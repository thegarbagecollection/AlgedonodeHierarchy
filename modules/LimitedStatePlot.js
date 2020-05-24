/**
 * A 100x100 grid corresponding to the 10000 possible dial states, where state-result pairs are 
 * plotted by colour. 
 * 
 * X-axis corresponds to [1-10,1-10,_,_], Y-axis to [_,_,1-10,1-10], so a point at
 * x=ab, y=cd represents dial state [a,b,c,d]
 * 
 * New state-result pairs can be entered one at a time, or as a sequence.
 * 
 * State-result pairs are removed by erasing - this plot does not store its own data.
 */
class LimitedStatePlot {
  constructor(context, colourHandler) {
    this.ctx = context
    this.colourHandler = colourHandler
    this.w = this.ctx.canvas.width
    this.h = this.ctx.canvas.height

    // drawable area of the canvas
    this.drawableLeft = this.w * 0.1
    this.drawableBottom = this.h * 0.9

    // turns a 0-99 into a coordinate fitting within the drawable area
    this.coordOffsetMultX = (0.9 * this.w) / 100
    this.coordOffsetMultY = (0.9 * this.h) / 100
  }

  /**
   * Adds and removes points to and from the plot where given by the new and removed state result pairs respectively.
   * @param {StateResultPair} newStateResultPair state result pair to add to the state plot; null if none
   * @param {StateResultPair} removedStateResultPair state result pair to remove from the state plot; null if none 
   * @public
   */
  plotStatePoint(newPoint, removedPoint) {
    if (removedPoint) {
      let { state, result: { lightColumn, aOrB } } = removedPoint
      let { x, y } = this.getXY(state)
      this.erasePoint(x, y) 
    }

    if (newPoint) {
      let { state, result: { lightColumn, aOrB } } = newPoint
      let { x, y } = this.getXY(state)
      let colour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
      this.drawPoint(x, y, colour)
    }

    this.drawAxes(false) // we need this! because of the rectangle erasing hack, it starts eating away at the axes
  }

  /**
   * Draw the point with the given colour at the given plot coordinate, of standard width.
   * @param {Number} x x coordinate of the point to plot, in 0-99
   * @param {Number} y y coordinate of the point to plot, in 0-99
   * @param {String} colour colour for the point
   * @protected
   */
  drawPoint(x, y, colour) {
    this.drawPointWithColour(x, y, 0, colour)
  }

  /**
   * Erases at the given plot coordinate, using a width slightly bigger than the standard point.
   * @param {Number} x x coordinate of the point to erase, in 0-99
   * @param {Number} y y coordinate of the point to erase, in 0-99
   * @protected
   */
  erasePoint(x, y) {
    // 1.2 width multiplier is a hack: it's not clearing the rectangles fully, no idea why, so we need to erase around them
    this.drawPointWithColour(x, y, 1.2, "white")
  }

  /**
   * Draw the point with the given colour centred at the given plot coordinate, with optional 
   * added size.
   * @param {Number} x x coordinate of the point to plot, in 0-99
   * @param {Number} y y coordinate of the point to plot, in 0-99
   * @param {Number} addedSize additional size to be added onto the point in both dimensions
   * @param {String} colour colour for the point
   * @protected
   */
  drawPointWithColour(x, y, addedSize, colour) {
    this.ctx.beginPath()
    this.ctx.fillStyle = colour
    let adjustedX = this.drawableLeft + x * this.coordOffsetMultX
    let adjustedY = this.drawableBottom - (y + 1) * this.coordOffsetMultY
    this.ctx.fillRect(adjustedX - addedSize / 2, adjustedY - addedSize / 2, this.coordOffsetMultX + addedSize, this.coordOffsetMultY + addedSize)
    this.ctx.stroke()
  }

  /**
   * Convert a dial state to an (x,y)-coordinate pair on the grid
   * @param {DialStates} states dial states to convert
   * @returns {{x: Number, y: Number}} converted coordinate points for this dial state, both in 0-99 
   * @protected
   */
  getXY(states) {
    let x = 10 * (states[0] - 1) + (states[1] - 1)
    let y = 10 * (states[2] - 1) + (states[3] - 1)
    return { x, y }
  }

  /**
   * Draw the axes and labels.
   * @param {String} drawText 
   * @public
   */
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

  /**
   * Clears the state plot, and plots all the given state-result pairs.
   * @param {Array.<StateResultPair>} individualResults the state-result pairs to plot
   * @public
   */
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

  /**
   * Clear state plot.
   * @public
   */
  clearGraphic() {
    this.ctx.clearRect(0, 0, this.w, this.h)
    this.drawAxes(true)
  }
}
