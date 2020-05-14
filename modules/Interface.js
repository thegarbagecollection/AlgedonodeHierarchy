// Implementation of the algedonode hierarchy from Stafford Beer's Brain of the Firm, Chapter 5
// Also includes a metasystem view - a metasystem by definition can't see any details, and won't
// have access to every input state at once.

class ContactsHandler {
  constructor(structuresToReset) {
    const contactsDefault2 = [-0.49, 0.49]
    const contactsDefault4 = [-0.49, -0.16, 0.16, 0.49 ]
    const contactsDefault8 = [-0.49, -0.35, -0.21, -0.07, 0.07, 0.21, 0.35 , 0.49]

    this.contactsDefault = {
      "1": [-0.49, 0.49, -0.49, 0.49, -0.49, 0.49, -0.49, 0.49],
      "2": [contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2],
      "4": [contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4],
      "8": [contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8],
    }
    this.contactsCurrent = { ...this.contactsDefault }
    this.structuresToReset = structuresToReset
  }

  // returns a list of n random contact positions in [-0.49, 0.49]
  randomContactPositions(n) {
    return new Array(n).fill(null).map(_ => Math.random() * 0.98 - 0.49)
  }

  // returns an 8-list of lists of n random contact positions in [-0.49, 0.49]
  randomContactPositions8(n) {
    return new Array(8).fill(null).map(_ => this.randomContactPositions(n))
  }

  setRandomContacts(metasystemMode) {
    this.contactsCurrent[1] = this.randomContactPositions(8)
    this.contactsCurrent[2] = this.randomContactPositions8(2)
    this.contactsCurrent[4] = this.randomContactPositions8(4)
    this.contactsCurrent[8] = this.randomContactPositions8(8)
    this.structuresToReset.algHierarchy.setNewContactPositions(this)
    reset({freshPlot: true, plotCurrentDialValues: true}, this.structuresToReset, metasystemMode)
  }

  restoreDefaultContacts(metasystemMode) {
    this.contactsCurrent = { ...this.contactsDefault }
    this.structuresToReset.algHierarchy.setNewContactPositions(this)
    reset({freshPlot: true, plotCurrentDialValues: true}, this.structuresToReset, metasystemMode)
  }

  getContactsCurrent() {
    return this.contactsCurrent
  }

  getContactsDefault() {
    return this.contactsDefault
  }
}


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

function resizeData(sliderValue, dataStore, barChart, statePlot) {
  let newStoreSpace = Math.floor(datapointSliderToStoreSpace(sliderValue))
  $("#labelDataPoints").text(`Data point store space: ${newStoreSpace}`)
  let removed = dataStore.resize(newStoreSpace)
  if (removed) removed.forEach(pointRemoved => {
    statePlot.plotStatePoint(null, pointRemoved)
    barChart.changePoint(null, pointRemoved)
  })
}

function clearPlot(dataStore, barChart, statePlot) {
  dataStore.clear()
  barChart.clear()
  statePlot.clear()
}

function plotNewPoint(algHierarchy, dataStore, barChart, statePlot) {
  let states = algHierarchy.dials.map(dial => dial.getDialValue())
  let illum = algHierarchy.getIlluminatedLight()
  if (illum !== null) {
    let { column, lightRow } = illum
    let removed = dataStore.enqueue(states, column, lightRow)

    statePlot.plotStatePoint({ states, column, lightRow}, removed)

    barChart.changePoint( { states, column, lightRow}, removed)

  }
}







function setButtonsActiveByMetasystemMode(metasystemMode) {
  $("#draw-plot").button("option", "disabled", metasystemMode)
  $("#default-contacts").button("option", "disabled", metasystemMode)
  $("#random-contacts").button("option", "disabled", metasystemMode)
  $("#metasystem-toggle").button("option", "label", metasystemMode ? "To x-ray view" : "To metasystem view")
}

function convert100RangeToSliderShift(input) {
  // sliders need an input range of [-1, 1]
  // also, 0 corresponds to bottom and 100 to top
  // so we need to switch that around
  return -((input - 50) / 50)
}

function newRender(algHierarchy, metasystemMode) {
  algHierarchy.clearRenderer()
  if (metasystemMode) {
    algHierarchy.renderMetasystem()
  }
  else {
    algHierarchy.render()
  }
}

// random integer in {1,...,n}
function rnd(n) {
  return Math.floor(Math.random() * n) + 1
}


