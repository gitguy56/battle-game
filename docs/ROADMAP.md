# Roadmap

Every milestone ends with something you can **run and look at**. Never work more
than a couple of weeks without something on screen — that is how beginner projects
die.

Estimates assume a few hours a week while learning as you go. Halve them if you
have more time. Do not be discouraged if they run long; they will.

> **This roadmap changed when the project added 3D and player roles.** It now
> builds the cheapest, most distinctive role to a high standard first, and adds
> the expensive ones later. See ROLES.md for why the ordering is what it is.

---

## Phase 1 — The drone (months 1-3)

### M0 — Godot, a hill, and a camera you can fly
A terrain, a sky, and a camera you control with a gamepad or keyboard. No game
yet. Just flight that feels right.

**Done when:** flying around the terrain is genuinely enjoyable with nothing else
in the scene. If flight feels bad, everything built on it feels bad.
**Teaches:** Godot scenes, 3D transforms, input, terrain.
**Estimate:** 3-4 weeks. *This is where most people quit. Push through it.*

### M1 — The video feed
The shader that turns your clean 3D render into an FPV goggles view: low
resolution, scanlines, compression artefacts, interference that worsens with
distance, a battery readout, and a signal-loss state.

**Done when:** a screenshot is hard to tell apart from real FPV footage.
**Why so early:** this is the single biggest "looks realistic" win in the project,
it is mostly one shader file, and it makes everything you build afterwards look
better. See REALISM.md.
**Estimate:** 2 weeks.

### M2 — Something to kill
A handful of vehicles in the world. Flight physics with momentum. Impact
detection, damage by hit location, and an explosion with real sound.

**Done when:** you dive on a parked vehicle, hit the engine deck, and it is
genuinely satisfying.
**Estimate:** 3 weeks.

### M3 — A mission ⭐
Take off from a tree line, fly out with a finite battery, find a target that is
trying to hide, hit it. Fail states: battery dead, lost signal, missed, shot down.

**⭐ This is the vertical slice.** At M3 you have a complete, novel, genuinely
good small game. Three months in. Put it in front of people.
**Estimate:** 3 weeks.

---

## Phase 2 — The war underneath (months 4-7)

### M4 — The simulation layer
Layer 1 from TECH.md: units, supply, ammunition, movement, ticking forward
independently of what you are looking at. Headless and testable.

**Done when:** the war runs for a simulated week with no window open and the
numbers still make sense.
**Estimate:** 4-5 weeks. Unglamorous, and it is what makes everything after this
possible.

### M5 — Contacts and fog of war
Sensors, detection rolls, contacts that age and drift and misclassify. Both sides
act on beliefs, never on truth.

**Done when:** you fly out to a marked contact and find the enemy left an hour ago.
**Estimate:** 3 weeks.

### M6 — Artillery, and the recon drone role
The second role. Loiter, find, mark, call fire, watch the flight time elapse,
correct, watch them scatter. Shells land where you *thought* the target was.

**Done when:** you spot for guns you are not controlling and it feels like a job.
**Estimate:** 4 weeks.

### M7 — The mortar crew role
The other end of the same radio. Grid reference, charge, elevation, deflection,
fire, wait, correct, fire for effect — then displace before counterbattery lands.

**Done when:** you get greedy, fire one extra mission before moving, and die for it.
**Estimate:** 2-3 weeks. Cheap, because it reuses M6 entirely.

---

## Phase 3 — The spectrum (months 8-10)

### M8 — Electronic warfare
The jamming field. Flying into a jammed area degrades your link and can lose you
the drone. Fibre-optic FPVs ignore it — the answer to the answer.

**Done when:** a jammer denies a whole sector to your drones and changes how you
fly.
**Estimate:** 3 weeks.

### M9 — The EW operator role
A spectrum display. Find emitters, choose what to jam, and live with the fact that
jamming makes you a target.

**Done when:** you jam at the right moment to save an assault, and a loitering
munition arrives twenty minutes later.
**Estimate:** 3 weeks. Almost pure interface, and nothing else on the market does it.

---

## Phase 4 — On foot (months 11-18+)

### M10 — Character controller and night
First-person movement, stamina, weight, stance. Night rendering and night vision
with a narrow field of view and real grain.

**Estimate:** 6 weeks.

### M11 — The sapper role
Cross open ground at night, avoid patrols and thermal cameras, place a charge, and
withdraw — which is the hard part.

**Done when:** the withdrawal is more frightening than the approach.
**Estimate:** 6 weeks.

### M12 — Infantry combat
Ballistics, lethality, suppression, wounds and bleeding. Enemy AI with perception,
cover and pathfinding.

**Estimate:** 4-6 months, honestly, and possibly more. Combat AI is one of the
hardest problems in the field, and bad AI destroys realism instantly.

### M13 — Vehicles
Driver, gunner and commander seats. Third-person camera, which is correct and
cheap here.

**Estimate:** 2-3 months.

---

## Timelines, honestly

| Target | Realistic time, few hours a week |
|---|---|
| **M3 — a complete FPV drone game** | **~3 months** |
| M7 — three roles and a live war underneath | ~7 months |
| M9 — plus electronic warfare | ~10 months |
| M11 — plus night infiltration | ~15 months |
| M13 — the full vision | **2-3 years** |

The two-to-three-year figure is not a warning, it is just what this genre costs.
*Squad*, *Insurgency* and *Zero Hour* were all built by teams over years. What
makes this plan work is that **you have something worth playing at month three**,
and every phase after that is an addition rather than a prerequisite.

If you stop at M3, you made a good game. If you stop at M7, you made something
nobody else has made. Neither is failure.

## Rules for not failing

1. **Never break the two-layer rule** in TECH.md section 2.
2. **Build roles cheapest-first.** The rifleman is not a starting point.
3. **Delete before you add.** REALISM.md Part 1 is free and worth more than months
   of art.
4. **Commit every session**, even broken work, on a branch.
5. **Play your own game at every milestone.** If M3 is not fun, M12 will not
   rescue it.
6. **When stuck or bored, tune data or work on sound.** Both are real progress and
   both are more fun than debugging.
