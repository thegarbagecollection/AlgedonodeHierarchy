// Implementation of the algedonode hierarchy / cluster from Stafford Beer's Brain of the Firm, Chapter 5
// Also includes a metasystem view - a metasystem by definition can't see any details, and won't
// have access to every input state at once.




let coloursCurrent = { ...coloursDefault }

let coloursTemp = { ...coloursDefault }

let contactsCurrent = { ...contactsDefault }

let metasystemMode = false


function elementCentre(row, column, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
  // offsets are the starting point
  let rowOffset = 100
  let columnOffset = 100
  return {
    cX: columnOffset + (column * columnSpacing),
    cY: rowOffset + (row * rowSpacing)
  }
}

// takes an array [x1,...,xn], returns the nested arrays [[x_1,...,x_p],[x_{p+1},...,x_{2p}],...]
// where p is partitionSize
function partitionArray(array, partitionSize) {
  let ret = []
  let partition = []
  let currPartitionSize = 0
  for (let i = 0; i < array.length; i++) {
    partition.push(array[i])
    currPartitionSize++
    if (currPartitionSize === partitionSize) {
      currPartitionSize = 0
      ret.push(partition)
      partition = []
    }
  }
  return ret
}

class Cluster {
    constructor() {
        this.positionInfo = {
          columnSpacing: 50, // distance between columns
          columnWidth: 10, // width of a single column
          rowSpacing: 100, // distance between rows
          rowHeight: 30, // height of a single row
        }
        this.dials = []
        this.rows = []
        this.lights = []
        this.strips = []
        this.algedonodeActivators = []
        for (let i = 0; i < 4; i++) {
            this.dials[i] = new Dial(i)
            this.rows[i] = []
            for (let j = 0; j < 8; j++) {
                this.rows[i][j] = new Algedonode(i, j)
            }
        }

        for (let j = 0; j < 8; j++) {
          this.lights[j] = [new Light("B", 0.5, j), new Light("A", -0.5, j)]

          let brassPadPair = []
          for (let i = 0; i < 4; i++) {
            brassPadPair[i] = this.rows[i][j].brassPadPair
          }

          this.strips[j] = new Strip(brassPadPair, j)
        }
      
    }
    
    setupConnections() {
      this.setFirstRowInputConnections()
      this.setOtherRowInputConnections()
      this.setOtherRowOutputConnections()
      this.setLastRowOutputConnections()
    }

    setFirstRowInputConnections() {
      let d = this.dials[0]
      let r0 = this.rows[0]
      for (let c = 0; c < 8; c++) {
        r0[c].setSingleContact(d.getDialOutputsForAlgedonodes()[c])
      }
    }
    setOtherRowInputConnections() {
      for (let r = 1; r < 4; r++) {
        let inputs = this.dials[r].getDialOutputsForAlgedonodes()
        let inPartitionSize = Math.pow(2, r)
        let partitionedInputs = partitionArray(inputs, inPartitionSize)

        let currInputPartition = 0
        for (let c = 0; c < 8; c++) {
          this.rows[r][c].setMultiContact(partitionedInputs[currInputPartition])
          currInputPartition++
          if (currInputPartition === partitionedInputs.length) currInputPartition = 0
        }

      }
      
    }

    setLastRowOutputConnections() {
      let r3 = this.rows[3]
      for (let c = 0; c < 8; c++) {
        r3[c].setOutput(this.lights[c][0], this.lights[c][1])
      }

    }

    setOtherRowOutputConnections() {
      /*   create 2 subpartitions of equal size
           all the 0 output pads of this partition activate the first subpartition
           all the 1 output pads of this partition activate the second subpartition
      */
      this.linkPartitions(0, 0, 7)

      // also need to link the lights in with dial 8 and 9 for dial3

      for (let c = 0; c < 8; c++) {
        this.dials[3].link9and10(this.lights[c][0], this.lights[c][1])
      }
    }
    
    linkPartitions(row, pStart, pEnd) {
      if (row === 3) {
        this.lights[pStart].forEach( light => light.setParent(this.rows[row][pStart]) )
        return
      }



      let pMid = Math.trunc((pStart + pEnd) / 2) + 1

      let partition0 = []
      for (let c = pStart; c <= pMid - 1; c++) {
        partition0.push(this.rows[row + 1][c])
      }



      let partition1 = []
      for (let c = pMid; c <= pEnd; c++) {
        partition1.push(this.rows[row + 1][c])
      }

      let algAct0 = new AlgedonodeSetActivator(partition0, pStart, pMid - 1, row, this.rows[row][pStart])
      let algAct1 = new AlgedonodeSetActivator(partition1, pMid, pEnd, row, this.rows[row][pMid])

      this.algedonodeActivators.push(algAct0)
      this.algedonodeActivators.push(algAct1)

      for (let c = pStart; c <= pEnd; c++) {
        this.rows[row][c].setOutput(algAct0, algAct1)
      }

      // We also wire up 8 and 9 here for each of rows 0-2
      this.dials[row].link9and10(algAct0, algAct1)


      this.linkPartitions(row + 1, pStart, pMid - 1)
      this.linkPartitions(row + 1, pMid, pEnd)

    }


    clear() {
      this.rows.forEach(row => { row.forEach(algedonode => { algedonode.clear() } ) } )
      this.lights.forEach(lightPair => { lightPair.forEach( light => light.clear() )  })
      this.dials.forEach(dial => { dial.clear() })
    }

    renderTo(context) {
      this.renderComponentsTo(context) // dial + outputs, algedonode, brass pads, strips, lights
      this.renderLabelsTo(context)
    }

    renderLabelsTo(context) {
      for (let i = 0; i < 8; i++) {
        let {cX, cY} = elementCentre(4.65, i, this.positionInfo)
        context.beginPath()
        context.font = "" + this.positionInfo.columnWidth * 2 + "px Arial"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillStyle = "black"
        context.fillText(`${i + 1}`, cX, cY)
        context.stroke()
      }

      let {cX, cY} = elementCentre(4.25, -1, this.positionInfo)
      context.beginPath()
      context.font = "" + this.positionInfo.columnWidth * 2 + "px Arial"
      context.textAlign = "center"
      context.textBaseline = "middle"
      context.fillStyle = "black"
      context.fillText(`A`, cX, cY - 0.4 * this.positionInfo.rowHeight)
      context.fillText(`B`, cX, cY + 0.5 * this.positionInfo.rowHeight)
      context.stroke()

    }

