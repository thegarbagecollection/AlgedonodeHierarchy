// Implementation of the algedonode hierarchy from Stafford Beer's Brain of the Firm, Chapter 5
// Also includes a metasystem view - a metasystem by definition can't see any details, and won't
// have access to every input state at once.

function metasystemButtonFunctions() {
  // return [$("#draw-plot"), $("#default-contacts"), $("#random-contacts")]
  let disabledByMetasystem = [(metasystemMode) => $(".metasystem-disabled").button("option", "disabled", metasystemMode)]
  let labelFn = (metasystemMode) => $("#metasystem-toggle").button("option", "value", metasystemMode ? "To x-ray view" : "To metasystem view")
  let labelledByMetasystemMode = [labelFn] 
  return { disabledByMetasystem, labelledByMetasystemMode }
}


function convert100RangeToSliderShift(input) {
  // sliders need an input range of [-1, 1]
  // also, 0 corresponds to bottom and 100 to top
  // so we need to switch that around
  return -((input - 50) / 50)
}

// random integer in {1,...,n}
function rnd(n) {
  return Math.floor(Math.random() * n) + 1
}

function setDial(algHierarchy) {
  return (dialNum, value) => {
    $("#dial" + dialNum).val(value).trigger('change')
    algHierarchy.setDialValue(dialNum, value)
  }
}

$( function() {
  let { disabledByMetasystem, labelledByMetasystemMode } = metasystemButtonFunctions()
  let { algHierarchy, dataStore, barChart, statePlot } = initialise()
  
  let renderingHandler = new RenderingHandler(algHierarchy, disabledByMetasystem, labelledByMetasystemMode)

  let dataPointLabelSetter = (newStoreSpace) => $("#labelDataPoints").text(`Data point store space: ${newStoreSpace}`)
  let dataHandler = new DataHandler(dataStore, barChart, statePlot, dataPointLabelSetter)

  let resetCreator = (bool) => () => { renderingHandler.reset(); dataHandler.plotNewPoint(bool, algHierarchy); }
  let resetHierarchyKeepPlot = resetCreator(false)
  let resetHierarchyResetPlot = resetCreator(true)
  
  let playModeHandler = new PlayModeHandler(setDial(algHierarchy), resetHierarchyKeepPlot)

  let contactsHandler = new ContactsHandler(algHierarchy, resetHierarchyResetPlot)
  algHierarchy.setupConnections(contactsHandler)

  resetHierarchyResetPlot()

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
        renderingHandler.reset()
        resetHierarchyKeepPlot()
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
      playModeHandler.setNewPlaySpeed(playSpeed)
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
        renderingHandler.reset()
        resetHierarchyKeepPlot()
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
    renderingHandler.reset()
    resetHierarchyKeepPlot()
  })

  $("#draw-plot").button()
  $("#draw-plot").click((event) => {
      stop()
      let { counts, individualResults } = algHierarchy.fullSimulate()
      dataHandler.fullPlot(counts, individualResults)
  })

  $("#play-sequence").click(() => playModeHandler.playSequence())

  $("#play-random").click(() => playModeHandler.playRandom())

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
        renderingHandler.newRender()
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
        renderingHandler.reset()
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
    value: dataHandler.storeSpaceToDatapointSlider(InitialValues.DATA_STORE_SIZE),
    slide: function( event, ui ) {
      dataHandler.resizeData(ui.value)
    }
  });

  $("#labelDataPoints").text(`Data point store space: ${InitialValues.DATA_STORE_SIZE}`)

  $("#reset-plot-and-data").click(() => dataHandler.clearPlot())

  $("#random-contacts").button().click(() => contactsHandler.setRandomContacts())
  $("#default-contacts").button().click(() => contactsHandler.restoreDefaultContacts())

  $("#metasystem-toggle").button().click(() => {
    renderingHandler.toggleMetasystemMode()
    renderingHandler.reset()
    resetHierarchyResetPlot()
  })

});


function initialise() {
  let dataStore = new SmallDataStore(InitialValues.DATA_STORE_SIZE)

  let algCanvas = document.getElementById("canvas")
  let algCtx = algCanvas.getContext("2d")

  let plotCanvas = document.getElementById("plot")
  let plotCtx = plotCanvas.getContext("2d")

  let statesCanvas = document.getElementById("states")
  let statesCtx = statesCanvas.getContext("2d")

  let algHierarchy = new AlgedonodeHierarchy(new AlgedonodeHierarchyRenderer(algCtx))
  for (let i = 0; i < 4; i++) {
    setDial(algHierarchy)(i, 1)
  }
  let barChart = new LimitedBarChart(plotCtx)
  let statePlot = new LimitedStatePlot(statesCtx)


  return { algHierarchy, dataStore, barChart, statePlot }
}
