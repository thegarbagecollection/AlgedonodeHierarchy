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

  light(column, rowOffset, aOrB, active, activationSource) {
    let {cX, cY} = elementCentre(4.25, column, this.positionInfo)
    let radius = this.positionInfo.rowHeight / 4
    let y = cY + this.positionInfo.rowHeight * rowOffset

    this.lightConnection(column, rowOffset, aOrB, active, activationSource)

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

  lightConnection(column, rowOffset, aOrB, active, activationSource) {
    this.ctx.strokeStyle = active ? coloursCurrent.activated : "black"
    var {x:x1, y:y1} = this.lightConnectionCoords(column, rowOffset, aOrB)
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.arc(x1, y1, 2, 0 , 2 * Math.PI)

    var {x:x2, y:y2} = this.lightWireJoinCoords(column, rowOffset)
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

  lightWireJoinCoords(column, rowOffset) {
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
