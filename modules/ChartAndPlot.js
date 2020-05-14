class LimitedBarChart {
  constructor(barChartContext) {
    this.barData = new Array(8).fill(null).map(_ => {
      return { A: 0, B: 0 }
    }) // one per column
    this.totalFrequencyData = { A: 0, B: 0 }
    this.totalFrequencyDataCount = 0

    this.stateMapping = new Array(10000).fill(null)
    this.ctx = barChartContext
  }
  statesToInteger(states) {
    // TODO: pull this out
    return 1000 * (states[0] - 1) + 100 * (states[1] - 1) + 10 * (states[2] - 1) + (states[3] - 1)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.barData = new Array(8).fill(null).map(_ => {
      return { A: 0, B: 0 }
    }) // one per column
    this.totalFrequencyData = { A: 0, B: 0 }
    this.totalFrequencyDataCount = 0

    this.stateMapping = new Array(10000).fill(null)

    let w = this.ctx.canvas.width
    let h = this.ctx.canvas.height
    let barColumnW = w / 11.5

    let maxDrawH = 0.8 * h
    this.drawAxes(w, h, barColumnW, maxDrawH)
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
      } else {
        console.log("Tried to remove a point that wasn't in the data set")
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

  drawBarAndFrequency(columnAddedTo, columnRemovedFrom) {
    let w = this.ctx.canvas.width
    let h = this.ctx.canvas.height

    let maxDrawH = 0.8 * h

    // we need one column for each number, a space, and another 2 columns
    // for comparing red vs. green

    let barColumnW = w / 11.5

    // clear full rectangle around columns

    // and one around total frequencies
    this.ctx.clearRect(9 * barColumnW, 0, 2 * barColumnW, maxDrawH)

    // and redraw the bar column and the total frequencies

    // only do "removed" if it's not the one added to.
    // note: a light might be shifting colour within a column, so we still need to render if columnAddedTo = columnRemovedFrom
    // distinguishing null here, since 0 counts as false

    if (columnRemovedFrom !== null && columnAddedTo !== columnRemovedFrom) {
      this.ctx.clearRect(columnRemovedFrom * barColumnW, 0, barColumnW, maxDrawH)
      let { A: aCount, B: bCount } = this.barData[columnRemovedFrom]
      let rH = (maxDrawH * aCount) / this.totalFrequencyDataCount
      let gH = (maxDrawH * bCount) / this.totalFrequencyDataCount

      this.ctx.beginPath()
      this.ctx.fillStyle = coloursCurrent.lightAOn
      this.ctx.fillRect(columnRemovedFrom * barColumnW + barColumnW / 9, maxDrawH - rH, barColumnW / 2 - barColumnW / 9, rH)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.fillStyle = coloursCurrent.lightBOn
      this.ctx.fillRect(columnRemovedFrom * barColumnW + barColumnW / 2, maxDrawH - gH, barColumnW / 2 - barColumnW / 9, gH)
      this.ctx.stroke()
    }

    if (columnAddedTo !== null) {
      this.ctx.clearRect(columnAddedTo * barColumnW, 0, barColumnW, maxDrawH)
      let { A: aCount, B: bCount } = this.barData[columnAddedTo]
      let rH = (maxDrawH * aCount) / this.totalFrequencyDataCount
      let gH = (maxDrawH * bCount) / this.totalFrequencyDataCount

      this.ctx.beginPath()
      this.ctx.fillStyle = coloursCurrent.lightAOn
      this.ctx.fillRect(columnAddedTo * barColumnW + barColumnW / 9, maxDrawH - rH, barColumnW / 2 - barColumnW / 9, rH)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.fillStyle = coloursCurrent.lightBOn
      this.ctx.fillRect(columnAddedTo * barColumnW + barColumnW / 2, maxDrawH - gH, barColumnW / 2 - barColumnW / 9, gH)
      this.ctx.stroke()
    }

    // total frequencies here

    let totalLightA = this.totalFrequencyData["A"]
    let totalLightB = this.totalFrequencyData["B"]

    this.ctx.beginPath()
    this.ctx.fillStyle = coloursCurrent.lightAOn
    this.ctx.fillRect(
      9 * barColumnW + barColumnW / 9,
      maxDrawH - (maxDrawH * totalLightA) / this.totalFrequencyDataCount,
      barColumnW - barColumnW / 9,
      (maxDrawH * totalLightA) / this.totalFrequencyDataCount
    )
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.fillStyle = coloursCurrent.lightBOn
    this.ctx.fillRect(10 * barColumnW, maxDrawH - (maxDrawH * totalLightB) / this.totalFrequencyDataCount, barColumnW - barColumnW / 9, (maxDrawH * totalLightB) / this.totalFrequencyDataCount)
    this.ctx.stroke()
  }

  drawAxes(w, h, barColumnW, maxDrawH) {
    this.ctx.beginPath()
    this.ctx.fillStyle = "black"
    this.ctx.font = "" + 0.15 * h + "px Arial"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "bottom"
    this.ctx.fillText(`A`, 9 * barColumnW + barColumnW / 2, 0.99 * h)
    this.ctx.fillText(`B`, 10 * barColumnW + barColumnW / 2, 0.99 * h)
    this.ctx.stroke()
    for (let i = 0; i < 8; i++) {
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
  }

  fullChart(counts) {
    let w = this.ctx.canvas.width
    let h = this.ctx.canvas.height
    this.ctx.clearRect(0, 0, w, h)
  
    let maxDrawH = 0.8 * h
  
    // we need one column for each number, a space, and another 2 columns
    // for comparing red vs. green
  
    let barColumnW = w / 11.5
  
    // max count?
    let maxCount = counts.reduce((maxVal, { aCount, bCount }) => {
      return Math.max(aCount, bCount, maxVal)
    }, 0)
  
    let totalLightA = counts.reduce((acc, { aCount, bCount }) => {
      return acc + aCount
    }, 0)
  
    let totalLightB = counts.reduce((acc, { aCount, bCount }) => {
      return acc + bCount
    }, 0)
  
    for (let i = 0; i < counts.length; i++) {
      let { aCount, bCount } = counts[i]
      let rH = (maxDrawH * aCount) / 10000
      let gH = (maxDrawH * bCount) / 10000
      this.ctx.beginPath()
      this.ctx.fillStyle = coloursCurrent.lightAOn
      this.ctx.fillRect(i * barColumnW + barColumnW / 9, maxDrawH - rH, barColumnW / 2 - barColumnW / 9, rH)
      this.ctx.stroke()
  
      this.ctx.beginPath()
      this.ctx.fillStyle = coloursCurrent.lightBOn
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
    this.ctx.fillStyle = coloursCurrent.lightAOn
    this.ctx.fillRect(9 * barColumnW + barColumnW / 9, maxDrawH - (maxDrawH * totalLightA) / 10000, barColumnW - barColumnW / 9, (maxDrawH * totalLightA) / 10000)
    this.ctx.stroke()
  
    this.ctx.beginPath()
    this.ctx.fillStyle = coloursCurrent.lightBOn
    this.ctx.fillRect(10 * barColumnW, maxDrawH - (maxDrawH * totalLightB) / 10000, barColumnW - barColumnW / 9, (maxDrawH * totalLightB) / 10000)
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


class LimitedStatePlot {
  constructor(context) {
    this.ctx = context
  }

  plotStatePoint(newPoint, removedPoint) {
    // And the state results
    let wS = this.ctx.canvas.width
    let hS = this.ctx.canvas.height
  
    let drawableLeftS = wS * 0.1
    let drawableBottomS = hS * 0.9
  
    // turns a 0-99 into a coordinate fitting within the drawable area
    let coordOffsetMultX = (0.9 * wS) / 100
    let coordOffsetMultY = (0.9 * hS) / 100
  
    if (removedPoint) {
      let { states: statesRemoved, column: columnRemoved, lightRow: lightRowRemoved } = removedPoint
      let x = 10 * (statesRemoved[0] - 1) + (statesRemoved[1] - 1)
      let y = 10 * (statesRemoved[2] - 1) + (statesRemoved[3] - 1)
  
      this.ctx.beginPath()
  
      // let adjustedX = drawableLeftS + x * coordOffsetMultX
      // let adjustedY = drawableBottomS - y * coordOffsetMultY
  
      // this.ctx.arc(adjustedX, adjustedY, 0.5 * coordOffsetMultX, 0, 2 * Math.PI)
  
      let adjustedX = drawableLeftS + x * coordOffsetMultX
      let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
      this.ctx.beginPath()
      this.ctx.fillStyle = "white"
      this.ctx.fillRect(adjustedX - 0.6, adjustedY - 0.6, coordOffsetMultX + 1.2, coordOffsetMultY + 1.2) // hack: it's not clearing the rectangles properly, no idea why
      //this.ctx.stroke()
    }
  
    if (newPoint) {
      let { states: statesNew, column: columnNew, lightRow: lightRowNew } = newPoint
  
      let x = 10 * (statesNew[0] - 1) + (statesNew[1] - 1)
      let y = 10 * (statesNew[2] - 1) + (statesNew[3] - 1)
      // this.ctx.beginPath()
      // this.ctx.strokeStyle = lightRowNew === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
      this.ctx.fillStyle = lightRowNew === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
  
      // let adjustedX = drawableLeftS + x * coordOffsetMultX
      // let adjustedY = drawableBottomS - y * coordOffsetMultY
  
      // this.ctx.arc(adjustedX, adjustedY, 0.5 * coordOffsetMultX, 0, 2 * Math.PI)
  
      let adjustedX = drawableLeftS + x * coordOffsetMultX
      let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
      this.ctx.fillRect(adjustedX, adjustedY, coordOffsetMultX, coordOffsetMultY)
      //this.ctx.strokeRect(adjustedX, adjustedY, coordOffsetMultX, coordOffsetMultY)
      //this.ctx.fill()
      //this.ctx.stroke()
    }
  
    this.statesAxes(drawableLeftS, drawableBottomS, wS, false) // we need this! because of the rectangle erasing hack, it starts eating away at the axes
  }

  statesAxes(drawableLeftS, drawableBottomS, wS, drawText) {
    this.ctx.beginPath()
    this.ctx.strokeStyle = "black"
    this.ctx.moveTo(drawableLeftS - 1, 0)
    this.ctx.lineTo(drawableLeftS - 1, drawableBottomS + 1)
    this.ctx.lineTo(wS, drawableBottomS + 1)
    if (drawText) {
      this.ctx.fillStyle = "black"
      this.ctx.textAlign = "left"
      this.ctx.textBaseline = "bottom"
      this.ctx.fillText("_ _ 1 1", 0, drawableBottomS, drawableLeftS * 0.95)
      this.ctx.textAlign = "left"
      this.ctx.textBaseline = "top"
      this.ctx.fillText("_ _ 10 10", 0, 0, drawableLeftS * 0.95)
      this.ctx.textAlign = "left"
      this.ctx.textBaseline = "top"
      this.ctx.fillText("1 1 _ _", drawableLeftS, drawableBottomS * 1.01)
      this.ctx.textAlign = "right"
      this.ctx.textBaseline = "top"
      this.ctx.fillText("10 10 _ _", wS, drawableBottomS * 1.01)
      this.ctx.stroke()
    }
  }
  
  fullPlot(individualResults) {
    
    let wS = this.ctx.canvas.width
    let hS = this.ctx.canvas.height
    this.ctx.clearRect(0, 0, wS, hS)
  
    let drawableLeftS = wS * 0.1
    let drawableBottomS = hS * 0.9
  
    // turns a 0-99 into a coordinate fitting within the drawable area
    let coordOffsetMultX = (0.9 * wS) / 100
    let coordOffsetMultY = (0.9 * hS) / 100
  
    individualResults
      .map(({ state, result }) => ({ state: state.map(i => i - 1), result }))
      .map(({ state, result }) => {
        let stateX = 10 * state[0] + state[1]
        let stateY = 10 * state[2] + state[3]
        return { x: stateX, y: stateY, result }
      })
      .forEach(({ x, y, result }) => {
        this.ctx.beginPath()
        this.ctx.strokeStyle = result.aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
        this.ctx.fillStyle = result.aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
  
        let adjustedX = drawableLeftS + x * coordOffsetMultX
        let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
        this.ctx.fillRect(adjustedX, adjustedY, coordOffsetMultX, coordOffsetMultY)
  
        this.ctx.fill()
        this.ctx.stroke()
      })
  
    this.statesAxes(drawableLeftS, drawableBottomS, wS, true)
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    let wS = this.ctx.canvas.width
    let hS = this.ctx.canvas.height
    let drawableLeftS = wS * 0.1
    let drawableBottomS = hS * 0.9
    this.statesAxes(drawableLeftS, drawableBottomS, wS, true)
  }

}





// function plotNewBarPoint(newPoint, removedPoint) {
//   barChart.changePoint(newPoint, removedPoint)
// }

// function plotNewStatePoint(newPoint, removedPoint) {
//   statePlot.plotStatePoint(newPoint, removedPoint)
// }