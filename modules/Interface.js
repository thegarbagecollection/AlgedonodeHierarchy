// Implementation of the algedonode hierarchy from Stafford Beer's Brain of the Firm, Chapter 5
// Also includes a metasystem view - a metasystem by definition can't see any details, and won't
// have access to every input state at once.

$(function() {
  // Which buttons are enabled / disabled, or have a label change, by a change in metasystem mode?
  const { disabledByMetasystem, labelledByMetasystemMode } = metasystemButtonFunctions()

  const { algHierarchy, dataStore, barChart, statePlot, colourHandler } = initialiseMainComponents()
  const renderingHandler = new RenderingHandler(algHierarchy, disabledByMetasystem, labelledByMetasystemMode)

  // Function Integer -> (), should set the stored data point count label
  const dataPointLabelSetter = (newStoreSpace) => $("#label-data-store-size").text(`Data point store space: ${newStoreSpace}`)

  const dataHandler = new DataHandler(dataStore, barChart, statePlot, dataPointLabelSetter)

  // To force rerendering of algedonode hierarchy, and then display the current dial contents
  const rerenderHierarchyAndPlotNewPoint = () => { 
    renderingHandler.rerenderAndPropagate()
    dataHandler.displayNewPoint(algHierarchy)
  }

  let playModeHandler = new PlayModeHandler(setDial(algHierarchy), rerenderHierarchyAndPlotNewPoint)

  let contactsHandler = new ContactsHandler(algHierarchy, rerenderHierarchyAndPlotNewPoint)
  algHierarchy.setupConnections(contactsHandler)

  // if the slider or contacts have changed since the last full plot, we can't rely on the 
  // cached full plot data, it'll have to be recalculated
  let sliderOrContactsChanged = true // force a full render of the full plot first time
  
  // First display of window - draw axes for data graphics, draw hierarchy, plot result of starting state (1,1,1,1)
  dataHandler.drawAxes()
  rerenderHierarchyAndPlotNewPoint()

  /**************************************************************
   *  STRIP SLIDER
   * ************************************************************/
  for (let i = 0; i < 8; i++) {
    $( "#vslide" + i ).slider({
      orientation: "vertical",
      range: "min",
      min: 0,
      max: 100,
      value: 50,
      slide: function( event, ui ) {
        sliderOrContactsChanged = true
        let newStripPos = convert100RangeToSliderShift(ui.value)
        algHierarchy.moveStrip(i, newStripPos)
        // if a slider changes, we want to make sure a possible different output from the same state is rendered
        rerenderHierarchyAndPlotNewPoint() 
      }
      });
  }

  /**************************************************************
   *  DIALS
   * ************************************************************/
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
        rerenderHierarchyAndPlotNewPoint()
      }
  });
  }

  /**************************************************************
   *  RANDOM / DEFAULT CONTACTS
   * ************************************************************/
  // When we change the contacts, that'll also have to erase the data graphics
  $("#random-contacts").button().click(() => { 
    contactsHandler.setRandomContacts() 
    sliderOrContactsChanged = true
  })

  $("#default-contacts").button().click(() => { 
    contactsHandler.restoreDefaultContacts() 
    sliderOrContactsChanged = true
  })

  /**************************************************************
   *  METASYSTEM ON/OFF
   * ************************************************************/
  $("#metasystem-toggle")
    .button()
    .click(() => {
      renderingHandler.toggleMetasystemMode()
      rerenderHierarchyAndPlotNewPoint()
    })
    .button("option", "label", "To metasystem view")


  /**************************************************************
   *  "PLAY MODE" / TIMED SEQUENCE
   * ************************************************************/
  $("#random-state").click((event) => {
    playModeHandler.stop()
    for (let i = 0; i < 4; i++) {
      let rn = rnd(10)
      $("#dial" + i).val(rn).trigger('change')
      algHierarchy.setDialValue(i, rn)
    }
    // programmatically setting a new dial value requires propagating and rendering the changes
    rerenderHierarchyAndPlotNewPoint()
  })
  $("#play-sequence").click(() => playModeHandler.playSequence())
  $("#play-random").click(() => playModeHandler.playRandom())
  $("#stop").click(() => playModeHandler.stop())
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

  /**************************************************************
   *  GRAPHICAL DATA DISPLAY
   * ************************************************************/
  $("#draw-full-data-graphics").button()
  $("#draw-full-data-graphics").click((event) => {
      playModeHandler.stop()
      dataHandler.requestCompletePlot(algHierarchy, sliderOrContactsChanged)
      // when we do a full plot of all state-results, we cache it - unless 
      // something happens that could put the cache out of date (slider / contact positions)
      sliderOrContactsChanged = false
  })
  $("#data-store-size").slider({
    range: "min",
    min: 0,
    max: 100,
    step: 0.01,
    value: dataHandler.storeSpaceToDatapointSlider(InitialValues.DATA_STORE_SIZE),
    slide: function( event, ui ) {
      dataHandler.resizeData(ui.value)
    }
  });

  $("#label-data-store-size").text(`Data point store space: ${InitialValues.DATA_STORE_SIZE}`)

  $("#reset-data-graphics-and-data").click(() => dataHandler.clearPlotGraphicAndData())

  
  /**************************************************************
   *  COLOUR
   * ************************************************************/
  // Add one colour picker row for every row defined in colourHandler.initColours()
  // each row may contain multiple colour pickers, and contains one label
  let colourRows = colourHandler.getColourables()
  let colourPickerField = $("#colour-picker-field")
  colourRows.forEach(({ label, elementNames }) => {
    let colourRow = $(`<p></p>`)
    let colourLabel = $(`<label></label>`)
      .text(label)
      .attr({ for: `colour-${elementNames[elementNames.length - 1]}`})
      .addClass("label-colourpicker")
    let colourPickers = elementNames.map(name => {
      return $("<input></input>")
        .attr( {
          name: `colour-${name}`,
          type: "text",
          id: `colour-${name}`,
        })
        .addClass("text", "ui-widget-content", "ui-corner-all", "colourpicker")
    })
    colourPickers.forEach(colourPicker => colourRow.append(colourPicker))
    colourRow.append(colourLabel)
    colourPickerField.append(colourRow)
  })
  // Conversion to a Spectrum seems to have to happen after the elements 
  // have been added to the DOM, otherwise it doesn't render them!
  colourRows.forEach(({label, elementNames}) => {
    elementNames.forEach(name => { 
      $(`#colour-${name}`).spectrum({
        color: colourHandler.getByName(name)
      }) 
    })
  })

  // Colour picker form with accept / cancel , and associated button to open
  let dialog = $("#dialog-colour-picker-form").dialog({
    autoOpen: false,
    height: 650,
    width: 350,
    modal: true,
    
    buttons: {
      "Apply": () => { 
        // extract the colours from the colour pickers based on the names given to the elements in ColourHandler
        colourRows.forEach(({ label, elementNames }) => {
          elementNames.forEach(name => {
            let newColour = $(`#colour-${name}`).spectrum("get").toRgbString()
            colourHandler.colourChange(name, newColour)
          })
        })

        // also commit the colour changes and re-render both the algedonode hierarchy and the data graphics
        dialog.dialog( "close" );
        colourHandler.commitColourChange()
        renderingHandler.newRender()
        dataHandler.colourChange()
      },

      Cancel: function() {
        // Reset the colour picker settings to the default colours
        colourRows.forEach(({ label, elementNames }) => {
          elementNames.forEach(name => {
            $(`#colour-${name}`).spectrum("set", colourHandler.getByName(name))
          })
        })
        
        dialog.dialog( "close" );
        colourHandler.cancelColourChange()
      }
    },
    open: function () {
      // Initialise the colour pickers with the current colour associated with the appropriate element name
      colourHandler.beginColourChange()
      colourRows.forEach(({ label, elementNames }) => {
        elementNames.forEach(name => {
          $(`#colour-${name}`).spectrum("set", colourHandler.getByName(name))
        })
      })
    },
  })
  $("#change-colours").click(() => dialog.dialog("open"))

  // Dialog to confirm reset to colour defaults, and associated button to open
  let confirmDefaultColoursDialog = $("#dialog-confirm-delete").dialog({
    autoOpen: false,
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      "Yes": function() {
        colourHandler.setToDefault()
        renderingHandler.newRender()
        dataHandler.colourChange()
        confirmDefaultColoursDialog.dialog("close")
      },
      "No": function() {
        confirmDefaultColoursDialog.dialog("close")
      }
    }
  })
  $("#default-colours").click(() => confirmDefaultColoursDialog.dialog("open"))

});