    renderComponentsTo(context) {
      this.algedonodeActivators.forEach(aa => { aa.render(context, this.positionInfo) })
      this.dials.forEach(d => { d.render(context, this.positionInfo) })
      this.strips.forEach(s => { s.render(context, this.positionInfo) })
      this.rows.forEach( r => { r.forEach( c => { c.render(context, this.positionInfo) } )} )
      this.lights.forEach( lightPair => { lightPair.forEach( light => light.render(context, this.positionInfo) ) } )
      // render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    }

    renderConnectionsBetweenTo(context) {
      // console.log("renderConnections needs implementing")
    }

    // newValue should be in [-1, 1]
    moveStrip(stripNum, newValue) {
      this.strips[stripNum].setOffset(newValue)
    }

    setDialValue(dial, value) {
      this.dials[dial].setDialValue(value)
    }

    propagateDialValues() {
      this.dials.forEach(dial => {
        dial.propagateValue()
      })
    }

    // Given 4 states, returns the result at the current strip settings
    simulate(stateQuad) {
      this.clear()
      let oldValues = this.dials.map(dial => dial.getDialValue())

      for (let i = 0; i < 4; i++) {
        this.dials[i].setDialValue(stateQuad[i])
      }
      for (let i = 0; i < 4; i++) {
        this.dials[i].propagateValue()
      }

      let ret
      for (let i = 0; i < 8; i++) {
        if (this.lights[i][0].isActive()) {
          ret = {
            lightNum: i,
            aOrB: this.lights[i][0].getAorB()
          }
        }
        else if (this.lights[i][1].isActive()) {
          ret = {
            lightNum: i,
            aOrB: this.lights[i][1].getAorB()
          }
        }
      }

      for (let i = 0; i < 4; i++) {
        this.dials[i].setDialValue(oldValues[i])
      }
      for (let i = 0; i < 4; i++) {
        this.dials[i].propagateValue()
      }


      return ret

    }

    fullSimulate() {
      let results = []
      for (let i1 = 1; i1 <= 10; i1++) {
        for (let i2 = 1; i2 <= 10; i2++) {
          for (let i3 = 1; i3 <= 10; i3++) {
            for (let i4 = 1; i4 <= 10; i4++) {
              results.push( { state: [i1, i2, i3, i4], result: this.simulate([i1, i2, i3, i4]) })
            }
          }
        }
      }

      let counts = results.reduce((acc, { result: {lightNum, aOrB} }) => {
        if (!(acc[lightNum])) {
          acc[lightNum] = { aCount: 0, bCount: 0}
        }
        let {aCount, bCount} = acc[lightNum]
        acc[lightNum] = { aCount: (aOrB === "A" ? aCount + 1 : aCount), bCount: (aOrB === "B" ? bCount + 1 : bCount)}
        return acc
      }, [])



      return { counts, individualResults: results }
    }

    getIlluminatedLight() {
      for (let i = 0; i < this.lights.length; i++) {
        for (let j = 0; j < 2; j++) {
          let light = this.lights[i][j]
          if (light.isActive()) {
            return {
              column: light.getColumn(),
              lightRow: light.getAorB()
            }
          }
        }
      }
      return null;
    }


    setNewContactPositions() {
      this.rows.forEach(algedonodeRow => algedonodeRow.forEach(algedonode => algedonode.setNewContactPositions()))
    }

    renderMetasystemTo(context) {
      this.renderMetasystemVisibleComponentsTo(context) // dial + outputs, algedonode, brass pads, strips, lights
      this.renderLabelsTo(context)
    }

    renderMetasystemVisibleComponentsTo(context) {
      this.dials.forEach(d => { d.render(context, this.positionInfo) })
      this.strips.forEach(s => { s.render(context, this.positionInfo) })
      this.lights.forEach( lightPair => { lightPair.forEach( light => light.renderAsMetaSystem(context, this.positionInfo) ) } )
    
      context.fillStyle = "black"
      let x1 = this.positionInfo.columnSpacing
      let y1 = this.positionInfo.rowSpacing - this.positionInfo.rowHeight * 1.5
      let x2 = this.positionInfo.columnSpacing * 10
      let y2 = this.positionInfo.rowSpacing * 4.5
      context.fillRect(x1, y1, x2 - x1, y2 - y1)
      
    }
}

class Algedonode {
    // 1,2,4,8 inputs from dial going to contacts, 2 output pads (position adjusted by underlying strip), 1 input from previous row
    constructor(row, column) {
      this.active = row === 0
      this.row = row
      this.column = column
      this.brassPadPair = new BrassPadPair(row === 3)
      this.contacts = []
      this.contactCount = 0
    }

    // position is either 0.5 for on, or -0.5 for off
    setSingleContact(input) {
      let c = new Contact(contactsCurrent[1][this.column], this.brassPadPair)
      this.contacts.push(c)
      input.link(c)
      c.parentActivated()
      this.contactCount = 1
    }


    // Note: ONLY CALLED FROM ROWS 1-3
    setMultiContact(inputs) {
      // Multi-contacts are spread out evenly across the double strip, centred on position 0
      // Let's have them contained in a box of width 1 but never touching the edges, so 
      // a full push of the pad in either direction will still contain all the strips
      // 2 contacts: 0.49, -0.49                separation of 1
      // 4 contacts: 0.49, 0.16, -0.16, -0.49   separation of 1/3
      // 8 contacts: 0.49, 0.35, 0.21, 0.07, -0.07, -0.21,-0.35 , -0.49    separation of 1/7
      if (!contactsCurrent[inputs.length]) throw `setMultiContact got unexpected input size of ${inputs.length}`;

      this.contactCount = inputs.length

      let cPos = contactsCurrent[this.contactCount][this.column]

      for (let i = 0; i < this.contactCount; i++) {
        let c = new Contact(cPos[i], this.brassPadPair)
        this.contacts[i] = c
        inputs[i].link(c)
      }


    }

