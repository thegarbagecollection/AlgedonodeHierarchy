
class ContactsHandler {
    constructor(algHierarchy, resetFn) {
      const contactsDefault2 = [-0.49, 0.49]
      const contactsDefault4 = [-0.49, -0.16, 0.16, 0.49 ]
      const contactsDefault8 = [-0.49, -0.35, -0.21, -0.07, 0.07, 0.21, 0.35 , 0.49]
  
      this.contactsDefault = {
        "1": [-0.49, 0.49, -0.49, 0.49, -0.49, 0.49, -0.49, 0.49],
        "2": [contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2],
        "4": [contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4],
        "8": [contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8],
      }
      this.contactsCurrent = { ...this.contactsDefault }
      this.algHierarchy = algHierarchy
      this.resetFn = resetFn
    }
  
    // returns a list of n random contact positions in [-0.49, 0.49]
    randomContactPositions(n) {
      return new Array(n).fill(null).map(_ => Math.random() * 0.98 - 0.49)
    }
  
    // returns an 8-list of lists of n random contact positions in [-0.49, 0.49]
    randomContactPositions8(n) {
      return new Array(8).fill(null).map(_ => this.randomContactPositions(n))
    }
  
    setRandomContacts() {
      this.contactsCurrent[1] = this.randomContactPositions(8)
      this.contactsCurrent[2] = this.randomContactPositions8(2)
      this.contactsCurrent[4] = this.randomContactPositions8(4)
      this.contactsCurrent[8] = this.randomContactPositions8(8)
      this.algHierarchy.setNewContactPositions(this)
      this.resetFn()
    }
  
    restoreDefaultContacts() {
      this.contactsCurrent = { ...this.contactsDefault }
      this.algHierarchy.setNewContactPositions(this)
      this.resetFn()
    }
  
    getContactsCurrent() {
      return this.contactsCurrent
    }
  
    getContactsDefault() {
      return this.contactsDefault
    }
  }