/**
 * Initialises the main components of the app, and returns the ones that will 
 * be used elsewhere
 * @returns {{ algHierarchy: AlgedonodeHierarchy, 
 * dataStore: SmallDataStore, 
 * barChart: LimitedBarChart, 
 * statePlot: LimitedStatePlot, 
 * colourHandler: ColourHandler }} the main components
 */
function initialiseMainComponents() {
  let dataStore = new SmallDataStore(InitialValues.DATA_STORE_SIZE)

  let algCanvas = document.getElementById("canvas")
  let algCtx = algCanvas.getContext("2d")

  let barChartCanvas = document.getElementById("bar-chart")
  let barChartCtx = barChartCanvas.getContext("2d")

  let statePlotCanvas = document.getElementById("state-plot")
  let statePlotCtx = statePlotCanvas.getContext("2d")

  let colourHandler = new ColourHandler()

  let algHierarchy = new AlgedonodeHierarchy(new AlgedonodeHierarchyRenderer(algCtx, colourHandler))
  // Default value of all dials on load is 1
  for (let i = 0; i < 4; i++) {
    setDial(algHierarchy)(i, 1)
  }
  let barChart = new LimitedBarChart(barChartCtx, colourHandler)
  let statePlot = new LimitedStatePlot(statePlotCtx, colourHandler)

  return { algHierarchy, dataStore, barChart, statePlot, colourHandler }
}

