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
