class ColourHandler {
    constructor() {
        this.coloursDefault = { }
        this.colourGroups = [] // [{label, names[] }] where names are the names of the elements / things being coloured
        this.initColours()
        this.setToDefault()
    }

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

    // Takes a label, and a varargs of { name, colour }
    // This gives the colour mappings that will show up in each row the colour picker, and their label
    createColours(label, ...colourNameDefaults) {
        colourNameDefaults.forEach(({name, colour}) => {
            this.coloursDefault[name] = colour
        })
        this.colourGroups.push({ label, elementNames: colourNameDefaults.map(({name, colour}) => name ) } )
    }



    beginColourChange() {
        this.coloursTemp = { ...this.coloursCurrent }
    }
    colourChange(name, colour) {
        this.coloursTemp[name] = colour
    }
    commitColourChange() {
        this.coloursCurrent = { ...this.coloursTemp }
    }
    cancelColourChange() {
        // happens automatically!
    }

    getByName(name) {
        return this.coloursCurrent[name]
    }

    setToDefault() {
        this.coloursCurrent = { ...this.coloursDefault }
    }

    // returns an array [ { label, name: [names] } ], where each entry is a row in the colour picker
    // consisting of 1..* colour lookup names to turn into colourpickers, and their associated label
    getColourables() {
        return this.colourGroups
    }

    get background() { return this.coloursCurrent["background"] }
    get strip() { return this.coloursCurrent["strip"] }
    get dialOutput() { return this.coloursCurrent["dial-output"] }
    get activated() { return this.coloursCurrent["activated"] }
    get brassPad() { return this.coloursCurrent["brass-pad"] }
    get brassPadEdge() { return this.coloursCurrent["brass-pad-edge"] }
    get algedonode() { return this.coloursCurrent["algedonode"] }
    get algedonodeEdge() { return this.coloursCurrent["algedonode-edge"] }
    get lightAOn() { return this.coloursCurrent["light-a-on"] }
    get lightAOff() { return this.coloursCurrent["light-a-off"] }
    get lightBOn() { return this.coloursCurrent["light-b-on"] }
    get lightBOff() { return this.coloursCurrent["light-b-off"] }
    get blackBox() { return "black" }
}