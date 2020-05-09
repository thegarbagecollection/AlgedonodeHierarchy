class SmallDataStore {
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
  
      // a timestep is triggered by an enqueue 
      // just going to assume that no-one runs it until it hits overflow, that'll be fine
      this.timeStep = 0
    }
  
    // enqueue new data item
    // if exceeds length, dequeue the oldest
    // returns null if didn't exceed length,
    // and {states,column,lightRow} if that state was
    // dequeued and nothing newer existed for
    // that state
    enqueue(states, column, lightRow) {
      let s = this.statesToInteger(states)
      
      // overwrite old timestep, we've got new data for this state
      this.timeSteps[s] = this.timeStep
  
      let prevHead = this.headMark.prev
      let newItem = {
        prev: prevHead,
        next: this.headMark,
        states,
        column,
        lightRow
      }
      this.headMark.prev = newItem
      prevHead.next = newItem
  
      this.length++
      this.timeStep++
      if (this.length > this.maxSize) {
        return this.dequeue()
      }
    }
  
    // returns {states,column,lightRow} if that state was
    // dequeued and nothing newer existed for
    // that state, and null otherwise
    dequeue() {
      if (this.tailMark.next === this.headMark) return null // nothing to dequeue
  
      let { next, states, column, lightRow } = this.tailMark.next // prev is tailMark, not needed
  
      this.tailMark.next = next
      next.prev = this.tailMark
  
      this.length--
  
      let s = this.statesToInteger(states)
      // compare the timeSteps, there might be a newer timestep somewhere in the list for this state
      // in which case we don't want to remove it from the plot, just from the data store
      // this might be off by one, but doesn't matter too much as long as it's in the right direction!
      if (this.timeStep - this.timeSteps[s] >= this.maxSize) { 
        return { states, column, lightRow }
      }
      else {
        return null
      }
  
    }
  
    // given a number of dequeues to perform
    // returns nested array [{states1,column1,lightRow1}, ..., {states_n,column_n,lightRow_n}], one element for each state that
    // was dequeued with nothing newer coming in for that state; empty array otherwise
    multiDequeue(toRemove) {
      console.log(`Multi-dequeueing ${toRemove} items`)
      if (toRemove <= 0) return []
      // an array will map on a null, but not on an undefined...
      let ret = new Array(toRemove).fill(null).map(_ => this.dequeue()).filter( v => v !== null) // for shits and giggles
      return ret
    }
  
    // given a new maximum size for this data store
    // returns nested array [{states1,column1,lightRow1}, ..., {states_n,column_n,lightRow_n}], one element for each state that
    // was dequeued with nothing newer coming in for that state; empty array otherwise
    resize(newMaxSize) {
      if (newMaxSize >= this.maxSize) {
        this.maxSize = newMaxSize
        return null
      }
      else {
        // let oldMaxSize = this.maxSize
        // this.maxSize = newMaxSize
        // return this.multiDequeue(oldMaxSize - newMaxSize)
        this.maxSize = newMaxSize
        return this.multiDequeue(this.length - this.maxSize)
      }
    }
  
    // returns nested array [{states1,column1,lightRow1}, ..., {states_n,column_n,lightRow_n}], one element for each state that
    // was dequeued with nothing newer coming in for that state; empty array otherwise
    clear() {
      let restoreMaxSize = this.maxSize
      this.resize(0)
      this.resize(restoreMaxSize)
    }
  
    // takes an array of [1-10, 1-10, 1-10, 1-10] and returns the corresponding integer in [0, 9999]
    statesToInteger(states) {
      return 1000 * (states[0] - 1) + 100 * (states[1] - 1) + 10 * (states[2] - 1) + (states[3] - 1)
    }
  }
  


  class LimitedBarChart {
    constructor() {
      this.barData = new Array(8).fill(null).map( _ => { return { "A": 0, "B": 0 } }) // one per column
      this.totalFrequencyData = { "A": 0, "B": 0 }
      this.totalFrequencyDataCount = 0
  
      this.stateMapping = new Array(10000).fill(null)
    }
    statesToInteger(states) {
      // TODO: pull this out
      return 1000 * (states[0] - 1) + 100 * (states[1] - 1) + 10 * (states[2] - 1) + (states[3] - 1)
    }
  
    clear() {
      this.barData = new Array(8).fill(null).map( _ => { return { "A": 0, "B": 0 } }) // one per column
      this.totalFrequencyData = { "A": 0, "B": 0 }
      this.totalFrequencyDataCount = 0
  
      this.stateMapping = new Array(10000).fill(null)
  
  
  
      let w = plotCtx.canvas.width
      let h = plotCtx.canvas.height
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
  
          this.barData[column][lightRow] --
        }
        else {
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
            this.totalFrequencyData[lightRow] ++
            this.barData[column][lightRow] ++
          }
          else {
            if (stored.lightRow !== lightRow) {
              this.totalFrequencyData[stored.lightRow] --
              this.totalFrequencyData[lightRow] ++
            }
            // should work for all 3 cases
            this.barData[stored.column][stored.lightRow] --
            this.barData[column][lightRow] ++
  
          }
        }
      }
  
      this.drawBarAndFrequency(newPoint ? newPoint.column : null, removedPoint ? removedPoint.column : null)
    }
  
    addToStored(statesInt, column, lightRow) {
      this.stateMapping[statesInt] = { column, lightRow }
    }
  
    drawBarAndFrequency(columnAddedTo, columnRemovedFrom) {
  
      let w = plotCtx.canvas.width
      let h = plotCtx.canvas.height
        
    
      let maxDrawH = 0.8 * h
    
      // we need one column for each number, a space, and another 2 columns
      // for comparing red vs. green
    
      let barColumnW = w / 11.5
  
      // clear full rectangle around columns
  
  
      // and one around total frequencies
      plotCtx.clearRect(9 * barColumnW, 0, 2 * barColumnW, maxDrawH)
  
  
      // and redraw the bar column and the total frequencies
  
      // only do "removed" if it's not the one added to. 
      // note: a light might be shifting colour within a column, so we still need to render if columnAddedTo = columnRemovedFrom
      // distinguishing null here, since 0 counts as false
  
  
      if (columnRemovedFrom !== null && columnAddedTo !== columnRemovedFrom) {
        plotCtx.clearRect(columnRemovedFrom * barColumnW, 0, barColumnW, maxDrawH)
        let { "A": aCount, "B": bCount } = this.barData[columnRemovedFrom]
        let rH = maxDrawH * aCount / this.totalFrequencyDataCount
        let gH = maxDrawH * bCount / this.totalFrequencyDataCount
  
        plotCtx.beginPath()
        plotCtx.fillStyle = coloursCurrent.lightAOn
        plotCtx.fillRect(columnRemovedFrom * barColumnW + barColumnW / 9, maxDrawH - rH, barColumnW / 2 - barColumnW / 9, rH)
        plotCtx.stroke()
      
        plotCtx.beginPath()
        plotCtx.fillStyle = coloursCurrent.lightBOn
        plotCtx.fillRect(columnRemovedFrom * barColumnW + (barColumnW / 2), maxDrawH - gH, barColumnW / 2 - barColumnW / 9, gH)
        plotCtx.stroke()
      }
      
      if (columnAddedTo !== null) {
        
        plotCtx.clearRect(columnAddedTo * barColumnW, 0, barColumnW, maxDrawH)
        let { "A": aCount, "B": bCount } = this.barData[columnAddedTo]
        let rH = maxDrawH * aCount / this.totalFrequencyDataCount
        let gH = maxDrawH * bCount / this.totalFrequencyDataCount
  
        plotCtx.beginPath()
        plotCtx.fillStyle = coloursCurrent.lightAOn
        plotCtx.fillRect(columnAddedTo * barColumnW + barColumnW / 9, maxDrawH - rH, barColumnW / 2 - barColumnW / 9, rH)
        plotCtx.stroke()
      
        plotCtx.beginPath()
        plotCtx.fillStyle = coloursCurrent.lightBOn
        plotCtx.fillRect(columnAddedTo * barColumnW + (barColumnW / 2), maxDrawH - gH, barColumnW / 2 - barColumnW / 9, gH)
        plotCtx.stroke()
      }
  
  
  
    
      // total frequencies here
    
  
      let totalLightA = this.totalFrequencyData["A"]
      let totalLightB = this.totalFrequencyData["B"]
  
      plotCtx.beginPath()
      plotCtx.fillStyle = coloursCurrent.lightAOn
      plotCtx.fillRect(9 * barColumnW + barColumnW / 9, maxDrawH - (maxDrawH * totalLightA / this.totalFrequencyDataCount), barColumnW - barColumnW / 9, (maxDrawH * totalLightA / this.totalFrequencyDataCount))
      plotCtx.stroke()
    
      plotCtx.beginPath()
      plotCtx.fillStyle = coloursCurrent.lightBOn
      plotCtx.fillRect(10 * barColumnW, maxDrawH - (maxDrawH * totalLightB / this.totalFrequencyDataCount), barColumnW - barColumnW / 9, (maxDrawH * totalLightB / this.totalFrequencyDataCount))
      plotCtx.stroke()
    
  
    }
  
    drawAxes(w, h, barColumnW, maxDrawH) {
      plotCtx.beginPath()
      plotCtx.fillStyle = "black"
      plotCtx.font = "" + (0.15 * h) + "px Arial"
      plotCtx.textAlign = "center"
      plotCtx.textBaseline = "bottom"
      plotCtx.fillText(`A`, 9 * barColumnW + (barColumnW / 2), 0.99 * h)
      plotCtx.fillText(`B`, 10 * barColumnW + (barColumnW / 2), 0.99 * h)
      plotCtx.stroke()
      for (let i = 0; i < 8; i++) {
        plotCtx.beginPath()
        plotCtx.fillStyle = "black"
        plotCtx.font = "" + (0.15 * h) + "px Arial"
        plotCtx.textAlign = "center"
        plotCtx.textBaseline = "bottom"
        plotCtx.fillText(`${i + 1}`, i * barColumnW + (barColumnW / 2), 0.99 * h)
        plotCtx.stroke()
      }
  
  
      plotCtx.beginPath()
      plotCtx.strokeStyle = "black"
      plotCtx.moveTo(0, maxDrawH * 1.01)
      plotCtx.lineTo(w, maxDrawH * 1.01)
      plotCtx.moveTo(8 * barColumnW + (barColumnW / 2), h)
      plotCtx.lineTo(8 * barColumnW + (barColumnW / 2), 0)
      plotCtx.stroke()
    }
  }
  
  


  function plotNewBarPoint( newPoint, removedPoint) {
    barChart.changePoint(newPoint, removedPoint)
  }
  
  function plotStatePoint(newPoint, removedPoint) {
    // And the state results
    let wS = statesCtx.canvas.width
    let hS = statesCtx.canvas.height
    
    let drawableLeftS = wS * 0.1
    let drawableBottomS = hS * 0.9
  
    // turns a 0-99 into a coordinate fitting within the drawable area
    let coordOffsetMultX = 0.9 * wS / 100
    let coordOffsetMultY = 0.9 * hS / 100
  
  
    if (removedPoint) {
      let { states: statesRemoved, column: columnRemoved, lightRow: lightRowRemoved} = removedPoint
      let x = 10 * (statesRemoved[0] - 1) + (statesRemoved[1] - 1)
      let y = 10 * (statesRemoved[2] - 1) + (statesRemoved[3] - 1)
  
      statesCtx.beginPath()
     
      // let adjustedX = drawableLeftS + x * coordOffsetMultX
      // let adjustedY = drawableBottomS - y * coordOffsetMultY
    
      // statesCtx.arc(adjustedX, adjustedY, 0.5 * coordOffsetMultX, 0, 2 * Math.PI)
    
      let adjustedX = drawableLeftS + x * coordOffsetMultX
      let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
      statesCtx.beginPath()
      statesCtx.fillStyle = "white"
      statesCtx.fillRect(adjustedX - 0.6, adjustedY - 0.6, coordOffsetMultX + 1.2, coordOffsetMultY + 1.2) // hack: it's not clearing the rectangles properly, no idea why
      //statesCtx.stroke()
    }
  
  
    if (newPoint) {
      let { states: statesNew, column: columnNew, lightRow: lightRowNew} = newPoint
  
      let x = 10 * (statesNew[0] - 1) + (statesNew[1] - 1)
      let y = 10 * (statesNew[2] - 1) + (statesNew[3] - 1)
      // statesCtx.beginPath()
      // statesCtx.strokeStyle = lightRowNew === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
      statesCtx.fillStyle = lightRowNew === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
  
      // let adjustedX = drawableLeftS + x * coordOffsetMultX
      // let adjustedY = drawableBottomS - y * coordOffsetMultY
  
      // statesCtx.arc(adjustedX, adjustedY, 0.5 * coordOffsetMultX, 0, 2 * Math.PI)
  
      let adjustedX = drawableLeftS + x * coordOffsetMultX
      let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
      statesCtx.fillRect(adjustedX, adjustedY, coordOffsetMultX, coordOffsetMultY) 
      //statesCtx.strokeRect(adjustedX, adjustedY, coordOffsetMultX, coordOffsetMultY) 
      //statesCtx.fill()
      //statesCtx.stroke()
    }
  
    statesAxes(drawableLeftS, drawableBottomS, wS, false) // we need this! because of the rectangle erasing hack, it starts eating away at the axes
  
  }
  
  
  
  
  
