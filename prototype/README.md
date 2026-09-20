# Bodycam prototype

A playable first-person slice: clear a village house, three enemies, seen through
a chest-mounted camera.

**To play: double-click `bodycam-prototype.html`.** No install, no server, works
offline. Everything is in that one file.

## The mission

Three phases, so the round has a shape:

1. **Assault** — clear the garrison from the compound.
2. **Counter-attack** — they come back down the road, behind you. Hold.
3. **Exfil** — fall back to the marked circle on the road.

Difficulty sets how many defenders there are, how many come back, how accurate
they are, and how many hits you can take.

| | |
|---|---|
| move | `W A S D` |
| sprint | `Shift` — costs stamina, cannot be held |
| crouch | `C` — quieter, steadier, harder to spot |
| climb / vault | `Space` — through windows, the shell hole, over walls |
| fire | left mouse |
| aim | right mouse — hold; tightens the crosshair |
| reload | `R` |
| swap weapon | `Q` — primary / sidearm |
| pick up | `E` — take a weapon off the ground |
| check magazine | `F` — gives a feel, not a number |
| camera filter | `B` — toggle the bodycam look on or off |
| pause | `Esc` — settings, restart, quit |

**Two headshots or four body shots** — for them and for you. Four pips at the
bottom of the screen are your health.

The crosshair marks exactly where the shot goes, and its gap widens with your
spread, so it shows how accurate the next round will be. This departs from
`../docs/REALISM.md` part 1, which argues for removing the crosshair — that was
the right call for a hardcore sim and the wrong one here.

## Why this is a web page and not Godot

Godot is still the plan (`../docs/TECH.md`). This slice is in the browser because
it could be built *and verified running* in one sitting, and because you can play
it by double-clicking rather than installing an engine first.

It is a **feel test**. What it answers — how the bodycam should look, how heavy
movement should be, how fast fights should end, how the house should be laid out —
transfers to Godot directly. The code does not, and is not meant to.

## Weapons

Five, all defined as data in `src/weapons.js`, so a new one is a table entry
rather than new code. You carry a primary and a sidearm, and can take anything
off the ground with `E`.

| | Rounds | Rate | Head / body | Notes |
|---|---|---|---|---|
| Assault rifle | 30 | 600 rpm | 2 / 1 | The all-rounder |
| Submachine gun | 32 | 900 rpm | 2 / 1 | Vicious close, scatters at range |
| Pump shotgun | 7 | 75 rpm | 9 pellets | Lethal in a doorway, useless across the yard |
| Marksman rifle | 10 | 240 rpm | 4 / 2 | A headshot kills outright; 4.5x optic |
| Sidearm | 15 | 420 rpm | 2 / 1 | What you fall back on |

"Head / body" is damage against 4 health, so 2 / 1 means two headshots or four
body shots.

## Enemy types

Each carries a different weapon and wants to fight at a different distance:

| | Weapon | Fights at | Kills a standing player in |
|---|---|---|---|
| **Rifleman** | Rifle | 13m | ~5s |
| **Rusher** | SMG | 4m | ~2s, if it reaches you |
| **Shotgunner** | Shotgun | 3.5m | ~5s, and it is tougher |
| **Marksman** | DMR | 26m | ~10s, from where you cannot easily reach |

Times are on Regular against a player who stands still in the open, which is the
worst thing you can do. Breaking line of sight resets their aim entirely.

Kill one and the weapon they were carrying lands on the ground.

## Difficulty

| | Garrison | Counter-attack | Your health | Their accuracy |
|---|---|---|---|---|
| Recruit | 4 | 3 | 5 hits | 0.62x |
| Regular | 6 | 4 | 4 hits | 1.0x |
| Veteran | 8 | 5 | 3 hits | 1.2x |

You are graded at the end on marksmanship, pace and how intact you came through.

## Settings

Mouse sensitivity, field of view, volume, camera filter and inverted aim, all
remembered between sessions. Reachable from the menu or the pause screen, and
they apply live.

## What is in it

- **Bodycam presentation, kept light** — a gently distorted lens, a little
  chromatic aberration, fine grain and a soft vignette. Press `B` to switch it
  off entirely. The camera tracks your look almost exactly; the heavy spring lag
  it used to have read as the view "shifting" when you turned.
