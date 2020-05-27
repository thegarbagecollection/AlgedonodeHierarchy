/**
 * @typedef {[ContactArray,ContactArray,ContactArray,ContactArray,ContactArray,ContactArray,ContactArray,ContactArray]} ContactArray8
 */
/**
 * @typedef {{1: ContactArray8, 2: ContactArray8, 4:ContactArray8,8:ContactArray8}} ContactsPositions
 */

/**
 * Deals with changing (and resetting) the contact positioning within the algedonode hierarchy;
 * contains default positions. Contacts are measured within the range -0.49 to 0.49, where the
 * centre of the algedonode (and starting mid-point between the brass pad pair) is 0, each
 * pad is of height 1; and the strip can move -0.5 to 0.5 up and down. The contacts, then, will
 * always be on one of the two pads
 * 
 * Contact positions: a nested array, 4 rows, 8 columns, where each entry is an array containing all the 
 * contact positions for that algedonode; rows are indexed by number of contacts for each algedonode in 
 * that row: 1->1, 2->2, 3->4, 4->8
 * 
 * @todo might be nice to have contacts settable manually
 */
class ContactsHandler {
  /**
   * @param {AlgedonodeHierarchy} algHierarchy algedonode hierarchy to control the contacts for
   * @param {RerenderAndPlotCallback} rerenderFn when called, clears the dial settings, propagates a new state, re-renders, then plots the result
   * @public
   */
  constructor(algHierarchy, rerenderFn) {
    // standard spacings for contacts on first row: 1 contact per algedonode, on alternating pads across the row
    const contactsDefault1Off = [-0.49]
    const contactsDefault1On = [0.49]

    // standard spacing for contacts on second row: 2 contacts per algedonode, 1 per pad
    const contactsDefault2 = [-0.49, 0.49]

    // standard spacing for contacts on third row: 4 contacts per algedonode, 2 on each pad, medium distance
    const contactsDefault4 = [-0.49, -0.16, 0.16, 0.49]

    // standard spacing for contacts on fourth row: 8 contacts per algedonode, 4 on each pad, small distance
    const contactsDefault8 = [-0.49, -0.35, -0.21, -0.07, 0.07, 0.21, 0.35, 0.49]

    /**
     * Default contact positions for each row: a nested array, 4 rows, 8 columns, where each entry is an array containing all the 
     * contact positions for that algedonode; each row is indexed as the number of contacts needed per algedonode on that row
     */
    this.contactsDefault = {
      "1": [contactsDefault1Off, contactsDefault1On, contactsDefault1Off, contactsDefault1On, contactsDefault1Off, contactsDefault1On, contactsDefault1Off, contactsDefault1On], 
      "2": [contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2],
      "4": [contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4],
      "8": [contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8],
    }
    this.contactsCurrent = { ...this.contactsDefault }
    this.algHierarchy = algHierarchy
    this.rerenderFn = rerenderFn
  }

  /**
   * @typedef {Array.<Number>} ContactArray
   */
  /**
   * @param {Number} n an integer
   * @returns {ContactArray} an array of n random contact positions in range -0.49 to 0.49
   * @protected
   */
  randomContactPositions(n) {
    return new Array(n).fill(null).map(_ => Math.random() * 0.98 - 0.49)
  }

  /**
   * @param {Number} n an integer
   * @returns {ContactArray8} an 8-element array, 
   * where each element is an array of n random contact positions in range -0.49 to 0.49; one array per column
   * @protected
   */
  randomContactPositions8(n) {
    return new Array(8).fill(null).map(_ => this.randomContactPositions(n))
  }

  /**
   * Randomises contact positions; resets, propagates dial values, then re-renders hierarchy
   * @public
   */
  setRandomContacts() {
    this.contactsCurrent[1] = this.randomContactPositions8(1)
    this.contactsCurrent[2] = this.randomContactPositions8(2)
    this.contactsCurrent[4] = this.randomContactPositions8(4)
    this.contactsCurrent[8] = this.randomContactPositions8(8)
    this.algHierarchy.setNewContactPositions(this)
    this.rerenderFn()
  }

  /**
   * Restores default contact positions; resets, propagates dial values, then re-renders hierarchy
   * @public
   */
  restoreDefaultContacts() {
    this.contactsCurrent = { ...this.contactsDefault }
    this.algHierarchy.setNewContactPositions(this)
    this.rerenderFn()
  }

  /**
   * @returns {ContactsPositions} all the current contact positions
   * @public
   */
  getContactsCurrent() {
    return this.contactsCurrent
  }

  /**
   * @returns {ContactsPositions} all the default contact positions
   * @public
   */
  getContactsDefault() {
    return this.contactsDefault
  }
}
