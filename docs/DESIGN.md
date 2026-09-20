# Design

## 1. Three kinds of realism

"Ultra realistic" means three different things, and they cost wildly different
amounts to build:

| Kind | What it means | Example game | Cost for one beginner |
|---|---|---|---|
| **Visual** | Photoreal graphics, animation, audio | Arma 3 | Impossible. 50+ people, several years. |
| **Physical** | Ballistics, armour penetration, flight models, sensor physics | DCS World | Hard but achievable — it is just maths. |
| **Systemic** | Intelligence, doctrine, logistics, electronic warfare, attrition | Command: Modern Operations | **Very achievable — it is pure code and data.** |

This project chases **systemic realism first, physical realism second, and
deliberately ignores visual realism.**

That is not a consolation prize. *Command: Modern Operations* is the most
respected modern-war simulation on the market and it renders as a map with NATO
symbols on it. What people praise is that the sensors, the weapons and the
decision timelines behave correctly. That part is all code.

Practical consequence: **the map is a top-down 2D hex map with military symbols.**
No 3D, no first person, no character art. Every hour you would have spent on a
tank model goes into the electronic warfare model instead.

## 2. Setting

The design assumes a modern Eastern European theatre with contemporary Russian
and Ukrainian equipment, doctrine and tactics — that is the whole point, because
this is the conflict that rewrote how everyone thinks about drones, artillery
and dispersal.

This is a war happening to real people right now. That is not a reason to avoid
the subject — *Command: Modern Operations*, *Combat Mission Black Sea* and *DCS*
all model live conflicts, and a simulation that takes the fighting seriously is a
more honest thing than one that doesn't. It does mean four decisions are better
made on purpose than by accident:

- **Default to a near-future fictional framing with real equipment.** Fictional
  sector, fictional unit names, entirely real hardware and doctrine. This is what
  Eugen Systems (*WARNO*) and *Broken Arrow* do. You keep 100% of the interesting
  mechanics. Real place names can be swapped in later — the simulation does not
  care which string is in the map file.
- **Civilians are never a scoring mechanic.** Model them if you like — they
  constrain where you may fire and they clog the roads — but never as points.
- **No real named individuals, no atrocity content, no side written as subhuman.**
  Both sides get the same rulebook and the same mechanics.
- **Real unit designations and equipment are fine** and are most of where the
  realism lives.

If you would rather set it explicitly in the real war, that is your call and
every mechanic below works unchanged.

## 3. Scale and time

Pick one scale and commit. The interesting systems only coexist at one of them.

| Scale | You command | Map | Turn | Verdict |
|---|---|---|---|---|
| Tactical | A platoon, ~30 men | 2 x 2 km | seconds | Loses logistics and EW entirely |
| **Operational** | **A brigade, ~4000 men** | **30 x 30 km** | **30 minutes** | **This one** |
| Strategic | A front, several corps | 500 km | days | Abstracts away the whole recon-strike loop |

**Chosen: operational.** A 30 x 30 km sector is the smallest box in which drones,
artillery, EW, mines *and* supply all simultaneously matter. It is also small
enough for one person to build.

- **Map:** hex grid, 500 m per hex, 60 x 60 = 3600 hexes.
- **Turn:** 30 simulated minutes.
- **Scenario length:** 24-72 hours = 48-144 turns.
- **Turn structure:** **WEGO / simultaneous resolution.** Both sides issue orders,
  then the simulation advances 30 minutes and resolves them together.

Why WEGO rather than real-time: it is dramatically easier to write correctly than
a real-time engine (no frame-rate-dependent physics, no interpolation, no
netcode), it is deterministic and therefore testable, *and* it fits the theme
perfectly — you are always committing to orders based on information that is
already stale. That is exactly the real problem.

## 4. The five pillars

Everything in the game should serve one of these. If a feature serves none of
them, cut it.

### Pillar 1 — Nothing moves unseen
Persistent drone overwatch means the battlefield is transparent. The question is
never "where is the enemy" in the abstract; it is "how old is my picture of them,
and how wrong is it now".

### Pillar 2 — The clock is the sensor-to-shooter loop
Detect, decide, fire, fly, impact. Every step costs minutes, and the target is
moving through all of them. **This loop is the game.**

### Pillar 3 — Concentration kills you
Massing forces the old way puts a brigade inside one cluster-munition footprint.
Dispersal is survival, but dispersed forces cannot attack. Managing that tension
is the core tactical decision.