- **Auto-exposure** — walk in through the front door and the camera hunts for
  exposure, exactly as a real one does. Stops down fast, opens up slowly.
- **The map** — a 50m compound holding a house of four rooms off a central
  corridor (each with a different floor), a barn and a workshop you can fight
  inside, a raised platform you climb by steps for overwatch, a sandbagged
  fighting position, a rubble mound, stone walls, crates and barrels for cover,
  a well, and a shell hole punched through the back wall of the house.
- **Four enemies** that warn each other by shouting, break for cover after firing
  a burst, approach a lost contact from one side rather than straight on, sweep
  the area where they last saw you, and get steadily more accurate the longer you
  stay in their sights — so breaking line of sight resets their aim. Still simple
  by the standards of a shipped game, but no longer a shooting gallery.
- **Sound, all synthesised in the browser** — no audio files. Each weapon has its
  own voice; other people's shots are panned to their side and delayed by the
  distance; rounds that miss crack past your head; footsteps change with the
  surface underfoot; someone who spots you shouts; bodies hit the ground; and
  distant artillery rumbles somewhere else in the war. A shot close by muffles
  everything and leaves your ears ringing.
- **A damage direction indicator**, because with half a dozen enemies you
  otherwise have no idea which way to turn.
- **Procedural textures** too, drawn on a canvas at load.

## Editing it

Source is in `src/`. After a change:

```
npm install      # once
npm run build    # rewrites bodycam-prototype.html
```

Tuning worth trying first, in order of how much they change the feel:

| Want | File | Look for |
|---|---|---|
| how much camera movement at all | `src/bodycam.js` | `this.motion = 0.35` |
| more or less lens distortion | `src/bodycam.js` | `float k = 0.035` |
| more or less grain | `src/bodycam.js` | `0.012 + uShake` |
| how tightly the camera tracks | `src/bodycam.js` | `const k = 420` |
| how dark it gets indoors | `src/bodycam.js` | `indoor ? 1.55 : 1.0` |
| accuracy | `src/weapon.js` | `let s = ads ? 0.0006 : 0.012` |
| shots needed to kill | `src/weapon.js` | `MAX_HP`, `HEAD_DAMAGE`, `BODY_DAMAGE` |
| difficulty numbers | `src/settings.js` | `DIFFICULTIES` |
| mission phases and spawns | `src/mission.js` | `GARRISON_POSTS`, `COUNTER_SPAWNS` |
| movement speed | `src/player.js` | `crouching ? 1.6 : ...` |
| how deadly they are | `src/ai.js` | `const settle = 0.14 + 0.30 *` |
| a single enemy type | `src/ai.js` | `KINDS` — weapon, speed, range, damage |
| how fast they notice you | `src/ai.js` | `let rate = 2.6 *` |
| how loud the ambience is | `src/audio.js` | `startAmbient`, `g.gain.value` |
| footstep character | `src/audio.js` | `SURFACES` |
| how often they break for cover | `src/ai.js` | `Math.random() < 0.5` in `engage` |
| how high you can climb | `src/player.js` | `VAULT_MAX`, `STEP_UP` |
| doorway width | `src/map.js` | `const door = (at, width = 1.5)` |
| room layout | `src/map.js` | the `wall(...)` calls |

`window.__dbg` in the browser console exposes the player, enemies and map — try
`__dbg.teleport(0, 0, -2)` to drop yourself inside the house.

## Performance

The compound is about 830 static boxes. Those are merged by material at load,
taking the scene from 846 draw calls to 192. Particle effects run from fixed
pools, so a firefight allocates nothing.

## Known limits

- Testing here runs on a software renderer at single-digit frame rates; on any
  real GPU it runs fine. Worth knowing if you ever automate tests: the
  simulation clamps its timestep, so at 8 fps the game advances at roughly 0.4x
  real time, and a test that waits in wall-clock seconds will misjudge it.
- Enemies steer around obstacles by sliding along them rather than pathfinding,
  so they can still get hung up on an awkward corner.
- Cover is chosen by sampling points and testing line of sight, not by a real
  tactical map, so it occasionally picks somewhere odd.
- One magazine of animation polish short of anything you would show off.
