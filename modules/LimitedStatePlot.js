
class LimitedStatePlot {
    constructor(context, colourHandler) {
      this.ctx = context
      this.colourHandler = colourHandler
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
    
        let adjustedX = drawableLeftS + x * coordOffsetMultX
        let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
        this.ctx.beginPath()
        this.ctx.fillStyle = "white"
        this.ctx.fillRect(adjustedX - 0.6, adjustedY - 0.6, coordOffsetMultX + 1.2, coordOffsetMultY + 1.2) // hack: it's not clearing the rectangles properly, no idea why
      }
    
      if (newPoint) {
        let { states: statesNew, column: columnNew, lightRow: lightRowNew } = newPoint
    
        let x = 10 * (statesNew[0] - 1) + (statesNew[1] - 1)
        let y = 10 * (statesNew[2] - 1) + (statesNew[3] - 1)
        // this.ctx.beginPath()
        // this.ctx.strokeStyle = lightRowNew === "A" ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
        this.ctx.fillStyle = lightRowNew === "A" ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    
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
    
      this.drawAxes(drawableLeftS, drawableBottomS, wS, false) // we need this! because of the rectangle erasing hack, it starts eating away at the axes
    }
  
    drawAxes(drawableLeftS, drawableBottomS, wS, drawText) {
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
          this.ctx.strokeStyle = result.aOrB === LightType.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
          this.ctx.fillStyle = result.aOrB === LightType.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    
          let adjustedX = drawableLeftS + x * coordOffsetMultX
          let adjustedY = drawableBottomS - (y + 1) * coordOffsetMultY
          this.ctx.fillRect(adjustedX, adjustedY, coordOffsetMultX, coordOffsetMultY)
    
          this.ctx.fill()
          this.ctx.stroke()
        })
    
      this.drawAxes(drawableLeftS, drawableBottomS, wS, true)
    }
    
    clearGraphic() {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
      let wS = this.ctx.canvas.width
      let hS = this.ctx.canvas.height
      let drawableLeftS = wS * 0.1
      let drawableBottomS = hS * 0.9
      this.drawAxes(drawableLeftS, drawableBottomS, wS, true)
    }
  
  }