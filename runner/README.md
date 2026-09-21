# Chainrunner

A movement speedrunner. Hop from target to target, come out of each one faster
than you went in, and don't break the chain.

**[Play it](chainrunner.html)** — double-click the file, or open the hosted link.

| | |
|---|---|
| move | `W A S D` |
| jump | `Space` |
| hop | left mouse — takes the marked target |
| restart | `R` — instantly, from anywhere |
| quit to menu | `Esc` |

## The idea

You take an enemy's place and inherit a speed boost. Hop again before the chain
bar empties and the boost grows. So the fast line through a level is the one
that never breaks the chain, and **the route is visible as a line of targets**
from the moment you spawn.

Three kinds:

- **Gold** — the standard hop
- **Blue** — a bigger boost, placed at the long gaps
- **Pink** — throws you upward instead of forward, for when you need height

**You cannot die.** Falling resets you to the last platform you passed and costs
one second on the clock — plus your chain, which is the real punishment.

## Why it plays the way it does

The brief was: floaty and momentum-driven, forgiving but deep, long horizontal
runs, and no prior genre knowledge to lean on. That last one shaped everything.

- **No hidden movement tech.** Air control redirects the speed you already have
  rather than requiring a strafe pattern you'd only know from Quake. You can see
  everything the game can do within a minute.
- **The depth is a number going up.** Chain length is the whole skill expression,
  and it's on screen. That's the most teachable form depth can take.
- **The ground is slow on purpose.** Friction steals speed, so being airborne is
  the fast state and landing is a soft failure.
- **A beat of slow motion on each hop** keeps long chains readable — the clock is
  never slowed, only the world.

## Tuning

Source is in `src/`, then `npm install` once and `npm run build`.

| Want | File | Look for |
|---|---|---|
| how floaty it is | `src/movement.js` | `TUNE.gravity`, `TUNE.airSteer` |
| top speed | `src/movement.js` | `TUNE.maxSpeed` |
| how much a hop gives you | `src/hop.js` | `HOP.baseBoost`, `HOP.perChain` |
| how far you can hop | `src/hop.js` | `HOP.range`, `HOP.cone` |
| how long the chain lasts | `src/hop.js` | `HOP.chainWindow` |
| the slow-motion beat | `src/hop.js` | `HOP.freeze`, `HOP.freezeScale` |
| the course itself | `src/course.js` | `PLATFORMS`, `TARGETS` |
| medal times | `src/course.js` | `medals` |

`window.__run` in the browser console exposes the runner, the hop system and the
course.

## Shared with the shooter

`audio.js` and `effects.js` are imported from `../prototype/src/` rather than
copied, so both games use the same synthesised sound and the same pooled
particles. Nothing in the shooter was changed to make this work.

## Known limits

- One course. The medal times are a guess and want tuning once someone has
  actually run it.
- Targets respawn only on restart, so there is no reason to double back.
- The course is 400m of mostly flat ground, so the far end compresses toward the
  horizon. You can reliably read the next five or six hops, not all 27.
