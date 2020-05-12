class AlgedonodeHierarchyRenderer {
  constructor(context) {
    this.ctx = context
    this.positionInfo = {
      columnSpacing: 50, // distance between columns
      columnWidth: 10, // width of a single column
      rowSpacing: 100, // distance between rows
      rowHeight: 30, // height of a single row
    }
  }

  rowAndColumnLabels() {
    for (let i = 0; i < 8; i++) {
      let { cX, cY } = this.elementCentre(4.65, i, this.positionInfo)
      this.ctx.beginPath()
      this.ctx.font = "" + this.positionInfo.columnWidth * 2 + "px Arial"
      this.ctx.textAlign = "center"
      this.ctx.textBaseline = "middle"
      this.ctx.fillStyle = "black"
      this.ctx.fillText(`${i + 1}`, cX, cY)
      this.ctx.stroke()
    }

    let { cX, cY } = this.elementCentre(4.25, -1, this.positionInfo)
    this.ctx.beginPath()
    this.ctx.font = "" + this.positionInfo.columnWidth * 2 + "px Arial"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    this.ctx.fillStyle = "black"
    this.ctx.fillText(`A`, cX, cY - 0.4 * this.positionInfo.rowHeight)
    this.ctx.fillText(`B`, cX, cY + 0.5 * this.positionInfo.rowHeight)
    this.ctx.stroke()
  }

  metasystemBlackBox() {
    this.ctx.fillStyle = "black"
    let x1 = this.positionInfo.columnSpacing
    let y1 = this.positionInfo.rowSpacing - this.positionInfo.rowHeight * 1.5
    let x2 = this.positionInfo.columnSpacing * 10
    let y2 = this.positionInfo.rowSpacing * 4.5
    this.ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
  }

  dial(row, textValue) {
    let { cX, cY } = elementCentre(row, 9, this.positionInfo)
  
    this.ctx.lineWidth = 1.0
    this.ctx.strokeStyle = "black"
    
    this.ctx.beginPath() 
    this.ctx.arc(cX, cY, this.positionInfo.rowHeight, 0, 2 * Math.PI)
    this.ctx.fillStyle = "white"
    this.ctx.fill()
    this.ctx.stroke()

    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"
    this.ctx.font = "40px arial"
    this.ctx.fillStyle = "black"
    this.ctx.fillText(textValue, cX, cY)
  }

  dialOutput(row, active, outputNum) {
    let {cX, cY} = elementCentre(row, 9, this.positionInfo)
  
    // We have 2x rowHeight space to work with - rowHeight is radius of parent dial
    // Use 1.5x rowHeight, 5 connections each side, 10 connections total
    let gapBetweenOutputs = this.positionInfo.rowHeight * 1.5 / 9

    // so 4.5 gaps each side
    let firstContactY = cY - 4.5 * gapBetweenOutputs

    let contactY = firstContactY + outputNum * gapBetweenOutputs

    this.ctx.lineWidth = 1.3
    this.ctx.strokeStyle = active ? coloursCurrent.activated : coloursCurrent.dialOutput
    this.ctx.beginPath()
    this.ctx.moveTo(cX, contactY)
    this.ctx.lineTo(cX - 2 * this.positionInfo.rowHeight, contactY)
    this.ctx.stroke()
  }

  strip(column, offset) {
    let { cX, cY } = elementCentre(0, column, this.positionInfo)
    // let stripTL = { x: cX - columnWidth, y: cY - (5 * rowHeight / 4) + (this.offset * rowHeight / 2)}
    let stripTL = { x: cX - this.positionInfo.columnWidth, y: cY - 2.5 * this.positionInfo.rowHeight + (offset * this.positionInfo.rowHeight / 2)}
    let height = 3 * this.positionInfo.rowSpacing + 5 * this.positionInfo.rowHeight

    this.ctx.lineWidth = 1.0
    this.ctx.strokeStyle = coloursCurrent.strip
    this.ctx.fillStyle = coloursCurrent.strip
    this.ctx.clearRect(stripTL.x, stripTL.y, this.positionInfo.columnWidth, height)
    this.ctx.fillRect(stripTL.x, stripTL.y, this.positionInfo.columnWidth, height)
    this.ctx.strokeRect(stripTL.x, stripTL.y, this.positionInfo.columnWidth, height)
  }

  light(theLight, column, rowOffset, aOrB, active, activationSource) {
    let {cX, cY} = elementCentre(4.25, column, this.positionInfo)
    let radius = this.positionInfo.rowHeight / 4
    let y = cY + this.positionInfo.rowHeight * rowOffset

    this.lightConnection(theLight, column, rowOffset, aOrB, active, activationSource)

    this.ctx.lineWidth = 1.0
    let onColour = aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
    let offColour = aOrB === "A" ? coloursCurrent.lightAOff : coloursCurrent.lightBOff

    this.ctx.fillStyle = active ? onColour : offColour
    this.ctx.strokeStyle = active ? onColour : offColour
    this.ctx.beginPath()
    this.ctx.arc(cX, y, radius, 0, 2 * Math.PI)
    this.ctx.fill()
    this.ctx.stroke()
  }

  lightConnection(theLight, column, rowOffset, aOrB, active, activationSource) {
    this.ctx.strokeStyle = active ? coloursCurrent.activated : "black"
    var {x:x1, y:y1} = this.lightConnectionCoords(column, rowOffset, aOrB)
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.arc(x1, y1, 2, 0 , 2 * Math.PI)

    var {x:x2, y:y2} = this.lightWireJoinCoords(theLight)
    this.ctx.lineTo(x2, y2)    
    this.ctx.stroke()
    
    this.ctx.beginPath()
    this.ctx.lineWidth = 1.5
    this.ctx.strokeStyle = activationSource === "dialOutput" ? coloursCurrent.activated : coloursCurrent.dialOutput
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x1, y1 + this.positionInfo.rowHeight / 4)
    this.ctx.lineTo(x1 + this.positionInfo.columnWidth / 4, y1 + this.positionInfo.rowHeight / 4)
    this.ctx.stroke()
  }

  metasystemLight(column, rowOffset, aOrB, active) {
    let {cX, cY} = elementCentre(4.25, column, this.positionInfo)
    let radius = this.positionInfo.rowHeight / 4
    let y = cY + this.positionInfo.rowHeight * rowOffset

    this.ctx.lineWidth = 1.0
    let onColour = aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
    let offColour = aOrB === "A" ? coloursCurrent.lightAOff : coloursCurrent.lightBOff

    this.ctx.fillStyle = active ? onColour : offColour
    this.ctx.strokeStyle = active ? onColour : offColour
    this.ctx.beginPath()
    this.ctx.arc(cX, y, radius, 0, 2 * Math.PI)
    this.ctx.fill()
    this.ctx.stroke()
  }

  algedonode(row, column, active) {
    let {cX, cY} = elementCentre(row, column, this.positionInfo)
    let algTL = { x: cX, y: cY - (0.7 * this.positionInfo.rowHeight) }
    this.ctx.lineWidth = 1.0
    if (active) {
      this.ctx.fillStyle = coloursCurrent.algedonode
      this.ctx.strokeStyle = coloursCurrent.activated
      this.ctx.fillRect(algTL.x, algTL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight * 1.4)
      this.ctx.strokeRect(algTL.x, algTL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight * 1.4)
    }
    else { 
      this.ctx.fillStyle = coloursCurrent.algedonode
      this.ctx.strokeStyle = coloursCurrent.algedonodeEdge
      this.ctx.fillRect(algTL.x, algTL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight * 1.4)
      this.ctx.strokeRect(algTL.x, algTL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight * 1.4)
    }
  }

  contactAsInputSection(row, column, position, active) {
    let {cX, cY} = elementCentre(row, column, this.positionInfo)
  
    let x = cX + this.positionInfo.columnWidth
    let y = cY + position * this.positionInfo.rowHeight

    this.ctx.lineWidth = 1.5
    this.ctx.strokeStyle = active ? coloursCurrent.activated : coloursCurrent.dialOutput
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(x + this.positionInfo.columnWidth, y)
    this.ctx.stroke()
  }

  contactAsContact(row, column, position, active, algedonodeActive) {
    let {cX, cY} = elementCentre(row, column, this.positionInfo)
  
    let x = cX
    let y = cY + position * this.positionInfo.rowHeight

    this.ctx.lineWidth = 1.5
    this.ctx.strokeStyle = active && algedonodeActive ? coloursCurrent.activated : coloursCurrent.dialOutput
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(x - this.positionInfo.columnWidth * 3 / 4, y)
    this.ctx.stroke()
  }

  brassPadPair(row, column, active0, active1, offset, attachedLight, outputs0, outputs1) {
    // (cX, cY) is centre of algedonode-padpair group
    let {cX, cY} = elementCentre(row, column, this.positionInfo)
    let lx = cX - this.positionInfo.columnWidth
    let yOffset = offset * this.positionInfo.rowHeight / 2
    let pad0TL = { x: lx, y: cY - this.positionInfo.rowHeight + yOffset}
    let pad1TL = { x: lx, y: cY + yOffset}

    this.ctx.lineWidth = 1.0

    this.ctx.strokeStyle = active0 ? coloursCurrent.activated : coloursCurrent.brassPadEdge
    this.ctx.fillStyle = coloursCurrent.brassPad
    this.ctx.fillRect(pad0TL.x, pad0TL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight)
    this.ctx.strokeRect(pad0TL.x, pad0TL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight)
    this.ctx.strokeStyle = active1 ? coloursCurrent.activated : coloursCurrent.brassPadEdge
    this.ctx.fillStyle = coloursCurrent.brassPad
    this.ctx.fillRect(pad1TL.x, pad1TL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight)
    this.ctx.strokeRect(pad1TL.x, pad1TL.y, this.positionInfo.columnWidth, this.positionInfo.rowHeight)

    if (attachedLight) {
        this.lightOutputWire(attachedLight, cX, cY, pad0TL, pad1TL, active0, active1, outputs0, outputs1)
    }
    else {
        this.standardOutputWire(cX, cY, pad0TL, pad1TL, active0, active1)
    }
  }

  lightOutputWire(lightPair, cX, cY, pad0TL, pad1TL, active0, active1, outputs0, outputs1) {
    var {x, y} = this.lightWireJoinCoords(lightPair[0])
    // output0 wire
    this.ctx.strokeStyle = active0 ? coloursCurrent.activated : "black"
    this.ctx.beginPath()
    this.ctx.moveTo(pad0TL.x, pad0TL.y + 0.1 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad0TL.x - 0.8 * this.positionInfo.columnWidth, pad0TL.y + 0.1 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad0TL.x - 0.8 * this.positionInfo.columnWidth, y)
    this.ctx.stroke()

    var {x, y} = this.lightWireJoinCoords(lightPair[1])
    // output1 wire
    this.ctx.strokeStyle = active1 ? coloursCurrent.activated : "black"
    this.ctx.beginPath()
    this.ctx.moveTo(pad1TL.x, pad1TL.y + 0.9 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad1TL.x - 0.4 * this.positionInfo.columnWidth, pad1TL.y + 0.9 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad1TL.x - 0.4 * this.positionInfo.columnWidth, y)
    this.ctx.stroke()
  }

  standardOutputWire(cX, cY, pad0TL, pad1TL, active0, active1) {
    // output0 wire
    this.ctx.strokeStyle = active0 ? coloursCurrent.activated : "black"
    this.ctx.beginPath()
    this.ctx.moveTo(pad0TL.x, pad0TL.y + 0.1 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad0TL.x - 0.8 * this.positionInfo.columnWidth, pad0TL.y + 0.1 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad0TL.x - 0.8 * this.positionInfo.columnWidth, cY - 0.3 * this.positionInfo.rowHeight)
    this.ctx.arc(pad0TL.x - 0.8 * this.positionInfo.columnWidth, cY - 0.3 * this.positionInfo.rowHeight, 2, 0, 2 * Math.PI)
    this.ctx.stroke()

    // output1 wire
    this.ctx.strokeStyle = active1 ? coloursCurrent.activated : "black"
    this.ctx.beginPath()
    this.ctx.moveTo(pad1TL.x, pad1TL.y + 0.9 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad1TL.x - 0.4 * this.positionInfo.columnWidth, pad1TL.y + 0.9 * this.positionInfo.rowHeight)
    this.ctx.lineTo(pad1TL.x - 0.4 * this.positionInfo.columnWidth, cY + 0.3 * this.positionInfo.rowHeight)
    this.ctx.arc(pad1TL.x - 0.4 * this.positionInfo.columnWidth, cY + 0.3 * this.positionInfo.rowHeight, 2, 0, 2 * Math.PI)
    this.ctx.stroke()
  }

  algedonodeSetActivator(row, startColumn, algedonodes, activationSource, active) {
    let {cX, cY} = elementCentre(row, startColumn, this.positionInfo)
  
  
    // we want the activator to be above the furthest the top pad can move, start a little to the left of the 
    // top output wire, and finish at the midpoint of the final algedonode
    // then other wires come down from it to the top mid of each of the algedonodes

    let tl = { x: cX - 2 * this.positionInfo.columnWidth, y: cY + 1.6 * this.positionInfo.rowHeight }

    let algCoords = algedonodes.map(algedonode => algedonode.getXPos(this.positionInfo)) 

    this.ctx.beginPath()
    this.ctx.strokeStyle = activationSource === "dialOutput" ? coloursCurrent.activated : coloursCurrent.dialOutput
    this.ctx.moveTo(tl.x, tl.y)
    this.ctx.lineTo(tl.x, tl.y - this.positionInfo.rowHeight / 3.5)
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.strokeStyle = active ? coloursCurrent.activated : "black"

    this.ctx.arc(tl.x, tl.y, 2, 0, 2 * Math.PI)
    this.ctx.moveTo(tl.x, tl.y)
    this.ctx.lineTo(algCoords[algCoords.length - 1].x + this.positionInfo.columnWidth / 2, tl.y)
    algCoords.forEach(({x, y}) => {
      this.ctx.moveTo(x + this.positionInfo.columnWidth / 2, tl.y)
      this.ctx.lineTo(x + this.positionInfo.columnWidth / 2, y - this.positionInfo.rowHeight / 2)
    })
    this.ctx.stroke()
  }

  // start, and each element of to, are objects { x, y }
  line(start, ...to) {
    this.ctx.beginPath()
    this.ctx.moveTo(start.x, start.y)
    to.forEach((coord) => this.ctx.lineTo(coord.x, coord.y))
    this.ctx.stroke()
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
    let rowOffset = light.getRowOffset()
    let column = light.getColumn()
    let {cX, cY} = elementCentre(4.25, column, this.positionInfo)
    let radius = this.positionInfo.rowHeight / 4
    let y = cY + this.positionInfo.rowHeight * rowOffset

    return {
      x: cX - radius,
      y
    }
  }

  lightConnectionCoords(column, rowOffset, aOrB) {
    let {cX, cY} = elementCentre(4.25, column, this.positionInfo)
    let y = cY + this.positionInfo.rowHeight * rowOffset
    return {
      x: cX - (aOrB === "B" ? 0.8 : 0.4) * this.positionInfo.columnWidth - this.positionInfo.columnWidth, 
      y: y
    }
  }
}
