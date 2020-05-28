# Algedonode Hierarchy
### Brain of the Firm Chapter 5 (2nd ed.)
### Stafford Beer 

## Introduction
A model / simulation to help new readers of Brain of the Firm understand what Beer is talking about in Chapter 5 - it's long on description and short on explanation.

As far as I can tell, this is reasonably faithful to the machine Beer discusses, although contact positions may have been different in the real implementations.

## To use
The latest version is live at []()

For desktop use, download the zip, extract, and run the file `AlgedonodeHierarchy.html` in a browser; all necessary files are included.

The wooden strip positions are controlled by the sliders below the machine, and the dials can be set directly.

## Additions
This implementation has a few extra features that might help in understanding the machine and the various concepts in the chapter.

#### Timed dial state change
In addition to direct dial input, **Random (step)** sets the dials to a random configuration, and simple controls are available for running state changes on a timer:
* **Sequence** runs through all the states in order at the given speed
* **Random** changes the dial state randomly at the given speed
* **Stop** stops timed state changes
* The **Speed** slider controls how fast these timed changes happen

#### Data graphic display
The **bar chart** (top) displays a running count of the number of states producing a particular light colour in a particular column (1 to 8), and also a running count of the total lights of each colour (A and B).

The **state plot** (bottom) gives a running display of which state produced which light colour; the point `x=[9 7 _ _] y=[_ _ 3 2]` corresponds to the dial values, from top to bottom, 
```
9
7
3
2
```
A **limited data store** is provided to store the data as it is generated; this has a maximum size given by the **Data point store space** slider, and the oldest items are removed first. This is part of the metasystem conception (see below), where a metasystem may only be able to see and remember the system's actions on a small portion of the state space.

**Full simulation** runs every possible dial state through the machine without showing the process, and displays *all* of the resulting data regardless of current data store size.

#### Randomizable contact positions
Different contact positions have different effects on how the state space is mapped to the output lights.

#### Changing view modes
**X-ray view** allow the user to see the internal connections of the machine and perform all actions; this is the default.

**Metasystem view** _stops the user from seeing the internals_; this is a black-box view. In Beer's conception, a metasystem controls a system through the system's "language", seeing the outcomes, rather than by full view of the effects manipulations have on that system. _The contact position change is disabled_ for the same reason. Similarly, _a metasystem cannot simulate a system_ to see what it would do in every circumstance; it only has access to the system's outputs at the time they change, and the previous history of such changes.

#### Colours
Most colours are customisable.