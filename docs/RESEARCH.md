# Research

Systemic realism is a research problem as much as a coding problem. The good news
is that this is the best-documented war in history and most of what you need is
published openly.

## Where the numbers come from

**Doctrine and lessons-learned analysis** — the highest-value reading by far:
- **RUSI** (Royal United Services Institute). Jack Watling and Nick Reynolds have
  written the definitive open analyses of how this war actually works — drone
  saturation, EW, artillery, why offensives stall. If you read one source, this.
- **CSIS** and **RAND** — operational analysis and force-structure work.
- **ISW** (Institute for the Study of War) — daily assessments and maps. Good for
  tempo: how far does a front actually move in a day? (Usually: almost not at all.)

**Equipment and loss data:**
- **Oryx** — visually confirmed equipment losses. Useful for the *ratios*: what
  actually kills what.
- **Janes**, **Military Balance** (IISS) — orders of battle and specifications.
- Manufacturer published figures for ranges and endurance.

**Doctrine manuals** — US Army FM 3-0 (Operations) and the ATP series are public
and explain how fire missions, supply and reconnaissance are *supposed* to work.
Extremely useful for structuring your systems correctly.

## The data you actually need

Do not try to research everything. You need these fields, per unit type:

| Field | Feeds |
|---|---|
| Movement rate, on and off road | movement.ts |
| Weapon ranges and rate of fire | combat.ts, artillery.ts |
| Ammunition load and consumption rate | supply.ts |
| Sensor detection ranges by target type | spotting.ts |
| Signature — visual, thermal, acoustic, EM | spotting.ts |
| Drone endurance and link range | drones.ts |
| Emplace / displace times | artillery.ts |

That is about seven numbers per unit and twenty unit types. A weekend of work,
not a research degree.

## How to record sources

Keep the citation next to the number, in the JSON:

```json
"maxRangeKm": 40,
"_source": "manufacturer figure, base-bleed round"
```

Future you will want to know whether a value came from a published spec or from
you guessing. Both are fine; knowing which is essential.

## Watch out for

- **Specification versus reality.** Published maximum ranges are best-case. Real
  effective ranges are shorter, often much shorter.
- **Wartime claims from either side.** Treat all of it as marketing until an
  independent source confirms it.
- **Numbers that moved.** This war's tactics changed enormously between 2022 and
  now — 2022 drone data describes a different war from 2025 drone data. Note the
  year alongside the figure.
- **Guessing is allowed.** A plausible invented number that makes the system
  behave correctly beats a stalled project. Mark it `"_source": "estimate"` and
  move on.

## Technical references

- **Red Blob Games, "Hexagonal Grids"** — the canonical guide to hex coordinates,
  distance and line of sight. Work through it with your editor open before M0.
- **Red Blob Games, "Introduction to A*"** — pathfinding, needed at M1.
- **Vitest docs** — testing, needed from M1 onward.

## Design references — play these

Studying the genre is real work, not procrastination:

- **Command: Modern Operations** — the gold standard for sensor and weapon
  modelling. Note how much realism it delivers with almost no graphics.
- **Combat Mission: Black Sea** — WEGO turn structure done well, and excellent
  spotting and suppression models.
- **Flashpoint Campaigns: Southern Storm** — the closest existing thing to this
  design. Operational scale, WEGO, orders delay, electronic warfare. Play it and
  take notes.
- **Graviteam Tactics** — attrition and logistics modelling.

*Flashpoint Campaigns* in particular is worth buying before M0. Much of what this
design proposes, it already does — seeing which parts feel good and which feel
tedious is worth weeks of guessing.
