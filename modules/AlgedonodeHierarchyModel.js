/**
 * A representation of the current dial states of the algedonode hierarchy.
 * Each value should be an integer from 1 to 10 inclusive.
 * @typedef { [number, number, number, number] } DialStates
 */
/**
 * @typedef { { state: DialStates, result: { lightColumn: Number, aOrB: LightTypes } } } StateResultPair
 */

/**
 * Defines the light type - which row is the light on, row A or row B?
 * @enum { LightType }
 */
const LightTypes = {
  /**
   * @type { LightType }
   */
  A: "A",
  /**
   * @type { LightType }
   */
  B: "B",
}

/**
 * Where is a given algedonode or light being activated from - directly from a dial output, or
 * via another algedonode's output?
 * @enum { ActivationSource }
 */
const ActivationSources = {
  /**
   * @type { ActivationSource }
   */
  NONE: "NONE",
  /**
   * @type { ActivationSource }
   */
  DIAL_OUTPUT: "DIAL_OUTPUT",
  /**
   * @type { ActivationSource }
   */
  ALGEDONODE: "ALGEDONODE",
}

/**
 * Partitions an array into sub-arrays, each partitionSize in length; repeat these sub-arrays as a cycle
 * until returned array is of length cycleTo.
 * @param {Array} array array to partition
 * @param {Number} partitionSize size of each partition
 * @param {Number} cycleTo the required length of the returned array, to be built by cycling subarrays
 * @returns {Array.<Array>} an array of length cycleTo, containing cycleTo arrays partitionSize in length as above.
 */
function partitionArray(array, partitionSize, cycleTo) {
  // Initial partitioning
  let initialPartitionResult = []
  let currPartition = []
  let currPartitionSize = 0
  for (let i = 0; i < array.length; i++) {
    currPartition.push(array[i])
    currPartitionSize++
    if (currPartitionSize === partitionSize) {
      currPartitionSize = 0
      initialPartitionResult.push(currPartition)
      currPartition = []
    }
  }
  
  // Cycle initial partitioning until final array is of appopriate size
  let currIndex = 0
  let ret = []
  while (ret.length < cycleTo) {
    ret.push(initialPartitionResult[currIndex++])
    if (currIndex >= initialPartitionResult.length) currIndex = 0
  }
  return ret
}

/**
 * The root of the algedonode hierarchy structure; controls access to the algedonode
 * hierarchy's state and light information.
 *
 * Changes to the dial state propagate down through the hierarchy to produce a light
 * as output, highlighting which components are active on the way.
 *
 * Additionally, can simulate (without rendering) the effect of a dial state on the
 * algedonode hierarchy, giving the light resulting as output.
 *
 * 4 rows, 8 columns.
 */
class AlgedonodeHierarchy {
  /**
   * @param {AlgedonodeHierarchyRenderer} renderer renders the algedonode hierarchy to a canvas
   */
  constructor(renderer) {
    this.renderer = renderer
    this.dials = []
    this.rows = []
    this.lights = []
    this.strips = []
    this.algedonodeActivators = [] // receives output from brass pads or dial, and passes it to its connected lower algedonode
    for (let i = 0; i < 4; i++) {
      this.dials[i] = new Dial(i)
      this.rows[i] = []
      for (let j = 0; j < 8; j++) {
        this.rows[i][j] = new Algedonode(i, j)
      }
    }

    for (let j = 0; j < 8; j++) {
      this.lights[j] = [new Light(LightTypes.B, j), new Light(LightTypes.A, j)]

      let brassPadPair = []
      for (let i = 0; i < 4; i++) {
        brassPadPair[i] = this.rows[i][j].brassPadPair
      }

      this.strips[j] = new Strip(brassPadPair, j)
    }
  }