### Pillar 4 — You fight on ammunition, not on tanks
Shells and fuel are the binding constraint. A full-strength battalion with no
shells is a spectator.

### Pillar 5 — The electromagnetic spectrum is terrain
Jamming is a place on the map. Emitting is a decision that can get you killed.

## 5. Systems

Each system below lists **what it is**, **why it is in** (the realism it buys),
and **the mechanic** (how it gets coded). The mechanic column is what turns this
from a wish list into a plan.

### 5.1 Spotting, contacts and fog of war
*The single most important system. Build it early and build it properly.*

**What:** You never see enemy units. You see *contacts* — imperfect, ageing,
misclassified reports.

**Mechanic:** Every unit has a **signature** vector (visual, thermal, acoustic,
electromagnetic). Every sensor has a detection profile. Each turn, for each
sensor/target pair within range and line of sight, roll detection against
signature x concealment x weather x range.

A successful detection writes a `Contact` onto that player's intel layer:

```
Contact {
  classification: "unknown" | "vehicle" | "armour" | "artillery" | "infantry" | "air-defence"
  position:       hex            // where you think it is
  positionError:  metres         // how wrong that probably is
  lastSeenTurn:   number
  confidence:     0..1
}
```

Contacts **decay**: every turn a target goes unobserved, `positionError` grows
and `confidence` falls. Classification can be wrong — a decoy inflatable HIMARS
reads as the real thing until something looks closer.

Both the human player and the AI act on contacts, never on truth. This one
system produces more "realism feel" than any amount of graphics.

### 5.2 The recon-strike loop
**What:** Firing is not instantaneous and the target does not wait.

**Why:** The sensor-to-shooter timeline is the defining metric of this war. A
responsive battery answers in minutes; a deliberate mission takes half an hour.
A drone already airborne over the target answers in seconds. Whoever closes the
loop faster wins ground.

**Mechanic:** A fire mission is a queued object:

```
FireMission {
  firingUnit, targetContact
  predictedPosition           // snapshot of where you THOUGHT it was
  impactTurn = now + decideTime + tubeReadyTime + flightTime
}
```

On `impactTurn`, resolve the shells against `predictedPosition` — **not** against
where the target actually is now. Stale intel means shells land on empty ground.
This is the mechanic the whole game is built on; get it working at Milestone 4
and you already have the soul of the design.

### 5.3 Drones, in layers
**Why:** Not one thing. Five distinct classes with completely different roles,
and the interaction between them is most of modern tactics.

| Class | Role | Endurance | Reach | Killed by |
|---|---|---|---|---|
| Recon quadcopter | Local eyes, correcting artillery | ~30 min | 5-10 km | Any jammer, small arms |
| FPV strike | Precision kill on one vehicle | one-way | 5-20 km | Jammers, cope cages, nets |
| Fibre-optic FPV | FPV that jamming cannot touch | one-way | limited by spool | Physical interception only |
| Fixed-wing recon | Finds your artillery at depth | hours | 50-100 km | SHORAD, jamming of its link |
| Loitering munition | Hunts artillery and air defence | tens of min | 40+ km | SHORAD, EW, decoys |

**Mechanic:** A drone is a unit with (a) an **operator unit** that must be alive
and within link range, (b) an **endurance timer**, and (c) a **link quality**
value that electronic warfare attacks. Kill the operator and the drone is gone.
Fibre-optic variants skip the link-quality roll entirely — which makes them the
answer to the answer, and a great mid-game unlock.

### 5.4 Electronic warfare as terrain
**Why:** One of the genuinely defining features of this war, and almost no game
models it. Huge differentiator for very little code.

**Mechanic:** Maintain an **EW intensity layer** over the hex grid — one float per
hex, same shape as the terrain layer. Jammers add intensity in a radius.

- Drone control rolls read jamming intensity at the drone's hex.
- Satellite-guided munitions read it at the *impact* hex — high intensity widens
  their accuracy radius dramatically.
- Radio orders to units in heavily jammed hexes arrive late or not at all.

**Emitting is not free.** An active jammer is a beacon: it writes an
electromagnetic contact onto the enemy intel layer and invites a loitering
munition. Shoot-and-scoot applies to EW exactly as it does to artillery.

### 5.5 Artillery and counterbattery
**Why:** Artillery causes the large majority of casualties in this kind of war.
The counterbattery duel is a sub-game in its own right.

**Mechanic:**
- Each battery holds a finite ammunition count, replenished by the supply system.
  Different natures (HE, cluster, smoke, mine-scattering, precision) with wildly
  different stock levels and effects.