    setOutput(outputs0, outputs1) {
      this.brassPadPair.setOutput(outputs0, outputs1)
    }


    clear() {
      // Row 0 algedonodes are always active
      if (this.row !== 0) {
        this.active = false
        this.contacts.forEach( contact => { contact.algedonodeActive = false })
      }
      this.brassPadPair.clear()

    }

    activate() {
      this.active = true
      this.contacts.forEach( contact => contact.parentActivated())
    }

    isActive() {
      return this.active
    }

    render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
      // Centre of a row is between the algedonode `body' and the pads, half-way down the algedonode, and at the vertical midpoint of the 2 pads
      /*
        ##
        ## 
        ## |-|
        --c| |
        ## |-|
        ## 
        ##
      */
      

      let {cX, cY} = elementCentre(this.row, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })

      let algTL = { x: cX, y: cY - (0.7 * rowHeight) }

      this.brassPadPair.render(context, cX, cY, { columnSpacing, columnWidth, rowSpacing, rowHeight })

      context.lineWidth = 1.0
      if (this.active) {
        context.fillStyle = coloursCurrent.algedonode
        context.strokeStyle = coloursCurrent.activated
        context.fillRect(algTL.x, algTL.y, columnWidth, rowHeight * 1.4)
        context.strokeRect(algTL.x, algTL.y, columnWidth, rowHeight * 1.4)
      }
      else { 
        context.fillStyle = coloursCurrent.algedonode
        context.strokeStyle = coloursCurrent.algedonodeEdge
        context.fillRect(algTL.x, algTL.y, columnWidth, rowHeight * 1.4)
        context.strokeRect(algTL.x, algTL.y, columnWidth, rowHeight * 1.4)
      }



      this.contacts.forEach(contact => {
        contact.renderAsInputSection(context, this.row, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
      })

      this.contacts.forEach(contact => {
        contact.renderAsContact(context, this.row, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
      })
    }


    getXPos({ columnSpacing, columnWidth, rowSpacing, rowHeight }) {
      let {cX, cY} = elementCentre(this.row, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
      return { x: cX, y: cY }
    }

    setNewContactPositions() {
      if (this.row !== 0) {
        this.contacts.forEach((contact, i) => {
          contact.setPosition(contactsCurrent[this.contactCount][this.column][i])
        })
      }
      else {
        this.contacts[0].setPosition(contactsCurrent[this.contactCount][this.column])
      }
    }

    renderLightWires(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
      let {cX, cY} = elementCentre(this.row, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
      this.brassPadPair.renderLightOutputWireMetasystem(context, cX, cY, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    }
}

class Contact {
  constructor(position, brassPadPair) {
    this.position = position
    this.active = false
    this.algedonodeActive = false
    this.brassPadPair = brassPadPair
  }

  setPosition(newPosition) {
    this.position = newPosition
  }

  parentActivated() {
    this.algedonodeActive = true
  }

  clear() {
    this.active = false
  }

  activate(source) {
    // source isn't used here - this will always be from a dial
    this.active = true
    // console.log("TODO: an activated contact must also activate the corresponding brass pad")
    // If this is active, we need to activate the brass pad underneath, whichever it is
    if (this.algedonodeActive) {
      this.brassPadPair.activate(this.position)
    }
  }

  renderAsInputSection(context, row, column,  { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(row, column, { columnSpacing, columnWidth, rowSpacing, rowHeight })

    let x = cX + columnWidth
    let y = cY + this.position * rowHeight

    context.lineWidth = 1.5
    context.strokeStyle = this.active ? coloursCurrent.activated : coloursCurrent.dialOutput
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + columnWidth, y)
    context.stroke()

  }

  renderAsContact(context, row, column, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(row, column, { columnSpacing, columnWidth, rowSpacing, rowHeight })

    let x = cX
    let y = cY + this.position * rowHeight

    context.lineWidth = 1.5
    context.strokeStyle = this.active && this.algedonodeActive ? coloursCurrent.activated : coloursCurrent.dialOutput
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x - columnWidth * 3 / 4, y)
    context.stroke()
  }
}

class BrassPadPair {
  // contact at vertical position p:
  // 0 <= p <= 1: output 1
  // -1 <= p < 0: output 0
  // starts with centreline of pad pair at 0
  constructor(isLastRow) {
    this.active0 = false
    this.active1 = false
    this.offset = 0
    this.isLastRow = isLastRow
  }

  setOutput(outputs0, outputs1) {
    this.outputs0 = outputs0
    this.outputs1 = outputs1
  }
  
  activate(contactPosition) {
    // contact position is fixed, in [-0.5,0.5]
    // this should work: if contactPos >= this.offset / 2, then 1 output, else 0 output

    if (contactPosition >= this.offset / 2) {
      this.active1 = true
      this.outputs1.activate("algedonode")
    }
    else {
      this.active0 = true
      this.outputs0.activate("algedonode")
    }

  }

  clear() {
    this.active0 = false
    this.active1 = false
    this.outputs0.clear() 
    this.outputs1.clear() 
  }
  setOffset(offset) {
    this.offset= offset
  }
  render(context, cX, cY, { columnSpacing, columnWidth, rowSpacing, rowHeight }){
    // (cX, cY) is centre of algedonode-padpair group
    let lx = cX - columnWidth
    let yOffset = this.offset * rowHeight / 2
    let pad0TL = { x: lx, y: cY - rowHeight + yOffset}
    let pad1TL = { x: lx, y: cY + yOffset}

    context.lineWidth = 1.0

    context.strokeStyle = this.active0 ? coloursCurrent.activated : coloursCurrent.brassPadEdge
    context.fillStyle = coloursCurrent.brassPad
    context.fillRect(pad0TL.x, pad0TL.y, columnWidth, rowHeight)
    context.strokeRect(pad0TL.x, pad0TL.y, columnWidth, rowHeight)
    context.strokeStyle = this.active1 ? coloursCurrent.activated : coloursCurrent.brassPadEdge
    context.fillStyle = coloursCurrent.brassPad
    context.fillRect(pad1TL.x, pad1TL.y, columnWidth, rowHeight)
    context.strokeRect(pad1TL.x, pad1TL.y, columnWidth, rowHeight)

    if (this.isLastRow) {
      this.renderLightOutputWire(context, cX, cY, pad0TL, pad1TL, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    }
    else {
      this.renderStandardOutputWire(context, cX, cY, pad0TL, pad1TL,  { columnSpacing, columnWidth, rowSpacing, rowHeight })
    }

    //this.outputs0.render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    //this.outputs1.render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight })
  } 

  renderStandardOutputWire(context, cX, cY, pad0TL, pad1TL, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    // output0 wire
    context.strokeStyle = this.active0 ? coloursCurrent.activated : "black"
    context.beginPath()
    context.moveTo(pad0TL.x, pad0TL.y + 0.1 * rowHeight)
    context.lineTo(pad0TL.x - 0.8 * columnWidth, pad0TL.y + 0.1 * rowHeight)
    context.lineTo(pad0TL.x - 0.8 * columnWidth, cY - 0.3 * rowHeight)
    context.arc(pad0TL.x - 0.8 * columnWidth, cY - 0.3 * rowHeight, 2, 0, 2 * Math.PI)
    context.stroke()

    // output1 wire
    context.strokeStyle = this.active1 ? coloursCurrent.activated : "black"
    context.beginPath()
    context.moveTo(pad1TL.x, pad1TL.y + 0.9 * rowHeight)
    context.lineTo(pad1TL.x - 0.4 * columnWidth, pad1TL.y + 0.9 * rowHeight)
    context.lineTo(pad1TL.x - 0.4 * columnWidth, cY + 0.3 * rowHeight)
    context.arc(pad1TL.x - 0.4 * columnWidth, cY + 0.3 * rowHeight, 2, 0, 2 * Math.PI)
    context.stroke()
  }

  renderLightOutputWire(context, cX, cY, pad0TL, pad1TL, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    
        var {x, y} = this.outputs0.getWireJoinCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight })
        // output0 wire
        context.strokeStyle = this.active0 ? coloursCurrent.activated : "black"
        context.beginPath()
        context.moveTo(pad0TL.x, pad0TL.y + 0.1 * rowHeight)
        context.lineTo(pad0TL.x - 0.8 * columnWidth, pad0TL.y + 0.1 * rowHeight)
        context.lineTo(pad0TL.x - 0.8 * columnWidth, y)
        context.stroke()
    
        var {x, y} = this.outputs1.getWireJoinCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight })
        // output1 wire
        context.strokeStyle = this.active1 ? coloursCurrent.activated : "black"
        context.beginPath()
        context.moveTo(pad1TL.x, pad1TL.y + 0.9 * rowHeight)
        context.lineTo(pad1TL.x - 0.4 * columnWidth, pad1TL.y + 0.9 * rowHeight)
        context.lineTo(pad1TL.x - 0.4 * columnWidth, y)
        context.stroke()
  }
  
