class AlgedonodeHierarchyRenderer {
  constructor(context, colourHandler) {
    this.ctx = context
    this.colourHandler = colourHandler
    this.positionInfo = {
      columnSpacing: 50, // distance between columns
      columnWidth: 10, // width of a single column
      rowSpacing: 100, // distance between rows
      rowHeight: 30, // height of a single row
    }
  }

  clear() {
    let canvas = this.ctx.canvas
    let w = canvas.width
    let h = canvas.height
    this.ctx.fillStyle = this.colourHandler.background
    this.ctx.fillRect(0, 0, w, h)
  }

  rowAndColumnLabels() {
    let fontSize = this.positionInfo.columnWidth * 2
    for (let i = 0; i < 8; i++) {
      let { cX, cY } = this.elementCentre(4.65, i, this.positionInfo)
      this.label(`${i + 1}`, cX, cY, fontSize)
    }
    let { cX, cY } = this.elementCentre(4.25, -1, this.positionInfo)
    this.label(LightTypes.A, cX, cY - 0.4 * this.positionInfo.rowHeight, fontSize)
    this.label(LightTypes.B, cX, cY + 0.5 * this.positionInfo.rowHeight, fontSize)
  }


  metasystemBlackBox() {
    let x1 = this.positionInfo.columnSpacing
    let y1 = this.positionInfo.rowSpacing - this.positionInfo.rowHeight * 1.5
    let x2 = this.positionInfo.columnSpacing * 10
    let y2 = this.positionInfo.rowSpacing * 4.5
    this.rectangle({ lineWidth: 0, strokeStyle: null, fillStyle: "black"}, x1, y1, x2 - x1, y2 - y1)
  }

  dial(row, textValue) {
    let { cX, cY } = this.elementCentre(row, 9, this.positionInfo)
  
    this.circle({ lineWidth: 1, strokeStyle: "black", fillStyle: "white"}, cX, cY, this.positionInfo.rowHeight)

    this.label(textValue, cX, cY, 40)
  }

  dialOutput(row, active, outputNum) {
    let {cX, cY} =this.elementCentre(row, 9, this.positionInfo)
  
    // We have 2x rowHeight space to work with - rowHeight is radius of parent dial
    // Use 1.5x rowHeight, 5 connections each side, 10 connections total
    let gapBetweenOutputs = this.positionInfo.rowHeight * 1.5 / 9

    // so 4.5 gaps each side
    let firstContactY = cY - 4.5 * gapBetweenOutputs

    let contactY = firstContactY + outputNum * gapBetweenOutputs

    let lineWidth = 1.3
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.dialOutput
    let start = {x: cX, y: contactY }
    let end = { x: cX - 2 * this.positionInfo.rowHeight, y: contactY}
    this.line({lineWidth, strokeStyle}, start, end)
  }

  strip(column, offset) {
    let { cX, cY } =this.elementCentre(0, column, this.positionInfo)
    // let stripTL = { x: cX - columnWidth, y: cY - (5 * rowHeight / 4) + (this.offset * rowHeight / 2)}
    let stripTL = { x: cX - this.positionInfo.columnWidth, y: cY - 2.5 * this.positionInfo.rowHeight + (offset * this.positionInfo.rowHeight / 2)}
    let height = 3 * this.positionInfo.rowSpacing + 5 * this.positionInfo.rowHeight

    this.rectangle({lineWidth: 1.0, strokeStyle: this.colourHandler.strip, fillStyle: this.colourHandler.strip}, 
        stripTL.x, stripTL.y, this.positionInfo.columnWidth, height)
  }

  light(theLight, column, aOrB, active, activationSource) {
    let {cX, cY} = this.elementCentre(4.25, column, this.positionInfo)
    let rowOffset = this.lightTypeToOffset(aOrB)
    let radius = this.positionInfo.rowHeight / 4
    let y = cY + this.positionInfo.rowHeight * rowOffset

    this.lightConnection(theLight, column, rowOffset, aOrB, active, activationSource)

    let onColour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    let offColour = aOrB === LightTypes.A ? this.colourHandler.lightAOff : this.colourHandler.lightBOff

    let colour = active ? onColour : offColour

    this.circle({ lineWidth: 1, strokeStyle: colour, fillStyle: colour}, cX, y, radius)
  }

  lightConnection(theLight, column, rowOffset, aOrB, active, activationSource) {
    let lineWidth = 1.5
    let strokeStyle = activationSource === ActivationSource.DIAL_OUTPUT ? this.colourHandler.activated : this.colourHandler.dialOutput

    var {x, y} = this.lightConnectionCoords(column, rowOffset, aOrB)
    this.line({lineWidth, strokeStyle}, 
        {x, y}, 
        {x:x, y:y + this.positionInfo.rowHeight / 4}, 
        {x:x + this.positionInfo.columnWidth / 4, y:y + this.positionInfo.rowHeight / 4 })

    strokeStyle = active ? this.colourHandler.activated : "black"
    var wjc = this.lightWireJoinCoords(theLight)
    this.line({lineWidth, strokeStyle}, {x, y}, wjc)
    this.circle({lineWidth, strokeStyle, fillStyle: strokeStyle}, x, y, 2)
  }

