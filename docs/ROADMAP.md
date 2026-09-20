# Roadmap

Each milestone ends with something you can **run and look at**. Never work for
more than a couple of weeks without something on screen — that is how beginner
projects die.

Time estimates assume a few hours a week and that you are learning as you go.
Halve them if you have more time; do not be discouraged if they run long.

---

### M0 — A map on screen
Render a 60 x 60 hex grid with a few terrain types. Click a hex, see its
coordinates in the corner. Pan and zoom.

**Done when:** you can click any hex and the right one highlights.
**Teaches:** canvas drawing, hex coordinates, mouse input.
**Estimate:** 1-2 weeks. *This is the milestone where most people quit. It is
unglamorous and it is the foundation of everything. Push through it.*

---

### M1 — Units that take orders
Load units from `data/units.json`. Draw them as NATO symbols. Select one, order
it to a hex, press "end turn", watch both sides move simultaneously.

**Done when:** a WEGO turn resolves and both sides' units have moved.
**Teaches:** the `GameState` shape, `resolveTurn`, why simultaneous resolution is
not the same as taking turns.
**Estimate:** 2-3 weeks.

---

### M2 — Fog of war and contacts
Line of sight. Detection rolls. You stop seeing enemy units and start seeing
*contacts* that age, drift and misclassify.

**Done when:** you can watch a contact marker decay and get it wrong.
**Teaches:** the most important system in the game (DESIGN 5.1).
**Estimate:** 3-4 weeks. Worth every day of it.

---

### M3 — Direct fire
Units in contact shoot. Strength, suppression, fatigue and cohesion — four
separate numbers, not one health bar. Units can rout.

**Done when:** a fight resolves and a unit breaks and runs.
**Estimate:** 2 weeks.

---

### M4 — Artillery and the recon-strike loop ⭐
Fire missions with real delays. Shells land where you *thought* the target was.
Ammunition counters. Counterbattery fire against batteries that did not displace.

**Done when:** you call fire on a stale contact and the shells hit empty ground —
and you understand exactly why.

**⭐ This is the vertical slice.** At the end of M4 you have the soul of the
design in a playable form: find, decide, shoot, miss because you were slow. If
you only ever finish four milestones, finish these four. Everything after this is
deepening, not inventing.
**Estimate:** 3-4 weeks.

---

### M5 — Drones
Recon quadcopters, FPV strike, fixed-wing recon, loitering munitions. Operators,
endurance timers, link quality.

**Done when:** a drone spots for artillery, closing the loop in minutes instead
of hours — and killing the operator blinds the whole sector.
**Estimate:** 3 weeks.

---

### M6 — Supply
Depots, a road graph, consumption, interdiction. Units run dry and stop firing.

**Done when:** cutting one road silences a battalion three hexes away.
**Estimate:** 3 weeks. The flow calculation is the hardest maths in the project;
it is fine to start with something crude and improve it.

---

### M7 — Electronic warfare
The EW intensity layer. Jammers degrade drone links and satellite-guided
munitions. Active jammers are detectable and get hunted.

**Done when:** driving under a jamming umbrella makes you invisible to FPVs — and
the jammer itself gets killed by a loitering munition twenty minutes later.
**Estimate:** 2 weeks. High payoff per hour: almost no other game does this.

---

### M8 — Mines and engineering
Mine density per hex. Breaching takes multiple exposed turns. Naive armoured
thrusts die; prepared combined-arms breaches get through at cost.

**Done when:** you have lost a tank company to a minefield and then successfully
breached one properly.
**Estimate:** 2 weeks.

---

### M9 — An opponent
An AI that reads a `GameState`, reasons about *its own contacts* (never the
truth), and returns orders. Start embarrassingly simple: hold ground, fire at the
best contact, displace after firing, rotate exhausted units.

**Done when:** you lose a game to it and it did nothing obviously stupid.
**Estimate:** 4+ weeks, and genuinely open-ended. Simple and consistent beats
clever and erratic.

---

### M10 — Scenarios and release
Three or four hand-built scenarios. Victory conditions. A tutorial. Deploy to
GitHub Pages and put the link somewhere people play wargames.

**Estimate:** 3-4 weeks.

---

## Total

Roughly **six to nine months** at a few hours a week to reach M10 — and you will
have something playable and genuinely interesting from M4, a few months in.

That is a normal timeline for a solo systems wargame. It is also roughly 1% of
what "ultra realistic" would cost in the photoreal-3D sense, for something that
the wargaming audience will find *more* realistic, not less.

## Rules for not failing

1. **Never break the architecture rule** in TECH.md section 2.
2. **Commit every session**, even broken work, on a branch.
3. **Finish milestones in order.** Each depends on the last.
4. **When bored, tune data, not code.** Editing JSON to make artillery feel right
   is progress and it is fun.
5. **Play your own game every milestone.** If it is not interesting at M4, the
   problem will not be fixed by M9.
