/**
 * Controls the rendering of the algedonode hierarchy; contains all positions and spacings for
 * the columns and rows, and the corresponding hierarchy component position calculations.
 *
 * elementCentre(r, c) and its resulting { cX, cY } gives the "drawing centre" of the algedonode
 * component group in row r and column c - cX on the border between the algodonode body and the
 * brass pads, and cY at the centreline of the algedonode body and the brass pads.
 */
class AlgedonodeHierarchyRenderer {
  constructor(context, colourHandler) {
    this.ctx = context
    this.colourHandler = colourHandler
    this.columnSpacing = 50 // distance between columns
    this.columnWidth = 10 // width of a single column
    this.rowSpacing = 100 // distance between rows
    this.rowHeight = 30 // height of a single row
    this.row0Y = 100 // starting y of first row
    this.col0X = 100 // starting x of first column
  }

  /**
   * Clear the graphic to the background colour.
   * @public
   */
  clear() {
    let canvas = this.ctx.canvas
    let w = canvas.width
    let h = canvas.height
    this.ctx.fillStyle = this.colourHandler.background
    this.ctx.fillRect(0, 0, w, h)
  }

  /**
   * Label the algedonode columns below the lights from 1 to 8, and label the light rows A and B
   */
  rowAndColumnLabels() {
    let fontSize = this.columnWidth * 2
    for (let i = 0; i < 8; i++) {
      let { cX, cY } = this.elementCentre(4.65, i)
      this.label(`${i + 1}`, cX, cY, fontSize)
    }
    let { cX, cY } = this.elementCentre(4.25, -1)
    this.label(LightTypes.A, cX, cY - 0.4 * this.rowHeight, fontSize)
    this.label(LightTypes.B, cX, cY + 0.5 * this.rowHeight, fontSize)
  }

  /**
   * Draw the metasystem black box; it should cover all the algedonodes and brass pads, leave out the
   * lights, dials, and dial connections, and each strip should be visible on both ends even when at
   * maximum slider distances up and down.
   */
  metasystemBlackBox() {
    let x1 = this.columnSpacing
    let y1 = this.rowSpacing - this.rowHeight * 1.5
    let x2 = this.columnSpacing * 10
    let y2 = this.rowSpacing * 4.5
    this.rectangle({ lineWidth: 0, strokeStyle: null, fillStyle: "black" }, x1, y1, x2 - x1, y2 - y1)
  }

  /**
   * Draw the dial for the given row - a circle outline, filled, containing the required dial value
   * @param {Number} row row for the dial
   * @param {Number} dialValue integer from 1-10 giving the dial value
   */
  dial(row, dialValue) {
    let { cX, cY } = this.elementCentre(row, 9)

    this.circle({ lineWidth: 1, strokeStyle: "black", fillStyle: "white" }, cX, cY, this.rowHeight)

    this.label(dialValue, cX, cY, 40)
  }

  /**
   * Renders the numbered dial output of the given row in the active colour if active and
   * dial output inactive colour if not
   * @param {Number} row the row the owning dial belongs to
   * @param {Boolean} active is this dial output active?
   * @param {Number} outputNum the index of the dial output from 0 to 9
   */
  dialOutput(row, active, outputNum) {
    let { cX, cY } = this.elementCentre(row, 9)

    // We have 2x rowHeight space to work with - rowHeight is radius of parent dial
    // Use 1.5x rowHeight, 5 connections each side, 10 connections total
    let gapBetweenOutputs = (this.rowHeight * 1.5) / 9

    // so 4.5 gaps each side
    let firstContactY = cY - 4.5 * gapBetweenOutputs

    let contactY = firstContactY + outputNum * gapBetweenOutputs

    let lineWidth = 1.3
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.dialOutput
    let start = { x: cX, y: contactY }
    let end = { x: cX - 2 * this.rowHeight, y: contactY }
    this.line({ lineWidth, strokeStyle }, start, end)
  }

