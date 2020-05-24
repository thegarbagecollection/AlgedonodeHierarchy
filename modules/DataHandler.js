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
        this.barChart.changePoint(null, pointRemoved)
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
      this.partialPlotHandler.restorePlot()
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

      this.barChart.changePoint(stateResult, removed)
    }
  }
}
