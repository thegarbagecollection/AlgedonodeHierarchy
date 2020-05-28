/**
 * @private
 * @typedef {{name: String, colour: String}} NameColourPair
*/

/**
 * Manages the associations between graphical elements, their colours, 
 * and the changing of those colours; contains default colours for 
 * all elements.
 */
class ColourHandler {
    /**
     * Construct a colour handler with the built-in default colours
     */
    constructor() {
        this.coloursDefault = { }
        /**
         * @type {Array.<ColourPickerDialogEntry>}
         */
        this.colourGroups = []
        this.initColours()
        this.setToDefault()
    }

    /**
     * Assigns default colours and creates groupings / labels based on which row of the colour picker dialog they should 
     * be grouped together in.
     * @protected
     */
    initColours() {
        this.createColours("Background", { name: "background", colour: "darkgrey" })
        this.createColours("Strip", { name: "strip", colour: "burlywood" })
        this.createColours("Dial output / contact", { name: "dial-output", colour: "black" })
        this.createColours("Activated element", { name: "activated", colour: "red" })
        this.createColours("Brass pad / edge", { name: "brass-pad", colour: "gold" }, { name: "brass-pad-edge", colour: "goldenrod"})
        this.createColours("Algedonode / edge", { name: "algedonode", colour: "gainsboro" }, { name: "algedonode-edge", colour: "dimgrey"})
        this.createColours("A lights on / off", { name: "light-a-on", colour: "red" }, { name: "light-a-off", colour: "darkred"})
        this.createColours("B lights on / off", { name: "light-b-on", colour: "lime" }, { name: "light-b-off", colour: "darkgreen"})
    }
    /**
     * Each call gives an arbitrary number of pairs of an identifier for an element to be coloured and that element's default
     * colour; these will be in the same row of the colour picker dialog, along with the given label.
     * 
     * Also adds each such element-colour pair to the defaults.
     * @param {String} label 
     * @param  {...NameColourPair} nameColourPairs 
     * @protected
     */
    createColours(label, ...nameColourPairs) {
        nameColourPairs.forEach(({name, colour}) => {
            this.coloursDefault[name] = colour
        })
        this.colourGroups.push({ label, elementNames: nameColourPairs.map(({name, colour}) => name ) } )
    }


    /**
     * Start a colour change
     * @public
     */
    beginColourChange() {
        this.coloursTemp = { ...this.coloursCurrent }
    }
    /**
     * The given element will be assigned the given colour after this colour change is committed
     * @param {String} name name of the element to adjust colour for; must be the same as in the corresponding name-colour pair
     * @param {String} colour new colour to assign to the element of the given name
     * @public
     */
    colourChange(name, colour) {
        this.coloursTemp[name] = colour
    }
    /**
     * Commits a colour change, overwriting the current colours
     * @public
     */
    commitColourChange() {
        this.coloursCurrent = { ...this.coloursTemp }
    }

    /**
     * Cancel a colour change
     * @public
     */
    cancelColourChange() {
        // happens automatically!
    }

    /**
     * Get the colour assigned to the element with the given name
     * @param {String} name name of element
     * @returns {String} returns the colour currently associated with this element
     * @public
     */
    getByName(name) {
        return this.coloursCurrent[name]
    }

    /**
     * Restores current colours to the default
     * @public
     */
    setToDefault() {
        this.coloursCurrent = { ...this.coloursDefault }
    }

    /**
     * @typedef {{label: String, elementNames: String[]} } ColourPickerDialogEntry
     */
    /**
     * @returns {Array.<ColourPickerDialogEntry>} all entries for the colour picker dialog, each entry containing some number of element names to
     * be given colour pickers, and a label associated with their row in the colour picker dialog.
     * @public
     */
    getColourables() {
        return this.colourGroups
    }

    /**
     * @returns {String} the current background colour
     */
    get background() { return this.coloursCurrent["background"] }

    /**
     * @returns {String} the current colour of the "wooden" strips
     */
    get strip() { return this.coloursCurrent["strip"] }

    /**
     * @returns {String} the current colour of the dial output wires
     */
    get dialOutput() { return this.coloursCurrent["dial-output"] }

    /**
     * @returns {String} the current colour of any activated element (border or wire)
     */
    get activated() { return this.coloursCurrent["activated"] }

    /**
     * @returns {String} the current colour of the brass pads
     */
    get brassPad() { return this.coloursCurrent["brass-pad"] }

    /**
     * @returns {String} the current colour of the brass pad edges
     */
    get brassPadEdge() { return this.coloursCurrent["brass-pad-edge"] }

    /**
     * @returns {String} the current colour of the algedonodes
     */
    get algedonode() { return this.coloursCurrent["algedonode"] }

    /**
     * @returns {String} the current colour of the algedonode edges
     */
    get algedonodeEdge() { return this.coloursCurrent["algedonode-edge"] }

    /**
     * @returns {String} the current colour of row A's lights when activated
     */
    get lightAOn() { return this.coloursCurrent["light-a-on"] }

    /**
     * @returns {String} the current colour of row A's lights when not activated
     */
    get lightAOff() { return this.coloursCurrent["light-a-off"] }

    /**
     * @returns {String} the current colour of row B's lights when activated
     */
    get lightBOn() { return this.coloursCurrent["light-b-on"] }

    /**
     * @returns {String} the current colour of row B's lights when not activated
     */
    get lightBOff() { return this.coloursCurrent["light-b-off"] }

    /**
     * @returns {String} the current colour of the black box overlay for the algedonode hierarchy (i.e. black)
     */
    get blackBox() { return "black" }
}