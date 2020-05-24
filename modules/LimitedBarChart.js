class LimitedBarChart {
  constructor(barChartContext, colourHandler) {
    this.colourHandler = colourHandler
    this.barData = new Array(8).fill(null).map(_ => {
      return { A: 0, B: 0 }
    }) // one per column
    this.totalFrequencyData = { A: 0, B: 0 }
    this.totalFrequencyDataCount = 0

    this.stateMapping = new Array(10000).fill(null)
    this.ctx = barChartContext

    this.w = this.ctx.canvas.width
    this.h = this.ctx.canvas.height
    this.barColumnW = this.w / 11.5
    this.maxDrawH = 0.8 * this.h
  }

  stateToInteger(state) {
    return 1000 * (state[0] - 1) + 100 * (state[1] - 1) + 10 * (state[2] - 1) + (state[3] - 1)
  }

  clearAll() {
    this.clearGraphic()
    this.clearData()
  }

  clearGraphic() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.drawAxes()
  }

  clearData() {
    this.barData = new Array(8).fill(null).map(_ => {
      return { A: 0, B: 0 }
    }) // one per column
    this.totalFrequencyData = { A: 0, B: 0 }
    this.totalFrequencyDataCount = 0
    this.stateMapping = new Array(10000).fill(null)
  }

  changePoint(newPoint, removedPoint) {
    if (removedPoint) {
      let { state, result: { lightColumn, aOrB }} = removedPoint
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

    if (newPoint) {
      let { state, result: { lightColumn, aOrB }} = newPoint
      let s = this.stateToInteger(state)
      let stored = this.stateMapping[s]
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
          // should work for all 3 cases
          this.barData[stored.lightColumn][stored.aOrB]--
          this.barData[lightColumn][aOrB]++
        }
      }
    }

    // Minor issue here - if we only replot the *explicitly* changed columns, but the overall data count (frequency)
    // has increased or decreased, we'll need to redraw all the other columns to compensate...
    // so we may as well just redraw the whole shebang, not like it takes long
    this.redrawBarsAndFrequencies()
  }

  addToStored(statesInt, lightColumn, aOrB) {
    this.stateMapping[statesInt] = { lightColumn, aOrB }
  }

  drawBar(column, height, fill, xOffset) {
    this.ctx.beginPath()
    this.ctx.fillStyle = fill
    this.ctx.fillRect(column * this.barColumnW + xOffset, this.maxDrawH - height, this.barColumnW / 2 - this.barColumnW / 9, height)
    this.ctx.stroke()
  }

  drawBars(column, aCount, bCount, totalFrequencyDataCount) {
    this.ctx.clearRect(column * this.barColumnW, 0, this.barColumnW, this.maxDrawH)

    this.drawBar(column, this.barHeight(aCount, totalFrequencyDataCount), this.colourHandler.lightAOn, this.barColumnW / 9)
    this.drawBar(column, this.barHeight(bCount, totalFrequencyDataCount), this.colourHandler.lightBOn, this.barColumnW / 2)
  }

  barHeight(count, totalFrequencyDataCount) {
    return (this.maxDrawH * count) / totalFrequencyDataCount
  }


  drawFrequency(column, height, fill, xOffset) {
    this.ctx.beginPath()
    this.ctx.fillStyle = fill
    this.ctx.fillRect(column * this.barColumnW + xOffset, this.maxDrawH - height, this.barColumnW - this.barColumnW / 9, height)
    this.ctx.stroke()
  }
  drawFrequencies(aCount, bCount) {
    let total = aCount + bCount
    this.ctx.clearRect(9 * this.barColumnW, 0, 2 * this.barColumnW, this.maxDrawH)
    this.drawFrequency(9, this.barHeight(aCount, total) , this.colourHandler.lightAOn, this.barColumnW / 9)
    this.drawFrequency(10, this.barHeight(bCount, total) , this.colourHandler.lightBOn, 0)
  }

  redrawBarsAndFrequencies() {

    this.barData.forEach(({A: aCount, B: bCount}, i) => {
      this.drawBars(i, aCount, bCount, this.totalFrequencyDataCount)
    })
    
    let totalLightA = this.totalFrequencyData[LightTypes.A]
    let totalLightB = this.totalFrequencyData[LightTypes.B]

    this.drawFrequencies(totalLightA, totalLightB)
  }

  // takes { label: String, column: Integer }[]
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

  drawAxes() {
    this.drawLabels([{ label: LightTypes.A, column: 9 }, { label: LightTypes.B, column: 10}])

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

  overwriteData(totalLightA, totalLightB, totalItems, counts, individualResults) {
    this.clearData() // make sure everything's reinitialised
    this.totalFrequencyData = { A: totalLightA, B: totalLightB }
    this.totalFrequencyDataCount = totalItems
    counts.forEach( ({aCount, bCount}, i) => { 
      this.barData[i] = { A: aCount, B: bCount } 
    })
    individualResults.forEach(({ state, result: { lightColumn, aOrB }}) => {
      this.addToStored(this.stateToInteger(state), lightColumn, aOrB)
    })
  }
}