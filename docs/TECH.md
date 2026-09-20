# Technology and code structure

Written for someone early in their coding journey. The choices below optimise for
*you finishing this*, not for what a large studio would pick.

## 1. The stack

**Recommendation: TypeScript, running in the browser, drawing to an HTML canvas,
built with Vite.**

Four reasons, in order of importance:

1. **This game is ~90% simulation logic and ~10% drawing.** You are writing rules
   about detection and supply, not rendering engines. A game engine would mostly
   be in the way.
2. **The debugging is the gentlest that exists.** Browser dev tools let you pause
   mid-turn and inspect the entire game state as a tree you can click through.
   Nothing else is close for a beginner.
3. **Zero friction for players.** You send a link. No installer, no platform
   builds, no store. GitHub Pages hosts it free, straight from this repository.
4. **TypeScript catches your mistakes before you run.** For a simulation with
   dozens of interacting numbers, having the editor say *"a Contact does not have
   a `.strength`, did you mean the Unit it points to?"* will save you many hours.

### Alternatives, honestly assessed

| Option | Use it if | Cost |
|---|---|---|
| **Godot 4 (GDScript)** | You are sure you want 3D or fancy visuals later | You learn an engine *on top of* learning to code. Real extra work. |
| **Python + pygame** | You want the gentlest possible language | Fine for learning; painful to share with players, and slow once the sim gets big. |
| **Unity / Unreal** | — | Overkill. Heavy, complex, aimed at exactly the visual realism we decided to skip. |

Start with TypeScript. If this project succeeds and you want a 3D version in
three years, all the simulation logic ports over — because of the architecture
rule below.

## 2. The one architecture rule

> **The simulation is plain data and pure functions. Rendering only reads.**

Concretely:

```ts
// The entire game is ONE plain-data object. No functions, no classes inside it.
type GameState = {
  turn: number
  weather: Weather
  map: { terrain: Uint8Array; mines: Float32Array; ewIntensity: Float32Array }
  units: Unit[]
  contacts: { red: Contact[]; blue: Contact[] }   // what each side believes
  fireMissions: FireMission[]
  rngSeed: number
}

// Advancing time is one pure function. Same inputs -> same output. Always.
function resolveTurn(state: GameState, redOrders: Order[], blueOrders: Order[]): GameState

// Drawing NEVER changes anything. It only looks.
function render(ctx: CanvasRenderingContext2D, state: GameState, viewingSide: Side): void
```

Follow this rule and you get five things almost for free:

- **Saving** is `JSON.stringify(state)`. Loading is `JSON.parse`.
- **Replays** are a seed plus the list of orders. Kilobytes, not megabytes.
- **Undo** is keeping the previous state object.
- **Tests** become easy: build a state, resolve a turn, assert on the result.
- **The AI** is just another thing that reads a state and returns orders. It plugs
  into the exact same slot the human does.

Break this rule — let the drawing code nudge unit positions, scatter game logic
into click handlers — and the project becomes unfixable around Milestone 5. This
is the most valuable single sentence in these documents.

### Corollary: seed your randomness

Never call `Math.random()` in simulation code. Use a small seeded generator stored
in the state. Then a bug is reproducible, and "why did my battalion evaporate" is
a question you can actually answer by replaying it.

## 3. Folder layout

```
battle-game/
  index.html
  src/
    main.ts              # startup, input, the frame loop
    core/
      hex.ts             # hex coordinate maths (see RESEARCH.md for the guide)
      rng.ts             # seeded random number generator
      state.ts           # the GameState type and a blank starting state
    sim/                 # PURE. No drawing, no DOM, no Math.random.
      turn.ts            # resolveTurn — orchestrates the phases below, in order
      movement.ts
      spotting.ts        # sensors -> contacts    (Milestone 2)
      combat.ts          # direct fire            (Milestone 3)
      artillery.ts       # fire missions, counterbattery (Milestone 4)
      drones.ts          # (Milestone 5)
      supply.ts          # (Milestone 6)
      ew.ts              # (Milestone 7)
      engineering.ts     # mines and breaching    (Milestone 8)
    ai/
      opponent.ts        # reads a GameState, returns Orders  (Milestone 9)
    render/
      map.ts             # terrain hexes
      symbols.ts         # NATO unit symbols
      ui.ts              # panels, order entry
  data/                  # tuning values. Edit these WITHOUT touching code.
    units.json
    weapons.json
    sensors.json
  scenarios/
    01-tree-line.json
  tests/
```

The `sim/` and `render/` split is the architecture rule made physical. If you ever
find yourself importing something from `render/` into `sim/`, stop — something has
gone wrong.

## 4. Data-driven from day one

Every number that describes the world lives in JSON, never in code:

```json
{
  "id": "spg_155_wheeled",
  "name": "155mm wheeled SPG battery",
  "category": "artillery",
  "maxRangeKm": 40,
  "emplaceTurns": 1,
  "displaceTurns": 1,
  "roundsPerFireMission": 6,
  "signature": { "visual": 0.7, "thermal": 0.8, "acoustic": 0.9, "em": 0.2 },
  "_source": "open published figures - see docs/RESEARCH.md"
}
```

Two payoffs. **Balancing becomes editing a file**, not hunting through code for a
magic number. And **realism becomes a research task you can do in the evening** —
find a better published figure, change one line, done.

## 5. Testing

You do not need full test coverage. You *do* need tests on the parts where a
silent wrong answer would poison everything downstream. Use Vitest, and cover:

- hex distance and line-of-sight maths
- contact decay over time
- the supply flow calculation
- one full end-to-end turn resolution on a tiny fixed scenario

## 6. What to learn, in order

Rough guide, assuming a few hours a week. Do not read ahead — learn each one
*because* the next milestone needs it.

1. **JavaScript basics** — variables, functions, arrays, objects, loops. (2-3 weeks)
2. **TypeScript types** — just `type`, `interface`, and typing function arguments.
   Ignore generics and decorators for a long time. (1 week)
3. **Canvas drawing** — `fillRect`, `arc`, `fillText`, coordinate transforms. (a few days)
4. **Hex grid maths** — Red Blob Games' guide, linked in RESEARCH.md. Work through
   it once with code open. (a weekend)
5. **Git** — commit, branch, push. You already have the repository. (ongoing)

Everything past that, learn when a milestone demands it.
