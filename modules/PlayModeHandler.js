/**
 * Indicates timed change are happening to dial states - dial states change sequentially, 
 * randomly, or not at all (unless user changes states directly).
 * @enum {PlayMode}
 * @todo Maybe add a pause mode - might be useful for resuming mid-sequence
 */
const PlayModes = {
  /**
   * @type {PlayMode}
   */
  STOP: "stop",
  /**
   * @type {PlayMode}
   */
  SEQUENCE: "sequence",
  /**
   * @type {PlayMode}
   */
  RANDOM: "random",
}

/**
 * Deals with timed state progression - random, sequential, and stopping;
 * also the speed of state progression.
 */
class PlayModeHandler {
  /**
   * @param {DialSetterCallback} dialSetterFn sets the given dial to the given state in 1-10
   * @param {RerenderAndPlotCallback} rerenderFn when called, clears the dial settings, propagates a new state, re-renders, then plots the result
   * @public
   */
  constructor(dialSetterFn, rerenderFn) {
    this.playInterval = null // stores the interval cancellation handle
    this.playSpeed = 50 // speed measured in 1-100
    this.playIndex = 0 // position in the state sequence (1,1,1,1)-(10,10,10,10)
    this.playMode = PlayModes.STOP
    /**
     * @type {DialStates}
     */
    this.stateSequence = InitialValues.DIAL_STATES // in-order dial states (1,1,1,1)-(10,10,10,10)
    this.rerenderFn = rerenderFn
    this.dialSetterFn = dialSetterFn
  }

  /**
   * @param {Number} n 
   * @returns {Number} random integer in 1,...,n inclusive
   * @protected
   */
  rnd(n) {
    return Math.floor(Math.random() * n) + 1
  }
  /**
   * @returns {DialStates} a random dial state
   * @protected
   */
  randomState() {
    let rState = []
    for (let i = 0; i < 4; i++) {
      let rn = rnd(10)
      rState[i] = rn
    }
    return rState
  }

  /**
   * @returns {Number} the millisecond delay conversion of the currently set speed for state transition
   * @protected
   */
  createDelayFromSpeed() {
    // Speed is 1-100
    // We want speed 100 = 0ms delay
    //         speed 1 = 1000 ms delay
    // We also want -x^2 behaviour, or something like that - polynomial, at least
    // go with 1000 * (1 - x^1.5), with x in [0, 1]
    let x = this.playSpeed / 100
    return 1000 * (1 - Math.pow(x, 1.5))
  }

  /**
   * Stops the timed state transition if playing
   * @public
   */
  stop() {
    if (this.playInterval) {
      window.clearInterval(this.playInterval)
    }
    this.playMode = PlayModes.STOP
  }

  /**
   * Sets the dials to the given states, propagates the values through the hierarchy, re-renders, and plots the result
   * @param {DialStates} states the dial states to set the dials to
   * @protected
   */
  setDialsDirect(states) {
    for (let i = 0; i < 4; i++) {
      let n = states[i]
      this.dialSetterFn(i, n)
    }
    this.rerenderFn()
  }

  /**
   * Sets the play mode to sequential, starting from the beginning (state [0,0,0,0])
   * @public
   */
  playSequence() {
    this.stop()
    this.playMode = PlayModes.SEQUENCE
    this.playIndex = 0
    this.playInterval = window.setInterval(() => {
      if (this.playIndex >= this.stateSequence.length) this.playIndex = 0
      this.setDialsDirect(this.stateSequence[this.playIndex++])
    }, this.createDelayFromSpeed())
  }

  /**
   * Sets the play mode to sequential, resuming from where it left off (if still playing)
   * using a new speed
   * @protected
   */
  newSequenceSpeed() {
    this.stop()
    this.playMode = PlayModes.SEQUENCE
    this.playInterval = window.setInterval(() => {
      if (this.playIndex >= this.stateSequence.length) this.playIndex = 0
      this.setDialsDirect(this.stateSequence[this.playIndex++])
    }, this.createDelayFromSpeed())
  }

  /**
   * Sets play mode to random
   * @public
   */
  playRandom() {
    this.stop()
    this.playMode = PlayModes.RANDOM
    this.playInterval = window.setInterval(() => {
      let rs = this.randomState()
      this.setDialsDirect(rs)
    }, this.createDelayFromSpeed())
  }

  /**
   * Sets play mode to random using a new speed
   * @protected
   */
  newRandomSpeed() {
    this.playRandom() // don't need to do anything else
  }

  /**
   * Change playback speed to new value, start playing at that speed in the
   * play mode currently set
   * @param {Number} newSpeed new speed to set playback to, in range 1 to 100 inclusive
   * @public
   */
  setNewPlaySpeed(newSpeed) {
    this.playSpeed = newSpeed
    switch (this.playMode) {
      case PlayModes.STOP:
        break
      case PlayModes.SEQUENCE:
        this.newSequenceSpeed()
        break
      case PlayModes.RANDOM:
        this.newRandomSpeed()
        break
    }
  }
}



/**
 * hack to get PlayMode as a type for documentation
 * @class
 */
function PlayMode() {}