- **Firing reveals you.** Every fire mission writes a firing-point contact onto
  the enemy intel layer, with position error set by their counterbattery radar
  coverage and drone overwatch of that hex.
- **Shoot and scoot.** A battery that fires and has not displaced within N turns
  takes an incoming counterbattery mission. This should be the most reliable way
  for a careless player to lose their artillery.

### 5.6 Mines, engineering, and why attacks fail
**Why:** Dense minefields covered by ATGMs and drones are the reason mechanised
breakthrough largely stopped working. A game that lets a tank column drive
through is not modelling this war.

**Mechanic:** Each hex has a mine density value. Moving through rolls damage and
mobility kills against it. Engineering units reduce density over *multiple turns*
while sitting exposed in the open — which makes the breaching vehicle the single
highest-priority target on the map.

Design target: a naive armoured thrust must die. A prepared combined-arms breach —
suppression on the overwatch positions, smoke, EW cover against the FPVs, engineers,
and a follow-on force ready — must get through, at real cost.

### 5.7 Logistics under fire
**Why:** Pillar 4. This is the constraint that actually decides operational-level
fights.

**Mechanic:** Supply is a **flow problem on a road graph**. Depots are sources,
units are sinks, roads are edges with throughput capacity.

- Units consume ammunition and fuel every turn, far more when firing or moving.
- Deep strikes on depots and interdiction of road hexes reduce throughput.
- So you push depots further back. So your lines get longer. So turnaround time
  grows. So your rate of fire falls. That feedback loop *is* the operational game.
- Units below supply threshold drop to reduced rates of fire, then cannot move,
  then lose cohesion.

### 5.8 Air and air defence
**Why:** Aircraft rarely cross the line, because surface-to-air umbrellas make it
suicidal. Air power appears mostly as standoff glide bombs and helicopters
lobbing rockets from behind friendly lines.

**Mechanic:** Air defence units project **engagement volumes** (radius + altitude
band). Air missions plan a route; entering a volume rolls an engagement. SEAD and
DEAD missions try to make holes. Emitting radars are detectable — same rule as
jammers and artillery.

Keep this system simpler than the ground game, at least at first.

### 5.9 Attrition, suppression and cohesion
**Why:** A single "hit points" bar is the least realistic thing a wargame can do.

**Mechanic:** Four independent numbers per unit:

- **Strength** — actual people and vehicles. Slow to recover, needs replacements.
- **Suppression** — short-term, from incoming fire. Recovers in turns. Suppressed
  units barely shoot back or move.
- **Fatigue** — accumulates with combat and movement. Only recovers by rotating
  out of the line.
- **Cohesion** — the will to hold. Falls under sustained fire and losses, and does
  **not** recover inside one scenario. At zero, the unit routs.

Casualty sources should be weighted realistically: indirect fire and drones cause
the large majority; direct small-arms fire should be the *smallest* contributor.

### 5.10 Weather, season and light
**Why:** Mud seasons close off-road movement. Thermal sights depend on temperature
differential. Fog and low cloud ground the drones.

**Mechanic:** A per-turn weather state modifying detection rolls, off-road movement
cost and drone availability.

This produces one of the best emergent dynamics available: **bad weather is your
window.** The only days you can mass and move are the days nobody can see you —
and you will want to hoard your attacks for them.

## 6. The core loop, in one paragraph

You have too few drones, too few tubes, too few shells, too few jammers and too
much frontage. Every turn you allocate those scarce assets across the sector,
acting on a picture that is between five minutes and five hours out of date. You
try to close your own detect-decide-strike loop faster than the enemy closes
theirs, while keeping your batteries alive by moving them, keeping your units
supplied over roads somebody is trying to cut, and choosing the one moment —
usually in bad weather — to concentrate enough force to actually take ground
before the drones find it.

## 7. Deliberately not doing

Writing this list down is as important as the design itself.

- **3D, first person, photoreal graphics.** Not achievable and not where the
  realism lives.
- **Multiplayer.** Add it much later, if ever. It roughly doubles the work.
- **The whole war.** One sector, one brigade. Strategic scope abstracts away every
  interesting mechanic.
- **Every vehicle in existence.** Twenty well-modelled unit types beat two hundred
  copy-pasted ones.
- **A custom engine.** Use existing tools.
- **Politics, negotiations, nuclear escalation.** Different game.
- **Starting with the AI.** Play both sides by hand until the rules are good.
