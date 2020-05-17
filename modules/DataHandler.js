class DataHandler {
    constructor(dataStore, barChart, statePlot, dataPointLabelSetter) {
      this.dataStore = dataStore
      this.barChart = barChart
      this.statePlot = statePlot
      this.dataPointLabelSetter = dataPointLabelSetter // function: StoreSpace -> String
    }
  
    fullPlot(counts, individualResults) {
      this.clearPlot()
      this.barChart.fullChart(counts)
      this.statePlot.fullPlot(individualResults)
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
      if (removed) removed.forEach(pointRemoved => {
        this.statePlot.plotStatePoint(null, pointRemoved)
        this.barChart.changePoint(null, pointRemoved)
      })
    }
    
    clearPlot() {
      this.dataStore.clear()
      this.barChart.clear()
      this.statePlot.clear()
    }
    
    plotNewPoint(freshPlot, algHierarchy) {
      if (freshPlot) this.clearPlot()
      let states = algHierarchy.dials.map(dial => dial.getDialValue())
      let illum = algHierarchy.getIlluminatedLight()
      if (illum !== null) {
        let { column, lightRow } = illum
        let removed = this.dataStore.enqueue(states, column, lightRow)
    
        this.statePlot.plotStatePoint({ states, column, lightRow}, removed)
    
        this.barChart.changePoint( { states, column, lightRow}, removed)
      }
    }
}