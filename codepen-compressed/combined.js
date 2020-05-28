/*
 * This was all compressed into one file to allow it to run on codepen.
 * Proper version is at https://github.com/thegarbagecollection/AlgedonodeHierarchy
 */

/**
 *
 * @global
 */
const InitialValues = {
  DATA_STORE_SIZE: 1000, // Needed during window initialisation to set positions etc
  DIAL_STATES: createDialStates(), //  * All 10000 dial states, in an array for global access - should not change during execution
}

/**
 * Creates an array of sequential dial states, from [1,1,1,1] to [10,10,10,10]
 * @returns {Array<DialStates>} the dial state aray
 * @private
 */
function createDialStates() {
  let states = []
  for (let i1 = 1; i1 <= 10; i1++) {
    for (let i2 = 1; i2 <= 10; i2++) {
      for (let i3 = 1; i3 <= 10; i3++) {
        for (let i4 = 1; i4 <= 10; i4++) {
          states.push([i1, i2, i3, i4])
        }
      }
    }
  }
  return states
}

/**
 * Both A and B are non-negative integers
 * @typedef {{ A: Number, B: Number } } FrequencyData
 */

/**
 * Bar chart that contains both light A and B frequencies for each individual column in the algedonode hierarchy,
 * and the sum totals of A and B frequencies across all columns.
 *
 * Can be updated a single data entry at a time, or given a batch of data to display.
 *
 * Bar heights are scaled according to what percentage of the total output that column and light make up.
 *
 * Algedonode columns are represented in corresponding columns 0-7 of the bar chart, and the total frequencies
 * in columns 9 (LightTypes.A) and 10 (LightTypes.B).
 */
class LimitedBarChart {
    /**
     * @param {CanvasRenderingContext2D} barChartContext context for rendering the bar chart to
     * @param {ColourHandler} colourHandler to get access to the common colour definitions
     */
    constructor(barChartContext, colourHandler) {
      this.colourHandler = colourHandler
  
      /**
       * Frequencies for each algedonode column, 0-indexed
       * @type {Array.<FrequencyData>}
       */
      this.barData = new Array(8).fill(null).map(_ => {
        return { A: 0, B: 0 }
      })
  
      /**
       * Total frequencies of each light across all columns
       * @type { FrequencyData }
       */
      this.totalFrequencyData = { A: 0, B: 0 }
      this.totalFrequencyDataCount = 0 // sum of both parts of this.totalFrequencyData
  
      /**
       * Maps a state (as integer) directly to the result of that state-result pair
       * @type {Array.<{ lightColumn: Number, aOrB: LightTypes }>}
       */
  
      this.stateMapping = new Array(10000).fill(null)
      this.ctx = barChartContext
  
      this.w = this.ctx.canvas.width
      this.h = this.ctx.canvas.height
      this.barColumnW = this.w / 11.5 // width of a column
      this.maxDrawH = 0.8 * this.h // maximum height of a bar
    }
  
    /**
     * Converts a given dial state into the corresponding integer in 0-9999
     * @param {DialStates} state dial state to transform
     * @returns {Number} the corresponding integer
     * @protected
     */
    stateToInteger(state) {
      return 1000 * (state[0] - 1) + 100 * (state[1] - 1) + 10 * (state[2] - 1) + (state[3] - 1)
    }
  
    /**
     * Clear both the bar chart graphic and the stored frequency data, and redraw axes.
     * @public
     */
    clearAll() {
      this.clearGraphic()
      this.clearData()
    }
  
    /**
     * Clear the bar chart graphic and redraw axes.
     * @public
     */
    clearGraphic() {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
      this.drawAxes()
    }
  
    /**
     * Clear the data, setting stored frequencies per column to 0, overall frequencies to 0, and
     * clearing all state mappings.
     * @protected
     */
    clearData() {
      this.barData = new Array(8).fill(null).map(_ => {
        return { A: 0, B: 0 }
      }) // one per column
      this.totalFrequencyData = { A: 0, B: 0 }
      this.totalFrequencyDataCount = 0
      this.stateMapping = new Array(10000).fill(null)
    }
  
    /**
     * Updates frequencies for the bars given by the new and removed state result pairs, updates the
     * overall frequencies, and re-renders the chart.
     * @param {StateResultPair} newStateResultPair state result pair to add to the bar chart; null if none
     * @param {StateResultPair} removedStateResultPair state result pair to remove from the bar chart; null if none
     * @public
     */
    changeBars(newStateResultPair, removedStateResultPair) {
      if (removedStateResultPair) {
        // Remove given state-result pair from the appropriate bar
        let {
          state,
          result: { lightColumn, aOrB },
        } = removedStateResultPair
        let s = this.stateToInteger(state)
        let stored = this.stateMapping[s]
        if (stored) {
          if (lightColumn !== stored.lightColumn || aOrB !== stored.aOrB) console.log("Tried to remove a point that was different from expected")
          this.stateMapping[s] = null
          this.totalFrequencyData[aOrB]--
          this.totalFrequencyDataCount--
          this.barData[lightColumn][aOrB]--
        }
      }
  
      if (newStateResultPair) {
        let {
          state,
          result: { lightColumn, aOrB },
        } = newStateResultPair
        let s = this.stateToInteger(state)
        let stored = this.stateMapping[s]
        // If the stored and new mappings for this state differ in any way, we need to update the
        // appropriate bars, removing from the old bar and adding to the new.
        if (stored === null || stored.lightColumn !== lightColumn || stored.aOrB !== aOrB) {
          this.addToStored(s, lightColumn, aOrB)
          if (stored === null) {
            this.totalFrequencyDataCount++
            this.totalFrequencyData[aOrB]++
            this.barData[lightColumn][aOrB]++
          } else {
            if (stored.aOrB !== aOrB) {
              this.totalFrequencyData[stored.aOrB]--
              this.totalFrequencyData[aOrB]++
            }
            this.barData[stored.lightColumn][stored.aOrB]--
            this.barData[lightColumn][aOrB]++
          }
        }
      }
  
      // If we only replot the *explicitly* changed columns, but the overall data count (frequency)
      // has increased or decreased, we'll need to redraw all the other columns to compensate...
      // so we may as well just redraw the whole shebang, not like it takes long
      this.redrawBarsAndFrequencies()
    }
  
    /**
     * Adds the given result lightColumn and aOrB to the state mapping under the given integer state representation
     * @param {Number} statesInt integer representation of a dial state
     * @param {Number} lightColumn column the light is in
     * @param {LightType} aOrB type of the light
     * @protected
     */
    addToStored(statesInt, lightColumn, aOrB) {
      this.stateMapping[statesInt] = { lightColumn, aOrB }
    }
  
    /**
     * Draw a bar on the chart
     * @param {Number} column the column index to draw the bar in, from 0-10
     * @param {Number} height the height of the bar
     * @param {String} fill the fill style for the bar, a colour
     * @param {Number} xOffset the starting left coordinate offset of the bar within the column
     * @protected
     */
    drawBar(column, height, fill, xOffset) {
      this.ctx.beginPath()
      this.ctx.fillStyle = fill
      this.ctx.fillRect(column * this.barColumnW + xOffset, this.maxDrawH - height, this.barColumnW / 2 - this.barColumnW / 9, height)
      this.ctx.stroke()
    }
  
    /**
     * Draw bars on the chart corresponding to light A counts and light B counts in the given column.
     * @param {Number} column the column to draw both bars in
     * @param {Number} aCount frequency of light A
     * @param {Number} bCount frequency of light B
     * @param {Number} totalFrequencyDataCount total data points available across all columns and lights
     * @protected
     */
    drawBars(column, aCount, bCount, totalFrequencyDataCount) {
      this.ctx.clearRect(column * this.barColumnW, 0, this.barColumnW, this.maxDrawH)
  
      this.drawBar(column, this.barHeight(aCount, totalFrequencyDataCount), this.colourHandler.lightAOn, this.barColumnW / 9)
      this.drawBar(column, this.barHeight(bCount, totalFrequencyDataCount), this.colourHandler.lightBOn, this.barColumnW / 2)
    }
  
    /**
     * Converts a frequency for a bar into a height in pixels, given the total available height for bars
     * @param {Number} count frequency of the light
     * @param {Number} totalFrequencyDataCount total data points available across all columns and lights
     * @returns {Number} the height, in pixels, of the bar with that count given the total number of data points
     * @protected
     */
    barHeight(count, totalFrequencyDataCount) {
      return (this.maxDrawH * count) / totalFrequencyDataCount
    }
  
    /**
     * Draw a total frequency bar (wider than one of the standard bars) of the given height
     * @param {Number} column column index for the total frequency bar
     * @param {Number} height height of the total frequency bar
     * @param {String} fill fill colour
     * @param {Number} xOffset offset position from the left of the column
     * @protected
     */
    drawFrequency(column, height, fill, xOffset) {
      this.ctx.beginPath()
      this.ctx.fillStyle = fill
      this.ctx.fillRect(column * this.barColumnW + xOffset, this.maxDrawH - height, this.barColumnW - this.barColumnW / 9, height)
      this.ctx.stroke()
    }
  
    /**
     * Draw the given data as total frequencies
     * @param {Number} aCount number of lights of type A
     * @param {Number} bCount number of lights of type B
     * @protected
     */
    drawFrequencies(aCount, bCount) {
      let total = aCount + bCount
      this.ctx.clearRect(9 * this.barColumnW, 0, 2 * this.barColumnW, this.maxDrawH)
      this.drawFrequency(9, this.barHeight(aCount, total), this.colourHandler.lightAOn, this.barColumnW / 9)
      this.drawFrequency(10, this.barHeight(bCount, total), this.colourHandler.lightBOn, 0)
    }
  
    /**
     * Redraw all bars and total frequency bars based on data currently stored in this object
     * @protected
     */
    redrawBarsAndFrequencies() {
      this.barData.forEach(({ A: aCount, B: bCount }, i) => {
        this.drawBars(i, aCount, bCount, this.totalFrequencyDataCount)
      })
  
      let totalLightA = this.totalFrequencyData[LightTypes.A]
      let totalLightB = this.totalFrequencyData[LightTypes.B]
  
      this.drawFrequencies(totalLightA, totalLightB)
    }
  
    /**
     * Draw the labels along the x-axis
     * @param {Array.<{label: String, column: Number}>} labelsWithPos column labels and positions
     * @protected
     */
    drawLabels(labelsWithPos) {
      this.ctx.beginPath()
      this.ctx.fillStyle = "black"
      this.ctx.font = "" + 0.15 * this.h + "px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "bottom"
      labelsWithPos.forEach(({ label, column }) => {
        this.ctx.fillText(label, column * this.barColumnW + this.barColumnW / 2, 0.99 * this.h)
      })
      this.ctx.stroke()
    }
  
    /**
     * Draw the axes and labels
     * @protected
     */
    drawAxes() {
      this.drawLabels([
        { label: LightTypes.A, column: 9 },
        { label: LightTypes.B, column: 10 },
      ])
  
      let colLabels = new Array(8).fill(null).map((_, i) => ({ label: `${i + 1}`, column: i }))
      this.drawLabels(colLabels)
  
      this.ctx.beginPath()
      this.ctx.strokeStyle = "black"
      this.ctx.moveTo(0, this.maxDrawH * 1.01)
      this.ctx.lineTo(this.w, this.maxDrawH * 1.01)
      this.ctx.moveTo(8 * this.barColumnW + this.barColumnW / 2, this.h)
      this.ctx.lineTo(8 * this.barColumnW + this.barColumnW / 2, 0)
      this.ctx.stroke()
    }
  
    /**
     * Draw the chart based entirely off the state-result pairs and their corresponding counts
     * passed in; optionally storing these as the data to work from subsequently.
     * @param {Array.<StateResultPair>} individualResults state-result pairs
     * @param {CountResults} counts the state-result pairs in {@link individualResults}, transformed into frequencies
     * @param {Boolean} storeCountData should the passed-in data be saved and worked from subsequently?
     * @public
     */
    fullChart(individualResults, counts, storeCountData) {
      this.clearGraphic()
  
      let totalLightA = counts.reduce((acc, { aCount, bCount }) => {
        return acc + aCount
      }, 0)
  
      let totalLightB = counts.reduce((acc, { aCount, bCount }) => {
        return acc + bCount
      }, 0)
  
      let totalItems = totalLightA + totalLightB
  
      if (storeCountData) {
        this.overwriteData(totalLightA, totalLightB, totalItems, counts, individualResults)
      }
  
      for (let i = 0; i < counts.length; i++) {
        if (counts[i]) {
          let { aCount, bCount } = counts[i]
          this.drawBars(i, aCount, bCount, totalItems)
        }
      }
  
      this.drawFrequencies(totalLightA, totalLightB)
    }
  
