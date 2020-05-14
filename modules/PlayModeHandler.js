const PlayMode = {
    STOP: "stop",
    SEQUENCE: "sequence",
    RANDOM: "random"
  }
  
  class PlayModeHandler {
    constructor(structuresToReset) {
      this.playInterval = null
      this.playSpeed = 50
      this.playIndex = 0
      this.playMode = PlayMode.STOP
      this.stateSequence = []
      this.structuresToReset = structuresToReset
  
      for (let i1 = 1; i1 <= 10; i1++) {
        for (let i2 = 1; i2 <= 10; i2++) {
          for (let i3 = 1; i3 <= 10; i3++) {
            for (let i4 = 1; i4 <= 10; i4++) {
              this.stateSequence.push([i1, i2, i3, i4])
            }
          }
        }
      }
    }
  
    // random integer in {1,...,n}
    rnd(n) {
        return Math.floor(Math.random() * n) + 1
    }
    randomState() {
      let rState = []
      for (let i = 0; i < 4; i++) {
        let rn = rnd(10)
        rState[i] = rn
      }
      return rState
    }
  
    createDelayFromSpeed() {
      // Speed is 1-100
      // We want speed 100 = 0ms delay
      //         speed 1 = 1000 ms delay
      // We also want -x^2 behaviour, or something like that
      // go with 1000 * (1 - x^1.1), with x in [0, 1]
      let x = this.playSpeed / 100
      return 1000 * (1 - Math.pow(x, 1.1))
    }
  
    stop() {
      if (this.playInterval) {
        window.clearInterval(this.playInterval)
      }
      this.playMode = PlayMode.STOP
    }
  
  
    setDialsDirect(metasystemMode, states) {
      for (let i = 0; i < 4; i++) {
        let n = states[i]
        $("#dial" + i).val(n).trigger('change')
        this.structuresToReset.algHierarchy.setDialValue(i, n)
      }
      reset({ freshPlot: false, plotCurrentDialValues: true }, this.structuresToReset, metasystemMode)
    }
  
    playSequence(metasystemMode) {
      this.stop()
      this.playMode = PlayMode.SEQUENCE
      this.playIndex = 0
      this.playInterval = window.setInterval(() => {
        this.setDialsDirect(metasystemMode, this.stateSequence[this.playIndex++])
      }, this.createDelayFromSpeed())
    }
  
    newSequenceSpeed(metasystemMode) {
      this.stop()
      this.playMode = PlayMode.SEQUENCE
      this.playInterval = window.setInterval(() => {
        this.setDialsDirect(metasystemMode, this.stateSequence[this.playIndex++])
      }, this.createDelayFromSpeed())
    }
  
    playRandom(metasystemMode) {
      this.stop()
      this.playMode = PlayMode.RANDOM
      this.playInterval = window.setInterval(() => {
        let rs = this.randomState()
        this.setDialsDirect(metasystemMode, rs)
      }, this.createDelayFromSpeed())
    }
  
    newRandomSpeed(metasystemMode) {
      this.playRandom(metasystemMode) // don't need to do anything else
    }
  
    setNewPlaySpeed(newSpeed, metasystemMode) {
      this.playSpeed = newSpeed
      switch (this.playMode) {
        case PlayMode.STOP: break;
        case PlayMode.SEQUENCE: this.newSequenceSpeed(metasystemMode); break;
        case PlayMode.RANDOM: this.newSequenceSpeed(metasystemMode); break;
      }
    }
  }