  /**
   * Sets up initial connections between all dials, algedonodes, and lights
   * @param {ContactsHandler} contactHandler contacts handler to use in setting contact positions
   * @protected
   */
  setupConnections(contactHandler) {
    this.setRowInputConnections(contactHandler) // dial output links to algedonode contacts
    this.setRowOutputConnections() // algedonode -> algedonode links, direct links from dial positions 9 and 10
  }

  /**
   * Set up the links between dial outputs and algedonode contacts.
   * @param {ContactsHandler} contactHandler contacts handler to use in setting contact positions
   * @protected
   */
  setRowInputConnections(contactHandler) {
    // Over each row, we partition dial outputs 1-8 into 8 groups by cycling the outputs. One group per algedonode in that row,
    // whose size matches the number of contacts in that algedonode. e.g. in the second row, where algedonodes have 2 contacts, dial
    // outputs are (conceptually) grouped  [[1,2],[3,4],[5,6],[7,8],[1,2],[3,4],[5,6],[7,8]].
    // Note that dial outputs 9 and 10 will be linked directly to the output of the algedonodes, so isn't handled here.
    // Then we link the contacts for each algedonode against the dial outputs for the corresponding group in that row.
    for (let r = 0; r < 4; r++) {
      let inputs = this.dials[r].getDialOutputsForAlgedonodes()
      let inPartitionSize = Math.pow(2, r)

      let partitionedInputs = partitionArray(inputs, inPartitionSize, 8)

      partitionedInputs.forEach((inputs, c) => {
        this.rows[r][c].setContact(inputs, contactHandler.getContactsDefault())
      })
    }
  }

  /**
   * Links the brass pad outputs of row r in 1 to 3 to activate the appropriate algedonodes in row r+1;
   * also links dial outputs 9 and 10 of row r to activate the appropriate algedonodes in row r+1.
   * @protected
   */
  setRowOutputConnections() {
    /*   create 2 subpartitions of equal size
             all the 0 output pads of this partition activate the first subpartition
             all the 1 output pads of this partition activate the second subpartition
        */
    this.linkPartitions(0, 0, 7)

    // also need to link the lights in with dial outputs 9 and 10
    for (let c = 0; c < 8; c++) {
      this.dials[3].link9and10(this.lights[c][0], this.lights[c][1])
    }
  }

  /**
   * Recursive helper for {@link setRowOutputConnections}.
   *
   * Given a row r (indexed 0 - 2), and a partition p of r's algedonodes given by a starting column
   * and an ending column (inclusive), create two equal subpartitions p0, p1 of that partition, and for
   * all of the algedonodes in p, link their 0 output to activate subpartition p0, and their 1 output to activate
   * subpartition p1.
   *
   * A row index of 3 indicates that the current partition should be of size 1 (a single algedonode),
   * and this algedonode should be linked to its corresponding lights.
   * @param {Number} row current row in 0 to 3
   * @param {Number} pStart start of the row partition
   * @param {Number} pEnd end of the row partition (inclusive)
   */
  linkPartitions(row, pStart, pEnd) {
    // termination condition; should be at pStart = pEnd, a single algedonode partition
    if (pStart === pEnd) {
      // row index 3
      this.rows[row][pStart].setOutput(this.lights[pStart])
      this.lights[pStart].forEach(light => light.setParent(this.rows[row][pStart]))
      return
    }

    let pMid = Math.trunc((pStart + pEnd) / 2) + 1

    // equal splits of this partition
    let partition0 = this.rows[row + 1].slice(pStart, pMid)
    let partition1 = this.rows[row + 1].slice(pMid, pEnd + 1)

    // Create single points of activation to activate each subpartition, corresponding
    // to 0 and 1 outputs from the algedonodes of this partition
    let algAct0 = new AlgedonodeSetActivator(partition0, pStart, pMid - 1, row, this.rows[row][pStart])
    let algAct1 = new AlgedonodeSetActivator(partition1, pMid, pEnd, row, this.rows[row][pMid])

    this.algedonodeActivators.push(algAct0)
    this.algedonodeActivators.push(algAct1)

    // Link those activation points to this partition
    for (let c = pStart; c <= pEnd; c++) {
      this.rows[row][c].setOutput([algAct0, algAct1])
    }

    // We also wire up dial outputs 9 and 10 here for the first 3 rows - each activates
    // the corresponding algedonode set activator, much like an algedonode output
    this.dials[row].link9and10(algAct0, algAct1)

    // Link subpartitions
    this.linkPartitions(row + 1, pStart, pMid - 1)
    this.linkPartitions(row + 1, pMid, pEnd)
  }