  /**
   * Render the strip in the given column at the given offset
   * @param {Number} column column of strip
   * @param {Number} offset offset of strip, in [-1, 1] where negative is moved up and positive is moved down
   */
  strip(column, offset) {
    let { cX, cY } = this.elementCentre(0, column)
    let stripTL = { x: cX - this.columnWidth, y: cY - 2.5 * this.rowHeight + (offset * this.rowHeight) / 2 }
    let height = 3 * this.rowSpacing + 5 * this.rowHeight

    this.rectangle({ lineWidth: 1.0, strokeStyle: this.colourHandler.strip, fillStyle: this.colourHandler.strip }, stripTL.x, stripTL.y, this.columnWidth, height)
  }

  /**
   * Render the given light at the given column, with the given light type (colour) depending on whether it's on or off,
   * drawing the various wires from the connection point depending on which parent component was active - dial or algedonode
   * @param {Light} theLight the light being rendered; required to extract positioning details of the contact point
   * @param {Number} column column of given light
   * @param {LightType} aOrB is the light in light row A or row B?
   * @param {Boolean} active is the light on?
   * @param {ActivationSource} activationSource where was the light activated from, a dial output or an algedonode output? This determines which wires
   * to show as active.
   */
  light(theLight, column, aOrB, active, activationSource) {
    let { cX, cY } = this.elementCentre(4.25, column)
    let rowOffset = this.lightTypeToOffset(aOrB)
    let radius = this.rowHeight / 4
    let y = cY + this.rowHeight * rowOffset

    this.lightConnection(theLight, column, rowOffset, aOrB, active, activationSource)

    let onColour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    let offColour = aOrB === LightTypes.A ? this.colourHandler.lightAOff : this.colourHandler.lightBOff

    let colour = active ? onColour : offColour

    this.circle({ lineWidth: 1, strokeStyle: colour, fillStyle: colour }, cX, y, radius)
  }

  /**
   * Draws the light's contact point, the wire from the contact point to the light, and the wire "from" the dial output to the
   * light, with colouring depending on whether they are on or off
   * @param {Light} theLight the light being rendered; required to extract positioning details of the contact point
   * @param {Number} column column of given light
   * @param {Number} rowOffset offset computed to put the light in the appropriate row
   * @param {LightType} aOrB is the light in light row A or row B?
   * @param {Boolean} active is the light on?
   * @param {ActivationSource} activationSource where was the light activated from, a dial output or an algedonode output? This determines which wires
   */
  lightConnection(theLight, column, rowOffset, aOrB, active, activationSource) {
    // the wire from the contact point to the point it joins the light
    let lineWidth = 1.5
    let strokeStyle = activationSource === ActivationSources.DIAL_OUTPUT ? this.colourHandler.activated : this.colourHandler.dialOutput

    var { x, y } = this.lightConnectionCoords(column, rowOffset, aOrB)
    this.line({ lineWidth, strokeStyle }, { x, y }, { x: x, y: y + this.rowHeight / 4 }, { x: x + this.columnWidth / 4, y: y + this.rowHeight / 4 })

    // the wire coming "from" the dial output
    strokeStyle = active ? this.colourHandler.activated : "black"
    var wjc = this.lightWireJoinCoords(theLight)
    this.line({ lineWidth, strokeStyle }, { x, y }, wjc)
    this.circle({ lineWidth, strokeStyle, fillStyle: strokeStyle }, x, y, 2)
  }

  /**
   * Render the given light at the given column, with the given light type (colour) depending on whether it's on or off;
   * contact points and connecting wires are not drawn (metasystem viewpoint)
   * @param {Number} column column of given light
   * @param {LightType} aOrB is the light in light row A or row B?
   * @param {Boolean} active is the light on?
   */
  metasystemLight(column, aOrB, active) {
    let { cX, cY } = this.elementCentre(4.25, column)
    let rowOffset = this.lightTypeToOffset(aOrB)
    let radius = this.rowHeight / 4
    let y = cY + this.rowHeight * rowOffset

    let onColour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    let offColour = aOrB === LightTypes.A ? this.colourHandler.lightAOff : this.colourHandler.lightBOff

    let colour = active ? onColour : offColour

    this.circle({ lineWidth: 1, strokeStyle: colour, fillStyle: colour }, cX, y, radius)
  }

