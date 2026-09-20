# Roadmap

Every milestone ends with something you can **run and look at**. Never work more
than a couple of weeks without something on screen — that is how beginner projects
die.

Estimates assume a few hours a week while learning as you go. Halve them if you
have more time. Do not be discouraged if they run long; they will.

> **The first five months now live in [PROTOTYPE.md](PROTOTYPE.md)** — a 2v2
> multiplayer game pairing one drone operator with one first-person shooter per
> team. That document is what you build next; this one is what comes after it.
>
> Phase 0 below is a summary of the prototype. Phases 1-4 are the long game, and
> they now assume the prototype exists.

---

## Phase 0 — The 2v2 prototype (months 1-5) — **START HERE**

Full detail in [PROTOTYPE.md](PROTOTYPE.md). In brief:

| | | |
|---|---|---|
| **P0** | Walk around — first-person movement, single player | 4 weeks |
| **P1** | **Networking spike** — two cubes, two machines ⚠ | 3 weeks |
| **P2** | The drone, networked, with a killable operator | 3 weeks |
| **P3** | Shooting and dying | 4 weeks |
| **P4** | The video feed shader and the FPV strike | 3 weeks |
| **P5** | The round loop — roles, elimination, score, reset | 3 weeks |
| **P6** | The realism pass — deletions, sound, lighting | 3 weeks |

⚠ **P1 is not optional and cannot be moved later.** Retrofitting multiplayer is a
rewrite, not a feature.

**At the end of Phase 0 you have a complete, playable, genuinely novel game.**
Everything below is expansion, and none of it is required.

---

## Phase 1 — Depth in the prototype (months 6-9)

Now that four people can play, make the thing they are playing better.

### M1 — More drones
The recon quadcopter as a distinct choice from the FPV strike drone, and the
fibre-optic FPV that jamming cannot touch.
**Estimate:** 3 weeks.

### M2 — Electronic warfare, as a third role
A portable jammer on the map. It denies airspace, and it makes whoever is running
it a target. This is where the game stops resembling anything else on the market.
**Estimate:** 4 weeks. Consider 3v3 at this point.

### M3 — Night
Real darkness, night vision with a narrow field of view and grain, thermal cameras
on the drone. Changes every tactic in the game.
**Estimate:** 4 weeks.

### M4 — The sapper role
Demolitions: cross open ground, place a charge, withdraw. Works as an objective
mode alongside elimination.
**Estimate:** 5 weeks.

---

## Phase 2 — The war underneath (months 10-16)

The simulation layer from DESIGN.md: a persistent war running underneath the
matches, so that what you did last round changes what is available next round.
This is the ambitious part, and it is entirely optional.

### M5 — The simulation layer
Layer 1 from TECH.md: units, supply, ammunition, movement, ticking forward
independently of what you are looking at. Headless and testable.

**Done when:** the war runs for a simulated week with no window open and the
numbers still make sense.
**Estimate:** 4-5 weeks. Unglamorous, and it is what makes everything after this
possible.

### M6 — Contacts and fog of war
Sensors, detection rolls, contacts that age and drift and misclassify. Both sides
act on beliefs, never on truth.

**Done when:** you fly out to a marked contact and find the enemy left an hour ago.
**Estimate:** 3 weeks.

### M7 — Artillery and the spotter loop
Off-map guns your drone operator can call. Loiter, find, mark, call fire, watch the flight time elapse,
correct, watch them scatter. Shells land where you *thought* the target was.

**Done when:** you spot for guns you are not controlling and it feels like a job.
**Estimate:** 4 weeks.

### M8 — The mortar crew role
The other end of the same radio. Grid reference, charge, elevation, deflection,
fire, wait, correct, fire for effect — then displace before counterbattery lands.

**Done when:** you get greedy, fire one extra mission before moving, and die for it.
**Estimate:** 2-3 weeks. Cheap, because it reuses M7 entirely.

---

## Phase 3 — Further roles (months 17+)

By this point the game tells you what it needs. These are candidates, not a plan.

### M9 — Vehicles
Driver, gunner and commander as separate seats. Third-person camera, which is
correct and cheap here because a vehicle is a rigid body with no animation problem.
**Estimate:** 2-3 months.

### M10 — Single-player and co-op
Everything up to here is player-versus-player, which is what let you skip combat
AI entirely. Adding a single-player mode means finally writing that AI: perception,
cover selection, pathfinding, suppression response.
**Estimate:** 4-6 months, honestly, and possibly more. Combat AI is one of the
hardest problems in the field, and bad AI destroys realism instantly. Only do this
if people are actually asking for it.

### M11 — Whatever the players are asking for by then
Four people will have played this for a year. Listen to them instead of to this
document.

---

## Timelines, honestly

| Target | Realistic time, few hours a week |
|---|---|
| **Phase 0 — a complete, playable 2v2** | **~5 months** |
| Phase 1 — plus EW, night and the sapper | ~9 months |
| Phase 2 — plus a persistent war underneath | ~16 months |

**Phase 0 is the real goal.** If you finish it and stop, you have made a good
game that nobody else has made. Everything after it is optional expansion, and
the decision to continue should be made by whether four people actually enjoy
playing it — not by this document.

## Rules for not failing

1. **Never break the two-layer rule** in TECH.md section 2. With networking it
   becomes: the host owns the state, everyone else renders it.
2. **Do the networking spike early.** P1, month two. This is the one ordering
   mistake that cannot be undone cheaply.
3. **Delete before you add.** REALISM.md Part 1 is free and worth more than months
   of art.
4. **Commit every session**, even broken work, on a branch.
5. **Play your own game at every milestone**, with other people, from P1 onward.
   A multiplayer game that is not fun with four friends will not be rescued by
   anything in Phase 2.
6. **When stuck or bored, tune data or work on sound.** Both are real progress and
   both are more fun than debugging.
