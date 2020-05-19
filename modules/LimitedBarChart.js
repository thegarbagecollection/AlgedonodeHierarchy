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
    this.barColumnW = w / 11.5
    this.maxDrawH = 0.8 * h
  }

  statesToInteger(states) {
    // TODO: pull this out
    return 1000 * (states[0] - 1) + 100 * (states[1] - 1) + 10 * (states[2] - 1) + (states[3] - 1)
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
      let { states, column, lightRow } = removedPoint
      let s = this.statesToInteger(states)
      let stored = this.stateMapping[s]
      if (stored) {
        if (column !== stored.column || lightRow !== stored.lightRow) console.log("Tried to remove a point that was different from expected")
        this.stateMapping[s] = null
        this.totalFrequencyData[lightRow]--
        this.totalFrequencyDataCount--
        this.barData[column][lightRow]--
      }
    }

    if (newPoint) {
      let { states, column, lightRow } = newPoint
      let s = this.statesToInteger(states)
      let stored = this.stateMapping[s]
      if (stored === null || stored.column !== column || stored.lightRow !== lightRow) {
        this.addToStored(s, column, lightRow)
        if (stored === null) {
          this.totalFrequencyDataCount++
          this.totalFrequencyData[lightRow]++
          this.barData[column][lightRow]++
        } else {
          if (stored.lightRow !== lightRow) {
            this.totalFrequencyData[stored.lightRow]--
            this.totalFrequencyData[lightRow]++
          }
          // should work for all 3 cases
          this.barData[stored.column][stored.lightRow]--
          this.barData[column][lightRow]++
        }
      }
    }

    this.drawBarAndFrequency(newPoint ? newPoint.column : null, removedPoint ? removedPoint.column : null)
  }

  addToStored(statesInt, column, lightRow) {
    this.stateMapping[statesInt] = { column, lightRow }
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

  drawBarAndFrequency(columnAddedTo, columnRemovedFrom) {

  
    // and redraw the bar column and the total frequencies

    // only do "removed" if it's not the one added to.
    // note: a light might be shifting colour within a column, so we still need to render if columnAddedTo = columnRemovedFrom
    // distinguishing null here, since 0 counts as false

    if (columnRemovedFrom !== null && columnAddedTo !== columnRemovedFrom) {
      let { A: aCount, B: bCount } = this.barData[columnRemovedFrom]
      this.drawBars(columnRemovedFrom, aCount, bCount, this.totalFrequencyDataCount)
    }

    if (columnAddedTo !== null) {
      let { A: aCount, B: bCount } = this.barData[columnAddedTo]
      this.drawBars(columnAddedTo, aCount, bCount, this.totalFrequencyDataCount)
    }

    // total frequencies here
    // clear total frequencies
    let totalLightA = this.totalFrequencyData["A"]
    let totalLightB = this.totalFrequencyData["B"]

    this.drawFrequencies(totalLightA, totalLightB)
  }

  drawAxes() {
    this.ctx.beginPath()
    this.ctx.fillStyle = "black"
    this.ctx.font = "" + 0.15 * this.h + "px Arial"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "bottom"
    this.ctx.fillText(`A`, 9 * this.barColumnW + this.barColumnW / 2, 0.99 * this.h)
    this.ctx.fillText(`B`, 10 * this.barColumnW + this.barColumnW / 2, 0.99 * this.h)
    this.ctx.stroke()
    for (let i = 0; i < 8; i++) {
      this.ctx.beginPath()
      this.ctx.fillStyle = "black"
      this.ctx.font = "" + 0.15 * this.h + "px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "bottom"
      this.ctx.fillText(`${i + 1}`, i * this.barColumnW + this.barColumnW / 2, 0.99 * this.h)
      this.ctx.stroke()
    }

    this.ctx.beginPath()
    this.ctx.strokeStyle = "black"
    this.ctx.moveTo(0, this.maxDrawH * 1.01)
    this.ctx.lineTo(this.w, this.maxDrawH * 1.01)
    this.ctx.moveTo(8 * this.barColumnW + this.barColumnW / 2, this.h)
    this.ctx.lineTo(8 * this.barColumnW + this.barColumnW / 2, 0)
    this.ctx.stroke()
  }

  fullChart(individualResults, counts, storeCountData) {
    
    let w = this.ctx.canvas.width
    let h = this.ctx.canvas.height
    this.ctx.clearRect(0, 0, w, h)
  
    let maxDrawH = 0.8 * h
  
    // we need one column for each number, a space, and another 2 columns
    // for comparing red vs. green
  
    let barColumnW = w / 11.5
  
    let totalLightA = counts.reduce((acc, { aCount, bCount }) => {
      return acc + aCount
    }, 0)
  
    let totalLightB = counts.reduce((acc, { aCount, bCount }) => {
      return acc + bCount
    }, 0)
  
    let totalItems = totalLightA + totalLightB

    if (storeCountData) {
      this.totalFrequencyData = { A: totalLightA, B: totalLightB }
      this.totalFrequencyDataCount = totalItems
      this.barData = counts.map( ({aCount, bCount} )=> ({ A: aCount, b: bCount }))
      individualResults.forEach(({ state, result: { lightNum, aOrB }}) => {
        this.addToStored(this.statesToInteger(state), lightNum, aOrB)
      })
    }

    for (let i = 0; i < counts.length; i++) {
      let { aCount, bCount } = counts[i]
      let rH = (maxDrawH * aCount) / totalItems
      let gH = (maxDrawH * bCount) / totalItems
      this.ctx.beginPath()
      this.ctx.fillStyle = this.colourHandler.lightAOn
      this.ctx.fillRect(i * barColumnW + barColumnW / 9, maxDrawH - rH, barColumnW / 2 - barColumnW / 9, rH)
      this.ctx.stroke()
  
      this.ctx.beginPath()
      this.ctx.fillStyle = this.colourHandler.lightBOn
      this.ctx.fillRect(i * barColumnW + barColumnW / 2, maxDrawH - gH, barColumnW / 2 - barColumnW / 9, gH)
      this.ctx.stroke()
  
      this.ctx.beginPath()
      this.ctx.fillStyle = "black"
      this.ctx.font = "" + 0.15 * h + "px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "bottom"
      this.ctx.fillText(`${i + 1}`, i * barColumnW + barColumnW / 2, 0.99 * h)
      this.ctx.stroke()
    }
  
    this.ctx.beginPath()
    this.ctx.strokeStyle = "black"
    this.ctx.moveTo(0, maxDrawH * 1.01)
    this.ctx.lineTo(w, maxDrawH * 1.01)
    this.ctx.moveTo(8 * barColumnW + barColumnW / 2, h)
    this.ctx.lineTo(8 * barColumnW + barColumnW / 2, 0)
    this.ctx.stroke()
  
    this.ctx.beginPath()
    this.ctx.fillStyle = this.colourHandler.lightAOn
    this.ctx.fillRect(9 * barColumnW + barColumnW / 9, maxDrawH - (maxDrawH * totalLightA) / totalItems, barColumnW - barColumnW / 9, (maxDrawH * totalLightA) / totalItems)
    this.ctx.stroke()
  
    this.ctx.beginPath()
    this.ctx.fillStyle = this.colourHandler.lightBOn
    this.ctx.fillRect(10 * barColumnW, maxDrawH - (maxDrawH * totalLightB) / totalItems, barColumnW - barColumnW / 9, (maxDrawH * totalLightB) / totalItems)
    this.ctx.stroke()
  
    this.ctx.beginPath()
    this.ctx.fillStyle = "black"
    this.ctx.font = "" + 0.15 * h + "px Arial"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "bottom"
    this.ctx.fillText(`A`, 9 * barColumnW + barColumnW / 2, 0.99 * h)
    this.ctx.fillText(`B`, 10 * barColumnW + barColumnW / 2, 0.99 * h)
    this.ctx.stroke()
  }
}