  /**
   * Clear the graphic to the background colour.
   * @protected
   */
  clearRenderer() {
    this.renderer.clear()
  }

  /**
   * Clears activations across the algedonode hierarchy,
   * resulting in no active components.
   * @public
   */
  clear() {
    this.rows.forEach(row => {
      row.forEach(algedonode => {
        algedonode.clear()
      })
    })
    this.lights.forEach(lightPair => {
      lightPair.forEach(light => light.clear())
    })
    this.dials.forEach(dial => {
      dial.clear()
    })
  }

  /**
   * Draw all hierarchy components and labels
   * @public
   */
  render() {
    this.renderComponents() // dial + outputs, algedonode, brass pads, strips, lights
    this.renderLabels()
  }

  /**
   * Draw labels
   * @protected
   */
  renderLabels() {
    this.renderer.rowAndColumnLabels()
  }

  /**
   * Draw components, in "z-axis" order to prevent unpleasant overlaps
   * @protected
   */
  renderComponents() {
    this.algedonodeActivators.forEach(aa => {
      aa.render(this.renderer)
    })
    this.dials.forEach(d => {
      d.render(this.renderer)
    })
    this.strips.forEach(s => {
      s.render(this.renderer)
    })
    this.rows.forEach(r => {
      r.forEach(c => {
        c.render(this.renderer)
      })
    })
    this.lights.forEach(lightPair => {
      lightPair.forEach(light => light.render(this.renderer))
    })
  }

  /**
   * Moves the given strip to the new offset away from 0 (the centre of each algedonode and the default
   * starting position); this offset must be between -1 (fully up) and 1 (fully down), inclusive
   * @param {Number} stripNum column of the strip, integer 0 to 7 inclusive
   * @param {Number} newValue new offset of the strip, in [-1, 1]
   * @public
   */
  moveStrip(stripNum, newValue) {
    this.strips[stripNum].setOffset(newValue)
  }

  /**
   * Sets the given dial to the given value in 1 to 10 inclusive
   * @param {Number} dial row index of dial to set, from 0 to 3
   * @param {Number} value value to set the dial to; must be in range 1 to 10 inclusive
   * @public
   */
  setDialValue(dial, value) {
    this.dials[dial].setDialValue(value)
  }

  /**
   * Propagates the currently-set dial values from the dial outputs all the way
   * through the hierarchy.
   * @public
   */
  propagateDialValues() {
    this.dials.forEach(dial => {
      dial.propagateValue()
    })
  }

  /**
   * Simulates the outcome of a given dial state on the algedonode hierarchy, given
   * the current strip settings. Clears activations, sets dial values from the state,
   * propagates, them, obtains the result.
   *
   * DOES NOT render the process.
   * @param {DialStates} state a dial state to simulate the outcome of
   * @returns {StateResultPair} the result of the simulation
   * @protected
   */
  simulate(state) {
    this.clear()
    state.forEach((value, i) => {
      this.dials[i].setDialValue(value)
      this.dials[i].propagateValue()
    })

    // we assume that there will always be a light on after a simulation completes
    return this.getIlluminatedLight()
  }

