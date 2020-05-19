class DataHandler {
    constructor(dataStore, barChart, statePlot, dataPointLabelSetter) {
      this.dataStore = dataStore
      this.barChart = barChart
      this.statePlot = statePlot
      this.dataPointLabelSetter = dataPointLabelSetter // function: StoreSpace -> String

      this.fullPlotHandler = new FullPlotHandler(statePlot, barChart)
      this.partialPlotHandler = new PartialPlotHandler(statePlot, barChart)
      this.currentPlotHandler = this.partialPlotHandler
    }
  

    colourChange() {
      // Re-render what's already there, no need to reset or change the data  
      this.currentPlotHandler.plot()
    }
  
    requestCompletePlot(algHierarchy, sliderOrContactsChanged) {
      if (this.currentPlotHandler === this.partialPlotHandler) {
        let storedIndividualResults = this.dataStore.getStoredResults()
        this.partialPlotHandler.save(storedIndividualResults, this.computeCountsFromResults(storedIndividualResults))
        this.currentPlotHandler = this.fullPlotHandler
      }

      if (sliderOrContactsChanged || !this.fullPlotHandler.hasData()) {
        let individualResults = algHierarchy.fullSimulate()
        let counts = this.computeCountsFromResults(individualResults)
        this.fullPlotHandler.save(individualResults, counts)
      }

      this.fullPlotHandler.plot()

    }

    drawAxes() {
      this.statePlot.drawAxes()
      this.barChart.drawAxes()
    }

    clearPlotGraphicAndData() {
      this.dataStore.clear()
      this.statePlot.clearGraphic() // no data to clear
      this.barChart.clearAll()
      this.fullPlotHandler.clearData()
      this.partialPlotHandler.clearData()
    }

    clearPlotGraphic() {
      this.statePlot.clearGraphic()
      this.barChart.clearGraphic()
    }

    computeCountsFromResults(individualResults) {
      return individualResults.reduce((acc, { result: {lightNum, aOrB} }) => {
        if (!(acc[lightNum])) {
          acc[lightNum] = { aCount: 0, bCount: 0}
        }
        let {aCount, bCount} = acc[lightNum]
        acc[lightNum] = { aCount: (aOrB === LightType.A ? aCount + 1 : aCount), bCount: (aOrB === LightType.B ? bCount + 1 : bCount)}
        return acc
      }, [])
    }

    datapointSliderToStoreSpace(sliderVal) {
      // minimum of 100, max of 20000 seems reasonable
      // use a low-order polynomial: x^2 on (0, 1]?
      let x = sliderVal / 100 // sliderVal in 1-100
      return 100 + 19900 * Math.pow(x, 2)
    }
    
    // inverse of datapointSliderToStoreSpace
    storeSpaceToDatapointSlider(storeSpace) {
      return 100 * Math.sqrt((storeSpace - 100) / 19900)
    }
    
    resizeData(sliderValue) {
      let newStoreSpace = Math.floor(this.datapointSliderToStoreSpace(sliderValue))
      this.dataPointLabelSetter(newStoreSpace)
      let removed = this.dataStore.resize(newStoreSpace)
      if (removed && this.currentPlotHandler === this.partialPlotHandler) { 
        removed.forEach(pointRemoved => {
          this.statePlot.plotStatePoint(null, pointRemoved)
          this.barChart.changePoint(null, pointRemoved)
        })
      }
      else if (removed && this.currentPlotHandler === this.fullPlotHandler)  { // we're removing while a full plot is displayed
        // is this actually necessary?? when we switch back to the partialPlotHandler, however it happens,
        // we're going to need to get the current information out of the dataStore, render it to the chart and store the counts,
        // and render it to the plot. so i guess... not?
        // this.barChart.removePointWithoutPlotting(pointRemoved)
      }
    }
 
    plotNewPoint(algHierarchy) {
      if (this.currentPlotHandler === this.fullPlotHandler) {
        this.clearPlotGraphic()
        this.partialPlotHandler.restorePlot()
        this.currentPlotHandler = this.partialPlotHandler
      }

      this.partialPlotHandler.plotNewPoint(algHierarchy, this.dataStore)

    }
}

class FullPlotHandler {
  constructor(statePlot, barChart) {
    this.statePlot = statePlot
    this.barChart = barChart
    this.currentIndividualResults = null
    this.currentCounts = null
  }

  save(individualResults, counts) {
    this.currentIndividualResults = individualResults
    this.currentCounts = counts
  }

  hasData() {
    return this.currentIndividualResults !== null && this.currentCounts !== null
  }

  clearData() {
    this.currentIndividualResults = null
    this.currentCounts = null
  }

  // assumes that this.current and this.currentCounts both contain data
  plot() {
    if (this.hasData()) { 
      this.barChart.fullChart(this.currentIndividualResults, this.currentCounts, false)
      this.statePlot.fullPlot(this.currentIndividualResults)
    }
  }
}

/*
  We don't want to always save the latest data being plotted; this
  is stored only when we switch to a full plot
*/
class PartialPlotHandler {
  constructor(statePlot, barChart) {
    this.statePlot = statePlot
    this.barChart = barChart
    this.currentIndividualResults = null
    this.currentCounts = null
  }

  clearData() {
    this.currentIndividualResults = null
    this.currentCounts = null
  }

  hasData() {
    return this.currentIndividualResults !== null && this.currentCounts !== null
  }

  save(individualResults, counts) {
    this.currentIndividualResults = individualResults
    this.currentCounts = counts
  }

  restorePlot() {
    // what happens when the first action we take is full plot?
    // then restore won't have anything to work with, but that's actually ok!
    // all we want there is to clear and draw the axes
    if (!this.hasData()) {
      this.currentIndividualResults = []
      this.currentCounts = []
    }
    
    this.barChart.fullChart(this.currentIndividualResults, this.currentCounts, true)
    this.statePlot.fullPlot(this.currentIndividualResults)
  }

  plotNewPoint(algHierarchy, dataStore) {
    let states = algHierarchy.dials.map(dial => dial.getDialValue())
    let illum = algHierarchy.getIlluminatedLight()
    if (illum !== null) {
      let { column, lightRow } = illum
      let removed = dataStore.enqueue(states, column, lightRow)
  
      this.statePlot.plotStatePoint({ states, column, lightRow}, removed)
  
      this.barChart.changePoint( { states, column, lightRow}, removed)
    }
  }
}