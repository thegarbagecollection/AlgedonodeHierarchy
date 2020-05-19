  
  // takes an array [x1,...,xn], returns the nested arrays [[x_1,...,x_p],[x_{p+1},...,x_{2p}],...]
  // where p is partitionSize
  function partitionArray(array, partitionSize) {
    let ret = []
    let partition = []
    let currPartitionSize = 0
    for (let i = 0; i < array.length; i++) {
      partition.push(array[i])
      currPartitionSize++
      if (currPartitionSize === partitionSize) {
        currPartitionSize = 0
        ret.push(partition)
        partition = []
      }
    }
    return ret
  }
  
  class AlgedonodeHierarchy {
      // takes an AlgedonodeHierarchyRenderer
      constructor(renderer) {
          this.renderer = renderer
          this.dials = []
          this.rows = []
          this.lights = []
          this.strips = []
          this.algedonodeActivators = []
          for (let i = 0; i < 4; i++) {
              this.dials[i] = new Dial(i)
              this.rows[i] = []
              for (let j = 0; j < 8; j++) {
                  this.rows[i][j] = new Algedonode(i, j)
              }
          }
  
          for (let j = 0; j < 8; j++) {
            this.lights[j] = [new Light(LightType.B, j), new Light(LightType.A, j)]
  
            let brassPadPair = []
            for (let i = 0; i < 4; i++) {
              brassPadPair[i] = this.rows[i][j].brassPadPair
            }
  
            brassPadPair[3].setAttachedLightPair(this.lights[j])

            this.strips[j] = new Strip(brassPadPair, j)
          }
        
      }
      
      setupConnections(contactHandler) {
        this.setFirstRowInputConnections(contactHandler)
        this.setOtherRowInputConnections(contactHandler)
        this.setOtherRowOutputConnections()
        this.setLastRowOutputConnections()
      }
  
      setFirstRowInputConnections(contactHandler) {
        let d = this.dials[0]
        let r0 = this.rows[0]
        for (let c = 0; c < 8; c++) {
          r0[c].setSingleContact(d.getDialOutputsForAlgedonodes()[c], contactHandler.getContactsDefault())
        }
      }
      setOtherRowInputConnections(contactHandler) {
        for (let r = 1; r < 4; r++) {
          let inputs = this.dials[r].getDialOutputsForAlgedonodes()
          let inPartitionSize = Math.pow(2, r)
          let partitionedInputs = partitionArray(inputs, inPartitionSize)
  
          let currInputPartition = 0
          for (let c = 0; c < 8; c++) {
            this.rows[r][c].setMultiContact(partitionedInputs[currInputPartition], contactHandler.getContactsDefault())
            currInputPartition++
            if (currInputPartition === partitionedInputs.length) currInputPartition = 0
          }
  
        }
        
      }
  
      setLastRowOutputConnections() {
        let r3 = this.rows[3]
        for (let c = 0; c < 8; c++) {
          r3[c].setOutput([this.lights[c][0], this.lights[c][1]])
        }
  
      }
  
      setOtherRowOutputConnections() {
        /*   create 2 subpartitions of equal size
             all the 0 output pads of this partition activate the first subpartition
             all the 1 output pads of this partition activate the second subpartition
        */
        this.linkPartitions(0, 0, 7)
  
        // also need to link the lights in with dial 8 and 9 for dial3
  
        for (let c = 0; c < 8; c++) {
          this.dials[3].link9and10(this.lights[c][0], this.lights[c][1])
        }
      }
      
      linkPartitions(row, pStart, pEnd) {
        if (row === 3) {
          this.lights[pStart].forEach( light => light.setParent(this.rows[row][pStart]) )
          return
        }
  
  
  
        let pMid = Math.trunc((pStart + pEnd) / 2) + 1
  
        let partition0 = []
        for (let c = pStart; c <= pMid - 1; c++) {
          partition0.push(this.rows[row + 1][c])
        }
  
  
  
        let partition1 = []
        for (let c = pMid; c <= pEnd; c++) {
          partition1.push(this.rows[row + 1][c])
        }
  
        let algAct0 = new AlgedonodeSetActivator(partition0, pStart, pMid - 1, row, this.rows[row][pStart])
        let algAct1 = new AlgedonodeSetActivator(partition1, pMid, pEnd, row, this.rows[row][pMid])
  
        this.algedonodeActivators.push(algAct0)
        this.algedonodeActivators.push(algAct1)
  
        for (let c = pStart; c <= pEnd; c++) {
          this.rows[row][c].setOutput([algAct0, algAct1])
        }
  
        // We also wire up 8 and 9 here for each of rows 0-2
        this.dials[row].link9and10(algAct0, algAct1)
  
  
        this.linkPartitions(row + 1, pStart, pMid - 1)
        this.linkPartitions(row + 1, pMid, pEnd)
  
      }
  
      clearRenderer() {
        this.renderer.clear()
      }

      clear() {
        this.rows.forEach(row => { row.forEach(algedonode => { algedonode.clear() } ) } )
        this.lights.forEach(lightPair => { lightPair.forEach( light => light.clear() )  })
        this.dials.forEach(dial => { dial.clear() })
      }
  
      render() {
        this.renderComponents() // dial + outputs, algedonode, brass pads, strips, lights
        this.renderLabels()
      }
  
      renderLabels() {
        this.renderer.rowAndColumnLabels()
      }
  
      renderComponents() {
        this.algedonodeActivators.forEach(aa => { aa.render(this.renderer) })
        this.dials.forEach(d => { d.render(this.renderer) })
        this.strips.forEach(s => { s.render(this.renderer) } )
        this.rows.forEach( r => { r.forEach( c => { c.render(this.renderer) } )} )
        this.lights.forEach( lightPair => { lightPair.forEach( light => light.render(this.renderer) ) } )
      }
  
      // newValue should be in [-1, 1]
      moveStrip(stripNum, newValue) {
        this.strips[stripNum].setOffset(newValue)
      }
  
      setDialValue(dial, value) {
        this.dials[dial].setDialValue(value)
      }
  
      propagateDialValues() {
        this.dials.forEach(dial => {
          dial.propagateValue()
        })
      }
  
      // Given 4 states, returns the result at the current strip settings
      simulate(stateQuad) {
        this.clear()
        let oldValues = this.dials.map(dial => dial.getDialValue())
  
        for (let i = 0; i < 4; i++) {
          this.dials[i].setDialValue(stateQuad[i])
        }
        for (let i = 0; i < 4; i++) {
          this.dials[i].propagateValue()
        }
  
        let ret
        for (let i = 0; i < 8; i++) {
          if (this.lights[i][0].isActive()) {
            ret = {
              lightNum: i,
              aOrB: this.lights[i][0].getAorB()
            }
          }
          else if (this.lights[i][1].isActive()) {
            ret = {
              lightNum: i,
              aOrB: this.lights[i][1].getAorB()
            }
          }
        }
  
        for (let i = 0; i < 4; i++) {
          this.dials[i].setDialValue(oldValues[i])
        }
        for (let i = 0; i < 4; i++) {
          this.dials[i].propagateValue()
        }
  
        this.clear()
        return ret
  
      }
  
      fullSimulate() {
        let results = []
        for (let i1 = 1; i1 <= 10; i1++) {
          for (let i2 = 1; i2 <= 10; i2++) {
            for (let i3 = 1; i3 <= 10; i3++) {
              for (let i4 = 1; i4 <= 10; i4++) {
                results.push( { state: [i1, i2, i3, i4], result: this.simulate([i1, i2, i3, i4]) })
              }
            }
          }
        }
  
        // results: in format {state: [i1,i2,i3,i4], result: { lightNum, aOrB }}

        return results
      }
  
      getIlluminatedLight() {
        for (let i = 0; i < this.lights.length; i++) {
          for (let j = 0; j < 2; j++) {
            let light = this.lights[i][j]
            if (light.isActive()) {
              return {
                column: light.getColumn(),
                lightRow: light.getAorB()
              }
            }
          }
        }
        return null;
      }
  
  
      setNewContactPositions(contactHandler) {
        this.rows.forEach(algedonodeRow => algedonodeRow.forEach(algedonode => algedonode.setNewContactPositions(contactHandler.getContactsCurrent())))
      }
  
      renderMetasystem() {
        this.renderMetasystemVisibleComponents() // dial + outputs, algedonode, brass pads, strips, lights
        this.renderer.metasystemBlackBox()
        this.renderLabels()
      }
  
      renderMetasystemVisibleComponents() {
        this.dials.forEach(d => { d.render(this.renderer) })
        this.strips.forEach(s => { s.render(this.renderer) })
        this.lights.forEach( lightPair => { lightPair.forEach( light => light.renderAsMetaSystem(this.renderer) ) } )
      }
  }
  
  class Algedonode {
      // 1,2,4,8 inputs from dial going to contacts, 2 output pads (position adjusted by underlying strip), 1 input from previous row
      constructor(row, column) {
        this.active = row === 0
        this.row = row
        this.column = column
        this.brassPadPair = new BrassPadPair(row === 3)
        this.contacts = []
        this.contactCount = 0
      }
  
      getColumn() {
        return this.column
      }

      getRow() {
        return this.row
      }

      // position is either 0.5 for on, or -0.5 for off
      setSingleContact(input, contactsDefault) {
        let c = new Contact(contactsDefault[1][this.column], this.brassPadPair)
        this.contacts.push(c)
        input.link(c)
        c.parentActivated()
        this.contactCount = 1
      }
  
  
      // Note: ONLY CALLED FROM ROWS 1-3
      setMultiContact(inputs, contactsDefault) {
        // Multi-contacts are spread out evenly across the double strip, centred on position 0
        // Let's have them contained in a box of width 1 but never touching the edges, so 
        // a full push of the pad in either direction will still contain all the strips
        // 2 contacts: 0.49, -0.49                separation of 1
        // 4 contacts: 0.49, 0.16, -0.16, -0.49   separation of 1/3
        // 8 contacts: 0.49, 0.35, 0.21, 0.07, -0.07, -0.21,-0.35 , -0.49    separation of 1/7
        if (!contactsDefault[inputs.length]) throw `setMultiContact got unexpected input size of ${inputs.length}`;
  
        this.contactCount = inputs.length
  
        let cPos = contactsDefault[this.contactCount][this.column]
  
        for (let i = 0; i < this.contactCount; i++) {
          let c = new Contact(cPos[i], this.brassPadPair)
          this.contacts[i] = c
          inputs[i].link(c)
        }
  
  
      }
  
      setOutput(outputs) {
        this.brassPadPair.setOutput(outputs)
      }
  
  
      clear() {
        // Row 0 algedonodes are always active
        if (this.row !== 0) {
          this.active = false
          this.contacts.forEach( contact => { contact.algedonodeActive = false })
        }
        this.brassPadPair.clear()
  
      }
  
      activate() {
        this.active = true
        this.contacts.forEach( contact => contact.parentActivated())
      }
  
      isActive() {
        return this.active
      }
  
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
  
      setNewContactPositions(contactsCurrent) {
        if (this.row !== 0) {
          this.contacts.forEach((contact, i) => {
            contact.setPosition(contactsCurrent[this.contactCount][this.column][i])
          })
        }
        else {
          this.contacts[0].setPosition(contactsCurrent[this.contactCount][this.column])
        }
      }
  
  }
  
  class Contact {
    constructor(position, brassPadPair) {
      this.position = position
      this.active = false
      this.algedonodeActive = false
      this.brassPadPair = brassPadPair
    }
  
    setPosition(newPosition) {
      this.position = newPosition
    }
  
    parentActivated() {
      this.algedonodeActive = true
    }
  
    clear() {
      this.active = false
    }
  
    activate(source) {
      // source isn't used here - this will always be from a dial
      this.active = true
      // If this is active, we need to activate the brass pad underneath, whichever it is
      if (this.algedonodeActive) {
        this.brassPadPair.activate(this.position)
      }
    }
  
    renderAsInputSection(renderer, row, column) {
      renderer.contactAsInputSection(row, column, this.position, this.active)
    }
  
    renderAsContact(renderer, row, column) {
      renderer.contactAsContact(row, column, this.position, this.active, this.algedonodeActive)
    }
  }
  
  class BrassPadPair {
    // contact at vertical position p:
    // 0 <= p <= 1: output 1
    // -1 <= p < 0: output 0
    // starts with centreline of pad pair at 0
    constructor() {
      this.active = [false, false]
      this.offset = 0
      this.attachedLightPair = null // if null, not attached to a light
    }
  
    setAttachedLightPair(lightPair) {
      this.attachedLightPair = lightPair
    }

    setOutput(outputs) {
      this.outputs = outputs
    }
    
    activate(contactPosition) {
      // contact position is fixed, in (-0.5,0.5)
      // this should work: if contactPos >= this.offset / 2, then 1 output, else 0 output
  
      if (contactPosition >= this.offset / 2) {
        this.active[1] = true
        this.outputs[1].activate(ActivationSource.ALGEDONODE)
      }
      else {
        this.active[0] = true
        this.outputs[0].activate(ActivationSource.ALGEDONODE)
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
      renderer.brassPadPair(row, column, this.active, this.offset, this.attachedLightPair)
    } 
  
  }
  
  class AlgedonodeSetActivator {
    constructor(algedonodes, startColumn, endColumn, row, representativePartitionParent) {
      this.algedonodes = algedonodes
      this.active = false
      this.startColumn = startColumn
      this.row = row
      this.endColumn = endColumn
      this.activationSource = ActivationSource.NONE
      this.representativePartitionParent = representativePartitionParent
    }
  
    clear() {
      this.active = false
      this.algedonodes.forEach( algedonode => algedonode.clear() )
      this.activationSource = ActivationSource.NONE
    }
  
    activate(source) {
      // Need a bit of logic here - a dial output will only activate this
      // group if the parent group of algedonodes is currently activated
      if ((source === ActivationSource.DIAL_OUTPUT && this.representativePartitionParent.isActive()) || source === ActivationSource.ALGEDONODE) {
        this.active = true
        this.activationSource = source
        this.algedonodes.forEach( algedonode => algedonode.activate() )
      }
  
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
       contact.activate(this.value < 9 ? ActivationSource.ALGEDONODE : ActivationSource.DIAL_OUTPUT)
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
    setOffset(newOffset) {
      this.offset = newOffset
      this.brassPadPairs.forEach( brassPadPair => brassPadPair.setOffset(newOffset) )
    }
  }
  
  const LightType = {
    A: "A",
    B: "B"
  }
  
  const ActivationSource = {
    NONE: "NONE",
    DIAL_OUTPUT: "DIAL_OUTPUT",
    ALGEDONODE: "ALGEDONODE"
  }

  class Light { 
    constructor(aOrB, column) {
      this.aOrB = aOrB
      this.active = false
      this.column = column
      this.parent = null
      this.activationSource = ActivationSource.NONE
    }
    setParent(parent) {
      this.parent = parent
    }
    getColumn() {
      return this.column
    }
    activate(source) {
      if ((source === ActivationSource.DIAL_OUTPUT && this.parent.isActive()) || source === ActivationSource.ALGEDONODE) {
        this.active = true
        this.activationSource = source
      }
    }
    clear() {
      this.active = false
      this.activationSource = ActivationSource.NONE
    }
    render(renderer) {
      renderer.light(this, this.column, this.aOrB, this.active, this.activationSource)
    }
 
    renderAsMetaSystem(renderer) {
      renderer.metasystemLight(this.column, this.aOrB, this.active)
    }
  
    isActive() {
      return this.active
    }
  
    getAorB() {
      return this.aOrB
    }
  
    getColumn() {
      return this.column
    }
  
  }