  renderLightOutputWireMetasystem(context, cX, cY, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let lx = cX - columnWidth
    let yOffset = this.offset * rowHeight / 2
    let pad0TL = { x: lx, y: cY - rowHeight + yOffset}
    let pad1TL = { x: lx, y: cY + yOffset}

    context.lineWidth = 1.0
    console.log("HERE2")
    var {x, y} = this.outputs0.getWireJoinCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight })
    // output0 wire
    context.strokeStyle = this.active0 ? coloursCurrent.activated : "black"
    context.beginPath()
    context.moveTo(pad0TL.x, pad0TL.y + 0.1 * rowHeight)
    context.lineTo(pad0TL.x - 0.8 * columnWidth, pad0TL.y + 0.1 * rowHeight)
    context.lineTo(pad0TL.x - 0.8 * columnWidth, y)
    context.stroke()

    var {x, y} = this.outputs1.getWireJoinCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight })
    // output1 wire
    context.strokeStyle = this.active1 ? coloursCurrent.activated : "black"
    context.beginPath()
    context.moveTo(pad1TL.x, pad1TL.y + 0.9 * rowHeight)
    context.lineTo(pad1TL.x - 0.4 * columnWidth, pad1TL.y + 0.9 * rowHeight)
    context.lineTo(pad1TL.x - 0.4 * columnWidth, y)
    context.stroke()
}
}

class AlgedonodeSetActivator {
  constructor(algedonodes, startColumn, endColumn, row, representativePartitionParent) {
    this.algedonodes = algedonodes
    this.active = false
    this.startColumn = startColumn
    this.row = row
    this.endColumn = endColumn
    this.activationSource = ""
    this.representativePartitionParent = representativePartitionParent
  }

  clear() {
    this.active = false
    this.algedonodes.forEach( algedonode => algedonode.clear() )
    this.activationSource = ""
  }

  activate(source) {
    // Need a bit of logic here - a dial output will only activate this
    // group if the parent group of algedonodes is currently activated
    if ((source === "dialOutput" && this.representativePartitionParent.isActive()) || source === "algedonode") {
      this.active = true
      this.activationSource = source
      this.algedonodes.forEach( algedonode => algedonode.activate() )
    }

  }
  
  render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(this.row, this.startColumn, { columnSpacing, columnWidth, rowSpacing, rowHeight })


    // we want the activator to be above the furthest the top pad can move, start a little to the left of the 
    // top output wire, and finish at the midpoint of the final algedonode
    // then other wires come down from it to the top mid of each of the algedonodes

    let tl = { x: cX - 2 * columnWidth, y: cY + 1.6 * rowHeight }

    let algCoords = this.algedonodes.map(algedonode => algedonode.getXPos({ columnSpacing, columnWidth, rowSpacing, rowHeight })) 