function statesAxes(drawableLeftS, drawableBottomS, wS, drawText) {
    statesCtx.beginPath()
    statesCtx.strokeStyle = "black"
    statesCtx.moveTo(drawableLeftS - 1, 0)
    statesCtx.lineTo(drawableLeftS - 1, drawableBottomS + 1)
    statesCtx.lineTo(wS, drawableBottomS + 1)
    if (drawText) {
        statesCtx.fillStyle = "black"
        statesCtx.textAlign = "left"
        statesCtx.textBaseline = "bottom"
        statesCtx.fillText("_ _ 1 1", 0, drawableBottomS, drawableLeftS * 0.95)
        statesCtx.textAlign = "left"
        statesCtx.textBaseline = "top"
        statesCtx.fillText("_ _ 10 10", 0, 0, drawableLeftS * 0.95)
        statesCtx.textAlign = "left"
        statesCtx.textBaseline = "top"
        statesCtx.fillText("1 1 _ _", drawableLeftS, drawableBottomS * 1.01)
        statesCtx.textAlign = "right"
        statesCtx.textBaseline = "top"
        statesCtx.fillText("10 10 _ _", wS, drawableBottomS * 1.01)
        statesCtx.stroke()
    }
}
  
  function drawPlot({ counts, individualResults }, plotCtx, statesCtx) {
    
    let w = plotCtx.canvas.width
    let h = plotCtx.canvas.height
    plotCtx.clearRect(0,0, w, h)
  
  
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
      let rH = maxDrawH * aCount / 10000
      let gH = maxDrawH * bCount / 10000
      plotCtx.beginPath()
      plotCtx.fillStyle = coloursCurrent.lightAOn
      plotCtx.fillRect(i * barColumnW + barColumnW / 9, maxDrawH - rH, barColumnW / 2 - barColumnW / 9, rH)
      plotCtx.stroke()
  
      plotCtx.beginPath()
      plotCtx.fillStyle = coloursCurrent.lightBOn
      plotCtx.fillRect(i * barColumnW + (barColumnW / 2), maxDrawH - gH, barColumnW / 2 - barColumnW / 9, gH)
      plotCtx.stroke()
  
      plotCtx.beginPath()
      plotCtx.fillStyle = "black"
      plotCtx.font = "" + (0.15 * h) + "px Arial"
      plotCtx.textAlign = "center"
      plotCtx.textBaseline = "bottom"
      plotCtx.fillText(`${i + 1}`, i * barColumnW + (barColumnW / 2), 0.99 * h)
      plotCtx.stroke()
    }
  
  
    plotCtx.beginPath()
    plotCtx.strokeStyle = "black"
    plotCtx.moveTo(0, maxDrawH * 1.01)
    plotCtx.lineTo(w, maxDrawH * 1.01)
    plotCtx.moveTo(8 * barColumnW + (barColumnW / 2), h)
    plotCtx.lineTo(8 * barColumnW + (barColumnW / 2), 0)
    plotCtx.stroke()
  
    plotCtx.beginPath()
    plotCtx.fillStyle = coloursCurrent.lightAOn
    plotCtx.fillRect(9 * barColumnW + barColumnW / 9, maxDrawH - (maxDrawH * totalLightA / 10000), barColumnW - barColumnW / 9, (maxDrawH * totalLightA / 10000))
    plotCtx.stroke()
  
    plotCtx.beginPath()
    plotCtx.fillStyle = coloursCurrent.lightBOn
    plotCtx.fillRect(10 * barColumnW, maxDrawH - (maxDrawH * totalLightB / 10000), barColumnW - barColumnW / 9, (maxDrawH * totalLightB / 10000))
    plotCtx.stroke()
  
    plotCtx.beginPath()
    plotCtx.fillStyle = "black"
    plotCtx.font = "" + (0.15 * h) + "px Arial"
    plotCtx.textAlign = "center"
    plotCtx.textBaseline = "bottom"
    plotCtx.fillText(`A`, 9 * barColumnW + (barColumnW / 2), 0.99 * h)
    plotCtx.fillText(`B`, 10 * barColumnW + (barColumnW / 2), 0.99 * h)
    plotCtx.stroke()
  
  
    // And the state results
    let wS = statesCtx.canvas.width
    let hS = statesCtx.canvas.height
    statesCtx.clearRect(0, 0, wS, hS)
  
    let drawableLeftS = wS * 0.1
    let drawableBottomS = hS * 0.9
  
    // turns a 0-99 into a coordinate fitting within the drawable area
    let coordOffsetMultX = 0.9 * wS / 100
    let coordOffsetMultY = 0.9 * hS / 100
  
    individualResults
      .map(({ state, result }) => ({ state: state.map(i => i - 1), result }))
      .map(({ state, result }) => { 
        let stateX = 10 * state[0] + state[1]
        let stateY = 10 * state[2] + state[3]
        return { x: stateX, y: stateY, result } 
      })
      .forEach(({ x, y, result }) => {
        statesCtx.beginPath()
        statesCtx.strokeStyle = result.aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
        statesCtx.fillStyle = result.aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
  
        // let adjustedX = drawableLeftS + x * coordOffsetMultX
        // let adjustedY = drawableBottomS - y * coordOffsetMultY
  
        // statesCtx.arc(adjustedX, adjustedY, 0.5 * coordOffsetMultX, 0, 2 * Math.PI)
  
        let adjustedX = drawableLeftS + x * coordOffsetMultX
        let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
        statesCtx.fillRect(adjustedX, adjustedY, coordOffsetMultX, coordOffsetMultY) 
  
        statesCtx.fill()
        statesCtx.stroke()
      })
  
  
  
    statesAxes(drawableLeftS, drawableBottomS, wS, true)
  
  }