  /**
   * Simulates every one of the 10000 dial states and returns the
   * resulting state-result activation pairs for each.
   * @returns {Array.<StateResultPair>}
   * @public
   */
  fullSimulate() {
    let oldValues = this.dials.map(dial => dial.getDialValue())

    let results = InitialValues.DIAL_STATES.map(state => {
      return {
        state,
        result: this.simulate(state),
      }
    })

    // Reset and restore, but don't send the old information to the data graphics, it's
    // already stored! (also drawing it will reset the complete data just generated)
    this.clear()
    oldValues.forEach((value, i) => {
      this.dials[i].setDialValue(value)
      this.dials[i].propagateValue()
    })

    return results
  }

  /**
   * Returns the state-result pair from the current dial state.
   * @returns {StateResultPair}
   * @public
   */
  getCurrentResult() {
    return { state: this.getDialStates(), result: this.getIlluminatedLight() }
  }

  /**
   * Returns the current dial state
   * @returns {DialStates}
   * @protected
   */
  getDialStates() {
    return this.dials.map(dial => dial.getDialValue())
  }

  /**
   * Return the details of the currently-illuminated light, or null if no light is on
   * @returns {{ lightColumn:Number, aOrB: LightType } | null} the activated light's column and light type, or
   * null if no light is on
   * @protected
   */
  getIlluminatedLight() {
    let lightOption = this.lights
      .flat()
      .filter(light => light.isActive())
      .map(light => light.getDetails())
    if (lightOption) return lightOption[0]
    return null
  }

  /**
   * Set new contact positions using given contact handler.
   * @param {ContactHandler} contactHandler the contact handler with positions to use
   * @public
   */
  setNewContactPositions(contactHandler) {
    this.rows.forEach(algedonodeRow => algedonodeRow.forEach(algedonode => algedonode.setNewContactPositions(contactHandler.getContactsCurrent())))
  }

  /**
   * Render the hierarchy as a metasystem - no internal details, just the strips, lights, dials, and black box overlay.
   * @public
   */
  renderMetasystem() {
    this.renderMetasystemVisibleComponents() // dial + outputs, algedonode, brass pads, strips, lights
    this.renderer.metasystemBlackBox()
    this.renderLabels()
  }

  /**
   * Render the visible components of the metasystem - dials, strips, lights
   * @protected
   */
  renderMetasystemVisibleComponents() {
    this.dials.forEach(d => {
      d.render(this.renderer)
    })
    this.strips.forEach(s => {
      s.render(this.renderer)
    })
    this.lights.forEach(lightPair => {
      lightPair.forEach(light => light.renderAsMetaSystem(this.renderer))
    })
  }
}

/**
 * Represents an algedonode in a given row and column. Each is connected to a certain number of dial outputs (its contacts), has 2 brass
 * pad outputs, and an activating input coming from both some partition of the previous row's outputs and a direct dial output.
 */
class Algedonode {
  
  /**
   * @param {Number} row row of algedonode from 0 to 7 inclusive
   * @param {Number} column row of algedonode from 0 to 3 inclusive
   */
  constructor(row, column) {
    this.active = row === 0 // first row are always active
    this.row = row
    this.column = column
    this.brassPadPair = new BrassPadPair()
    this.contacts = []
    this.contactCount = 0
  }

  /**
   * @returns {Number} this algedonode's column
   * @public
   */
  getColumn() {
    return this.column
  }

  /**
   * @returns {Number} this algedonode's row
   * @public
   */
  getRow() {
    return this.row
  }

  /**
   * Set this algedonode's contact positions according to the corresponding defaults.
   * @param {Array.<DialOutput>} inputs dial outputs to be linked to this algedonode
   * @param {ContactsPositions} contactsDefault default contact positions for an algedonode of this many contacts (row-determined)
   * @protected
   */
  setContact(inputs, contactsDefault) {
    // Let's have them contained in a box of width 1 but never touching the edges, so
    // a full push of the pad in either direction will still contain all the strips
    if (!contactsDefault[inputs.length]) throw `setMultiContact got unexpected input size of ${inputs.length}`

    this.contactCount = inputs.length

    // remember contact rows are indexed by contact count
    let cPos = contactsDefault[this.contactCount][this.column]

    inputs.forEach((input, i) => {
      let c = new Contact(cPos[i], this.brassPadPair)
      this.contacts[i] = c
      input.link(c)
    })

    // Handle first row of contacts - their parent algedonode is always activated!
    if (this.contactCount === 1) this.contacts[0].parentActivated()
  }

