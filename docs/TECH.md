# Technology and code structure

Written for someone early in their coding journey, and optimised for *you
finishing this* rather than for what a large studio would pick.

> **What actually happened.** This document recommended Godot, and the game was
> built as a web page instead. The reason was practical rather than principled:
> a browser build could be written, run, screenshotted and verified in one
> sitting, and it can be played by clicking a link with nothing installed. Every
> design answer in here still transferred — camera feel, movement weight,
> lethality, layout. The Godot case below stands if the project ever wants
> native builds, better tooling or heavier scenes.

## 1. What it is built with

**Three.js in a single self-contained HTML file**, bundled by esbuild from the
modules in `prototype/src/`. No install, no server, works offline. All textures
are drawn on a canvas at load and all sound is synthesised in the browser, so
there are no asset files at all.

## 1b. The engine that was recommended

**Godot 4, using GDScript.**

- **Free and open source**, no royalties, no account, about a 100 MB download.
- **GDScript looks like Python** — indentation, no semicolons, no memory
  management. It is the gentlest language any major engine offers.
- **Godot 4's 3D is genuinely good** — physically based rendering, global
  illumination, volumetric fog. Everything in REALISM.md is achievable in it.
- **Fast iteration.** Press play, the game runs in under a second. When you are
  learning, the speed of the try-it-and-see loop matters more than almost anything.
- **Scenes compose naturally**, which maps perfectly onto "each role is a different
  window onto the same war".

### Alternatives, honestly assessed

| Engine | Use it if | The real cost |
|---|---|---|
| **Unreal 5** | Photorealism is genuinely non-negotiable | Gives you Lumen, Nanite and free Megascans, so it *does* look better out of the box. But it is a huge download, demands a strong PC, iterates slowly, and when something breaks the error surface is enormous. It is an industry tool that assumes you already know what you are doing. |
| **Unity** | You want the largest tutorial library | Fine engine, C# is harder than GDScript, and the licensing history makes people wary. |
| **Build your own** | Never | Not a real option. |

Start in Godot. If in two years the drone role is brilliant and you want to remake
it photoreal in Unreal, you will by then be a competent programmer and the
simulation code ports over — because of the architecture rule below.

## 2. The two-layer architecture

This is the most important idea in the project. Read it twice.

```
+---------------------------------------------------+
|  LAYER 1: THE WAR SIMULATION                      |
|  Plain data. Pure logic. No 3D, no rendering.     |
|  Units, contacts, artillery, supply, EW, weather. |
|  Ticks forward whether anyone is watching or not. |
+---------------------------------------------------+
                        ^
                        |  reads state / sends actions
                        v
+---------------------------------------------------+
|  LAYER 2: ROLE VIEWS                              |
|  Godot scenes. One per role.                      |
|  FPVDrone.tscn  MortarPit.tscn  EWStation.tscn    |
|  Sapper.tscn    Rifleman.tscn                     |
+---------------------------------------------------+
```

**The rule: Layer 1 never imports anything from Layer 2.** The simulation must be
able to run with no window open at all.

Why this matters so much here:

- **Roles become cheap to add.** A new role is a new scene that reads the same
  world. You are not rebuilding the game each time.
- **Your actions persist.** The truck you killed as a drone pilot is gone from the
  simulation, so the battalion it supplied is short of shells tomorrow — in
  whatever role you play next.
- **Saving** is serialising Layer 1.
- **Testing** is possible at all. You can run a thousand simulated turns headless
  in a second and check the numbers are sane.
- **The AI** plugs into the same slot a player does.

Break this rule — let a drone's collision handler directly change a battalion's
ammunition count — and around role four the project stops being fixable. This is
the most common way ambitious solo projects die.

## 3. Project layout