  /**
   *
   * @param {Number} row
   * @param {Number} column
   * @param {Boolean} active
   */
  algedonode(row, column, active) {
    let { cX, cY } = this.elementCentre(row, column)
    let algTL = { x: cX, y: cY - 0.7 * this.rowHeight }
    let fillStyle = this.colourHandler.algedonode
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.algedonodeEdge
    let lineWidth = 1.0
    this.rectangle({ lineWidth, strokeStyle, fillStyle }, algTL.x, algTL.y, this.columnWidth, this.rowHeight * 1.4)
  }

  /**
   * Render the input portion of this algedonode contact, coming from the dial output. Indicates whether or not the
   * contact is active.
   * @param {Number} row the row of this contact's parent algedonode
   * @param {Number} column the column of this contact's parent algedonode
   * @param {Number} position the vertical position of this contact within the parent algedonode, in (-0.5. 0.5), where
   * the coordinate is a relative multiplier of the algedonode's height; so -0.49 is almost at the top, 0.49 almost at the bottom
   * @param {Boolean} active is this contact active?
   */
  contactAsInputSection(row, column, position, active) {
    let { cX, cY } = this.elementCentre(row, column)

    let x = cX + this.columnWidth
    let y = cY + position * this.rowHeight

    let lineWidth = 1.5
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle }, { x, y }, { x: x + this.columnWidth, y })
  }

  /**
   * Render the output portion of this algedonode contact, coming from the dial output. Indicates whether or not the
   * contact is active as an output (depends on the algedonode being active).
   * @param {Number} row the row of this contact's parent algedonode
   * @param {Number} column the column of this contact's parent algedonode
   * @param {Number} position the vertical position of this contact within the parent algedonode, in (-0.5. 0.5), where
   * the coordinate is a relative multiplier of the algedonode's height; so -0.49 is almost at the top, 0.49 almost at the bottom
   * @param {Boolean} active is this contact active?
   * @param {Boolean} algedonodeActive is this contact's algedonode parent active?
   */
  contactAsContact(row, column, position, active, algedonodeActive) {
    let { cX, cY } = this.elementCentre(row, column)

    let x = cX
    let y = cY + position * this.rowHeight

    let lineWidth = 1.5
    let strokeStyle = active && algedonodeActive ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle }, { x, y }, { x: x - (this.columnWidth * 3) / 4, y })
  }

  /**
   * Render the brass pad pair at the appropriate location on its underlying strip, showing which (if either) of
   * the two pads is active
   * @param {Number} row row of this brass pad pair's parent algedonode
   * @param {Number} column column of this brass pad pair's parent algedonode
   * @param {Number} active which brass pad, if any, is active? -1 for none, 0 for output 0, 1 for output 1
   * @param {Number} offset the offset of the slider this brass pad pair rests on; altering its position will
   * alter the brass pad pair's position
   */
  brassPadPair(row, column, active, offset) {
    // (cX, cY) is centre of algedonode-padpair group
    let { cX, cY } = this.elementCentre(row, column)
    let lx = cX - this.columnWidth
    let yOffset = (offset * this.rowHeight) / 2

    let pad0TL = { x: lx, y: cY - this.rowHeight + yOffset }
    let pad1TL = { x: lx, y: cY + yOffset }

    let padTL = [pad0TL, pad1TL]

    let lineWidth = 1
    let fillStyle = this.colourHandler.brassPad

    for (let i = 0; i < 2; i++) {
      let strokeStyle = i === active ? this.colourHandler.activated : this.colourHandler.brassPadEdge
      this.rectangle({ lineWidth, strokeStyle, fillStyle }, padTL[i].x, padTL[i].y, this.columnWidth, this.rowHeight)
    }

    return { cY, padTL }
  }

  /**
   * Render the brass pad pair at the appropriate location on its underlying strip, showing which (if either) of
   * the two pads is active; also draws connections between the brass pad and the appropriate light contact point
   * @param {Number} row row of this brass pad pair's parent algedonode
   * @param {Number} column column of this brass pad pair's parent algedonode
   * @param {Number} active which brass pad, if any, is active? -1 for none, 0 for output 0, 1 for output 1
   * @param {Number} offset the offset of the slider this brass pad pair rests on; altering its position will
   * alter the brass pad pair's position
   * @param {Light} attachedLight
   */
  brassPadPairLightOutput(row, column, active, offset, attachedLight) {
    let { cY, padTL } = this.brassPadPair(row, column, active, offset)
    this.lightOutputWire(attachedLight, padTL, active)
  }

  /**
   * Render the brass pad pair at the appropriate location on its underlying strip, showing which (if either) of
   * the two pads is active; also draws connections between the brass pad and the place the wires "disappear"
   * when going to an algedonode set activator
   * @param {Number} row row of this brass pad pair's parent algedonode
   * @param {Number} column column of this brass pad pair's parent algedonode
   * @param {Number} active which brass pad, if any, is active? -1 for none, 0 for output 0, 1 for output 1
   * @param {Number} offset the offset of the slider this brass pad pair rests on; altering its position will
   * alter the brass pad pair's position
   */
  brassPadPairNormalOutput(row, column, active, offset) {
    let { cY, padTL } = this.brassPadPair(row, column, active, offset)
    this.standardOutputWire(cY, padTL, active)
  }

  /**
   * Draws the pair of output wires from a bottom row brass pad pair to its corresponding lights; activated wires are displayed
   * in a different colour.
   * @param {[Light, Light]} lightPair the pair of lights to draw output wire to
   * @param {{x:Number, y:Number}} padTL the top-left coordinate of the brass pad pair
   * @param {Number} active which output is active? -1 for none, 0 for output 0, and 1 for output 1
   */
  lightOutputWire(lightPair, padTL, active) {
    let lineWidth = 1
    let multiplierX = [0.8, 0.4]
    let multiplierY = [0.1, 0.9]

    for (let i = 0; i < 2; i++) {
      var { x, y } = this.lightWireJoinCoords(lightPair[i])
      let strokeStyle = i === active ? this.colourHandler.activated : "black"
      let start = { x: padTL[i].x, y: padTL[i].y + multiplierY[i] * this.rowHeight }
      let p1 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: padTL[i].y + multiplierY[i] * this.rowHeight }
      let p2 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: y }
      this.line({ lineWidth, strokeStyle }, start, p1, p2)
    }
  }

  /**
   * Draws the pair of output wires from a brass pad pair to the "disappear" contact point for an algedonode set activator;
   * activated wires are displayed in a different colour.
   * @param {Number} cY centre y coordinate of the algedonode parent
   * @param {{x:Number, y:Number}} padTL the top-left coordinate of the brass pad pair
   * @param {Number} active which output is active? -1 for none, 0 for output 0, and 1 for output 1
   */
  standardOutputWire(cY, padTL, active) {
    let lineWidth = 1

    let multiplierX = [0.8, 0.4]
    let multipliersY = [
      [0.1, 0.3],
      [0.9, -0.3],
    ]

    for (let i = 0; i < 2; i++) {
      let strokeStyle = i === active ? this.colourHandler.activated : "black"
      let start = { x: padTL[i].x, y: padTL[i].y + multipliersY[i][0] * this.rowHeight }
      let p1 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: padTL[i].y + multipliersY[i][0] * this.rowHeight }
      let p2 = { x: padTL[i].x - multiplierX[i] * this.columnWidth, y: cY - multipliersY[i][1] * this.rowHeight }
      this.line({ lineWidth, strokeStyle }, start, p1, p2)
      this.circle({ lineWidth, strokeStyle }, p2.x, p2.y, 2)
    }
  }

  /**
   * Draw the algedonode set activator - a contact point, a wire coming "into it" from the dial, a wire along the
   * top of the algedonodes, and a wire down to each
   * @param {Number} row the row that the algedonode set activator is activated by
   * @param {Number} startColumn the starting column of the algedonodes to activate
   * @param {Array.<Algedonode>} algedonodes the algedonodes to activate
   * @param {ActivationSource} activationSource what is the activation source for this algedonode set activator 
   * @param {Boolean} active is this algedonode set activator active?
   */
  algedonodeSetActivator(row, startColumn, algedonodes, activationSource, active) {
    let { cX, cY } = this.elementCentre(row, startColumn)

    // we want the activator to be above the furthest the top pad can move, start a little to the left of the
    // top output wire, and finish at the midpoint of the final algedonode
    // then other wires come down from it to the top mid of each of the algedonodes

    let connPoint = { x: cX - 2 * this.columnWidth, y: cY + 1.6 * this.rowHeight }

    // draw vertical line at the contact point, "coming" from the dial output direct
    let lineWidth = 1
    let strokeStyleDialOutput = activationSource === ActivationSources.DIAL_OUTPUT ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle: strokeStyleDialOutput }, connPoint, { x: connPoint.x, y: connPoint.y - this.rowHeight / 3.5 })

    // draw contact point
    let styleAlgedonodeSet = active ? this.colourHandler.activated : "black"
    this.circle({ lineWidth, strokeStyle: styleAlgedonodeSet, fillStyle: styleAlgedonodeSet }, connPoint.x, connPoint.y, 2)

    // draw horizontal line from contact point to final algedonode
    let algCoords = algedonodes.map(algedonode => this.elementCentre(algedonode.getRow(), algedonode.getColumn()))
    let lines = []
    let topLineStart = connPoint
    let topLineEnd = { x: algCoords[algCoords.length - 1].cX + this.columnWidth / 2, y: connPoint.y }
    lines.push([topLineStart, topLineEnd])

    // draw vertical lines down to each algedonode from the horizontal
    algCoords.forEach(({ cX, cY }) => {
      let downLineStart = { x: cX + this.columnWidth / 2, y: connPoint.y }
      let downLineEnd = { x: cX + this.columnWidth / 2, y: cY - this.rowHeight / 2 }
      lines.push([downLineStart, downLineEnd])
    })

    this.multiline({ lineWidth, strokeStyle: styleAlgedonodeSet }, lines)
  }

  /**
   * Gives the "drawing centre" of the algedonode component group in row r and column c -
   * cX on the border between the algodonode body and the brass pads, and cY at the
   * centreline of the algedonode body and the brass pads.
   * @param {Number} row row of the component
   * @param {Number} column column of the component
   * @returns {{cX: Number, cY: Number}} the centre position of this (row, column) pair, as described
   */
  elementCentre(row, column) {
    return {
      cX: this.col0X + column * this.columnSpacing,
      cY: this.row0Y + row * this.rowSpacing,
    }
  }

  /**
   * Returns the coordinates at which the wire meets the light from the light contact point
   * @param {Light} light the light to find the join coordinates for
   * @returns {{x: Number, y: Number}} the coordinates of the join point
   */
  lightWireJoinCoords(light) {
    let rowOffset = this.lightTypeToOffset(light.getAorB())
    let column = light.getColumn()
    let { cX, cY } = this.elementCentre(4.25, column)
    let radius = this.rowHeight / 4
    let y = cY + this.rowHeight * rowOffset

    return {
      x: cX - radius,
      y,
    }
  }

  /**
   * Converts a light type to a vertical offset, allowing location within a row
   * @param {LightType} lightType
   * @returns {Number} -0.5 for an A, 0.5 for a B
   *
   */
  lightTypeToOffset(lightType) {
    return lightType === LightTypes.A ? -0.5 : 0.5
  }

  /**
   * Retrieve the contact point for all connections to this light
   * @param {Number} column the column of the light
   * @param {Number} rowOffset the offset of the light (from its A or B designation)
   * @param {LightType} aOrB is the light type A or B?
   * @returns { x: Number, y: Number } the coordinates of the light contact point
   */
  lightConnectionCoords(column, rowOffset, aOrB) {
    let { cX, cY } = this.elementCentre(4.25, column)
    let y = cY + this.rowHeight * rowOffset
    return {
      x: cX - (aOrB === LightTypes.B ? 0.8 : 0.4) * this.columnWidth - this.columnWidth,
      y: y,
    }
  }

  /******************************************************
   * GRAPHICAL HELPER METHODS                           *
   ******************************************************/

  /**
   * @typedef {{x: Number, y: Number}} LineCoords
   */
  /**
   * Draws a series of connected line segments, starting at the given position, and then drawing straight
   * lines to each of the following points in order (so may form polygons, etc)
   * @param {{lineWidth: Number, strokeStyle: String}} param0 the width of the line and its colour / style
   * @param {LineCoords} start start position of the line
   * @param  {...LineCoords} to the subsequent positions to draw lines to
   */
  // start, and each element of to, are objects { x, y }
  line({ lineWidth, strokeStyle }, start, ...to) {
    this.ctx.beginPath()
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeStyle = strokeStyle
    this.ctx.moveTo(start.x, start.y)
    to.forEach(coord => this.ctx.lineTo(coord.x, coord.y))
    this.ctx.stroke()
  }

  /**
   * Draws a number of different sequences of connected line segments, as in {@link line}.
   * @param {{lineWidth: Number, strokeStyle: String}} param0 the width of the line and its colour / style
   * @param {Array.<Array.<LineCoords>>} lines a number of separate lines to draw; each element of the outer array is a line (as array
   * of points), and the line itself starts at the first coordinate of the array and visits each of the subsequent points
   *
   */
  multiline({ lineWidth, strokeStyle }, lines) {
    lines.forEach(l => this.line({ lineWidth, strokeStyle }, l[0], ...l.slice(1, l.length)))
  }

  /**
   * Draw a circle of the given radius, at the given position, using the given styling
   * @param {{lineWidth: Number, strokeStyle: String, fillStyle: String}} param0 the width of the circle outline, its colour / style, and the circle fill colour (may be null for no fill)
   * @param {Number} x the circle's x coordinate
   * @param {Number} y the circle's y coordinate
   * @param {Number} radius the circle's radius
   */
  circle({ lineWidth, strokeStyle, fillStyle }, x, y, radius) {
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeStyle = strokeStyle
    this.ctx.fillStyle = fillStyle
    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI)
    if (fillStyle) this.ctx.fill()
    this.ctx.stroke()
  }

  /**
   * Draws a rectangle of the given width and height, with the given top-left coordinate, using the given styling
   * @param {{lineWidth: Number, strokeStyle: String, fillStyle: String}} param0 the width of the rectangle outline, its colour / style, and the rectangle fill colour (may be null for no fill)
   * @param {Number} tlx x coordinate of the top-left of the rectangle
   * @param {Number} tly y coordinate of the top-left of the rectangle
   * @param {Number} w rectangle's width
   * @param {Number} h rectangle's height
   */
  rectangle({ lineWidth, strokeStyle, fillStyle }, tlx, tly, w, h) {
    this.ctx.lineWidth = lineWidth
    this.ctx.strokeStyle = strokeStyle
    this.ctx.fillStyle = fillStyle
    if (fillStyle) this.ctx.fillRect(tlx, tly, w, h)
    if (strokeStyle) this.ctx.strokeRect(tlx, tly, w, h)
  }

  /**
   * Draw the given label centred at the given position using the given font size
   * @param {String} val the label's text
   * @param {Number} x the x coordinate of the label's centre
   * @param {Number} y the y coordinate of the label's centre
   * @param {Number} fontSize the label's font size
   */
  label(val, x, y, fontSize) {
    this.ctx.beginPath()
    this.ctx.font = "" + fontSize + "px Arial"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    this.ctx.fillStyle = "black"
    this.ctx.fillText(val, x, y)
    this.ctx.stroke()
  }
}