    /**
     * Replace the stored data items with the ones passed in.
     * @param {Number} totalLightA total number of lights of type A
     * @param {Number} totalLightB total number of lights of type B
     * @param {Number} totalItems total number of lights lit by the passed-in states
     * @param {CountResults} counts counts the state-result pairs in {@link individualResults}, transformed into frequencies
     * @param {Array.<StateResultPair>} individualResults 
     * @protected
     */
    overwriteData(totalLightA, totalLightB, totalItems, counts, individualResults) {
      this.clearData() // make sure everything's reinitialised
      this.totalFrequencyData = { A: totalLightA, B: totalLightB }
      this.totalFrequencyDataCount = totalItems
      counts.forEach(({ aCount, bCount }, i) => {
        this.barData[i] = { A: aCount, B: bCount }
      })
      individualResults.forEach(({ state, result: { lightColumn, aOrB } }) => {
        this.addToStored(this.stateToInteger(state), lightColumn, aOrB)
      })
    }
  }
  

/**
 * Controls the rendering of the algedonode hierarchy; contains all positions and spacings for
 * the columns and rows, and the corresponding hierarchy component position calculations.
 *
 * elementCentre(r, c) and its resulting { cX, cY } gives the "drawing centre" of the algedonode
 * component group in row r and column c - cX on the border between the algodonode body and the
 * brass pads, and cY at the centreline of the algedonode body and the brass pads.
 */
class AlgedonodeHierarchyRenderer {
  constructor(context, colourHandler) {
    this.ctx = context
    this.colourHandler = colourHandler
    this.columnSpacing = 50 // distance between columns
    this.columnWidth = 10 // width of a single column
    this.rowSpacing = 100 // distance between rows
    this.rowHeight = 30 // height of a single row
    this.row0Y = 100 // starting y of first row
    this.col0X = 100 // starting x of first column
  }

  /**
   * Clear the graphic to the background colour.
   * @public
   */
  clear() {
    let canvas = this.ctx.canvas
    let w = canvas.width
    let h = canvas.height
    this.ctx.fillStyle = this.colourHandler.background
    this.ctx.fillRect(0, 0, w, h)
  }

  /**
   * Label the algedonode columns below the lights from 1 to 8, and label the light rows A and B
   */
  rowAndColumnLabels() {
    let fontSize = this.columnWidth * 2
    for (let i = 0; i < 8; i++) {
      let { cX, cY } = this.elementCentre(4.65, i)
      this.label(`${i + 1}`, cX, cY, fontSize)
    }
    let { cX, cY } = this.elementCentre(4.25, -1)
    this.label(LightTypes.A, cX, cY - 0.4 * this.rowHeight, fontSize)
    this.label(LightTypes.B, cX, cY + 0.5 * this.rowHeight, fontSize)
  }

  /**
   * Draw the metasystem black box; it should cover all the algedonodes and brass pads, leave out the
   * lights, dials, and dial connections, and each strip should be visible on both ends even when at
   * maximum slider distances up and down.
   */
  metasystemBlackBox() {
    let x1 = this.columnSpacing
    let y1 = this.rowSpacing - this.rowHeight * 1.5
    let x2 = this.columnSpacing * 10
    let y2 = this.rowSpacing * 4.5
    this.rectangle({ lineWidth: 0, strokeStyle: null, fillStyle: "black" }, x1, y1, x2 - x1, y2 - y1)
  }

  /**
   * Draw the dial for the given row - a circle outline, filled, containing the required dial value
   * @param {Number} row row for the dial
   * @param {Number} dialValue integer from 1-10 giving the dial value
   */
  dial(row, dialValue) {
    let { cX, cY } = this.elementCentre(row, 9)

    this.circle({ lineWidth: 1, strokeStyle: "black", fillStyle: "white" }, cX, cY, this.rowHeight)

    this.label(dialValue, cX, cY, 40)
  }

  /**
   * Renders the numbered dial output of the given row in the active colour if active and
   * dial output inactive colour if not
   * @param {Number} row the row the owning dial belongs to
   * @param {Boolean} active is this dial output active?
   * @param {Number} outputNum the index of the dial output from 0 to 9
   */
  dialOutput(row, active, outputNum) {
    let { cX, cY } = this.elementCentre(row, 9)

    // We have 2x rowHeight space to work with - rowHeight is radius of parent dial
    // Use 1.5x rowHeight, 5 connections each side, 10 connections total
    let gapBetweenOutputs = (this.rowHeight * 1.5) / 9

    // so 4.5 gaps each side
    let firstContactY = cY - 4.5 * gapBetweenOutputs

    let contactY = firstContactY + outputNum * gapBetweenOutputs

    let lineWidth = 1.3
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.dialOutput
    let start = { x: cX, y: contactY }
    let end = { x: cX - 2 * this.rowHeight, y: contactY }
    this.line({ lineWidth, strokeStyle }, start, end)
  }

  /**
   * Render the strip in the given column at the given offset
   * @param {Number} column column of strip
   * @param {Number} offset offset of strip, in [-1, 1] where negative is moved up and positive is moved down
   */
  strip(column, offset) {
    let { cX, cY } = this.elementCentre(0, column)
    let stripTL = { x: cX - this.columnWidth, y: cY - 2.5 * this.rowHeight + (offset * this.rowHeight) / 2 }
    let height = 3 * this.rowSpacing + 5 * this.rowHeight

    this.rectangle({ lineWidth: 1.0, strokeStyle: this.colourHandler.strip, fillStyle: this.colourHandler.strip }, stripTL.x, stripTL.y, this.columnWidth, height)
  }

  /**
   * Render the given light at the given column, with the given light type (colour) depending on whether it's on or off,
   * drawing the various wires from the connection point depending on which parent component was active - dial or algedonode
   * @param {Light} theLight the light being rendered; required to extract positioning details of the contact point
   * @param {Number} column column of given light
   * @param {LightType} aOrB is the light in light row A or row B?
   * @param {Boolean} active is the light on?
   * @param {ActivationSource} activationSource where was the light activated from, a dial output or an algedonode output? This determines which wires
   * to show as active.
   */
  light(theLight, column, aOrB, active, activationSource) {
    let { cX, cY } = this.elementCentre(4.25, column)
    let rowOffset = this.lightTypeToOffset(aOrB)
    let radius = this.rowHeight / 4
    let y = cY + this.rowHeight * rowOffset

    this.lightConnection(theLight, column, rowOffset, aOrB, active, activationSource)

    let onColour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    let offColour = aOrB === LightTypes.A ? this.colourHandler.lightAOff : this.colourHandler.lightBOff

    let colour = active ? onColour : offColour

    this.circle({ lineWidth: 1, strokeStyle: colour, fillStyle: colour }, cX, y, radius)
  }

  /**
   * Draws the light's contact point, the wire from the contact point to the light, and the wire "from" the dial output to the
   * light, with colouring depending on whether they are on or off
   * @param {Light} theLight the light being rendered; required to extract positioning details of the contact point
   * @param {Number} column column of given light
   * @param {Number} rowOffset offset computed to put the light in the appropriate row
   * @param {LightType} aOrB is the light in light row A or row B?
   * @param {Boolean} active is the light on?
   * @param {ActivationSource} activationSource where was the light activated from, a dial output or an algedonode output? This determines which wires
   */
  lightConnection(theLight, column, rowOffset, aOrB, active, activationSource) {
    // the wire from the contact point to the point it joins the light
    let lineWidth = 1.5
    let strokeStyle = activationSource === ActivationSources.DIAL_OUTPUT ? this.colourHandler.activated : this.colourHandler.dialOutput

    var { x, y } = this.lightConnectionCoords(column, rowOffset, aOrB)
    this.line({ lineWidth, strokeStyle }, { x, y }, { x: x, y: y + this.rowHeight / 4 }, { x: x + this.columnWidth / 4, y: y + this.rowHeight / 4 })

    // the wire coming "from" the dial output
    strokeStyle = active ? this.colourHandler.activated : "black"
    var wjc = this.lightWireJoinCoords(theLight)
    this.line({ lineWidth, strokeStyle }, { x, y }, wjc)
    this.circle({ lineWidth, strokeStyle, fillStyle: strokeStyle }, x, y, 2)
  }

  /**
   * Render the given light at the given column, with the given light type (colour) depending on whether it's on or off;
   * contact points and connecting wires are not drawn (metasystem viewpoint)
   * @param {Number} column column of given light
   * @param {LightType} aOrB is the light in light row A or row B?
   * @param {Boolean} active is the light on?
   */
  metasystemLight(column, aOrB, active) {
    let { cX, cY } = this.elementCentre(4.25, column)
    let rowOffset = this.lightTypeToOffset(aOrB)
    let radius = this.rowHeight / 4
    let y = cY + this.rowHeight * rowOffset

    let onColour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    let offColour = aOrB === LightTypes.A ? this.colourHandler.lightAOff : this.colourHandler.lightBOff

    let colour = active ? onColour : offColour

    this.circle({ lineWidth: 1, strokeStyle: colour, fillStyle: colour }, cX, y, radius)
  }

  /**
   *
   * @param {Number} row
   * @param {Number} column
   * @param {Boolean} active
   */
  algedonode(row, column, active) {
    let { cX, cY } = this.elementCentre(row, column)
    let algTL = { x: cX, y: cY - 0.7 * this.rowHeight }
    let fillStyle = this.colourHandler.algedonode
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.algedonodeEdge
    let lineWidth = 1.0
    this.rectangle({ lineWidth, strokeStyle, fillStyle }, algTL.x, algTL.y, this.columnWidth, this.rowHeight * 1.4)
  }

