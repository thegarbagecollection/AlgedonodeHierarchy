/**
 * Stores a limited amount of data, discarding the oldest data when the limit is exceeded.
 * 
 * Data is a {@link StateResultPair}
 */
class SmallDataStore {
  /**
   * @param {Number} maxSize the maximum number of elements to store
   */
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
  
      // a timestep is triggered by an enqueue, and keeps track of how old the data
      // for a given state is.
      // just going to assume that no-one runs it until it hits overflow, that'll be fine
      this.timeStep = 0
    }
  
    /**
     * Adds the given state-result pair to the data store, removing the oldest such pair
     * if the maximum data store size would be exceeded.
     * 
     * @param {StateResultPair} stateResultPair the state-result pair to add
     * @returns {StateResultPair} If a state-result pair was dequeued and nothing newer was in the store for that
     * state, returns a {@link StateResultPair}, otherwise returns null.
     * @public
     */
    enqueue(stateResultPair) {
      let {state, result: {lightColumn, aOrB}} = stateResultPair
      let s = this.statesToInteger(state)
      
      // overwrite old timestep, we've got new data for this state
      this.timeSteps[s] = this.timeStep
  
      let prevHead = this.headMark.prev
      let newItem = {
        prev: prevHead,
        next: this.headMark,
        state,
        lightColumn,
        aOrB
      }
      this.headMark.prev = newItem
      prevHead.next = newItem
  
      this.length++
      this.timeStep++
      if (this.length > this.maxSize) {
        return this.dequeue()
      }
      return null
    }
  
    /**
     * Removes the oldest state-result pair.
     * 
     * @returns {StateResultPair} If a state-result pair was removed and nothing newer was in the store for that
     * state (i.e. the graphic will need updating), returns a {@link StateResultPair}, otherwise returns null.
     * @public
     */
    dequeue() {
      if (this.tailMark.next === this.headMark) return null // nothing to dequeue
  
      let { next, state, lightColumn, aOrB } = this.tailMark.next
  
      this.tailMark.next = next
      next.prev = this.tailMark
  
      this.length--
  
      let s = this.statesToInteger(state)
      // compare the timeSteps, there might be a newer timestep somewhere in the list for this state
      // in which case we don't want to remove it from the plot, just from the data store
      // this might be off by one, but doesn't matter too much as long as it's in the right direction!
      if (this.timeStep - this.timeSteps[s] >= this.maxSize) { 
        return { state, result: { lightColumn, aOrB }}
      }
      else {
        return null
      }
  
    }
  
    /**
     * Remove a given number of items from the data store, oldest first.
     * 
     * @param {Number} toRemove number of removals to perform
     * @returns {Array.<StateResultPair>} an array (possibly empty) of the actionable removals (ones that require a graphic update) 
     * that were required to reduce the number of items stored in the data store by the required number.
     * @protected
     */
    multiDequeue(toRemove) {
      if (toRemove <= 0) return []
      // an array will map on a null, but not on an undefined...
      let ret = new Array(toRemove).fill(null).map(_ => this.dequeue()).filter( v => v !== null) // for shits and giggles
      return ret
    }
  
    /**
     * Sets the data store to contain at most the given number of elements, returning those removed in the process (oldest first)
     * 
     * @param {Number} newMaxSize the new maximum size of the data store
     * @returns {Array.<StateResultPair>} an array (possibly empty) of the actionable removals (ones that require a graphic update)  
     * that were required to reduce the number of items stored in the data store until the data store was of the given size.
     * @public
     */
    resize(newMaxSize) {
      if (newMaxSize >= this.maxSize) {
        this.maxSize = newMaxSize
        return null
      }
      else {
        this.maxSize = newMaxSize
        return this.multiDequeue(this.length - this.maxSize)
      }
    }
    /**
     * Completely clears the stored data, maintaining the previous maximum size.
     * @public
     */
    clear() {
      let restoreMaxSize = this.maxSize
      this.resize(0)
      this.resize(restoreMaxSize)
    }
  
    /**
     * @returns {Array.<StateResultPair>} the current contents of the data store
     * @public
     */
    getStoredResults() {
      let curr = this.headMark.prev
      let storedResults = []
      while (curr !== this.tailMark) {
        storedResults.push({ state: curr.state, result: { lightColumn: curr.lightColumn, aOrB: curr.aOrB }})
        curr = curr.prev
      }
      return storedResults
    }

    /**
     * @param {DialStates} states an array of [1-10, 1-10, 1-10, 1-10] representing a dial state
     * @return the corresponding integer in [0, 9999]
     * @private
     */
    statesToInteger(states) {
      return 1000 * (states[0] - 1) + 100 * (states[1] - 1) + 10 * (states[2] - 1) + (states[3] - 1)
    }
  }