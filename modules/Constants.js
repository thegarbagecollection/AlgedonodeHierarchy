/**
 *
 * @global
 */
const InitialValues = {
  DATA_STORE_SIZE: 1000, // Needed during window initialisation to set positions etc
  DIAL_STATES: createDialStates(), //  * All 10000 dial states, in an array for global access - should not change during execution
}

/**
 * Creates an array of sequential dial states, from [1,1,1,1] to [10,10,10,10]
 * @returns {Array<DialStates>} the dial state aray
 * @private
 */
function createDialStates() {
  let states = []
  for (let i1 = 1; i1 <= 10; i1++) {
    for (let i2 = 1; i2 <= 10; i2++) {
      for (let i3 = 1; i3 <= 10; i3++) {
        for (let i4 = 1; i4 <= 10; i4++) {
          states.push([i1, i2, i3, i4])
        }
      }
    }
  }
  return states
}