    context.beginPath()
    context.strokeStyle = this.activationSource === "dialOutput" ? coloursCurrent.activated : coloursCurrent.dialOutput
    context.moveTo(tl.x, tl.y)
    context.lineTo(tl.x, tl.y - rowHeight / 3.5)
    context.stroke()

    context.beginPath()
    context.strokeStyle = this.active ? coloursCurrent.activated : "black"

    context.arc(tl.x, tl.y, 2, 0, 2 * Math.PI)
    context.moveTo(tl.x, tl.y)
    context.lineTo(algCoords[algCoords.length - 1].x + columnWidth / 2, tl.y)
    algCoords.forEach(({x, y}) => {
      context.moveTo(x + columnWidth / 2, tl.y)
      context.lineTo(x + columnWidth / 2, y - rowHeight / 2)
    })
    context.stroke()

  }
}



class Dial {
  constructor(row) {
    this.row = row
    this.dialOutputs = []
    for (let i = 0; i < 10; i++) {
      this.dialOutputs[i] = new DialOutput(i + 1) // we're using 1-indexed value!
    }
    this.value = 1
  }

  setDialValue(value) {
    this.value = value
  }

  propagateValue() {
    this.dialOutputs[this.value - 1].activate()
  }

  getDialValue() {
    return this.value
  }

  getDialOutputsForAlgedonodes() {
    return this.dialOutputs.slice(0, 8)
  }
  render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {

    for (let i = 0; i < 10; i++) {
      this.dialOutputs[i].render(context, this.row, i,  { columnSpacing, columnWidth, rowSpacing, rowHeight })
    }

    let { cX, cY } = elementCentre(this.row, 9, { columnSpacing, columnWidth, rowSpacing, rowHeight })

    context.lineWidth = 1.0
    context.strokeStyle = "black"
    
    context.beginPath()
    context.arc(cX, cY, rowHeight, 0, 2 * Math.PI)
    context.fillStyle = "white"
    context.fill()
    context.stroke()

    context.textAlign = "center"
    context.textBaseline = "middle"
    context.font = "40px arial"
    context.fillStyle = "black"
    context.fillText(this.value, cX, cY)

 

  }

  clear() {
    this.dialOutputs.forEach(dialOutput => {
      dialOutput.clear()
    })
  }

  // technically this should be 9 and 10!!!
  link9and10(output9, output10) {
    this.dialOutputs[8].link(output9)
    this.dialOutputs[9].link(output10)
  }
}

class DialOutput {
  constructor(value) {
    this.contacts = []
    this.active = false
    this.value = value
  }

  activate() {
    this.active = true
    this.contacts.forEach(contact => {
     contact.activate(this.value < 9 ? "algedonode" : "dialOutput")
    })
  }
  clear() {
    this.active = false
    this.contacts.forEach(contact => contact.clear())
  }

  link(contact) {
    this.contacts.push(contact)
  }

  render(context, row, outputNum, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(row, 9, { columnSpacing, columnWidth, rowSpacing, rowHeight })

    // We have 2x rowHeight space to work with - rowHeight is radius of parent dial
    // Use 1.5x rowHeight, 5 connections each side, 10 connections total
    let gapBetweenOutputs = rowHeight * 1.5 / 9

    // so 4.5 gaps each side
    let firstContactY = cY - 4.5 * gapBetweenOutputs

    let contactY = firstContactY + outputNum * gapBetweenOutputs

    context.lineWidth = 1.3
    context.strokeStyle = this.active ? coloursCurrent.activated : coloursCurrent.dialOutput
    context.beginPath()
    context.moveTo(cX, contactY)
    context.lineTo(cX - 2 * rowHeight, contactY)
    context.stroke()

  }
}

class Strip {
  // 4-element array of brass pad pairs, in row order
  constructor(brassPadPairs, column) {
    this.brassPadPairs = brassPadPairs
    this.offset = 0 // will be controlled by sliders
    this.column = column
  }
  render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let { cX, cY } = elementCentre(0, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    // let stripTL = { x: cX - columnWidth, y: cY - (5 * rowHeight / 4) + (this.offset * rowHeight / 2)}
    let stripTL = { x: cX - columnWidth, y: cY - 2.5 * rowHeight + (this.offset * rowHeight / 2)}
    let height = 3 * rowSpacing + 5 * rowHeight

    context.lineWidth = 1.0
    context.strokeStyle = coloursCurrent.strip
    context.fillStyle = coloursCurrent.strip
    context.clearRect(stripTL.x, stripTL.y, columnWidth, height)
    context.fillRect(stripTL.x, stripTL.y, columnWidth, height)
    context.strokeRect(stripTL.x, stripTL.y, columnWidth, height)

  }
  setOffset(newOffset) {
    this.offset = newOffset
    this.brassPadPairs.forEach( brassPadPair => brassPadPair.setOffset(newOffset) )
  }
}




class Light { 
  // rowOffset is -0.5 if the light is meant to indicate a 0 output from row 3, and 0.5 if meant to indicate a 1 output
  // not linking it in with the colour - might want to change them!
  constructor(aOrB, rowOffset, column) {
    this.aOrB = aOrB
    this.active = false
    this.rowOffset = rowOffset
    this.column = column
    this.parent = null
    this.activationSource = ""
  }
  setParent(parent) {
    this.parent = parent
  }
  activate(source) {
    if ((source === "dialOutput" && this.parent.isActive()) || source === "algedonode") {
      this.active = true
      this.activationSource = source
    }
  }
  clear() {
    this.active = false
    this.activationSource = ""
  }
  render(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(4.25, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    let radius = rowHeight / 4
    let y = cY + rowHeight * this.rowOffset

    this.renderConnection(context, { columnSpacing, columnWidth, rowSpacing, rowHeight })

    context.lineWidth = 1.0
    let onColour = this.aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
    let offColour = this.aOrB === "A" ? coloursCurrent.lightAOff : coloursCurrent.lightBOff

    context.fillStyle = this.active ? onColour : offColour
    context.strokeStyle = this.active ? onColour : offColour
    context.beginPath()
    context.arc(cX, y, radius, 0, 2 * Math.PI)
    context.fill()
    context.stroke()

  }

  renderConnection(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    context.strokeStyle = this.active ? coloursCurrent.activated : "black"
    var {x:x1, y:y1} = this.getConnectionCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight })
    context.beginPath()
    context.moveTo(x1, y1)
    context.arc(x1, y1, 2, 0 , 2 * Math.PI)

