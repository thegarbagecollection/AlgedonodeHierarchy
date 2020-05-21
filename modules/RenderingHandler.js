/**
 * Enum for view mode of algedonode hierarchy - metasystem or see everything (x-ray)?
 * @readonly
 * @enum { ViewMode }
 */
const ViewModes = {
  /**
   * @type {ViewMode}
   */
  XRAY: 0,
  /**
   * @type {ViewMode}
   */
  METASYSTEM: 1,

  /**
   * Switches between view modes
   * @param {ViewMode} viewMode the view mode to return the opposite of
   * @returns {ViewMode} the opposite view mode
   */
  toggle(viewMode) {
    switch (viewMode) {
      case ViewModes.XRAY:
        return ViewModes.METASYSTEM
      case ViewModes.METASYSTEM:
        return ViewModes.XRAY
      default:
        throw `Metasystem mode toggle failed with input ${viewMode}`
    }
  },

  /**
   * @param {ViewMode} viewMode to convert
   * @returns {Boolean} true if METASYSTEM, false if XRAY, corresponding to whether or not an element should be disabled
   */
  disableElement(viewMode) {
    return viewMode === ViewModes.METASYSTEM
  },
}

/**
 * Contains the rendering options for the algedonode hierarchy; specifically, controlling the
 * view mode (metasystem rendering), drawing the hierarchy, and propagating values from dials.
 */
class RenderingHandler {
  /**
   * @param {AlgedonodeHierarchy} algHierarchy the algedonode hierarchy to control rendering for
   * @param {MetasystemButtonDisabler} buttonsDisabledFn function that, when called with ViewModes.METASYSTEM
   * disables all buttons that the metasystem doesn't need; and when called with ViewModes.XRAY, re-enables those buttons
   * @param {ViewModeElementLabeller} buttonsLabelledFns functions that, when called with ViewMode.METASYSTEM, set
   * the label on buttons to show the metasystem mode is active, and the opposite when called with ViewModes.XRAY
   */
  constructor(algHierarchy, buttonsDisabledFn, buttonsLabelledFns) {
    this.viewMode = ViewModes.XRAY
    this.algHierarchy = algHierarchy
    this.buttonsDisabledFn = buttonsDisabledFn
    this.buttonsLabelledFns = buttonsLabelledFns
  }

  
  toggleMetasystemMode() {
    this.viewMode = ViewModes.toggle(this.viewMode)
    this.buttonsDisabledFn(this.viewMode)
    this.buttonsLabelledFns.forEach(label => label(this.viewMode))
  }

  newRender() {
    this.algHierarchy.clearRenderer()
    switch (this.viewMode) {
      case ViewModes.METASYSTEM:
        this.algHierarchy.renderMetasystem()
        break
      case ViewModes.XRAY:
        this.algHierarchy.render()
        break
    }
  }

  rerenderAndPropagate() {
    this.algHierarchy.clear()
    this.algHierarchy.propagateDialValues()
    this.newRender()
  }
}


// Hack to get ViewMode to show up in the documentation
/**
 * @class
 */
function ViewMode() {}