  /**
   * The 0 and 1 outputs of this algedonode have to be set; pass whatever needs to be activated through to the brass pad objects
   * @param { [AlgedonodeSetActivator, AlgedonodeSetActivator] } outputs the outputs to be set: 0 output in position 0, 
   * and the 1 output in position 1
   * @protected
   */
  setOutput(outputs) {
    this.brassPadPair.setOutput(outputs)
  }

  /**
   * Set this algedonode to inactive (except for first row algedonodes which are always active), set this algedonode's contacts to inactive, 
   * and set the brass pads to inactive.
   * @protected
   */
  clear() {
    // Row 0 algedonodes are always active
    if (this.row !== 0) {
      this.active = false
      this.contacts.forEach(contact => {
        contact.algedonodeActive = false
      })
    }
    this.brassPadPair.clear()
  }

  /**
   * Activate this algedonode and inform its contacts that it is activated, allowing propagation to occur from dials.
   * @protected
   */
  activate() {
    this.active = true
    this.contacts.forEach(contact => contact.parentActivated())
  }

  /**
   * @returns {Boolean} is this algedonode active?
   * @public
   */
  isActive() {
    return this.active
  }

  /**
   * Render this algedonode, its contacts, and its brass pads. Contacts are in halves - half to the
   * right of the algedonode shows where the dial wire comes in and its activation state, and half to the
   * left show the activated contact if any
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to render with
   * @protected
   */
  render(renderer) {
    // Centre of a row is between the algedonode `body' and the pads, half-way down the algedonode, and at the vertical midpoint of the 2 pads
    /*
          ##
          ## 
          ## |-|
          --c| |
          ## |-|
          ## 
          ##
        */

    this.brassPadPair.render(renderer, this.row, this.column)

    renderer.algedonode(this.row, this.column, this.active)

    this.contacts.forEach(contact => {
      contact.renderAsInputSection(renderer, this.row, this.column)
    })

    this.contacts.forEach(contact => {
      contact.renderAsContact(renderer, this.row, this.column)
    })
  }

  /**
   * Sets the algedonode contact positions to the currently-stored positions.
   * @param {ContactsPositions} contactsCurrent the current contact positions to use for this algedonode
   * @public
   */
  setNewContactPositions(contactsCurrent) {
    this.contacts.forEach((contact, i) => {
      contact.setPosition(contactsCurrent[this.contactCount][this.column][i])
    })
  }
}

/**
 * Represents an algedonode contact, taking a signal from a single dial output
 * and passing it on to the brass pad directly underneath only when the algeonode
 * is active.
 */
class Contact {
  /**
   * @param {Number} position contact height position in range (-0.5, 0.5), ensuring contact always remains within a pad (of height 1),
   * as slider movement is scaled to range [-0.5,0.5]
   * @param {BrassPadPair} brassPadPair brass pad pair underneath this contact
   */
  constructor(position, brassPadPair) {
    this.position = position
    this.active = false
    this.algedonodeActive = false
    this.brassPadPair = brassPadPair
  }

  /**
   * Change contact's vertical position to given value
   * @param {Number} newPosition position in (-0.5, 0.5)
   * @protected
   */
  setPosition(newPosition) {
    this.position = newPosition
  }

  /**
   * Tell this contact that its parent algedonode is active
   * @protected
   */
  parentActivated() {
    this.algedonodeActive = true
  }