$( function() {
  let metasystemMode = false
  let { algHierarchy, dataStore, barChart, statePlot, contactsHandler } = initialise(metasystemMode)
  let structuresToReset = { algHierarchy, dataStore, barChart, statePlot }
  let playModeHandler = new PlayModeHandler(structuresToReset)

  for (let i = 0; i < 8; i++) {
    $( "#vslide" + i ).slider({
      orientation: "vertical",
      range: "min",
      min: 0,
      max: 100,
      value: 50,
      slide: function( event, ui ) {
        let newStripPos = convert100RangeToSliderShift(ui.value)
        algHierarchy.moveStrip(i, newStripPos)
        reset({freshPlot: false, plotCurrentDialValues: true}, structuresToReset, metasystemMode)
      }
      });
  }

  $( "#speed").slider({
    range: "min",
    min: 1,
    max: 100,
    value: 50,
    slide: function( event, ui ) {
      let playSpeed = ui.value
      playModeHandler.setNewPlaySpeed(playSpeed, metasystemMode)
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
        algHierarchy.setDialValue(i, rounded)
        reset({freshPlot: false, plotCurrentDialValues: true}, structuresToReset, metasystemMode)
      }
  });
  }

  $("#random-state").click((event) => {
    stop()
    for (let i = 0; i < 4; i++) {
      let rn = rnd(10)
      // $("#dial" + i).val(rn).trigger('change')
      $("#dial" + i).val(rn).trigger('change')
      algHierarchy.setDialValue(i, rn)
    }
    reset({freshPlot: false, plotCurrentDialValues: true}, structuresToReset, metasystemMode)
  })

  $("#draw-plot").button()
  $("#draw-plot").click((event) => {
      stop()
      let { counts, individualResults } = algHierarchy.fullSimulate()
      barChart.fullChart(counts)
      statePlot.fullPlot(individualResults)
  })

  $("#play-sequence").click(() => playModeHandler.playSequence(metasystemMode))

  $("#play-random").click(() => playModeHandler.playRandom(metasystemMode))

  $("#stop").click(() => playModeHandler.stop())

  


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
        newRender(algHierarchy, metasystemMode)
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
        newRender(algHierarchy, metasystemMode)
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
      resizeData(ui.value, dataStore, barChart, statePlot)
    }
  });

  $("#labelDataPoints").text(`Data point store space: ${InitialValues.DATA_STORE_SIZE}`)

  $("#reset-plot-and-data").click(() => clearPlot(dataStore, barChart, statePlot))

  $("#random-contacts").button().click(() => contactsHandler.setRandomContacts(metasystemMode))
  $("#default-contacts").button().click(() => contactsHandler.restoreDefaultContacts(metasystemMode))

  $("#metasystem-toggle").button().click(() => {
    metasystemMode = !metasystemMode
    setButtonsActiveByMetasystemMode(metasystemMode)
    reset({freshPlot: true, plotCurrentDialValues: true}, structuresToReset, metasystemMode)
  })

});


function initialise(metasystemMode) {
  let dataStore = new SmallDataStore(InitialValues.DATA_STORE_SIZE)

  let algCanvas = document.getElementById("canvas")
  let algCtx = algCanvas.getContext("2d")

  let plotCanvas = document.getElementById("plot")
  let plotCtx = plotCanvas.getContext("2d")

  let statesCanvas = document.getElementById("states")
  let statesCtx = statesCanvas.getContext("2d")

  let algHierarchy = new Hierarchy(new AlgedonodeHierarchyRenderer(algCtx))
  for (let i = 0; i < 4; i++) {
    $("#dial" + i).val(1).trigger('change')
    algHierarchy.setDialValue(i, 1)
  }
  let barChart = new LimitedBarChart(plotCtx)
  let statePlot = new LimitedStatePlot(statesCtx)
  let contactsHandler = new ContactsHandler({algHierarchy, dataStore, barChart, statePlot})

  algHierarchy.setupConnections(contactsHandler)

  reset({freshPlot: true, plotCurrentDialValues: true}, {algHierarchy, dataStore, barChart, statePlot}, metasystemMode)
  return { algHierarchy, dataStore, barChart, statePlot, contactsHandler }
}


function reset({freshPlot, plotCurrentDialValues}, {algHierarchy, dataStore, barChart, statePlot}, metasystemMode) {
  algHierarchy.clearRenderer()
  algHierarchy.clear()
  algHierarchy.propagateDialValues()
  newRender(algHierarchy, metasystemMode)
  if (freshPlot) clearPlot(dataStore, barChart, statePlot)
  if (plotCurrentDialValues) plotNewPoint(algHierarchy, dataStore, barChart, statePlot)
}