/**
 * 
 * @returns {{disabledByMetasystem: Function, labelledByMetasystemMode: Array }} 
 * disabledByMetasystem is a function Boolean -> () which disables every DOM element with the ".metasystem-disabled" class;
 * labelledByMetasystemMode is an array of functions Boolean -> () which, given a metasystem mode, will assign a label based on that 
 * metasystem mode to some DOM element
 */
function metasystemButtonFunctions() {
  let disabledByMetasystem = (metasystemMode) => $(".metasystem-disabled").button("option", "disabled", metasystemMode)
  let labelFn = (metasystemMode) => $("#metasystem-toggle").button("option", "label", metasystemMode ? "To x-ray view" : "To metasystem view")
  let labelledByMetasystemMode = [labelFn] 
  return { disabledByMetasystem, labelledByMetasystemMode }
}

/**
 * returns the conversion of any value in [0,100] to some value in [-1, 1], where 0 corresponds to 1 and 100 to -1 
 * ("inverted" due to vertical sliders measuring distance from the bottom, and the strips being rendered measured from the top)
 * @param {Number} input is in range 0 to 100;
 * @returns {Number} in range [-1, 1]
 */
function convert100RangeToSliderShift(input) {
  // sliders need an input range of [-1, 1]
  // also, 0 corresponds to bottom and 100 to top
  // so we need to switch that around
  return -((input - 50) / 50)
}

/**
 * @param {*} n 
 * @returns {Number} random integer in {1,...,n}
 */
function rnd(n) {
  return Math.floor(Math.random() * n) + 1
}

/**
 * 
 * @param {AlgedonodeHierarchy} algHierarchy the app's algedonode hierarchy
 * @returns {Function} function (dialNum: Integer, value: Integer) -> () which sets dial numbered dialNum to
 * the given value, both in the interface and within the algedonode hierarchy, 
 * possibly causing changes to the algedonode hierarchy's output state
 */
function setDial(algHierarchy) {
  return (dialNum, value) => {
    $("#dial" + dialNum).val(value).trigger('change')
    algHierarchy.setDialValue(dialNum, value)
  }
}