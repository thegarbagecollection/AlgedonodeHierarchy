
// TODO: move this to AH Renderer and delete
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
  
  class Hierarchy {
      // takes an AlgedonodeHierarchyRenderer
      constructor(renderer) {
          this.positionInfo = {
            columnSpacing: 50, // distance between columns
            columnWidth: 10, // width of a single column
            rowSpacing: 100, // distance between rows
            rowHeight: 30, // height of a single row
          }
          this.renderer = renderer
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
        this.renderLabels()
      }
  
      renderLabels() {
        this.renderer.rowAndColumnLabels()
      }
  
      renderComponentsTo(context) {
        this.algedonodeActivators.forEach(aa => { aa.render(context, this.positionInfo) })
        this.dials.forEach(d => { d.render(this.renderer) })
        this.strips.forEach(s => { s.render(this.renderer) } )
        this.rows.forEach( r => { r.forEach( c => { c.render(context, this.positionInfo) } )} )
        this.lights.forEach( lightPair => { lightPair.forEach( light => light.render(context, this.positionInfo) ) } )
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
        this.renderLabels()
      }
  
      renderMetasystemVisibleComponentsTo(context) {
        this.dials.forEach(d => { d.render(this.renderer) })
        this.strips.forEach(s => { s.render(this.renderer) })
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
    render(renderer) {
  
      for (let i = 0; i < 10; i++) {
        this.dialOutputs[i].render(renderer, this.row, i)
      }
  
      renderer.dial(this.row, this.value)
  
  
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
  
    render(renderer, row, outputNum) {
      renderer.dialOutput(row, this.active, outputNum)
    }
  }
  
  class Strip {
    // 4-element array of brass pad pairs,    in row order
    constructor(brassPadPairs, column) {
      this.brassPadPairs = brassPadPairs
      this.offset = 0 // will be controlled by sliders
      this.column = column
    }
    render(renderer) {
      renderer.strip(this.column, this.offset)
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