// Implementation of the algedonode hierarchy from Stafford Beer's Brain of the Firm, Chapter 5
// Also includes a metasystem view - a metasystem by definition can't see any details, and won't
// have access to every input state at once.



let c

let context



let dataStore = new SmallDataStore(InitialValues.DATA_STORE_SIZE)
let barChart
let statePlot


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
    plotNewStatePoint(null, pointRemoved)
    plotNewBarPoint(null, pointRemoved)
  })
}

function clearPlot() {
  dataStore.clear()
  barChart.clear()
  statePlot.clear()
}

function plotNewPoint() {
  let states = c.dials.map(dial => dial.getDialValue())
  let illum = c.getIlluminatedLight()
  if (illum !== null) {
    let { column, lightRow } = illum
    let removed = dataStore.enqueue(states, column, lightRow)

    plotNewStatePoint({ states, column, lightRow}, removed)

    plotNewBarPoint( { states, column, lightRow}, removed)

  }
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
}

function newRender() {
  clear(context)
  if (metasystemMode) {
    c.renderMetasystem()
  }
  else {
    c.render()
  }
}

// random integer in {1,...,n}
function rnd(n) {
  return Math.floor(Math.random() * n) + 1
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
      let { counts, individualResults } = c.fullSimulate()
      barChart.fullChart(counts)
      statePlot.fullPlot(individualResults, statesCtx)
    
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


window.onload = () => {
  let canvas = document.getElementById("canvas")
  
  context = canvas.getContext("2d")

  let plotCanvas = document.getElementById("plot")
  plotCtx = plotCanvas.getContext("2d")

  let statesCanvas = document.getElementById("states")
  statesCtx = statesCanvas.getContext("2d")

  c = new Hierarchy(new AlgedonodeHierarchyRenderer(context))
  c.setupConnections()
  for (let i = 0; i < 4; i++) {
    $("#dial" + i).val(1).trigger('change')
    c.setDialValue(i, 1)
  }
  barChart = new LimitedBarChart(plotCtx)
  statePlot = new LimitedStatePlot(statesCtx)
  clear(context)
  clearPlot()
  c.clear()
  c.propagateDialValues()
  plotNewPoint()
  c.render(context)
}