  /**
   * Set this contact to inactive. Note: its parent algedonode
   * will set algedonodeActive
   * @protected
   */
  clear() {
    this.active = false
  }

  /**
   * Activate this contact, passing on the signal to the brass pad underneath as long as the parent algedonode is active
   * @param {ActivationSource} source unused, the source for a contact is always a dial, this is just to match signatures
   * @protected
   */
  activate(source) {
    this.active = true
    if (this.algedonodeActive) {
      this.brassPadPair.activate(this.position)
    }
  }

  /**
   * Render the contact's input segment from the dial output (right of algedonode)
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @param {Number} row row index of this connection, in 0-7
   * @param {Number} column column index of this connection, in 0-3
   * @protected
   */
  renderAsInputSection(renderer, row, column) {
    renderer.contactAsInputSection(row, column, this.position, this.active)
  }

  /**
   * Render the contact's output segment from the algedonode (left of algedonode onto brass pad)
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @param {Number} row row index of this connection, in 0-7
   * @param {Number} column column index of this connection, in 0-3
   * @protected
   */
  renderAsContact(renderer, row, column) {
    renderer.contactAsContact(row, column, this.position, this.active, this.algedonodeActive)
  }
}

/**
 * The pair of adjacent brass pads linked to an algedonode. Takes a signal from a contact at
 * a certain position, and propagates it through the brass pad corresponding to contact's
 * position, through to either an algendonode set activator or light.
 * 
 * Has an offset in [-1,1] corresponding to slider offset coordinates in [-1, 1]; translates
 * to contact offsets coordinates [-0.5, 0.5], where (from starting positions) a positive value
 * indicates a 1 output and negative a 0; the centreline of the pad pair is at 0.
 * @todo can merge this.outputs with this.attachedLightPair
 */
class BrassPadPair {
  constructor() {
    this.active = [false, false]
    this.offset = 0
    this.outputs = null
  }

/**
 * Send this brass pad pair's outputs to the given pair of outputs, whether light or algedonode set activator
 * @param {[AlgedonodeSetActivator, AlgedonodeSetActivator] | [Light, Light]} outputs 
 */
  setOutput(outputs) {
    this.outputs = outputs
  }

  activate(contactPosition) {
    // contact position is fixed, in (-0.5,0.5)
    // this should work: if contactPos >= this.offset / 2, then 1 output, else 0 output

    if (contactPosition >= this.offset / 2) {
      this.active[1] = true
      this.outputs[1].activate(ActivationSources.ALGEDONODE)
    } else {
      this.active[0] = true
      this.outputs[0].activate(ActivationSources.ALGEDONODE)
    }
  }

  clear() {
    this.active = [false, false]
    this.outputs.forEach(output => output.clear())
  }
  setOffset(offset) {
    this.offset = offset
  }
  render(renderer, row, column) {
    if (this.outputs[0].isLight()) {
      renderer.brassPadPairLightOutput(row, column, this.active, this.offset, this.outputs)
    }
    else {
      renderer.brassPadPairNormalOutput(row, column, this.active, this.offset)
    }
  }
}

class AlgedonodeSetActivator {
  constructor(algedonodes, startColumn, endColumn, row, representativePartitionParent) {
    this.algedonodes = algedonodes
    this.active = false
    this.startColumn = startColumn
    this.row = row
    this.endColumn = endColumn
    this.activationSource = ActivationSources.NONE
    this.representativePartitionParent = representativePartitionParent
  }

  clear() {
    this.active = false
    this.algedonodes.forEach(algedonode => algedonode.clear())
    this.activationSource = ActivationSources.NONE
  }

  activate(source) {
    // Need a bit of logic here - a dial output will only activate this
    // group if the parent group of algedonodes is currently activated
    if ((source === ActivationSources.DIAL_OUTPUT && this.representativePartitionParent.isActive()) || source === ActivationSources.ALGEDONODE) {
      this.active = true
      this.activationSource = source
      this.algedonodes.forEach(algedonode => algedonode.activate())
    }
  }