  /**
   * Render the input portion of this algedonode contact, coming from the dial output. Indicates whether or not the
   * contact is active.
   * @param {Number} row the row of this contact's parent algedonode
   * @param {Number} column the column of this contact's parent algedonode
   * @param {Number} position the vertical position of this contact within the parent algedonode, in (-0.5. 0.5), where
   * the coordinate is a relative multiplier of the algedonode's height; so -0.49 is almost at the top, 0.49 almost at the bottom
   * @param {Boolean} active is this contact active?
   */
  contactAsInputSection(row, column, position, active) {
    let { cX, cY } = this.elementCentre(row, column)

    let x = cX + this.columnWidth
    let y = cY + position * this.rowHeight

    let lineWidth = 1.5
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle }, { x, y }, { x: x + this.columnWidth, y })
  }

  /**
   * Render the output portion of this algedonode contact, coming from the dial output. Indicates whether or not the
   * contact is active as an output (depends on the algedonode being active).
   * @param {Number} row the row of this contact's parent algedonode
   * @param {Number} column the column of this contact's parent algedonode
   * @param {Number} position the vertical position of this contact within the parent algedonode, in (-0.5. 0.5), where
   * the coordinate is a relative multiplier of the algedonode's height; so -0.49 is almost at the top, 0.49 almost at the bottom
   * @param {Boolean} active is this contact active?
   * @param {Boolean} algedonodeActive is this contact's algedonode parent active?
   */
  contactAsContact(row, column, position, active, algedonodeActive) {
    let { cX, cY } = this.elementCentre(row, column)

    let x = cX
    let y = cY + position * this.rowHeight

    let lineWidth = 1.5
    let strokeStyle = active && algedonodeActive ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle }, { x, y }, { x: x - (this.columnWidth * 3) / 4, y })
  }

  /**
   * Render the brass pad pair at the appropriate location on its underlying strip, showing which (if either) of
   * the two pads is active
   * @param {Number} row row of this brass pad pair's parent algedonode
   * @param {Number} column column of this brass pad pair's parent algedonode
   * @param {Number} active which brass pad, if any, is active? -1 for none, 0 for output 0, 1 for output 1
   * @param {Number} offset the offset of the slider this brass pad pair rests on; altering its position will
   * alter the brass pad pair's position
   */
  brassPadPair(row, column, active, offset) {
    // (cX, cY) is centre of algedonode-padpair group
    let { cX, cY } = this.elementCentre(row, column)
    let lx = cX - this.columnWidth
    let yOffset = (offset * this.rowHeight) / 2

    let pad0TL = { x: lx, y: cY - this.rowHeight + yOffset }
    let pad1TL = { x: lx, y: cY + yOffset }

    let padTL = [pad0TL, pad1TL]

    let lineWidth = 1
    let fillStyle = this.colourHandler.brassPad

    for (let i = 0; i < 2; i++) {
      let strokeStyle = i === active ? this.colourHandler.activated : this.colourHandler.brassPadEdge
      this.rectangle({ lineWidth, strokeStyle, fillStyle }, padTL[i].x, padTL[i].y, this.columnWidth, this.rowHeight)
    }

    return { cY, padTL }
  }

  /**
   * Render the brass pad pair at the appropriate location on its underlying strip, showing which (if either) of
   * the two pads is active; also draws connections between the brass pad and the appropriate light contact point
   * @param {Number} row row of this brass pad pair's parent algedonode
   * @param {Number} column column of this brass pad pair's parent algedonode
   * @param {Number} active which brass pad, if any, is active? -1 for none, 0 for output 0, 1 for output 1
   * @param {Number} offset the offset of the slider this brass pad pair rests on; altering its position will
   * alter the brass pad pair's position
   * @param {Light} attachedLight
   */
  brassPadPairLightOutput(row, column, active, offset, attachedLight) {
    let { cY, padTL } = this.brassPadPair(row, column, active, offset)
    this.lightOutputWire(attachedLight, padTL, active)
  }

  /**
   * Render the brass pad pair at the appropriate location on its underlying strip, showing which (if either) of
   * the two pads is active; also draws connections between the brass pad and the place the wires "disappear"
   * when going to an algedonode set activator
   * @param {Number} row row of this brass pad pair's parent algedonode
   * @param {Number} column column of this brass pad pair's parent algedonode
   * @param {Number} active which brass pad, if any, is active? -1 for none, 0 for output 0, 1 for output 1
   * @param {Number} offset the offset of the slider this brass pad pair rests on; altering its position will
   * alter the brass pad pair's position
   */
  brassPadPairNormalOutput(row, column, active, offset) {
    let { cY, padTL } = this.brassPadPair(row, column, active, offset)
    this.standardOutputWire(cY, padTL, active)
  }

  /**
   * Draws the pair of output wires from a bottom row brass pad pair to its corresponding lights; activated wires are displayed
   * in a different colour.
   * @param {[Light, Light]} lightPair the pair of lights to draw output wire to
   * @param {{x:Number, y:Number}} padTL the top-left coordinate of the brass pad pair
   * @param {Number} active which output is active? -1 for none, 0 for output 0, and 1 for output 1
   */
  lightOutputWire(lightPair, padTL, active) {
    let lineWidth = 1
    let multiplierX = [0.8, 0.4]
    let multiplierY = [0.1, 0.9]

    for (let i = 0; i < 2; i++) {
      var { x, y } = this.lightWireJoinCoords(lightPair[i])
      let strokeStyle = i === active ? this.colourHandler.activated : "black"
      let start = { x: padTL[i].x, y: padTL[i].y + multiplierY[i] * this.rowHeight }
      let p1 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: padTL[i].y + multiplierY[i] * this.rowHeight }
      let p2 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: y }
      this.line({ lineWidth, strokeStyle }, start, p1, p2)
    }
  }

  /**
   * Draws the pair of output wires from a brass pad pair to the "disappear" contact point for an algedonode set activator;
   * activated wires are displayed in a different colour.
   * @param {Number} cY centre y coordinate of the algedonode parent
   * @param {{x:Number, y:Number}} padTL the top-left coordinate of the brass pad pair
   * @param {Number} active which output is active? -1 for none, 0 for output 0, and 1 for output 1
   */
  standardOutputWire(cY, padTL, active) {
    let lineWidth = 1

    let multiplierX = [0.8, 0.4]
    let multipliersY = [
      [0.1, 0.3],
      [0.9, -0.3],
    ]

    for (let i = 0; i < 2; i++) {
      let strokeStyle = i === active ? this.colourHandler.activated : "black"
      let start = { x: padTL[i].x, y: padTL[i].y + multipliersY[i][0] * this.rowHeight }
      let p1 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: padTL[i].y + multipliersY[i][0] * this.rowHeight }
      let p2 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: cY - multipliersY[i][1] * this.rowHeight }
      this.line({ lineWidth, strokeStyle }, start, p1, p2)
      this.circle({ lineWidth, strokeStyle }, p2.x, p2.y, 2)
    }
  }

  /**
   * Draw the algedonode set activator - a contact point, a wire coming "into it" from the dial, a wire along the
   * top of the algedonodes, and a wire down to each
   * @param {Number} row the row that the algedonode set activator is activated by
   * @param {Number} startColumn the starting column of the algedonodes to activate
   * @param {Array.<Algedonode>} algedonodes the algedonodes to activate
   * @param {ActivationSource} activationSource what is the activation source for this algedonode set activator
   * @param {Boolean} active is this algedonode set activator active?
   */
  algedonodeSetActivator(row, startColumn, algedonodes, activationSource, active) {
    let { cX, cY } = this.elementCentre(row, startColumn)

    // we want the activator to be above the furthest the top pad can move, start a little to the left of the
    // top output wire, and finish at the midpoint of the final algedonode
    // then other wires come down from it to the top mid of each of the algedonodes

    let connPoint = { x: cX - 2 * this.columnWidth, y: cY + 1.6 * this.rowHeight }

    // draw vertical line at the contact point, "coming" from the dial output direct
    let lineWidth = 1
    let strokeStyleDialOutput = activationSource === ActivationSources.DIAL_OUTPUT ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle: strokeStyleDialOutput }, connPoint, { x: connPoint.x, y: connPoint.y - this.rowHeight / 3.5 })

    // draw contact point
    let styleAlgedonodeSet = active ? this.colourHandler.activated : "black"
    this.circle({ lineWidth, strokeStyle: styleAlgedonodeSet, fillStyle: styleAlgedonodeSet }, connPoint.x, connPoint.y, 2)

    // draw horizontal line from contact point to final algedonode
    let algCoords = algedonodes.map(algedonode => this.elementCentre(algedonode.getRow(), algedonode.getColumn()))
    let lines = []
    let topLineStart = connPoint
    let topLineEnd = { x: algCoords[algCoords.length - 1].cX + this.columnWidth / 2, y: connPoint.y }
    lines.push([topLineStart, topLineEnd])

    // draw vertical lines down to each algedonode from the horizontal
    algCoords.forEach(({ cX, cY }) => {
      let downLineStart = { x: cX + this.columnWidth / 2, y: connPoint.y }
      let downLineEnd = { x: cX + this.columnWidth / 2, y: cY - this.rowHeight / 2 }
      lines.push([downLineStart, downLineEnd])
    })

    this.multiline({ lineWidth, strokeStyle: styleAlgedonodeSet }, lines)
  }

  /**
   * Gives the "drawing centre" of the algedonode component group in row r and column c -
   * cX on the border between the algodonode body and the brass pads, and cY at the
   * centreline of the algedonode body and the brass pads.
   * @param {Number} row row of the component
   * @param {Number} column column of the component
   * @returns {{cX: Number, cY: Number}} the centre position of this (row, column) pair, as described
   */
  elementCentre(row, column) {
    return {
      cX: this.col0X + column * this.columnSpacing,
      cY: this.row0Y + row * this.rowSpacing,
    }
  }

  /**
   * Returns the coordinates at which the wire meets the light from the light contact point
   * @param {Light} light the light to find the join coordinates for
   * @returns {{x: Number, y: Number}} the coordinates of the join point
   */
  lightWireJoinCoords(light) {
    let rowOffset = this.lightTypeToOffset(light.getAorB())
    let column = light.getColumn()
    let { cX, cY } = this.elementCentre(4.25, column)
    let radius = this.rowHeight / 4
    let y = cY + this.rowHeight * rowOffset

    return {
      x: cX - radius,
      y,
    }
  }

  /**
   * Converts a light type to a vertical offset, allowing location within a row
   * @param {LightType} lightType
   * @returns {Number} -0.5 for an A, 0.5 for a B
   *
   */
  lightTypeToOffset(lightType) {
    return lightType === LightTypes.A ? -0.5 : 0.5
  }

  /**
   * Retrieve the contact point for all connections to this light
   * @param {Number} column the column of the light
   * @param {Number} rowOffset the offset of the light (from its A or B designation)
   * @param {LightType} aOrB is the light type A or B?
   * @returns { x: Number, y: Number } the coordinates of the light contact point
   */
  lightConnectionCoords(column, rowOffset, aOrB) {
    let { cX, cY } = this.elementCentre(4.25, column)
    let y = cY + this.rowHeight * rowOffset
    return {
      x: cX - (aOrB === LightTypes.B ? 0.8 : 0.4) * this.columnWidth - this.columnWidth,
      y: y,
    }
  }

  /******************************************************
   * GRAPHICAL HELPER METHODS                           *
   ******************************************************/

  /**
   * @typedef {{x: Number, y: Number}} LineCoords
   */
  /**
   * Draws a series of connected line segments, starting at the given position, and then drawing straight
   * lines to each of the following points in order (so may form polygons, etc)
   * @param {{lineWidth: Number, strokeStyle: String}} param0 the width of the line and its colour / style
   * @param {LineCoords} start start position of the line
   * @param  {...LineCoords} to the subsequent positions to draw lines to
   */
  // start, and each element of to, are objects { x, y }
  line({ lineWidth, strokeStyle }, start, ...to) {
    this.ctx.beginPath()
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeStyle = strokeStyle
    this.ctx.moveTo(start.x, start.y)
    to.forEach(coord => this.ctx.lineTo(coord.x, coord.y))
    this.ctx.stroke()
  }

  /**
   * Draws a number of different sequences of connected line segments, as in {@link line}.
   * @param {{lineWidth: Number, strokeStyle: String}} param0 the width of the line and its colour / style
   * @param {Array.<Array.<LineCoords>>} lines a number of separate lines to draw; each element of the outer array is a line (as array
   * of points), and the line itself starts at the first coordinate of the array and visits each of the subsequent points
   *
   */
  multiline({ lineWidth, strokeStyle }, lines) {
    lines.forEach(l => this.line({ lineWidth, strokeStyle }, l[0], ...l.slice(1, l.length)))
  }

  /**
   * Draw a circle of the given radius, at the given position, using the given styling
   * @param {{lineWidth: Number, strokeStyle: String, fillStyle: String}} param0 the width of the circle outline, its colour / style, and the circle fill colour (may be null for no fill)
   * @param {Number} x the circle's x coordinate
   * @param {Number} y the circle's y coordinate
   * @param {Number} radius the circle's radius
   */
  circle({ lineWidth, strokeStyle, fillStyle }, x, y, radius) {
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeStyle = strokeStyle
    this.ctx.fillStyle = fillStyle
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI)
    if (fillStyle) this.ctx.fill()
    this.ctx.stroke()
  }

  /**
   * Draws a rectangle of the given width and height, with the given top-left coordinate, using the given styling
   * @param {{lineWidth: Number, strokeStyle: String, fillStyle: String}} param0 the width of the rectangle outline, its colour / style, and the rectangle fill colour (may be null for no fill)
   * @param {Number} tlx x coordinate of the top-left of the rectangle
   * @param {Number} tly y coordinate of the top-left of the rectangle
   * @param {Number} w rectangle's width
   * @param {Number} h rectangle's height
   */
  rectangle({ lineWidth, strokeStyle, fillStyle }, tlx, tly, w, h) {
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeStyle = strokeStyle
    this.ctx.fillStyle = fillStyle
    if (fillStyle) this.ctx.fillRect(tlx, tly, w, h)
    if (strokeStyle) this.ctx.strokeRect(tlx, tly, w, h)
  }

  /**
   * Draw the given label centred at the given position using the given font size
   * @param {String} val the label's text
   * @param {Number} x the x coordinate of the label's centre
   * @param {Number} y the y coordinate of the label's centre
   * @param {Number} fontSize the label's font size
   */
  label(val, x, y, fontSize) {
    this.ctx.beginPath()
    this.ctx.font = "" + fontSize + "px Arial"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    this.ctx.fillStyle = "black"
    this.ctx.fillText(val, x, y)
    this.ctx.stroke()
  }
}

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
 * View mode of algedonode hierarchy - metasystem's view, or see everything (x-ray)?
 * @readonly
 * @enum { ViewMode }
 */
const ViewModes = {
    /**
     * @type {ViewMode}
     */
    XRAY: 0,
    /**
     * @type {ViewMode}
     */
    METASYSTEM: 1,
  
    /**
     * Switches between view modes
     * @param {ViewMode} viewMode the view mode to return the opposite of
     * @returns {ViewMode} the opposite view mode
     * @protected
     */
    toggle(viewMode) {
      switch (viewMode) {
        case ViewModes.XRAY:
          return ViewModes.METASYSTEM
        case ViewModes.METASYSTEM:
          return ViewModes.XRAY
        default:
          throw `Metasystem mode toggle failed with input ${viewMode}`
      }
    },
  
    /**
     * @param {ViewMode} viewMode to convert
     * @returns {Boolean} true if METASYSTEM, false if XRAY, corresponding to whether or not an element should be disabled
     * @protected
     */
    toBool(viewMode) {
      return viewMode === ViewModes.METASYSTEM
    },
  }
  
  /**
   * Contains the rendering options for the algedonode hierarchy; specifically, controlling the
   * view mode (metasystem rendering), drawing the hierarchy, and propagating values from dials.
   */
  class RenderingHandler {
    /**
     * @param {AlgedonodeHierarchy} algHierarchy the algedonode hierarchy to control rendering for
     * @param {MetasystemButtonDisabler} buttonsDisabledFn function that, when called with ViewModes.METASYSTEM
     * disables all buttons that the metasystem doesn't need; and when called with ViewModes.XRAY, re-enables those buttons
     * @param {ViewModeElementLabeller} buttonsLabelledFns functions that, when called with ViewMode.METASYSTEM, set
     * the label on buttons to show the metasystem mode is active, and the opposite when called with ViewModes.XRAY
     * @public
     */
    constructor(algHierarchy, buttonsDisabledFn, buttonsLabelledFns) {
      this.viewMode = ViewModes.XRAY
      this.algHierarchy = algHierarchy
      this.buttonsDisabledFn = buttonsDisabledFn
      this.buttonsLabelledFns = buttonsLabelledFns
    }
  
    /**
    * Flips between metasystem and xray views of the algedonode hierarchy, running the functions passed in at construction
    * to handle various UI features
    * @public
    */
    toggleViewMode() {
      this.viewMode = ViewModes.toggle(this.viewMode)
      this.buttonsDisabledFn(this.viewMode)
      this.buttonsLabelledFns.forEach(label => label(this.viewMode))
    }
  
    /**
     * Clear the algedonode hierarchy rendering, and re-render using the current view mode.
     * @public
     */
    newRender() {
      this.algHierarchy.clearRenderer()
      switch (this.viewMode) {
        case ViewModes.METASYSTEM:
          this.algHierarchy.renderMetasystem()
          break
        case ViewModes.XRAY:
          this.algHierarchy.render()
          break
      }
    }
  
    /**
     * Clear the currently activated elements in the algedonode hierarchy, propagate the dial
     * values, activating appropriate elements to turn another light on, then re-render the hierarchy.
     * @public
     */
    rerenderAndPropagate() {
      this.algHierarchy.clear()
      this.algHierarchy.propagateDialValues()
      this.newRender()
    }
  }
  
  
  // Hack to get ViewMode to show up in the documentation as a type
  /**
   * @class
   */
  function ViewMode() {}
  
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
 * @todo clear() should clear each component exactly once, not multiple times!
 */
