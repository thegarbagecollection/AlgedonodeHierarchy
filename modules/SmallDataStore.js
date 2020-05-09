class SmallDataStore {
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
  
      // a timestep is triggered by an enqueue 
      // just going to assume that no-one runs it until it hits overflow, that'll be fine
      this.timeStep = 0
    }
  
    // enqueue new data item
    // if exceeds length, dequeue the oldest
    // returns null if didn't exceed length,
    // and {states,column,lightRow} if that state was
    // dequeued and nothing newer existed for
    // that state
    enqueue(states, column, lightRow) {
      let s = this.statesToInteger(states)
      
      // overwrite old timestep, we've got new data for this state
      this.timeSteps[s] = this.timeStep
  
      let prevHead = this.headMark.prev
      let newItem = {
        prev: prevHead,
        next: this.headMark,
        states,
        column,
        lightRow
      }
      this.headMark.prev = newItem
      prevHead.next = newItem
  
      this.length++
      this.timeStep++
      if (this.length > this.maxSize) {
        return this.dequeue()
      }
    }
  
    // returns {states,column,lightRow} if that state was
    // dequeued and nothing newer existed for
    // that state, and null otherwise
    dequeue() {
      if (this.tailMark.next === this.headMark) return null // nothing to dequeue
  
      let { next, states, column, lightRow } = this.tailMark.next // prev is tailMark, not needed
  
      this.tailMark.next = next
      next.prev = this.tailMark
  
      this.length--
  
      let s = this.statesToInteger(states)
      // compare the timeSteps, there might be a newer timestep somewhere in the list for this state
      // in which case we don't want to remove it from the plot, just from the data store
      // this might be off by one, but doesn't matter too much as long as it's in the right direction!
      if (this.timeStep - this.timeSteps[s] >= this.maxSize) { 
        return { states, column, lightRow }
      }
      else {
        return null
      }
  
    }
  
    // given a number of dequeues to perform
    // returns nested array [{states1,column1,lightRow1}, ..., {states_n,column_n,lightRow_n}], one element for each state that
    // was dequeued with nothing newer coming in for that state; empty array otherwise
    multiDequeue(toRemove) {
      console.log(`Multi-dequeueing ${toRemove} items`)
      if (toRemove <= 0) return []
      // an array will map on a null, but not on an undefined...
      let ret = new Array(toRemove).fill(null).map(_ => this.dequeue()).filter( v => v !== null) // for shits and giggles
      return ret
    }
  
    // given a new maximum size for this data store
    // returns nested array [{states1,column1,lightRow1}, ..., {states_n,column_n,lightRow_n}], one element for each state that
    // was dequeued with nothing newer coming in for that state; empty array otherwise
    resize(newMaxSize) {
      if (newMaxSize >= this.maxSize) {
        this.maxSize = newMaxSize
        return null
      }
      else {
        // let oldMaxSize = this.maxSize
        // this.maxSize = newMaxSize
        // return this.multiDequeue(oldMaxSize - newMaxSize)
        this.maxSize = newMaxSize
        return this.multiDequeue(this.length - this.maxSize)
      }
    }
  
    // returns nested array [{states1,column1,lightRow1}, ..., {states_n,column_n,lightRow_n}], one element for each state that
    // was dequeued with nothing newer coming in for that state; empty array otherwise
    clear() {
      let restoreMaxSize = this.maxSize
      this.resize(0)
      this.resize(restoreMaxSize)
    }
  
    // takes an array of [1-10, 1-10, 1-10, 1-10] and returns the corresponding integer in [0, 9999]
    statesToInteger(states) {
      return 1000 * (states[0] - 1) + 100 * (states[1] - 1) + 10 * (states[2] - 1) + (states[3] - 1)
    }
  }