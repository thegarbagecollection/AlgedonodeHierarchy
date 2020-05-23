class LimitedStatePlot {
  constructor(context, colourHandler) {
    this.ctx = context
    this.colourHandler = colourHandler
    this.w = this.ctx.canvas.width
    this.h = this.ctx.canvas.height
    this.drawableLeft = this.w * 0.1
    this.drawableBottom = this.h * 0.9
    // turns a 0-99 into a coordinate fitting within the drawable area
    this.coordOffsetMultX = (0.9 * this.w) / 100
    this.coordOffsetMultY = (0.9 * this.h) / 100
  }

  plotStatePoint(newPoint, removedPoint) {
    if (removedPoint) {
      let { states: statesRemoved, column: columnRemoved, lightRow: lightRowRemoved } = removedPoint
      let { x, y } = this.getXY(statesRemoved)
      this.erasePoint(x, y) // hack: it's not clearing the rectangles fully, no idea why, so we need to erase around them
    }

    if (newPoint) {
      let { states: statesNew, column: columnNew, lightRow: lightRowNew } = newPoint
      let { x, y } = this.getXY(statesNew)
      let colour = lightRowNew === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
      this.drawPoint(x, y, colour)
    }

    this.drawAxes(false) // we need this! because of the rectangle erasing hack, it starts eating away at the axes
  }

  drawPoint(x, y, colour) {
    this.drawPointWithColour(x, y, 0, colour)
  }
  erasePoint(x, y) {
    this.drawPointWithColour(x, y, 1.2, "white")
  }

  drawPointWithColour(x, y, addedSize, colour) {
    this.ctx.beginPath()
    this.ctx.fillStyle = colour
    let adjustedX = this.drawableLeft + x * this.coordOffsetMultX
    let adjustedY = this.drawableBottom - (y + 1) * this.coordOffsetMultY
    this.ctx.fillRect(adjustedX - addedSize / 2, adjustedY - addedSize / 2, this.coordOffsetMultX + addedSize, this.coordOffsetMultY + addedSize)
    this.ctx.stroke()
  }

  getXY(states) {
    let x = 10 * (states[0] - 1) + (states[1] - 1)
    let y = 10 * (states[2] - 1) + (states[3] - 1)
    return { x, y }
  }

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

  clearGraphic() {
    this.ctx.clearRect(0, 0, this.w, this.h)
    this.drawAxes(true)
  }
}
