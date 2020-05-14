const coloursDefault = {
    background: "darkgrey",
    strip: "burlywood",
    dialOutput: "black",
    activated: "red",
    brassPad: "gold",
    brassPadEdge: "goldenrod",
    algedonode: "gainsboro",
    algedonodeEdge: "dimgrey",
    lightAOn: "red",
    lightAOff: "darkred",
    lightBOn: "lime",
    lightBOff: "darkgreen",
}

const InitialValues = {
    DATA_STORE_SIZE: 1000
}

const contactsDefault2 = [-0.49, 0.49]
const contactsDefault4 = [-0.49, -0.16, 0.16, 0.49 ]
const contactsDefault8 = [-0.49, -0.35, -0.21, -0.07, 0.07, 0.21, 0.35 , 0.49]

const contactsDefault = {
    "1": [-0.49, 0.49, -0.49, 0.49, -0.49, 0.49, -0.49, 0.49],
    "2": [contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2, contactsDefault2],
    "4": [contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4, contactsDefault4],
    "8": [contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8, contactsDefault8],
}

let coloursCurrent = { ...coloursDefault }

let coloursTemp = { ...coloursDefault }

let contactsCurrent = { ...contactsDefault }