```
battle-game/
  project.godot
  sim/                    # LAYER 1 - pure logic, no visuals, no Node3D
    world.gd              # the world state object
    tick.gd               # advance the war by one step
    spotting.gd           # sensors -> contacts
    artillery.gd          # fire missions, flight time, counterbattery
    supply.gd
    ew.gd                 # the jamming field
    rng.gd                # seeded randomness - never use randf() in sim
  roles/                  # LAYER 2 - one folder per role
    fpv_drone/
      fpv_drone.tscn
      flight.gd           # flight physics
      video_feed.gdshader # grain, interference, compression artefacts
    recon_drone/
    mortar_pit/
    ew_station/
    sapper/
    rifleman/
  world/                  # the shared 3D environment
    terrain/
    props/
    weather.gd
    lighting.gd
  audio/
  data/                   # tuning values as .json - edit WITHOUT touching code
    units.json
    weapons.json
    sensors.json
  missions/
  tests/
```

If you ever find yourself importing something from `roles/` into `sim/`, stop.
Something has gone wrong.

## 4. Data-driven from day one

Every number describing the world lives in JSON, never buried in code:

```json
{
  "id": "fpv_fibre",
  "name": "Fibre-optic FPV strike drone",
  "enduranceSeconds": 480,
  "cruiseSpeedMs": 28,
  "linkRangeKm": 15,
  "jamSusceptibility": 0.0,
  "_source": "estimate - see docs/RESEARCH.md"
}
```

Balancing then becomes editing a file rather than hunting for a magic number, and
improving realism becomes an evening's research rather than a refactor.

## 4b. Networking

The prototype is multiplayer from the start (PROTOTYPE.md), so this is not an
afterthought — it shapes the code from week one.

**Use Godot 4's high-level multiplayer.** `ENetMultiplayerPeer` for the connection,
`MultiplayerSpawner` for creating players, `MultiplayerSynchronizer` for keeping
positions in step, and `@rpc` functions for events. For four players this is
genuinely approachable, and you can test with two windows on one machine before
involving anyone else.

**One player hosts.** No dedicated server, no matchmaking. Connect by IP or room
code. At 2v2 this is entirely adequate and saves you months.

**The rule: the host decides.** Clients send *inputs* — "I am pressing forward",
"I pulled the trigger". The host works out what actually happened and tells
everyone. A client never declares its own hits.

This matters even among friends where cheating is not a concern, because it is the
only way to have one consistent answer to "did that bullet connect?". Two machines
disagreeing about whether someone died is the most common and most miserable
multiplayer bug there is.

Note how cleanly this sits on top of the two-layer rule in section 2: the host owns
the state, everyone else renders it. Same principle, now enforced by the network.

## 5. What to learn, in order

Do not read ahead. Learn each thing *because* the next milestone needs it.

1. **GDScript basics** — variables, functions, arrays, dictionaries, loops,
   classes. (3-4 weeks)
2. **Godot nodes and scenes** — how a scene tree works, instancing, signals. This
   is the concept that unlocks the engine. (2 weeks)
3. **3D transforms** — position, rotation, basis vectors, moving a camera in
   space. Needed for the drone. (1-2 weeks)
4. **Godot shaders** — enough to write the video-feed effect. Surprisingly
   approachable and enormously rewarding. (1 week)
5. **Lighting and environment** — HDRIs, fog, post-processing. This is where
   "looks realistic" actually comes from. (ongoing)
6. **Audio** — buses, 3D positional sound, reverb. (1 week)
7. **Godot high-level multiplayer** — peers, spawners, synchronizers, RPCs.
   Learn this at P1, before building anything on top of it. (2 weeks)
8. **Git** — commit, branch, push. You have the repository already. (ongoing)

Everything past that, learn when a milestone demands it.

## 6. A warning about tutorials

Most Godot tutorials teach 2D platformers, and most YouTube "make an FPS in Godot"
videos produce an arcade shooter with a crosshair, a health bar and hitscan
weapons — precisely the things REALISM.md tells you to delete.

Use tutorials to learn *the engine*. Take design direction from these documents and
from the games in REALISM.md Part 5, not from the tutorials.