  isLight() {
    return false
  }

  render(renderer) {
    renderer.algedonodeSetActivator(this.row, this.startColumn, this.algedonodes, this.activationSource, this.active)
  }
}

class Dial {
  constructor(row) {
    this.row = row
    this.dialOutputs = []
    for (let i = 0; i < 10; i++) {
      this.dialOutputs[i] = new DialOutput(i + 1) // we're using 1-indexed value!
    }
    this.value = 1
  }

  setDialValue(value) {
    this.value = value
  }

  propagateValue() {
    this.dialOutputs[this.value - 1].activate()
  }

  getDialValue() {
    return this.value
  }

  getDialOutputsForAlgedonodes() {
    return this.dialOutputs.slice(0, 8)
  }

  render(renderer) {
    for (let i = 0; i < 10; i++) {
      this.dialOutputs[i].render(renderer, this.row, i)
    }

    renderer.dial(this.row, this.value)
  }

  clear() {
    this.dialOutputs.forEach(dialOutput => {
      dialOutput.clear()
    })
  }

  link9and10(output9, output10) {
    this.dialOutputs[8].link(output9)
    this.dialOutputs[9].link(output10)
  }
}

class DialOutput {
  constructor(value) {
    this.contacts = []
    this.active = false
    this.value = value
  }

  activate() {
    this.active = true
    this.contacts.forEach(contact => {
      contact.activate(this.value < 9 ? ActivationSources.ALGEDONODE : ActivationSources.DIAL_OUTPUT)
    })
  }
  clear() {
    this.active = false
    this.contacts.forEach(contact => contact.clear())
  }

  link(contact) {
    this.contacts.push(contact)
  }

  render(renderer, row, outputNum) {
    renderer.dialOutput(row, this.active, outputNum)
  }
}

class Strip {
  // 4-element array of brass pad pairs,    in row order
  constructor(brassPadPairs, column) {
    this.brassPadPairs = brassPadPairs
    this.offset = 0 // will be controlled by sliders
    this.column = column
  }
  render(renderer) {
    renderer.strip(this.column, this.offset)
  }
  /**
   * Moves the strip to the new offset away from 0 (the centre of each algedonode and its original position);
   * this offset must be between -1 (fully up) and 1 (fully down), inclusive
   * @param {Number} newOffset new offset of the strip, in [-1, 1]
   * @protected
   */
  setOffset(newOffset) {
    this.offset = newOffset
    this.brassPadPairs.forEach(brassPadPair => brassPadPair.setOffset(newOffset))
  }
}

class Light {
  constructor(aOrB, column) {
    this.aOrB = aOrB
    this.active = false
    this.column = column
    this.parent = null
    this.activationSource = ActivationSources.NONE
  }
  setParent(parent) {
    this.parent = parent
  }
  getColumn() {
    return this.column
  }
  activate(source) {
    if ((source === ActivationSources.DIAL_OUTPUT && this.parent.isActive()) || source === ActivationSources.ALGEDONODE) {
      this.active = true
      this.activationSource = source
    }
  }
  clear() {
    this.active = false
    this.activationSource = ActivationSources.NONE
  }
  render(renderer) {
    renderer.light(this, this.column, this.aOrB, this.active, this.activationSource)
  }

  renderAsMetaSystem(renderer) {
    renderer.metasystemLight(this.column, this.aOrB, this.active)
  }

  isLight() {
    return true;
  }

  isActive() {
    return this.active
  }

  getDetails() {
    return {
      lightColumn: this.column,
      aOrB: this.aOrB,
    }
  }

  getAorB() {
    return this.aOrB
  }

  getColumn() {
    return this.column
  }
}

// Hacls to get LightType and ActivationSource represented as types for enums
/**
 * @class
 */
function LightType() {}
/**
 * @class
 */
function ActivationSource() {}
