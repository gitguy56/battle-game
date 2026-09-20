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
| reload | `R` — takes 2.8s, and you lose the partial magazine |
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
- **The map** — a house of four rooms off a central corridor with a different
  floor in each, a barn you can fight inside, stone walls, crates and barrels for
  cover, a well, and a shell hole punched through the back wall.
- **Four enemies** that warn each other by shouting, break for cover after firing
  a burst, approach a lost contact from one side rather than straight on, sweep
  the area where they last saw you, and get steadily more accurate the longer you
  stay in their sights — so breaking line of sight resets their aim. Still simple
  by the standards of a shipped game, but no longer a shooting gallery.
- **Procedural everything** — all textures are drawn on a canvas and all sound is
  synthesised in the browser, including the muffling and ear-ring after a shot.

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
| how fast they notice you | `src/ai.js` | `let rate = 2.6 *` |
| how often they break for cover | `src/ai.js` | `Math.random() < 0.5` in `engage` |
| how high you can climb | `src/player.js` | `VAULT_MAX`, `STEP_UP` |
| doorway width | `src/map.js` | `const door = (at, width = 1.5)` |
| room layout | `src/map.js` | the `wall(...)` calls |

`window.__dbg` in the browser console exposes the player, enemies and map — try
`__dbg.teleport(0, 0, -2)` to drop yourself inside the house.

## Known limits

- Software-rendered testing here managed 8 fps; on a real GPU it will run fine.
- Enemies steer around obstacles by sliding along them rather than pathfinding,
  so they can still get hung up on an awkward corner.
- Cover is chosen by sampling points and testing line of sight, not by a real
  tactical map, so it occasionally picks somewhere odd.
- One magazine of animation polish short of anything you would show off.