class AlgedonodeHierarchy {
  /**
   * @param {AlgedonodeHierarchyRenderer} renderer renders the algedonode hierarchy to a canvas
   */
  constructor(renderer) {
    this.renderer = renderer
    /**
     * @type {Array.<Dial>}
     */
    this.dials = []
    /**
     * @type {Array.<Array.<Algedonode>>}
     */
    this.rows = []
    /**
     * @type {Array.<Light>}
     */
    this.lights = []
    /**
     * @type {Array.<Strip>}
     */
    this.strips = []
    /**
     * @type {Array.<AlgedonodeSetActivator>}
     */
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
    /**
     * @type {Array.<Contact>}
     */
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
    if (this.row !== 0 && this.active) {
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
 * indicates a 1 output and negative a 0; the centreline of the pad pair is at 0, the midpoint
 * of the algedonode
 */
class BrassPadPair {
  constructor() {
    // renderer uses this to determine which of the two halves to outline
    // -1 is none, 0 is top, 1 is bottom; corresponds to index of active output
    this.active = -1
    this.offset = 0 // brass pad centreline is midpoint of algedonode
    /**
     * @type {[AlgedonodeSetActivator, AlgedonodeSetActivator] | [Light, Light]}
     */
    this.outputs = null
  }

  /**
   * Send this brass pad pair's outputs to the given pair of outputs, whether light or algedonode set activator;
   * 0 output activates index 0, and 1 output activates index 1
   * @param {[AlgedonodeSetActivator, AlgedonodeSetActivator] | [Light, Light]} outputs either a pair of lights or of algedonode
   * set activators, where the 0 index element is activated by an algedonode / pad 0 output and the 1 index element by a 1 output.
   * @protected
   */
  setOutput(outputs) {
    this.outputs = outputs
  }

  /**
   * Activates the brass pad which is underneath the activated contact.
   * @param {Number} contactPosition the position of the activated contact, in (-0.5, 0.5)
   * @protected
   */
  activate(contactPosition) {
    // contact position is fixed, in (-0.5,0.5); we reduce this pad pair's
    // offset into the space [-0.5, 0.5] by dividing by 2, since they're both centred on 0
    if (contactPosition >= this.offset / 2) {
      this.active = 1
      this.outputs[1].activate(ActivationSources.ALGEDONODE)
    } else {
      this.active = 0
      this.outputs[0].activate(ActivationSources.ALGEDONODE)
    }
  }

  /**
   * Deactivates both brass pads and clears any active output element, whether light or algedonode set activator.
   * @protected
   */
  clear() {
    this.active = -1
    this.outputs.forEach(output => output.clear())
  }

  /**
   * Set the pad pair to the given vertical offset.
   * @param {Number} offset number in [-1, 1], setting the position offset of this pad from centreline of algedonode
   * @protected
   */
  setOffset(offset) {
    this.offset = offset
  }

  /**
   * Render this brass pad pair and outgoing wires according to whether its output is to a light or to
   * an algedonode set activator.
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @param {Number} row parent algedonode's row index, from 0 to 7 inclusive
   * @param {Number} column parent algedonode's column index, from 0 to  inclusive
   * @protected
   */
  render(renderer, row, column) {
    if (this.outputIsLight()) {
      renderer.brassPadPairLightOutput(row, column, this.active, this.offset, this.outputs)
    } else {
      renderer.brassPadPairNormalOutput(row, column, this.active, this.offset)
    }
  }
  /**
   * @returns {Boolean} are this brass pad pair's outputs connected to a pair of lights?
   * @protected
   */
  outputIsLight() {
    return this.outputs[0].isLight()
  }
}

/**
 * Controls activation of a partition of algedonodes in a row. May be activated by
 * an algedonode's brass pad output or directly by dial output
 */
class AlgedonodeSetActivator {
  /**
   * @param {Array.<Algedonode>} algedonodes the algedonodes in the partition to be activated when this algedonode set activator is activated
   * @param {Number} startColumn the start column of the algedonode partition to activate
   * @param {Number} endColumn the last column of the algedonode partition to activate
   * @param {Number} row the row this algedonode set activator is controlled by
   * @param {Algedonode} representativePartitionParent an arbitrary algedonode in the partition of algedonodes controlling this activator
   */
  constructor(algedonodes, startColumn, endColumn, row, representativePartitionParent) {
    this.algedonodes = algedonodes
    this.active = false
    this.startColumn = startColumn
    this.row = row
    this.endColumn = endColumn
    this.activationSource = ActivationSources.NONE
    this.representativePartitionParent = representativePartitionParent
  }

  /**
   * Deactivate this algedonode set activator and all the algedonodes it is linked to.
   * @protected
   * @todo this clear() will end up triggering a large number of calls as it is at the moment, need to call each clear() once!
   */
  clear() {
    if (this.active) {
      this.active = false
      this.algedonodes.forEach(algedonode => algedonode.clear())
      this.activationSource = ActivationSources.NONE
    }
  }

  /**
   * Activate this activator, although if the activation is coming from a dial output, ensure the partition in the above row is also active
   * @param {ActivationSource} source is this activation coming from a dial output directly or via an algedonode contact?
   * @protected
   */
  activate(source) {
    // Need a bit of logic here - a dial output will only activate this
    // group if the parent group of algedonodes is currently activated
    if ((source === ActivationSources.DIAL_OUTPUT && this.representativePartitionParent.isActive()) || source === ActivationSources.ALGEDONODE) {
      this.active = true
      this.activationSource = source
      this.algedonodes.forEach(algedonode => algedonode.activate())
    }
  }

  /**
   * This is not a light (used to see which renderer is called for the brass pad outputs)
   * @protected
   */
  isLight() {
    return false
  }

  /**
   * Render the wires and contacts for this activator
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @protected
   */
  render(renderer) {
    renderer.algedonodeSetActivator(this.row, this.startColumn, this.algedonodes, this.activationSource, this.active)
  }
}

/**
 * A dial which provides part of the hierarchy's input state. Outputs 1-8 go to the algedonodes in that row, and 9 and 10
 * directly activate the next row's partitions or lights
 */
class Dial {
  /**
   * @param {Number} row row of this dial, 0 to 3 inclusive
   */
  constructor(row) {
    this.row = row
    /**
     * @type {Array.<DialOutput>}
     */
    this.dialOutputs = []
    for (let i = 0; i < 10; i++) {
      this.dialOutputs[i] = new DialOutput(i + 1) // we're using 1-indexed value!
    }
    this.value = 1
  }

  /**
   * Set dial to given value
   * @param {Number} value integer between 1 and 10 inclusive
   * @protected
   */
  setDialValue(value) {
    this.value = value
  }

  /**
   * Propagate this dial's output to the relevant algedonode contact or algedonode set activator,
   * causing the activation of algedonode(s) in the following row.
   * @protected
   */
  propagateValue() {
    this.dialOutputs[this.value - 1].activate()
  }

  /**
   * @returns {Number} the current value of this dial
   * @protected
   */
  getDialValue() {
    return this.value
  }

  /**
   * @returns {Array.<DialOutput>} the 8 dial outputs to be linked to algedonode contacts
   * @protected
   */
  getDialOutputsForAlgedonodes() {
    return this.dialOutputs.slice(0, 8)
  }

  /**
   * Render this dial and all its outputs
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @protected
   */
  render(renderer) {
    for (let i = 0; i < 10; i++) {
      this.dialOutputs[i].render(renderer, this.row, i)
    }

    renderer.dial(this.row, this.value)
  }

  /**
   * Deactivate all the dial output of this dial
   * @protected
   */
  clear() {
    this.dialOutputs.forEach(dialOutput => {
      dialOutput.clear()
    })
  }

  /**
   * Set up links between outputs 9 and 10 of the dial and the corresponding algedonode set activators or lights
   * @param {AlgedonodeSetActivator | Light} output9 algedonode set activator or light to activate on a 9
   * @param {AlgedonodeSetActivator | Light} output10 algedonode set activator or light to activate on a 10
   * @protected
   */
  link9and10(output9, output10) {
    this.dialOutputs[8].link(output9)
    this.dialOutputs[9].link(output10)
  }
}

/**
 * The output from a dial, linked to an algedonode contact or am algedonode set activator
 */
class DialOutput {
  /**
   *
   * @param {Number} value the dial value that this output corresponds to and is activated by
   */
  constructor(value) {
    /**
     * the contacts / algedonode set activator / light activated by this dial value
     * @type {Array.<Contact | AlgedonodeSetActivator | Light>}
     */
    this.activatedComponents = []
    this.active = false
    this.value = value
  }

  /**
   * Activate this dial output, activating all connected algedonode contacts
   * @protected
   */
  activate() {
    this.active = true
    this.activatedComponents.forEach(contact => {
      contact.activate(this.value < 9 ? ActivationSources.ALGEDONODE : ActivationSources.DIAL_OUTPUT)
    })
  }

  /**
   * Deactivate this dial output and its corresponding contacts
   * @protected
   */
  clear() {
    if (this.active) {
      this.active = false
      this.activatedComponents.forEach(component => component.clear())
    }
  }

  /**
   * Creates a link between this dial output and a component activated by it
   * @param {Contact | AlgedonodeSetActivator | Light} component a component to be activated by this dial output
   * @protected
   */
  link(component) {
    this.activatedComponents.push(component)
  }

  /**
   * Render this dial output
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @param {Number} row overall row index that this dial output is in, 0-3 inclusive
   * @param {Number} outputNum the dial output's index within the dial's outputs, 0-9 inclusive
   * @protected
   */
  render(renderer, row, outputNum) {
    renderer.dialOutput(row, this.active, outputNum)
  }
}

/**
 * Strip which the brass pad pairs rest on and are moved by
 */
class Strip {
  /**
   * @param {Array.<BrassPadPair>} brassPadPairs the brass pad pairs which will move when this strip does
   * @param {Number} column the column of the hierarchy this strip belongs to
   */
  constructor(brassPadPairs, column) {
    this.brassPadPairs = brassPadPairs
    this.offset = 0 // will be controlled by sliders
    this.column = column
  }

  /**
   * Render the strip
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   */
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

/**
 * Light output, has a type of A or B corresponding to the two light rows of the hierarchy,
 * where an A light is triggered by a 1 output of the above algedonode, and the B by the 0 output.
 */
class Light {
  /**
   *
   * @param {LightType} aOrB is this light is light row A or light row B?
   * @param {Number} column the column this light is rendered under
   */
  constructor(aOrB, column) {
    this.aOrB = aOrB
    this.active = false
    this.column = column
    this.parent = null
    this.activationSource = ActivationSources.NONE
  }
  /**
   * Sets the algedonode which controls this light
   * @param {Algedonode} parent the algedonode controlling this light
   * @protected
   */
  setParent(parent) {
    this.parent = parent
  }

  /**
   * @returns {Number} the column this light is in
   * @public
   */
  getColumn() {
    return this.column
  }

  /**
   * Activate this light, from some activation source - direct from a dial output, or from an algedonode
   * @param {ActivationSource} source the activation source for this light
   * @protected
   */
  activate(source) {
    if ((source === ActivationSources.DIAL_OUTPUT && this.parent.isActive()) || source === ActivationSources.ALGEDONODE) {
      this.active = true
      this.activationSource = source
    }
  }

  /**
   * Deactivates this light
   * @protected
   */
  clear() {
    this.active = false
    this.activationSource = ActivationSources.NONE
  }

  /**
   * Render this light with all its connection wires
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @protected
   */
  render(renderer) {
    renderer.light(this, this.column, this.aOrB, this.active, this.activationSource)
  }

  /**
   * Render this light without any connection wires (metasystem viewpoint)
   * @param {AlgedonodeHierarchyRenderer} renderer renderer to use
   * @protected
   */
  renderAsMetaSystem(renderer) {
    renderer.metasystemLight(this.column, this.aOrB, this.active)
  }

  /**
   * This is a light (used to see which renderer is called for the brass pad outputs)
   * @protected
   */
  isLight() {
    return true
  }

  /**
   * @returns {Boolean} is this light on at the moment?
   * @public
   */
  isActive() {
    return this.active
  }

  /**
   * Get the light's column and its light row (of A or B)
   * @returns {{lightColumn: Number, aOrB: LightType}} a record of this light's position
   * @protected
   */
  getDetails() {
    return {
      lightColumn: this.column,
      aOrB: this.aOrB,
    }
  }

  /**
   * @returns {LightType} is this light in light row A or B?
   * @public
   */
  getAorB() {
    return this.aOrB
  }

  /**
   * @returns {Number} the column of this light, 0-7 inclusive
   * @public
   */
  getColumn() {
    return this.column
  }
}

// Hacks to get LightType and ActivationSource represented as types for enums
/**
 * @class
 */
function LightType() {}
/**
 * @class
 */
function ActivationSource() {}

/**
 * Stores a limited amount of data, discarding the oldest data when the limit is exceeded.
 *
 * Data is a {@link StateResultPair}
 */
class SmallDataStore {
  /**
   * @param {Number} maxSize the maximum number of elements to store
   */
  constructor(maxSize) {
    // Double-linked list queue
    this.headMark = { prev: null } // head and tail markers
    this.tailMark = { next: null }
    this.length = 0
    this.maxSize = maxSize

    this.headMark.prev = this.tailMark
    this.tailMark.next = this.headMark

    // Last timestep lookup for a state
    this.timeSteps = new Array(10000)

    // a timestep is triggered by an enqueue, and keeps track of how old the data
    // for a given state is.
    // just going to assume that no-one runs it until it hits overflow, that'll be fine
    this.timeStep = 0
  }

  /**
   * Adds the given state-result pair to the data store, removing the oldest such pair
   * if the maximum data store size would be exceeded.
   *
   * @param {StateResultPair} stateResultPair the state-result pair to add
   * @returns {StateResultPair} If a state-result pair was dequeued and nothing newer was in the store for that
   * state, returns a {@link StateResultPair}, otherwise returns null.
   * @public
   */
  enqueue(stateResultPair) {
    let {
      state,
      result: { lightColumn, aOrB },
    } = stateResultPair
    let s = this.statesToInteger(state)

    // overwrite old timestep, we've got new data for this state
    this.timeSteps[s] = this.timeStep

    let prevHead = this.headMark.prev
    let newItem = {
      prev: prevHead,
      next: this.headMark,
      state,
      lightColumn,
      aOrB,
    }
    this.headMark.prev = newItem
    prevHead.next = newItem

    this.length++
    this.timeStep++
    if (this.length > this.maxSize) {
      return this.dequeue()
    }
    return null
  }

  /**
   * Removes the oldest state-result pair.
   *
   * @returns {StateResultPair} If a state-result pair was removed and nothing newer was in the store for that
   * state (i.e. the graphic will need updating), returns a {@link StateResultPair}, otherwise returns null.
   * @public
   */
  dequeue() {
    if (this.tailMark.next === this.headMark) return null // nothing to dequeue

    let { next, state, lightColumn, aOrB } = this.tailMark.next

    this.tailMark.next = next
    next.prev = this.tailMark

    this.length--

    let s = this.statesToInteger(state)
    // compare the timeSteps, there might be a newer timestep somewhere in the list for this state
    // in which case we don't want to remove it from the plot, just from the data store
    // this might be off by one, but doesn't matter too much as long as it's in the right direction!
    if (this.timeStep - this.timeSteps[s] >= this.maxSize) {
      return { state, result: { lightColumn, aOrB } }
    } else {
      return null
    }
  }

  /**
   * Remove a given number of items from the data store, oldest first.
   *
   * @param {Number} toRemove number of removals to perform
   * @returns {Array.<StateResultPair>} an array (possibly empty) of the actionable removals (ones that require a graphic update)
   * that were required to reduce the number of items stored in the data store by the required number.
   * @protected
   */
  multiDequeue(toRemove) {
    if (toRemove <= 0) return []
    // an array will map on a null, but not on an undefined...
    let ret = new Array(toRemove)
      .fill(null)
      .map(_ => this.dequeue())
      .filter(v => v !== null) // for shits and giggles
    return ret
  }

  /**
   * Sets the data store to contain at most the given number of elements, returning those removed in the process (oldest first)
   *
   * @param {Number} newMaxSize the new maximum size of the data store
   * @returns {Array.<StateResultPair>} an array (possibly empty) of the actionable removals (ones that require a graphic update)
   * that were required to reduce the number of items stored in the data store until the data store was of the given size.
   * @public
   */
  resize(newMaxSize) {
    if (newMaxSize >= this.maxSize) {
      this.maxSize = newMaxSize
      return null
    } else {
      this.maxSize = newMaxSize
      return this.multiDequeue(this.length - this.maxSize)
    }
  }
  /**
   * Completely clears the stored data, maintaining the previous maximum size.
   * @public
   */
  clear() {
    let restoreMaxSize = this.maxSize
    this.resize(0)
    this.resize(restoreMaxSize)
  }

  /**
   * @returns {Array.<StateResultPair>} the current contents of the data store
   * @public
   */
  getStoredResults() {
    let curr = this.headMark.prev
    let storedResults = []
    while (curr !== this.tailMark) {
      storedResults.push({ state: curr.state, result: { lightColumn: curr.lightColumn, aOrB: curr.aOrB } })
      curr = curr.prev
    }
    return storedResults
  }

  /**
   * @param {DialStates} states an array of [1-10, 1-10, 1-10, 1-10] representing a dial state
   * @return the corresponding integer in [0, 9999]
   * @private
   */
  statesToInteger(states) {
    return 1000 * (states[0] - 1) + 100 * (states[1] - 1) + 10 * (states[2] - 1) + (states[3] - 1)
  }
}

/**
 * Indicates timed change are happening to dial states - dial states change sequentially,
 * randomly, or not at all (unless user changes states directly).
 * @enum {PlayMode}
 * @todo Maybe add a pause mode - might be useful for resuming mid-sequence
 */
const PlayModes = {
  /**
   * @type {PlayMode}
   */
  STOP: "stop",
  /**
   * @type {PlayMode}
   */
  SEQUENCE: "sequence",
  /**
   * @type {PlayMode}
   */
  RANDOM: "random",
}

/**
 * Deals with timed state progression - random, sequential, and stopping;
 * also the speed of state progression.
 */
class PlayModeHandler {
  /**
   * @param {DialSetterCallback} dialSetterFn sets the given dial to the given state in 1-10
   * @param {RerenderAndPlotCallback} rerenderFn when called, clears the dial settings, propagates a new state, re-renders, then plots the result
   * @public
   */
  constructor(dialSetterFn, rerenderFn) {
    this.playInterval = null // stores the interval cancellation handle
    this.playSpeed = 50 // speed measured in 1-100
    this.playIndex = 0 // position in the state sequence (1,1,1,1)-(10,10,10,10)
    this.playMode = PlayModes.STOP
    /**
     * @type {DialStates}
     */
    this.stateSequence = InitialValues.DIAL_STATES // in-order dial states (1,1,1,1)-(10,10,10,10)
    this.rerenderFn = rerenderFn
    this.dialSetterFn = dialSetterFn
  }

  /**
   * @param {Number} n
   * @returns {Number} random integer in 1,...,n inclusive
   * @protected
   */
  rnd(n) {
    return Math.floor(Math.random() * n) + 1
  }
  /**
   * @returns {DialStates} a random dial state
   * @protected
   */
  randomState() {
    let rState = []
    for (let i = 0; i < 4; i++) {
      let rn = rnd(10)
      rState[i] = rn
    }
    return rState
  }

  /**
   * @returns {Number} the millisecond delay conversion of the currently set speed for state transition
   * @protected
   */
  createDelayFromSpeed() {
    // Speed is 1-100
    // We want speed 100 = 0ms delay
    //         speed 1 = 1000 ms delay
    // We also want -x^2 behaviour, or something like that - polynomial, at least
    // go with 1000 * (1 - x^1.5), with x in [0, 1]
    let x = this.playSpeed / 100
    return 1000 * (1 - Math.pow(x, 1.5))
  }

  /**
   * Stops the timed state transition if playing
   * @public
   */
  stop() {
    if (this.playInterval) {
      window.clearInterval(this.playInterval)
    }
    this.playMode = PlayModes.STOP
  }

  /**
   * Sets the dials to the given states, propagates the values through the hierarchy, re-renders, and plots the result
   * @param {DialStates} states the dial states to set the dials to
   * @protected
   */
  setDialsDirect(states) {
    for (let i = 0; i < 4; i++) {
      let n = states[i]
      this.dialSetterFn(i, n)
    }
    this.rerenderFn()
  }

  /**
   * Sets the play mode to sequential, starting from the beginning (state [0,0,0,0])
   * @public
   */
  playSequence() {
    this.stop()
    this.playMode = PlayModes.SEQUENCE
    this.playIndex = 0
    this.playInterval = window.setInterval(() => {
      if (this.playIndex >= this.stateSequence.length) this.playIndex = 0
      this.setDialsDirect(this.stateSequence[this.playIndex++])
    }, this.createDelayFromSpeed())
  }

  /**
   * Sets the play mode to sequential, resuming from where it left off (if still playing)
   * using a new speed
   * @protected
   */
  newSequenceSpeed() {
    this.stop()
    this.playMode = PlayModes.SEQUENCE
    this.playInterval = window.setInterval(() => {
      if (this.playIndex >= this.stateSequence.length) this.playIndex = 0
      this.setDialsDirect(this.stateSequence[this.playIndex++])
    }, this.createDelayFromSpeed())
  }

  /**
   * Sets play mode to random
   * @public
   */
  playRandom() {
    this.stop()
    this.playMode = PlayModes.RANDOM
    this.playInterval = window.setInterval(() => {
      let rs = this.randomState()
      this.setDialsDirect(rs)
    }, this.createDelayFromSpeed())
  }

  /**
   * Sets play mode to random using a new speed
   * @protected
   */
  newRandomSpeed() {
    this.playRandom() // don't need to do anything else
  }

  /**
   * Change playback speed to new value, start playing at that speed in the
   * play mode currently set
   * @param {Number} newSpeed new speed to set playback to, in range 1 to 100 inclusive
   * @public
   */
  setNewPlaySpeed(newSpeed) {
    this.playSpeed = newSpeed
    switch (this.playMode) {
      case PlayModes.STOP:
        break
      case PlayModes.SEQUENCE:
        this.newSequenceSpeed()
        break
      case PlayModes.RANDOM:
        this.newRandomSpeed()
        break
    }
  }
}

/**
 * hack to get PlayMode as a type for documentation
 * @class
 */
function PlayMode() {}

/**
 * A 100x100 grid corresponding to the 10000 possible dial states, where state-result pairs are
 * plotted by colour.
 *
 * X-axis corresponds to [1-10,1-10,_,_], Y-axis to [_,_,1-10,1-10], so a point at
 * x=ab, y=cd represents dial state [a,b,c,d]
 *
 * New state-result pairs can be entered one at a time, or as a sequence.
 *
 * State-result pairs are removed by erasing - this plot does not store its own data.
 */
class LimitedStatePlot {
  constructor(context, colourHandler) {
    this.ctx = context
    this.colourHandler = colourHandler
    this.w = this.ctx.canvas.width
    this.h = this.ctx.canvas.height

    // drawable area of the canvas
    this.drawableLeft = this.w * 0.1
    this.drawableBottom = this.h * 0.9

    // turns a 0-99 into a coordinate fitting within the drawable area
    this.coordOffsetMultX = (0.9 * this.w) / 100
    this.coordOffsetMultY = (0.9 * this.h) / 100
  }

  /**
   * Adds and removes points to and from the plot where given by the new and removed state result pairs respectively.
   * @param {StateResultPair} newStateResultPair state result pair to add to the state plot; null if none
   * @param {StateResultPair} removedStateResultPair state result pair to remove from the state plot; null if none
   * @public
   */
  plotStatePoint(newPoint, removedPoint) {
    if (removedPoint) {
      let {
        state,
        result: { lightColumn, aOrB },
      } = removedPoint
      let { x, y } = this.getXY(state)
      this.erasePoint(x, y)
    }

    if (newPoint) {
      let {
        state,
        result: { lightColumn, aOrB },
      } = newPoint
      let { x, y } = this.getXY(state)
      let colour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
      this.drawPoint(x, y, colour)
    }

    this.drawAxes(false) // we need this! because of the rectangle erasing hack, it starts eating away at the axes
  }

  /**
   * Draw the point with the given colour at the given plot coordinate, of standard width.
   * @param {Number} x x coordinate of the point to plot, in 0-99
   * @param {Number} y y coordinate of the point to plot, in 0-99
   * @param {String} colour colour for the point
   * @protected
   */
  drawPoint(x, y, colour) {
    this.drawPointWithColour(x, y, 0, colour)
  }

  /**
   * Erases at the given plot coordinate, using a width slightly bigger than the standard point.
   * @param {Number} x x coordinate of the point to erase, in 0-99
   * @param {Number} y y coordinate of the point to erase, in 0-99
   * @protected
   */
  erasePoint(x, y) {
    // 1.2 width multiplier is a hack: it's not clearing the rectangles fully, no idea why, so we need to erase around them
    this.drawPointWithColour(x, y, 1.2, "white")
  }

  /**
   * Draw the point with the given colour centred at the given plot coordinate, with optional
   * added size.
   * @param {Number} x x coordinate of the point to plot, in 0-99
   * @param {Number} y y coordinate of the point to plot, in 0-99
   * @param {Number} addedSize additional size to be added onto the point in both dimensions
   * @param {String} colour colour for the point
   * @protected
   */
  drawPointWithColour(x, y, addedSize, colour) {
    this.ctx.beginPath()
    this.ctx.fillStyle = colour
    let adjustedX = this.drawableLeft + x * this.coordOffsetMultX
    let adjustedY = this.drawableBottom - (y + 1) * this.coordOffsetMultY
    this.ctx.fillRect(adjustedX - addedSize / 2, adjustedY - addedSize / 2, this.coordOffsetMultX + addedSize, this.coordOffsetMultY + addedSize)
    this.ctx.stroke()
  }

  /**
   * Convert a dial state to an (x,y)-coordinate pair on the grid
   * @param {DialStates} states dial states to convert
   * @returns {{x: Number, y: Number}} converted coordinate points for this dial state, both in 0-99
   * @protected
   */
  getXY(states) {
    let x = 10 * (states[0] - 1) + (states[1] - 1)
    let y = 10 * (states[2] - 1) + (states[3] - 1)
    return { x, y }
  }

  /**
   * Draw the axes and labels.
   * @param {String} drawText
   * @public
   */
  drawAxes(drawText) {
    this.ctx.beginPath()
    this.ctx.strokeStyle = "black"
    this.ctx.moveTo(this.drawableLeft - 1, 0)
    this.ctx.lineTo(this.drawableLeft - 1, this.drawableBottom + 1)
    this.ctx.lineTo(this.w, this.drawableBottom + 1)
    this.ctx.stroke()
    if (drawText) {
      this.ctx.beginPath()
      // do we draw the text? we need to redraw the axes after erasing a point, but we don't need to redraw the text
      this.ctx.fillStyle = "black"
      this.ctx.textAlign = "left"
      this.ctx.textBaseline = "bottom"
      this.ctx.fillText("_ _ 1 1", 0, this.drawableBottom, this.drawableLeft * 0.95)
      this.ctx.textBaseline = "top"
      this.ctx.fillText("_ _ 10 10", 0, 0, this.drawableLeft * 0.95)
      this.ctx.fillText("1 1 _ _", this.drawableLeft, this.drawableBottom * 1.01)
      this.ctx.textAlign = "right"
      this.ctx.fillText("10 10 _ _", this.w, this.drawableBottom * 1.01)
      this.ctx.stroke()
    }
  }

  /**
   * Clears the state plot, and plots all the given state-result pairs.
   * @param {Array.<StateResultPair>} individualResults the state-result pairs to plot
   * @public
   */
  fullPlot(individualResults) {
    this.clearGraphic()
    individualResults
      .map(({ state, result }) => {
        let { x, y } = this.getXY(state)
        return { x, y, result }
      })
      .forEach(({ x, y, result }) => {
        let colour = result.aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
        this.drawPoint(x, y, colour)
      })
  }

  /**
   * Clear state plot.
   * @public
   */
  clearGraphic() {
    this.ctx.clearRect(0, 0, this.w, this.h)
    this.drawAxes(true)
  }
}

/**
 * When called with newStoreSpace, sets the label of the data store space control to the
 * appropriate value.
 * @callback DataPointLabelSetterCallback
 * @param {Number} newStoreSpace amount of store space to pass onto the label
 * @returns {void}
 */

/**
 * @typedef {Array.<{aCount: Number, bCount: Number}>} CountResults
 */

/**
 * Handles coordination of data store, bar chart, and state plot, re-rendering
 * where necessary, and storing data generated on toggling to full plot. Also
 * memoizes the full plot.
 */
class DataHandler {
  /**
   * Construct a data handler for the given store, chart, and plot; also requires a callback to
   * rename the current data point count label given the current store size.
   * @param {SmallDataStore} dataStore
   * @param {LimitedBarChart} barChart
   * @param {LimitedStatePlot} statePlot
   * @param {DataPointLabelSetterCallback} dataPointLabelSetter
   */
  constructor(dataStore, barChart, statePlot, dataPointLabelSetter) {
    this.sliderOrContactsChanged = true // we want to force the full plot to be (re)-computed when first run
    this.dataStore = dataStore
    this.barChart = barChart
    this.statePlot = statePlot
    this.dataPointLabelSetter = dataPointLabelSetter // function: StoreSpace -> String

    this.fullPlotHandler = new FullPlotHandler(statePlot, barChart)
    this.partialPlotHandler = new PartialPlotHandler(statePlot, barChart, dataStore)
    this.currentGraphicHandler = this.partialPlotHandler
  }

  /**
   * Used to indicate a colour change - the current data needs rerendering using the new colour,
   * but nothing else should change.
   * @public
   */
  colourChange() {
    // Re-render what's already there, no need to reset or change the data
    this.currentGraphicHandler.render(this)
  }

  /**
   * Request a complete scan of the algedonode hierarchy via simulating all the states and extracting the results for each;
   * render these complete results to both bar chart and state plot. If the hierarchy settings haven't changed enough to cause
   * differences in results, reuse the previous results. Also, cache any current random / sequential state data for resumption
   * after the full plot.
   * @param {AlgedonodeHierarchy} algHierarchy the algedonode hierarchy to plot
   * @public
   */
  requestCompleteScanAndRender(algHierarchy) {
    if (this.currentGraphicHandler === this.partialPlotHandler) {
      let { storedIndividualResults, counts } = this.getStoredResultsAndCounts()
      this.partialPlotHandler.save(storedIndividualResults, counts)
      this.currentGraphicHandler = this.fullPlotHandler
    }

    if (this.sliderOrContactsChanged || !this.fullPlotHandler.hasData()) {
      let individualResults = algHierarchy.fullSimulate()
      let counts = this.computeCountsFromResults(individualResults)
      this.fullPlotHandler.save(individualResults, counts)
    }

    this.fullPlotHandler.render()
    this.sliderOrContactsChanged = false
  }

  /**
   * Indicate to the data handler that there has been a change that will require re-running the simulation of all states on
   * the hierarchy.
   * @public
   */
  sliderOrContactsChange() {
    this.sliderOrContactsChanged = true
  }

  /**
   * Draw the axes on both bar chart and state plot
   * @public
   */
  drawAxes() {
    this.statePlot.drawAxes(true)
    this.barChart.drawAxes()
  }

  /**
   * Clears the bar chart, the state plot, and the data store
   * @public
   */
  clearDataGraphicAndData() {
    this.dataStore.clear()
    this.statePlot.clearGraphic() // no data to clear
    this.barChart.clearAll()
    this.fullPlotHandler.clearData()
    this.partialPlotHandler.clearData()
  }

  /**
   * Clear the bar chart and state plot
   * @protected
   */
  clearDataGraphic() {
    this.statePlot.clearGraphic()
    this.barChart.clearGraphic()
  }

  /**
   * Given a sequence of mappings from dial states to the resulting algedonode hierarchy output, count the
   * number of states mapping to each light in each column.
   *
   * @param { Array.<StateResultPair> } individualResults a set of individual results to compute the counts for
   *
   * @returns { CountResults } array containing respective counts for number of
   * lights on of each colour (A or B) in each column of the hierarchy over the given states
   * @protected
   */
  computeCountsFromResults(individualResults) {
    return individualResults.reduce((acc, { result: { lightColumn, aOrB } }) => {
      if (!acc[lightColumn]) {
        acc[lightColumn] = { aCount: 0, bCount: 0 }
      }
      let { aCount, bCount } = acc[lightColumn]
      acc[lightColumn] = { aCount: aOrB === LightTypes.A ? aCount + 1 : aCount, bCount: aOrB === LightTypes.B ? bCount + 1 : bCount }
      return acc
    }, [])
  }

  /**
   * @returns { { storedIndividualResults: Array.<StateResultPair>, counts: CountResults }} an object containing both the
   * individual results currently stored in the data store, and the counts coming from them
   * @protected
   */
  getStoredResultsAndCounts() {
    let storedIndividualResults = this.dataStore.getStoredResults()
    let counts = this.computeCountsFromResults(storedIndividualResults)
    return { storedIndividualResults, counts }
  }

  /**
   * Converts a slider value in 1-100 to a data store size in 100-20000 using a quadratic function for rapid scaling
   * @param {Number} sliderVal slider value in 1-100 to convert
   * @returns {Number} the value mapped to by sliderVal, between 100 and 20000, based on a quadratic
   * @protected
   */
  datapointSliderToStoreSpace(sliderVal) {
    // minimum of 100, max of 20000 seems reasonable
    // use a low-order polynomial: x^2 on (0, 1]?
    let x = sliderVal / 100 // sliderVal in 1-100
    return Math.floor(100 + 19900 * Math.pow(x, 2))
  }

  /**
   * Inverse of {@link datapointSliderToStoreSpace}
   * @param {Number} storeSpace a data store size
   * @returns {Number} the slider value corresponding to this data store size
   * @protected
   */
  storeSpaceToDatapointSlider(storeSpace) {
    return Math.floor(100 * Math.sqrt((storeSpace - 100) / 19900))
  }

  /**
   * Resizes the data store to the given size while preserving values where possible; a size
   * increase retains all old data, whereas a size decrease discards data from oldest first
   * until the correct size is reached.
   *
   * Also, if the last data graphic operation wasn't full plot, re-renders the data graphics
   * with the results of the resize.
   *
   * @param {Number} sliderValue value of slider in 1-100 to be turned into a data store size
   * @public
   */
  resizeData(sliderValue) {
    let newStoreSpace = this.datapointSliderToStoreSpace(sliderValue)
    this.dataPointLabelSetter(newStoreSpace)
    let removed = this.dataStore.resize(newStoreSpace)
    if (removed && this.currentGraphicHandler === this.partialPlotHandler) {
      removed.forEach(pointRemoved => {
        this.statePlot.plotStatePoint(null, pointRemoved)
        this.barChart.changeBars(null, pointRemoved)
      })
    }
  }

  /**
   * Renders the current algedonode state and result to the data graphics. If last data graphic action taken
   * was a full plot, switch back to displaying the partial plot using previously-generated data.
   * @param {AlgedonodeHierarchy} algHierarchy the algedonode hierarchy to retrieve the new point data from
   * @public
   */
  displayNewPoint(algHierarchy) {
    if (this.currentGraphicHandler === this.fullPlotHandler) {
      this.clearDataGraphic()
      this.partialPlotHandler.restorePlot(this)
      this.currentGraphicHandler = this.partialPlotHandler
    }

    this.partialPlotHandler.plotNewPoint(algHierarchy, this.dataStore)
  }
}

/**
 * The DataHandler switches to this to render the full plot and cache the results;
 * we want to avoid expensive recomputation.
 */
class FullPlotHandler {
  /**
   * @param {LimitedStatePlot} statePlot associated state plot
   * @param {LimitedBarChart} barChart associated bar chart
   * @protected
   */
  constructor(statePlot, barChart) {
    this.statePlot = statePlot
    this.barChart = barChart
    this.currentIndividualResults = null
    this.currentCounts = null
  }

  /**
   * Saves the given individual results and counts for re-rendering next time full plot is selected,
   * assuming no changes are made to sliders or contacts
   * @param {Array.<StateResultPair>} individualResults individual results to save
   * @param {CountResults} counts counts to save
   * @protected
   */
  save(individualResults, counts) {
    this.currentIndividualResults = individualResults
    this.currentCounts = counts
  }

  /**
   * @returns {Boolean} does this full plot handler have data cached?
   * @protected
   */
  hasData() {
    return this.currentIndividualResults !== null && this.currentCounts !== null
  }

  /**
   * Resets saved data.
   * @protected
   */
  clearData() {
    this.currentIndividualResults = null
    this.currentCounts = null
  }

  /**
   * Renders the currently-stored data
   *
   * Should only be called when this has data stored, or nothing will happen.
   * @param {DataHandler} dataHandler parent data handler object; just for consistency with {@link PartialPlotHandler}
   * @protected
   */
  render(dataHandler) {
    // argument for consistency's sake!
    if (this.hasData()) {
      this.barChart.fullChart(this.currentIndividualResults, this.currentCounts, false)
      this.statePlot.fullPlot(this.currentIndividualResults)
    }
  }
}

/**
 * The DataHandler switches to this for plotting of partial data, normally arriving one point
 * at a time, with the total quantity restricted by the data store size - only the newest items
 * are saved.
 */
class PartialPlotHandler {
  /**
   * @param {LimitedStatePlot} statePlot associated state plotter
   * @param {LimitedBarChart} barChart associated bar chart
   * @param {SmallDataStore} dataStore data store to get current results from
   * @protected
   */
  constructor(statePlot, barChart, dataStore) {
    this.statePlot = statePlot
    this.barChart = barChart
    this.currentIndividualResults = null
    this.currentCounts = null
    this.dataStore = dataStore
  }

  /**
   * Clear currently-cached data
   * @protected
   */
  clearData() {
    this.currentIndividualResults = null
    this.currentCounts = null
  }

  /**
   * @returns {Boolean} does this partial plot handler have data cached?
   * @protected
   */
  hasData() {
    return this.currentIndividualResults !== null && this.currentCounts !== null
  }

  /**
   * Saves the given individual results and counts for re-rendering next time full plot is selected,
   * assuming no changes are made to sliders or contacts
   * @param {Array.<StateResultPair>} individualResults individual results to save
   * @param {CountResults} counts counts to save
   * @protected
   */
  save(individualResults, counts) {
    this.currentIndividualResults = individualResults
    this.currentCounts = counts
  }

  /**
   * Draws the data graphics from the partial data currently cached
   * @param {DataHandler} dataHandler the parent DataHandler
   * @protected
   */
  render(dataHandler) {
    this.restorePlot(dataHandler)
  }

  /**
   * Draws the data graphics from the partial data currently cached
   * @param {DataHandler} dataHandler the parent DataHandler
   * @protected
   */
  restorePlot(dataHandler) {
    // what happens when the first action we take is full plot?
    // then restore won't have anything to work with, but that's actually ok!
    // all we want there is to clear and draw the axes
    if (!this.hasData()) {
      let { storedIndividualResults, counts } = dataHandler.getStoredResultsAndCounts()
      this.currentIndividualResults = storedIndividualResults
      this.currentCounts = counts
    }

    this.barChart.fullChart(this.currentIndividualResults, this.currentCounts, true)
    this.statePlot.fullPlot(this.currentIndividualResults)
  }

  /**
   * Add the algedonode hierarchy's current state-light pair to the data store, plot it on the state plot,
   * and add it to the bar chart's counts, re-rendering both.
   * @param {AlgedonodeHierarchy} algHierarchy algedonode hierarchy to retrieve state-light pair from
   * @param {SmallDataStore} dataStore associated data store
   * @public
   * @todo could maybe have a callback to get the data from the alg hierarchy, rather than access directly
   */
  plotNewPoint(algHierarchy, dataStore) {
    let stateResult = algHierarchy.getCurrentResult()
    if (stateResult.result !== null) {
      let removed = dataStore.enqueue(stateResult)

      this.statePlot.plotStatePoint(stateResult, removed)

      this.barChart.changeBars(stateResult, removed)
    }
  }
}

/**
 * @typedef {[ContactArray,ContactArray,ContactArray,ContactArray,ContactArray,ContactArray,ContactArray,ContactArray]} ContactArray8
 */
/**
 * @typedef {{1: ContactArray8, 2: ContactArray8, 4:ContactArray8,8:ContactArray8}} ContactsPositions
 */

/**
 * Deals with changing (and resetting) the contact positioning within the algedonode hierarchy;
 * contains default positions. Contacts are measured within the range -0.49 to 0.49, where the
 * centre of the algedonode (and starting mid-point between the brass pad pair) is 0, each
 * pad is of height 1; and the strip can move -0.5 to 0.5 up and down. The contacts, then, will
 * always be on one of the two pads
 *
 * Contact positions: a nested array, 4 rows, 8 columns, where each entry is an array containing all the
 * contact positions for that algedonode; rows are indexed by number of contacts for each algedonode in
 * that row: 1->1, 2->2, 3->4, 4->8
 *
 * @todo might be nice to have contacts settable manually
 */
class ContactsHandler {
  /**
   * @param {AlgedonodeHierarchy} algHierarchy algedonode hierarchy to control the contacts for
   * @param {RerenderAndPlotCallback} rerenderFn when called, clears the dial settings, propagates a new state, re-renders, then plots the result
   * @public
   */
  constructor(algHierarchy, rerenderFn) {
    // standard spacings for contacts on first row: 1 contact per algedonode, on alternating pads across the row
    const contactsDefault1Off = [-0.49]
    const contactsDefault1On = [0.49]

    // standard spacing for contacts on second row: 2 contacts per algedonode, 1 per pad
    const contactsDefault2 = [-0.49, 0.49]

    // standard spacing for contacts on third row: 4 contacts per algedonode, 2 on each pad, medium distance
    const contactsDefault4 = [-0.49, -0.16, 0.16, 0.49]

    // standard spacing for contacts on fourth row: 8 contacts per algedonode, 4 on each pad, small distance
    const contactsDefault8 = [-0.49, -0.35, -0.21, -0.07, 0.07, 0.21, 0.35, 0.49]

    /**
     * Default contact positions for each row: a nested array, 4 rows, 8 columns, where each entry is an array containing all the
     * contact positions for that algedonode; each row is indexed as the number of contacts needed per algedonode on that row
     */
    this.contactsDefault = {
      "1": [contactsDefault1Off, contactsDefault1On, contactsDefault1Off, contactsDefault1On, contactsDefault1Off, contactsDefault1On, contactsDefault1Off, contactsDefault1On],
      "2": [contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2],
      "4": [contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4],
      "8": [contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8],
    }
    this.contactsCurrent = { ...this.contactsDefault }
    this.algHierarchy = algHierarchy
    this.rerenderFn = rerenderFn
  }

  /**
   * @typedef {Array.<Number>} ContactArray
   */
  /**
   * @param {Number} n an integer
   * @returns {ContactArray} an array of n random contact positions in range -0.49 to 0.49
   * @protected
   */
  randomContactPositions(n) {
    return new Array(n).fill(null).map(_ => Math.random() * 0.98 - 0.49)
  }

  /**
   * @param {Number} n an integer
   * @returns {ContactArray8} an 8-element array,
   * where each element is an array of n random contact positions in range -0.49 to 0.49; one array per column
   * @protected
   */
  randomContactPositions8(n) {
    return new Array(8).fill(null).map(_ => this.randomContactPositions(n))
  }

  /**
   * Randomises contact positions; resets, propagates dial values, then re-renders hierarchy
   * @public
   */
  setRandomContacts() {
    this.contactsCurrent[1] = this.randomContactPositions8(1)
    this.contactsCurrent[2] = this.randomContactPositions8(2)
    this.contactsCurrent[4] = this.randomContactPositions8(4)
    this.contactsCurrent[8] = this.randomContactPositions8(8)
    this.algHierarchy.setNewContactPositions(this)
    this.rerenderFn()
  }

  /**
   * Restores default contact positions; resets, propagates dial values, then re-renders hierarchy
   * @public
   */
  restoreDefaultContacts() {
    this.contactsCurrent = { ...this.contactsDefault }
    this.algHierarchy.setNewContactPositions(this)
    this.rerenderFn()
  }

  /**
   * @returns {ContactsPositions} all the current contact positions
   * @public
   */
  getContactsCurrent() {
    return this.contactsCurrent
  }

  /**
   * @returns {ContactsPositions} all the default contact positions
   * @public
   */
  getContactsDefault() {
    return this.contactsDefault
  }
}

/**
 * @private
 * @typedef {{name: String, colour: String}} NameColourPair
 */

/**
 * Manages the associations between graphical elements, their colours,
 * and the changing of those colours; contains default colours for
 * all elements.
 */
class ColourHandler {
  /**
   * Construct a colour handler with the built-in default colours
   */
  constructor() {
    this.coloursDefault = {}
    /**
     * @type {Array.<ColourPickerDialogEntry>}
     */
    this.colourGroups = []
    this.initColours()
    this.setToDefault()
  }

  /**
   * Assigns default colours and creates groupings / labels based on which row of the colour picker dialog they should
   * be grouped together in.
   * @protected
   */
  initColours() {
    this.createColours("Background", { name: "background", colour: "darkgrey" })
    this.createColours("Strip", { name: "strip", colour: "burlywood" })
    this.createColours("Dial output / contact", { name: "dial-output", colour: "black" })
    this.createColours("Activated element", { name: "activated", colour: "red" })
    this.createColours("Brass pad / edge", { name: "brass-pad", colour: "gold" }, { name: "brass-pad-edge", colour: "goldenrod" })
    this.createColours("Algedonode / edge", { name: "algedonode", colour: "gainsboro" }, { name: "algedonode-edge", colour: "dimgrey" })
    this.createColours("A lights on / off", { name: "light-a-on", colour: "red" }, { name: "light-a-off", colour: "darkred" })
    this.createColours("B lights on / off", { name: "light-b-on", colour: "lime" }, { name: "light-b-off", colour: "darkgreen" })
  }
  /**
   * Each call gives an arbitrary number of pairs of an identifier for an element to be coloured and that element's default
   * colour; these will be in the same row of the colour picker dialog, along with the given label.
   *
   * Also adds each such element-colour pair to the defaults.
   * @param {String} label
   * @param  {...NameColourPair} nameColourPairs
   * @protected
   */
  createColours(label, ...nameColourPairs) {
    nameColourPairs.forEach(({ name, colour }) => {
      this.coloursDefault[name] = colour
    })
    this.colourGroups.push({ label, elementNames: nameColourPairs.map(({ name, colour }) => name) })
  }

  /**
   * Start a colour change
   * @public
   */
  beginColourChange() {
    this.coloursTemp = { ...this.coloursCurrent }
  }
  /**
   * The given element will be assigned the given colour after this colour change is committed
   * @param {String} name name of the element to adjust colour for; must be the same as in the corresponding name-colour pair
   * @param {String} colour new colour to assign to the element of the given name
   * @public
   */
  colourChange(name, colour) {
    this.coloursTemp[name] = colour
  }
  /**
   * Commits a colour change, overwriting the current colours
   * @public
   */
  commitColourChange() {
    this.coloursCurrent = { ...this.coloursTemp }
  }

  /**
   * Cancel a colour change
   * @public
   */
  cancelColourChange() {
    // happens automatically!
  }

  /**
   * Get the colour assigned to the element with the given name
   * @param {String} name name of element
   * @returns {String} returns the colour currently associated with this element
   * @public
   */
  getByName(name) {
    return this.coloursCurrent[name]
  }

  /**
   * Restores current colours to the default
   * @public
   */
  setToDefault() {
    this.coloursCurrent = { ...this.coloursDefault }
  }

  /**
   * @typedef {{label: String, elementNames: String[]} } ColourPickerDialogEntry
   */
  /**
   * @returns {Array.<ColourPickerDialogEntry>} all entries for the colour picker dialog, each entry containing some number of element names to
   * be given colour pickers, and a label associated with their row in the colour picker dialog.
   * @public
   */
  getColourables() {
    return this.colourGroups
  }

  /**
   * @returns {String} the current background colour
   */
  get background() {
    return this.coloursCurrent["background"]
  }

  /**
   * @returns {String} the current colour of the "wooden" strips
   */
  get strip() {
    return this.coloursCurrent["strip"]
  }

  /**
   * @returns {String} the current colour of the dial output wires
   */
  get dialOutput() {
    return this.coloursCurrent["dial-output"]
  }

  /**
   * @returns {String} the current colour of any activated element (border or wire)
   */
  get activated() {
    return this.coloursCurrent["activated"]
  }

  /**
   * @returns {String} the current colour of the brass pads
   */
  get brassPad() {
    return this.coloursCurrent["brass-pad"]
  }

  /**
   * @returns {String} the current colour of the brass pad edges
   */
  get brassPadEdge() {
    return this.coloursCurrent["brass-pad-edge"]
  }

  /**
   * @returns {String} the current colour of the algedonodes
   */
  get algedonode() {
    return this.coloursCurrent["algedonode"]
  }

  /**
   * @returns {String} the current colour of the algedonode edges
   */
  get algedonodeEdge() {
    return this.coloursCurrent["algedonode-edge"]
  }

  /**
   * @returns {String} the current colour of row A's lights when activated
   */
  get lightAOn() {
    return this.coloursCurrent["light-a-on"]
  }

  /**
   * @returns {String} the current colour of row A's lights when not activated
   */
  get lightAOff() {
    return this.coloursCurrent["light-a-off"]
  }

  /**
   * @returns {String} the current colour of row B's lights when activated
   */
  get lightBOn() {
    return this.coloursCurrent["light-b-on"]
  }

  /**
   * @returns {String} the current colour of row B's lights when not activated
   */
  get lightBOff() {
    return this.coloursCurrent["light-b-off"]
  }

  /**
   * @returns {String} the current colour of the black box overlay for the algedonode hierarchy (i.e. black)
   */
  get blackBox() {
    return "black"
  }
}

// Implementation of the algedonode hierarchy from Stafford Beer's Brain of the Firm, Chapter 5
// Also includes a metasystem view - a metasystem by definition can't see any details, and won't
// have access to every input state at once.

$(function () {
  // Which buttons are enabled / disabled, or have a label change, by a change in metasystem mode?
  const { disabledByMetasystem, labelledByViewMode } = viewModeButtonFunctions()

  const { algHierarchy, dataStore, barChart, statePlot, colourHandler } = initialiseMainComponents()
  const renderingHandler = new RenderingHandler(algHierarchy, disabledByMetasystem, labelledByViewMode)
  /**
   * @type {DataPointLabelSetterCallback}
   */
  const dataPointLabelSetter = newStoreSpace => $("#label-data-store-size").text(`Data point store space: ${newStoreSpace}`)

  const dataHandler = new DataHandler(dataStore, barChart, statePlot, dataPointLabelSetter)

  const rerenderAndPlot = rerenderHierarchyAndPlotNewPoint(algHierarchy, dataHandler, renderingHandler)

  let playModeHandler = new PlayModeHandler(setDial(algHierarchy), rerenderAndPlot)

  let contactsHandler = new ContactsHandler(algHierarchy, rerenderAndPlot)
  algHierarchy.setupConnections(contactsHandler)

  // First display of window - draw axes for data graphics, draw hierarchy, plot result of starting state (1,1,1,1)
  dataHandler.drawAxes()
  rerenderAndPlot()

  /**************************************************************
   *  STRIP SLIDER
   * ************************************************************/
  for (let i = 0; i < 8; i++) {
    $("#vslide" + i).slider({
      orientation: "vertical",
      range: "min",
      min: 0,
      max: 100,
      value: 50,
      slide: function (event, ui) {
        dataHandler.sliderOrContactsChange()
        let newStripPos = convert100RangeToSliderShift(ui.value)
        algHierarchy.moveStrip(i, newStripPos)
        // if a slider changes, we want to make sure a possible different output from the same state is rendered
        rerenderAndPlot()
      },
    })
  }

  /**************************************************************
   *  DIALS
   * ************************************************************/
  for (let i = 0; i < 4; i++) {
    $("#dial" + i).knob({
      min: 1,
      max: 10,
      step: 1,
      width: 100,
      height: 100,
      cursor: 20,
      displayInput: true,
      font: "arial",
      angleArc: 200,
      angleOffset: -100,
      change: function (v) {
        let rounded = Math.round(v) // needed because it otherwise updates with intermediate float values...
        algHierarchy.setDialValue(i, rounded)
        rerenderAndPlot()
      },
    })
  }

  /**************************************************************
   *  RANDOM / DEFAULT CONTACTS
   * ************************************************************/
  // When we change the contacts, that'll also have to erase the data graphics
  $("#random-contacts")
    .button()
    .click(() => {
      contactsHandler.setRandomContacts()
      dataHandler.sliderOrContactsChange()
    })

  $("#default-contacts")
    .button()
    .click(() => {
      contactsHandler.restoreDefaultContacts()
      dataHandler.sliderOrContactsChange()
    })

  /**************************************************************
   *  METASYSTEM ON/OFF
   * ************************************************************/
  $("#metasystem-toggle")
    .button()
    .click(() => {
      renderingHandler.toggleViewMode()
      rerenderAndPlot()
    })
    .button("option", "label", "To metasystem view")

  /**************************************************************
   *  "PLAY MODE" / TIMED SEQUENCE
   * ************************************************************/
  $("#random-state").click(event => {
    playModeHandler.stop()
    for (let i = 0; i < 4; i++) {
      let rn = rnd(10)
      $("#dial" + i)
        .val(rn)
        .trigger("change")
      algHierarchy.setDialValue(i, rn)
    }
    // programmatically setting a new dial value requires propagating and rendering the changes
    rerenderAndPlot()
  })
  $("#play-sequence").click(() => playModeHandler.playSequence())
  $("#play-random").click(() => playModeHandler.playRandom())
  $("#stop").click(() => playModeHandler.stop())
  $("#speed").slider({
    range: "min",
    min: 1,
    max: 100,
    value: 50,
    slide: function (event, ui) {
      let playSpeed = ui.value
      playModeHandler.setNewPlaySpeed(playSpeed)
    },
  })

  /**************************************************************
   *  GRAPHICAL DATA DISPLAY
   * ************************************************************/
  $("#draw-full-data-graphics").button()
  $("#draw-full-data-graphics").click(event => {
    playModeHandler.stop()
    dataHandler.requestCompleteScanAndRender(algHierarchy)
  })
  $("#data-store-size").slider({
    range: "min",
    min: 0,
    max: 100,
    step: 0.01,
    value: dataHandler.storeSpaceToDatapointSlider(InitialValues.DATA_STORE_SIZE),
    slide: function (event, ui) {
      dataHandler.resizeData(ui.value)
    },
  })

  $("#label-data-store-size").text(`Data point store space: ${InitialValues.DATA_STORE_SIZE}`)

  $("#reset-data-graphics-and-data").click(() => dataHandler.clearDataGraphicAndData())

  /**************************************************************
   *  COLOUR
   * ************************************************************/
  // Add one colour picker row for every row defined in colourHandler.initColours()
  // each row may contain multiple colour pickers, and contains one label
  let colourRows = colourHandler.getColourables()
  let colourPickerField = $("#colour-picker-field")
  colourRows.forEach(({ label, elementNames }) => {
    let colourRow = $(`<p></p>`)
    let colourLabel = $(`<label></label>`)
      .text(label)
      .attr({ for: `colour-${elementNames[elementNames.length - 1]}` })
      .addClass("label-colourpicker")
    let colourPickers = elementNames.map(name => {
      return $("<input></input>")
        .attr({
          name: `colour-${name}`,
          type: "text",
          id: `colour-${name}`,
        })
        .addClass("text", "ui-widget-content", "ui-corner-all", "colourpicker")
    })
    colourPickers.forEach(colourPicker => colourRow.append(colourPicker))
    colourRow.append(colourLabel)
    colourPickerField.append(colourRow)
  })
  // Conversion to a Spectrum seems to have to happen after the elements
  // have been added to the DOM, otherwise it doesn't render them!
  colourRows.forEach(({ label, elementNames }) => {
    elementNames.forEach(name => {
      $(`#colour-${name}`).spectrum({
        color: colourHandler.getByName(name),
      })
    })
  })

  // Colour picker form with accept / cancel , and associated button to open
  let dialog = $("#dialog-colour-picker-form").dialog({
    autoOpen: false,
    height: 650,
    width: 350,
    modal: true,

    buttons: {
      Apply: () => {
        // extract the colours from the colour pickers based on the names given to the elements in ColourHandler
        colourRows.forEach(({ label, elementNames }) => {
          elementNames.forEach(name => {
            let newColour = $(`#colour-${name}`).spectrum("get").toRgbString()
            colourHandler.colourChange(name, newColour)
          })
        })

        // also commit the colour changes and re-render both the algedonode hierarchy and the data graphics
        dialog.dialog("close")
        colourHandler.commitColourChange()
        renderingHandler.newRender()
        dataHandler.colourChange()
      },

      Cancel: function () {
        // Reset the colour picker settings to the default colours
        colourRows.forEach(({ label, elementNames }) => {
          elementNames.forEach(name => {
            $(`#colour-${name}`).spectrum("set", colourHandler.getByName(name))
          })
        })

        dialog.dialog("close")
        colourHandler.cancelColourChange()
      },
    },
    open: function () {
      // Initialise the colour pickers with the current colour associated with the appropriate element name
      colourHandler.beginColourChange()
      colourRows.forEach(({ label, elementNames }) => {
        elementNames.forEach(name => {
          $(`#colour-${name}`).spectrum("set", colourHandler.getByName(name))
        })
      })
    },
  })
  $("#change-colours").click(() => dialog.dialog("open"))

  // Dialog to confirm reset to colour defaults, and associated button to open
  let confirmDefaultColoursDialog = $("#dialog-confirm-delete").dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      Yes: function () {
        colourHandler.setToDefault()
        renderingHandler.newRender()
        dataHandler.colourChange()
        confirmDefaultColoursDialog.dialog("close")
      },
      No: function () {
        confirmDefaultColoursDialog.dialog("close")
      },
    },
  })
  $("#default-colours").click(() => confirmDefaultColoursDialog.dialog("open"))
})

/**
 * Initialises the main components of the app, and returns the ones that will
 * be used elsewhere
 * @returns {{ algHierarchy: AlgedonodeHierarchy, dataStore: SmallDataStore, barChart: LimitedBarChart, statePlot: LimitedStatePlot, colourHandler: ColourHandler }} the main components
 */
function initialiseMainComponents() {
  let dataStore = new SmallDataStore(InitialValues.DATA_STORE_SIZE)

  let algCanvas = document.getElementById("algedonode-hierarchy")
  let algCtx = algCanvas.getContext("2d")

  let barChartCanvas = document.getElementById("bar-chart")
  let barChartCtx = barChartCanvas.getContext("2d")

  let statePlotCanvas = document.getElementById("state-plot")
  let statePlotCtx = statePlotCanvas.getContext("2d")

  let colourHandler = new ColourHandler()

  let algHierarchy = new AlgedonodeHierarchy(new AlgedonodeHierarchyRenderer(algCtx, colourHandler))
  // Default value of all dials on load is 1
  for (let i = 0; i < 4; i++) {
    setDial(algHierarchy)(i, 1)
  }
  let barChart = new LimitedBarChart(barChartCtx, colourHandler)
  let statePlot = new LimitedStatePlot(statePlotCtx, colourHandler)

  return { algHierarchy, dataStore, barChart, statePlot, colourHandler }
}

/**
 * When run, sets all DOM elements with class "metasystem-disabled" to be disabled if the metasystem is enabled, and
 * enabled if metasystem mode is disabled
 * @callback MetasystemButtonDisabler
 * @param {ViewMode} viewMode
 * @returns {void}
 */
/**
 * When run, labels a DOM element (or set of DOM elements) according to the current view mode (metasystem enabled / disabled)
 * @callback ViewModeElementLabeller
 * @param {ViewMode} viewMode
 * @returns {void}
 */
/**
 * @returns {{disabledByMetasystem: MetasystemButtonDisabler, labelledByViewMode: Array<ViewModeElementLabeller> }}
 * a metasystemButtonDisabler and an array of metasystemElementLabellers, all functions taking a ViewMode,
 * which will be passed whether the system is currently in metasystem mode or not
 */
function viewModeButtonFunctions() {
  let disabledByMetasystem = viewMode => $(".metasystem-disabled").button("option", "disabled", ViewModes.toBool(viewMode))
  let labelFn = viewMode => $("#metasystem-toggle").button("option", "label", ViewModes.toBool(viewMode) ? "To x-ray view" : "To metasystem view")
  let labelledByViewMode = [labelFn]
  return { disabledByMetasystem, labelledByViewMode }
}

/**
 * returns the conversion of any value in [0,100] to some value in [-1, 1], where 0 corresponds to 1 and 100 to -1
 * ("inverted" due to vertical sliders measuring distance from the bottom, and the strips being rendered measured from the top)
 * @param {Number} input is in range 0 to 100;
 * @returns {Number} in range [-1, 1]
 */
function convert100RangeToSliderShift(input) {
  // sliders need an input range of [-1, 1]
  // also, 0 corresponds to bottom and 100 to top
  // so we need to switch that around
  return -((input - 50) / 50)
}

/**
 * @param {Number} n
 * @returns {Number} random integer in 1,...,n inclusive
 */
function rnd(n) {
  return Math.floor(Math.random() * n) + 1
}

/**
 * Sets dial numbered dialNum to the given value, both in the interface and within the algedonode hierarchy,
 * possibly causing changes to the algedonode hierarchy's output state
 * @callback DialSetterCallback
 * @param {Number} dialNum the dial number to set
 * @param {Number} value the value (from 1-10 inclusive) to set the dial to
 * @returns {void}
 */
/**
 * @param {AlgedonodeHierarchy} algHierarchy the app's algedonode hierarchy
 * @returns {DialSetterCallback} callback which sets dial numbered dialNum to
 * the given value, both in the interface and within the algedonode hierarchy,
 * possibly causing changes to the algedonode hierarchy's output state
 */
function setDial(algHierarchy) {
  return (dialNum, value) => {
    $("#dial" + dialNum)
      .val(value)
      .trigger("change")
    algHierarchy.setDialValue(dialNum, value)
  }
}

/**
 * When invoked, rerenders the algedonode hierarchy, propagating the current dial values, then
 * displays the result in data graphics
 * @callback RerenderAndPlotCallback
 * @returns {void}
 */
/**
 * Given a hierarchy, a data handler, and a rendering handler, returns a callback to propagate values,
 * rerender, and plot the result
 * @param {AlgedonodeHierarchy} algHierarchy
 * @param {DataHandler} dataHandler
 * @param {RenderingHandler} renderingHandler
 * @returns {RerenderAndPlotCallback}
 */
function rerenderHierarchyAndPlotNewPoint(algHierarchy, dataHandler, renderingHandler) {
  return () => {
    renderingHandler.rerenderAndPropagate()
    dataHandler.displayNewPoint(algHierarchy)
  }
}
