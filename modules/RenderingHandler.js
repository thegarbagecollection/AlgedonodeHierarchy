
class RenderingHandler {
    constructor(algHierarchy, buttonsDisabledFns, buttonsLabelledFns) {
      this.metasystemMode = false
      this.algHierarchy = algHierarchy
      this.buttonsDisabledFns= buttonsDisabledFns
      this.buttonsLabelledFns = buttonsLabelledFns
    }
  
    toggleMetasystemMode() {
      this.metasystemMode = !this.metasystemMode
      this.buttonsDisabledFns.forEach(disable => disable(this.metasystemMode))
      this.buttonsLabelledFns.forEach(label => label(this.metasystemMode))
    }
  
    newRender() {
      this.algHierarchy.clearRenderer()
      if (this.metasystemMode) {
        this.algHierarchy.renderMetasystem()
      }
      else {
        this.algHierarchy.render()
      }
    }
  
    rerenderAndPropagate() {
      this.algHierarchy.clear()
      this.algHierarchy.propagateDialValues()
      this.newRender()
    }
  }