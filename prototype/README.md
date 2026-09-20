# Bodycam prototype

A playable first-person slice: clear a village house, three enemies, seen through
a chest-mounted camera.

**To play: double-click `bodycam-prototype.html`.** No install, no server, works
offline. Everything is in that one file.

| | |
|---|---|
| move | `W A S D` |
| sprint | `Shift` — costs stamina, cannot be held |
| crouch | `C` — quieter, steadier, harder to spot |
| fire | left mouse |
| aim | right mouse — hold; there is no crosshair |
| reload | `R` — takes 2.8s, and you lose the partial magazine |
| check magazine | `F` — gives a feel, not a number |

Two hits kill you. Two hits kill them. There is no health bar, no ammo counter,
no hit markers and no minimap — see `../docs/REALISM.md` part 1 for why.

## Why this is a web page and not Godot

Godot is still the plan (`../docs/TECH.md`). This slice is in the browser because
it could be built *and verified running* in one sitting, and because you can play
it by double-clicking rather than installing an engine first.

It is a **feel test**. What it answers — how the bodycam should look, how heavy
movement should be, how fast fights should end, how the house should be laid out —
transfers to Godot directly. The code does not, and is not meant to.

## What is in it

- **Bodycam presentation** — wide distorted lens, chromatic aberration, sensor
  grain that rises in shadow, shutter smear, compression blocks, dropped lines,
  rolling scanline, vignette, and a camera that lags and overshoots your look
  because it is strapped to a chest rather than a skull.
- **Auto-exposure** — walk in through the front door and the camera hunts for
  exposure, exactly as a real one does. Stops down fast, opens up slowly.
- **The house** — four rooms off a central corridor, porch, fenced plot, shed,
  well, garden, shell hole punched through the back wall.
- **Three enemies** — patrol, notice you (faster if you are moving and standing),
  close, and shoot in bursts. Deliberately crude: enough to test the feel, nothing
  like the AI a real single-player mode needs.
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
| more or less lens distortion | `src/bodycam.js` | `float k = 0.16` |
| more or less grain | `src/bodycam.js` | `0.040 + uShake` |
| how hard the camera swings | `src/bodycam.js` | `const k = 62` |
| how dark it gets indoors | `src/bodycam.js` | `indoor ? 1.62 : 1.0` |
| movement speed | `src/player.js` | `crouching ? 1.25 : ...` |
| how deadly it is | `src/ai.js` | `let p = 0.30 *` |
| how fast they notice you | `src/ai.js` | `let rate = 2.6 *` |
| room layout | `src/map.js` | the `wall(...)` calls |

`window.__dbg` in the browser console exposes the player, enemies and map — try
`__dbg.teleport(0, 0, -2)` to drop yourself inside the house.

## Known limits

- Software-rendered testing here managed 9 fps; on a real GPU it will run fine.
- Enemies do not path around obstacles, they slide along them.
- One magazine of animation polish short of anything you would show off.
