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

**You fall onto people.** There is no teleport and no hop button. You get above
someone, dive, and the impact kills them outright and throws you back up — and
**the further you fell, the higher you go**. Bounce, arc forward, pick the next
roof, dive again.

`Space` jumps when you're standing and **slams** when you're in the air. That's
the whole movement system.

The jump is a real leap, not a hop — about 7m of rise — because you need to be
able to get above someone from a standing start. Without that, one missed slam
left you stranded on a roof with no way back into the air.

The dive **steers onto whoever is below you**, so you set it up (get above
someone, commit) rather than being asked to hit a 2.6m disc by feel while
falling.

The gun is still there, but it doesn't move you. It's for clearing someone you
can't reach, or can't line up in time.

**Lose the chain and the run restarts.** The bar under the chain counter is how
long you have to land the next one. There are no checkpoints and no penalties —
you just go again, instantly.

Three kinds of enemy:

- **Grunt** — the standard bounce
- **Heavy** — tougher to shoot, but a slam kills anything outright
- **Flyer** — placed high, so they're the ones that gain you altitude

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
| how high a slam throws you | `src/slam.js` | `SLAM.baseBounce`, `SLAM.restitution` |
| how much falling further matters | `src/slam.js` | `SLAM.enterSpeed`, `SLAM.maxBounce` |
| how far each bounce carries you | `src/slam.js` | `SLAM.forward`, `SLAM.hDamp` |
| how long before the run restarts | `src/slam.js` | `SLAM.window` |
| the slow-motion beat | `src/slam.js` | `SLAM.freeze`, `SLAM.freezeScale` |
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
- Enemies stand still and only shoot back occasionally. Being shot shakes the
  camera but cannot end your run - randomness should never do that.
- Resolution adapts to your frame rate. The simulation clamps its timestep, so
  below about 20fps the whole game runs in slow motion and the audio stutters;
  dropping resolution keeps it above that instead.
- The bounce numbers are tuned so the arc matches the gap between rooftops. Change
  `restitution` or `forward` much and the course stops being chainable; there is
  a simulation in the test folder that checks every hop.
- The course is 400m long, so the far end compresses toward the horizon. You can
  reliably read the next five or six kills, not all 32.
