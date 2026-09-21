# Chainrunner

A movement speedrunner. Hop from target to target, come out of each one faster
than you went in, and don't break the chain.

**[Play it](chainrunner.html)** — double-click the file, or open the hosted link.

| | |
|---|---|
| move | `W A S D` |
| jump | `Space` |
| shoot | left mouse — **a kill throws you through them** |
| aim | right mouse |
| swap weapon | `Q` |
| reload | `R` |
| restart | `Backspace` — instantly, from anywhere |
| quit to menu | `Esc` |

## The idea

**Your gun is the movement.** There is no hop button. You shoot an enemy, and
killing them throws you through where they were standing, faster than you
arrived. Miss and nothing happens — you keep falling.

Kill again before the chain bar empties and the throw gets stronger. So the fast
line through a level is the one that never breaks the chain, and **the route is
a line of enemies across the rooftops**, visible from the start.

Weapon choice is movement choice: the marksman rifle chains from range, the
rifle is the all-rounder. Anyone further than 52m is dimmed — you can kill them,
but they will not throw you.

Three kinds of enemy:

- **Grunt** — one shot, the standard throw
- **Heavy** — three shots, a much bigger throw, and it shoots back
- **Flyer** — one shot, throws you upward instead of forward

**You cannot die.** Falling drops you on the last rooftop you passed and costs a
second. Being shot costs your chain, which hurts more.

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
| how much a kill gives you | `src/hop.js` | `CHAIN.baseBoost`, `CHAIN.perChain` |
| how far a kill can throw you | `src/hop.js` | `CHAIN.launchRange` |
| how long the chain lasts | `src/hop.js` | `CHAIN.window` |
| the slow-motion beat | `src/hop.js` | `CHAIN.freeze`, `CHAIN.freezeScale` |
| the course itself | `src/course.js` | `BUILDINGS`, `ENEMIES` |
| enemy types | `src/enemy.js` | `ENEMY_KINDS` |
| medal times | `src/course.js` | `medals` |

`window.__run` in the browser console exposes the runner, the hop system and the
course.

## Shared with the shooter

Imported from `../prototype/src/` rather than copied: the whole weapon system
(`weapon.js`, `weapons.js` — all five guns, with their real recoil, spread and
reload), the synthesised audio, the pooled particle effects, and the procedural
textures. Nothing in the shooter was changed to make this work.

## Known limits

- One course. The medal times are a guess and want tuning once someone has
  actually run it.
- Enemies stand still and only shoot back occasionally. They are obstacles and
  fuel, not a fight.
- The course is 400m long, so the far end compresses toward the horizon. You can
  reliably read the next five or six kills, not all 32.