    var {x:x2, y:y2} = this.getWireJoinCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight })
    context.lineTo(x2, y2)    
    context.stroke()

    
    
    context.beginPath()
    context.lineWidth = 1.5
    context.strokeStyle = this.activationSource === "dialOutput" ? coloursCurrent.activated : coloursCurrent.dialOutput
    context.moveTo(x1, y1)
    context.lineTo(x1, y1 + rowHeight / 4)
    context.lineTo(x1 + columnWidth / 4, y1 + rowHeight / 4)
    context.stroke()

  }

  renderAsMetaSystem(context, { columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(4.25, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    let radius = rowHeight / 4
    let y = cY + rowHeight * this.rowOffset

    context.lineWidth = 1.0
    let onColour = this.aOrB === "A" ? coloursCurrent.lightAOn : coloursCurrent.lightBOn
    let offColour = this.aOrB === "A" ? coloursCurrent.lightAOff : coloursCurrent.lightBOff

    context.fillStyle = this.active ? onColour : offColour
    context.strokeStyle = this.active ? onColour : offColour
    context.beginPath()
    context.arc(cX, y, radius, 0, 2 * Math.PI)
    context.fill()
    context.stroke()
  }

  getConnectionCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(4.25, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    let y = cY + rowHeight * this.rowOffset
    return {
      x: cX - (this.aOrB === "B" ? 0.8 : 0.4) * columnWidth - columnWidth, 
      y: y
    }
  }

  getWireJoinCoords({ columnSpacing, columnWidth, rowSpacing, rowHeight }) {
    let {cX, cY} = elementCentre(4.25, this.column, { columnSpacing, columnWidth, rowSpacing, rowHeight })
    let radius = rowHeight / 4
    let y = cY + rowHeight * this.rowOffset

    return {
      x: cX - radius,
      y
    }
  }

  isActive() {
    return this.active
  }

  getAorB() {
    return this.aOrB
  }

  getColumn() {
    return this.column
  }

}


let c

let context
let plotCtx
let statesCtx


window.onload = () => {
  let canvas = document.getElementById("canvas")
  
  context = canvas.getContext("2d")

  let plotCanvas = document.getElementById("plot")
  plotCtx = plotCanvas.getContext("2d")

  let statesCanvas = document.getElementById("states")
  statesCtx = statesCanvas.getContext("2d")

  c = new Cluster()
  c.setupConnections()
  for (let i = 0; i < 4; i++) {
    $("#dial" + i).val(1).trigger('change')
    c.setDialValue(i, 1)
  }
  clear(context)
  clearPlot()
  c.clear()
  c.propagateDialValues()
  plotNewPoint()
  c.renderTo(context)
}

function convert100RangeToSliderShift(input) {
  // sliders need an input range of [-1, 1]
  // also, 0 corresponds to bottom and 100 to top
  // so we need to switch that around
  return -((input - 50) / 50)
}

function clear(context) {
  let canvas = context.canvas
  let w = canvas.width
  let h = canvas.height
  context.fillStyle = coloursCurrent.background
  context.fillRect(0, 0, w, h)
  // context.clearRect(0, 0, w, h)
}

function newRender() {
  clear(context)
  if (metasystemMode) {
    c.renderMetasystemTo(context)
  }
  else {
    c.renderTo(context)
  }
  
}

// random integer in {1,...,n}
function rnd(n) {
  return Math.floor(Math.random() * n) + 1
}














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









let dataStore = new SmallDataStore(InitialValues.DATA_STORE_SIZE)
let barChart = new LimitedBarChart()



function datapointSliderToStoreSpace(sliderVal) {
  // minimum of 100, max of 20000 seems reasonable
  // use a low-order polynomial: x^2 on (0, 1]?
  let x = sliderVal / 100 // sliderVal in 1-100
  return 100 + 19900 * Math.pow(x, 2)
}

// inverse of datapointSliderToStoreSpace
function storeSpaceToDatapointSlider(storeSpace) {
  return 100 * Math.sqrt((storeSpace - 100) / 19900)
}

function resizeData(sliderValue) {
  let newStoreSpace = Math.floor(datapointSliderToStoreSpace(sliderValue))
  $("#labelDataPoints").text(`Data point store space: ${newStoreSpace}`)
  let removed = dataStore.resize(newStoreSpace)
  if (removed) removed.forEach(pointRemoved => {
    plotStatePoint(null, pointRemoved)
    plotNewBarPoint(null, pointRemoved)
  })
}

function clearPlot() {
  // also clear the plots!
  plotCtx.clearRect(0, 0, plotCtx.canvas.width, plotCtx.canvas.height)
  statesCtx.clearRect(0, 0, statesCtx.canvas.width, statesCtx.canvas.height)

  dataStore.clear()
  barChart.clear()

  let wS = statesCtx.canvas.width
  let hS = statesCtx.canvas.height
  let drawableLeftS = wS * 0.1
  let drawableBottomS = hS * 0.9
  statesAxes(drawableLeftS, drawableBottomS, wS, true)
}

function plotNewPoint() {
  let states = c.dials.map(dial => dial.getDialValue())
  let illum = c.getIlluminatedLight()
  if (illum !== null) {
    let { column, lightRow } = illum
    let removed = dataStore.enqueue(states, column, lightRow)

    plotStatePoint({ states, column, lightRow}, removed)

    plotNewBarPoint( { states, column, lightRow}, removed)

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


let playInterval = null
let playSpeed = 50
let playIndex = 0

let playMode = "none"

let stateSequence = []
for (let i1 = 1; i1 <= 10; i1++) {
  for (let i2 = 1; i2 <= 10; i2++) {
    for (let i3 = 1; i3 <= 10; i3++) {
      for (let i4 = 1; i4 <= 10; i4++) {
        stateSequence.push([i1, i2, i3, i4])
      }
    }
  }
}

function randomState() {
  let rState = []
  for (let i = 0; i < 4; i++) {
    let rn = rnd(10)
    rState[i] = rn
  }
  return rState
}

function createDelayFromSpeed() {
  // Speed is 1-100
  // We want speed 100 = 0ms delay
  //         speed 1 = 1000 ms delay
  // We also want -x^2 behaviour, or something like that
  // go with 1000 * (1 - x^3), with x in [0, 1]
  let x = playSpeed / 100
  return 1000 * (1 - Math.pow(x, 1.1))
}

function stop() {
  if (playInterval) {
    window.clearInterval(playInterval)
  }
  playMode = "none"
}



function setDialsDirect(states) {
  for (let i = 0; i < 4; i++) {
    let n = states[i]
    // $("#dial" + i).val(rn).trigger('change')
    $("#dial" + i).val(n).trigger('change')
    c.setDialValue(i, n)
  }
  c.clear()
  c.propagateDialValues()
  newRender()
  plotNewPoint()
}

function playSequence() {
  stop()
  playMode = "sequence"
  playIndex = 0
  playInterval = window.setInterval(() => {
    setDialsDirect(stateSequence[playIndex++])
  }, createDelayFromSpeed())
}

function newSequenceSpeed() {
  stop()
  playMode = "sequence"
  playInterval = window.setInterval(() => {
    setDialsDirect(stateSequence[playIndex++])
  }, createDelayFromSpeed())
}

function playRandom() {
  stop()
  playMode = "random"
  playInterval = window.setInterval(() => {
    let rs = randomState()
    setDialsDirect(rs)
  }, createDelayFromSpeed())
}

function newRandomSpeed() {
  playRandom() // don't need to do anything else
}


// returns a list of n random contact positions in [-0.49, 0.49]
function randomContactPositions(n) {
  return new Array(n).fill(null).map(_ => Math.random() * 0.98 - 0.49)
}

// returns an 8-list of lists of n random contact positions in [-0.49, 0.49]
function randomContactPositions8(n) {
  return new Array(8).fill(null).map(_ => randomContactPositions(n))
}


function setRandomContacts() {
  contactsCurrent[1] = randomContactPositions(8)
  contactsCurrent[2] = randomContactPositions8(2)
  contactsCurrent[4] = randomContactPositions8(4)
  contactsCurrent[8] = randomContactPositions8(8)
  clearPlot()
  c.setNewContactPositions()
  c.clear()
  c.propagateDialValues()
  newRender()
  plotNewPoint()
}

function restoreDefaultContacts() {
  contactsCurrent = { ...contactsDefault }
  clearPlot()
  c.setNewContactPositions()
  c.clear()
  c.propagateDialValues()
  newRender()
  plotNewPoint()
}


function setButtonsActiveByMetasystemMode() {
  $("#draw-plot").button("option", "disabled", metasystemMode)
  $("#default-contacts").button("option", "disabled", metasystemMode)
  $("#random-contacts").button("option", "disabled", metasystemMode)

  $("#metasystem-toggle").button("option", "label", metasystemMode ? "To x-ray view" : "To metasystem view")
}

function metasystemToggle() {
  metasystemMode = !metasystemMode
  setButtonsActiveByMetasystemMode()
  c.clear()
  c.propagateDialValues()
  newRender()
  plotNewPoint()
}


$( function() {
  for (let i = 0; i < 8; i++) {
    $( "#vslide" + i ).slider({
      orientation: "vertical",
      range: "min",
      min: 0,
      max: 100,
      value: 50,
      slide: function( event, ui ) {
        // $( "#amount" ).val( ui.value );
        // console.log(convert100RangeToSliderShift(ui.value))
        let newStripPos = convert100RangeToSliderShift(ui.value)
        c.clear()
        c.moveStrip(i, newStripPos)
        c.propagateDialValues()
        newRender()
        plotNewPoint()
      }
      });
  }

  $( "#speed").slider({
    range: "min",
    min: 1,
    max: 100,
    value: 50,
    slide: function( event, ui ) {
      playSpeed = ui.value
      switch (playMode) {
        case "none": break;
        case "sequence": newSequenceSpeed(); break;
        case "random": newRandomSpeed(); break;
      }
    }
  });

  for (let i = 0; i < 4; i++){
    $("#dial" + i).knob({
      'min':1,
      'max':10,
      "step":1,
      "width": 100,
      "height": 100,
      "cursor": 20,
      "displayInput": true,
      "font": "arial",
      "angleArc": 200,
      "angleOffset": -100,
      change: function ( v ) {
        let rounded = Math.round(v) // needed because it otherwise updates with intermediate float values...
        c.clear()
        c.setDialValue(i, rounded)
        c.propagateDialValues()
        newRender()
        plotNewPoint()
      }
  });
  }

  $("#random-state").click((event) => {
    stop()
    for (let i = 0; i < 4; i++) {
      let rn = rnd(10)
      // $("#dial" + i).val(rn).trigger('change')
      $("#dial" + i).val(rn).trigger('change')
      c.setDialValue(i, rn)
    }
    c.clear()
    c.propagateDialValues()
    newRender()
    plotNewPoint()
  })

  $("#draw-plot").button()
  $("#draw-plot").click((event) => {
      stop()
      let res = c.fullSimulate()
      drawPlot(res, plotCtx, statesCtx)
    
  })

  // $("#draw-plot").click()

  $("#play-sequence").click(playSequence)

  $("#play-random").click(playRandom)

  $("#stop").click(stop)

  


  let colourPickerBackground = $("#colour-background").spectrum({
    color: coloursDefault.background
  })

  let colourPickerStrip = $("#colour-strip").spectrum({
    color: coloursDefault.strip
  })

  let colourPickerDialOutput = $("#colour-dialout").spectrum({
    color: coloursDefault.dialOutput
  })

  let colourPickerActivated = $("#colour-activated").spectrum({
    color: coloursDefault.activated
  })

  let colourPickerBrassPad = $("#colour-brasspad").spectrum({
    color: coloursDefault.brassPad
  })

  let colourPickerBrassPadEdge = $("#colour-brasspad-edge").spectrum({
    color: coloursDefault.brassPadEdge
  })

  let colourPickerAlgedonode = $("#colour-algedonode").spectrum({
    color: coloursDefault.algedonode
  })

  let colourPickerAlgedonodeEdge = $("#colour-algedonode-edge").spectrum({
    color: coloursDefault.algedonodeEdge
  })
  
  let colourPickerLightAOn = $("#colour-light-a-on").spectrum({
    color: coloursDefault.lightAOn
  })

  let colourPickerLightAOff = $("#colour-light-a-off").spectrum({
    color: coloursDefault.lightAOff
  })

  let colourPickerLightBOn = $("#colour-light-b-on").spectrum({
    color: coloursDefault.lightBOn
  })

  let colourPickerLightBOff = $("#colour-light-b-off").spectrum({
    color: coloursDefault.lightBOff
  })

  $("#colour-blackbox").spectrum({
    color: "black",
    disabled: true
  })

  let dialog = $("#dialog-colour-picker-form").dialog({
    autoOpen: false,
    height: 650,
    width: 350,
    modal: true,
    
    buttons: {
      "Apply": () => { 
        coloursCurrent.background = colourPickerBackground.spectrum("get").toRgbString()
        coloursCurrent.strip = colourPickerStrip.spectrum("get").toRgbString()
        coloursCurrent.dialOutput = colourPickerDialOutput.spectrum("get").toRgbString()
        coloursCurrent.activated = colourPickerActivated.spectrum("get").toRgbString()
        coloursCurrent.brassPad = colourPickerBrassPad.spectrum("get").toRgbString()
        coloursCurrent.brassPadEdge = colourPickerBrassPadEdge.spectrum("get").toRgbString()
        coloursCurrent.algedonode = colourPickerAlgedonode.spectrum("get").toRgbString()
        coloursCurrent.algedonodeEdge = colourPickerAlgedonodeEdge.spectrum("get").toRgbString()

        coloursCurrent.lightAOn = colourPickerLightAOn.spectrum("get").toRgbString()
        coloursCurrent.lightAOff = colourPickerLightAOff.spectrum("get").toRgbString()
        
        coloursCurrent.lightBOn = colourPickerLightBOn.spectrum("get").toRgbString()
        coloursCurrent.lightBOff = colourPickerLightBOff.spectrum("get").toRgbString()

        dialog.dialog( "close" );
        newRender()
      },

      Cancel: function() {
        colourPickerBackground.spectrum("set", coloursTemp.background)
        colourPickerStrip.spectrum("set", coloursTemp.strip)
        colourPickerDialOutput.spectrum("set", coloursTemp.dialOutput)
        colourPickerActivated.spectrum("set", coloursTemp.activated)
        colourPickerBrassPad.spectrum("set", coloursTemp.brassPad)
        colourPickerBrassPadEdge.spectrum("set", coloursTemp.brassPadEdge)
        colourPickerAlgedonode.spectrum("set", coloursTemp.algedonode)
        colourPickerAlgedonodeEdge.spectrum("set", coloursTemp.algedonodeEdge)
        colourPickerLightAOn.spectrum("set", coloursTemp.lightAOn)
        colourPickerLightAOff.spectrum("set", coloursTemp.lightAOff)

        colourPickerLightBOn.spectrum("set", coloursTemp.lightBOn)
        colourPickerLightBOff.spectrum("set", coloursTemp.lightBOff)

        dialog.dialog( "close" );
      }
    },
    open: function () {
      // Need to save colours here
      coloursTemp.background = colourPickerBackground.spectrum("get").toRgbString()
      coloursTemp.strip = colourPickerStrip.spectrum("get").toRgbString()
      coloursTemp.dialOutput = colourPickerDialOutput.spectrum("get").toRgbString()
      coloursTemp.activated = colourPickerActivated.spectrum("get").toRgbString()
      coloursTemp.brassPad = colourPickerBrassPad.spectrum("get").toRgbString()
      coloursTemp.brassPadEdge = colourPickerBrassPadEdge.spectrum("get").toRgbString()
      coloursTemp.algedonode = colourPickerAlgedonode.spectrum("get").toRgbString()
      coloursTemp.algedonodeEdge = colourPickerAlgedonodeEdge.spectrum("get").toRgbString()
      coloursTemp.lightAOn = colourPickerLightAOn.spectrum("get").toRgbString()
      coloursTemp.lightAOff = colourPickerLightAOff.spectrum("get").toRgbString()
      coloursTemp.lightBOn = colourPickerLightBOn.spectrum("get").toRgbString()
      coloursTemp.lightBOff = colourPickerLightBOff.spectrum("get").toRgbString()
    },
    close: function() {
      // form[ 0 ].reset();
      
    }
  })

  let confirmDefaultColoursDialog = $("#dialog-confirm-delete").dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      "Yes": function() {
        coloursCurrent = { ...coloursDefault }
        newRender()
        confirmDefaultColoursDialog.dialog("close")
      },
      "No": function() {
        confirmDefaultColoursDialog.dialog("close")
      }
    }
  })

  $("#change-colours").click(() => dialog.dialog("open"))

  $("#default-colours").click(() => confirmDefaultColoursDialog.dialog("open"))


  $("#datapoints").slider({
    range: "min",
    min: 0,
    max: 100,
    step: 0.01,
    value: storeSpaceToDatapointSlider(InitialValues.DATA_STORE_SIZE),
    slide: function( event, ui ) {
      resizeData(ui.value)
    }
  });

  $("#labelDataPoints").text(`Data point store space: ${InitialValues.DATA_STORE_SIZE}`)

  $("#reset-plot-and-data").click(clearPlot)

  $("#random-contacts").button().click(setRandomContacts)
  $("#default-contacts").button().click(restoreDefaultContacts)

  $("#metasystem-toggle").button().click(metasystemToggle)

});