  metasystemLight(column, aOrB, active) {
    let {cX, cY} = this.elementCentre(4.25, column, this.positionInfo)
    let rowOffset = this.lightTypeToOffset(aOrB)
    let radius = this.positionInfo.rowHeight / 4
    let y = cY + this.positionInfo.rowHeight * rowOffset

    let onColour = aOrB === LightTypes.A ? this.colourHandler.lightAOn : this.colourHandler.lightBOn
    let offColour = aOrB === LightTypes.A ? this.colourHandler.lightAOff : this.colourHandler.lightBOff

    let colour = active ? onColour : offColour

    this.circle({ lineWidth: 1, strokeStyle: colour, fillStyle: colour}, cX, y, radius)
  }

  algedonode(row, column, active) {
    let {cX, cY} =this.elementCentre(row, column, this.positionInfo)
    let algTL = { x: cX, y: cY - (0.7 * this.positionInfo.rowHeight) }
    let fillStyle = this.colourHandler.algedonode
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.algedonodeEdge
    let lineWidth = 1.0
    this.rectangle({lineWidth, strokeStyle, fillStyle}, algTL.x, algTL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight * 1.4)
  }

  contactAsInputSection(row, column, position, active) {
    let {cX, cY} = this.elementCentre(row, column, this.positionInfo)
  
    let x = cX + this.positionInfo.columnWidth
    let y = cY + position * this.positionInfo.rowHeight

    let lineWidth = 1.5
    let strokeStyle = active ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle }, {x, y}, {x: x + this.positionInfo.columnWidth , y})
  }

  contactAsContact(row, column, position, active, algedonodeActive) {
    let {cX, cY} =this.elementCentre(row, column, this.positionInfo)
  
    let x = cX
    let y = cY + position * this.positionInfo.rowHeight

    let lineWidth = 1.5
    let strokeStyle = active && algedonodeActive ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({lineWidth, strokeStyle}, {x, y}, {x: x - this.positionInfo.columnWidth * 3 / 4, y} )
  }

  brassPadPair(row, column, active, offset, attachedLight) {
    // (cX, cY) is centre of algedonode-padpair group
    let {cX, cY} =this.elementCentre(row, column, this.positionInfo)
    let lx = cX - this.positionInfo.columnWidth
    let yOffset = offset * this.positionInfo.rowHeight / 2

    let pad0TL = { x: lx, y: cY - this.positionInfo.rowHeight + yOffset}
    let pad1TL = { x: lx, y: cY + yOffset}

    let padTL = [pad0TL, pad1TL]

    let lineWidth = 1
    let fillStyle = this.colourHandler.brassPad

    for (let i = 0; i < 2; i++) {
        let strokeStyle = active[i] ? this.colourHandler.activated : this.colourHandler.brassPadEdge
        this.rectangle({lineWidth, strokeStyle, fillStyle}, padTL[i].x, padTL[i].y, this.positionInfo.columnWidth, this.positionInfo.rowHeight)
    }

    if (attachedLight) {
        this.lightOutputWire(attachedLight, padTL, active)
    }
    else {
        this.standardOutputWire(cY, padTL, active)
    }
  }

  lightOutputWire(lightPair, padTL, active) {

    let lineWidth = 1
    let multiplierX = [0.8, 0.4]
    let multiplierY = [0.1, 0.9]

    for (let i = 0; i < 2; i++) {
        var {x, y} = this.lightWireJoinCoords(lightPair[i])
        let strokeStyle = active[i] ? this.colourHandler.activated : "black"
        let start = { x: padTL[i].x, y: padTL[i].y + multiplierY[i] * this.positionInfo.rowHeight }
        let p1 = {x: padTL[i].x - multiplierX[i] * this.positionInfo.columnWidth,  y: padTL[i].y + multiplierY[i] * this.positionInfo.rowHeight }
        let p2 = {x: padTL[i].x - multiplierX[i] * this.positionInfo.columnWidth, y: y }
        this.line({ lineWidth, strokeStyle }, start, p1, p2)
    }

  }

  standardOutputWire(cY, padTL, active) {
    let lineWidth = 1

    let multiplierX = [0.8, 0.4]
    let multipliersY = [[0.1, 0.3], [0.9, -0.3]]

    for (let i = 0; i < 2; i++) {
        let strokeStyle = active[i] ? this.colourHandler.activated : "black"
        let start = {x: padTL[i].x, y: padTL[i].y + multipliersY[i][0] * this.positionInfo.rowHeight}
        let p1 = {x: padTL[i].x - multiplierX[i] * this.positionInfo.columnWidth, y: padTL[i].y + multipliersY[i][0] * this.positionInfo.rowHeight}
        let p2 = {x: padTL[i].x - multiplierX[i] * this.positionInfo.columnWidth, y: cY - multipliersY[i][1] * this.positionInfo.rowHeight}
        this.line({lineWidth, strokeStyle}, start, p1, p2)
        this.circle({lineWidth, strokeStyle}, p2.x, p2.y, 2)
    }
  }

  algedonodeSetActivator(row, startColumn, algedonodes, activationSource, active) {
    let {cX, cY} =this.elementCentre(row, startColumn, this.positionInfo)
  
    // we want the activator to be above the furthest the top pad can move, start a little to the left of the 
    // top output wire, and finish at the midpoint of the final algedonode
    // then other wires come down from it to the top mid of each of the algedonodes

    let connPoint = { x: cX - 2 * this.positionInfo.columnWidth, y: cY + 1.6 * this.positionInfo.rowHeight }

    let lineWidth = 1
    let strokeStyleDialOutput = activationSource === ActivationSource.DIAL_OUTPUT ? this.colourHandler.activated : this.colourHandler.dialOutput
    this.line({ lineWidth, strokeStyle: strokeStyleDialOutput }, connPoint, {x : connPoint.x, y: connPoint.y - this.positionInfo.rowHeight / 3.5})

    let styleAlgedonodeSet = active ? this.colourHandler.activated : "black"
    this.circle({ lineWidth, strokeStyle: styleAlgedonodeSet, fillStyle: styleAlgedonodeSet }, connPoint.x, connPoint.y, 2)


    let algCoords = algedonodes.map(algedonode => this.getXPos(algedonode.getRow(), algedonode.getColumn())) 
    let lines = []
    let topLineStart = connPoint
    let topLineEnd = {x: algCoords[algCoords.length - 1].x + this.positionInfo.columnWidth / 2, y: connPoint.y }
    lines.push([topLineStart, topLineEnd])

    
    algCoords.forEach(({x, y}) => {
        let downLineStart = {x: x + this.positionInfo.columnWidth / 2, y: connPoint.y}
        let downLineEnd = {x: x + this.positionInfo.columnWidth / 2, y: y - this.positionInfo.rowHeight / 2}
        lines.push([downLineStart, downLineEnd])
    })

    this.multiline({ lineWidth, strokeStyle: styleAlgedonodeSet}, lines)

  }

  getXPos(row, column) {
    let {cX, cY} =this.elementCentre(row, column, this.positionInfo)
    return { x: cX, y: cY }
  }

  elementCentre(row, column, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    // offsets are the starting point
    let rowOffset = 100
    let columnOffset = 100
    return {
      cX: columnOffset + column * columnSpacing,
      cY: rowOffset + row * rowSpacing,
    }
  }

  lightWireJoinCoords(light) {
    let rowOffset = this.lightTypeToOffset(light.getAorB())
    let column = light.getColumn()
    let {cX, cY} =this.elementCentre(4.25, column, this.positionInfo)
    let radius = this.positionInfo.rowHeight / 4
    let y = cY + this.positionInfo.rowHeight * rowOffset

    return {
      x: cX - radius,
      y
    }
  }

  lightTypeToOffset(lightType) {
      return lightType === LightTypes.A ? -0.5 : 0.5
  }

  lightConnectionCoords(column, rowOffset, aOrB) {
    let {cX, cY} =this.elementCentre(4.25, column, this.positionInfo)
    let y = cY + this.positionInfo.rowHeight * rowOffset
    return {
      x: cX - (aOrB === LightTypes.B ? 0.8 : 0.4) * this.positionInfo.columnWidth - this.positionInfo.columnWidth, 
      y: y
    }
  }

    // start, and each element of to, are objects { x, y }
    line({lineWidth, strokeStyle}, start, ...to) {
        this.ctx.beginPath()
        this.ctx.lineWidth = lineWidth
        this.ctx.strokeStyle = strokeStyle
        this.ctx.moveTo(start.x, start.y)
        to.forEach((coord) => this.ctx.lineTo(coord.x, coord.y))
        this.ctx.stroke()
    }

    multiline({lineWidth, strokeStyle}, lines) {
        lines.forEach(l => this.line({lineWidth, strokeStyle}, l[0], ...l.slice(1, l.length)))
    }

    // fillStyle can be left empty to not fill
    circle({lineWidth, strokeStyle, fillStyle}, x, y, radius) {
        this.ctx.lineWidth = lineWidth
        this.ctx.strokeStyle = strokeStyle
        this.ctx.fillStyle = fillStyle
        this.ctx.beginPath()
        this.ctx.arc(x, y, radius, 0 , 2 * Math.PI)
        if (fillStyle) this.ctx.fill()
        this.ctx.stroke()
    }

    rectangle({lineWidth, strokeStyle, fillStyle}, tlx, tly, w, h) {
        this.ctx.lineWidth = lineWidth
        this.ctx.strokeStyle = strokeStyle
        this.ctx.fillStyle = fillStyle
        if (fillStyle) this.ctx.fillRect(tlx, tly, w, h)
        if (strokeStyle) this.ctx.strokeRect(tlx, tly, w, h)
    }

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
