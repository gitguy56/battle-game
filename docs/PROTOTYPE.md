# Prototype — 2v2, operator and shooter

**This is now the first thing being built.** Everything else in this repository is
the long game; this document is the next few months.

## The pitch

Two teams of two. Each team has one **operator** flying a drone and one **shooter**
on the ground in first person. The operator sees; the shooter acts. Both are on the
map, and both can die.

Each team is one pair of eyes and one trigger — and each team is hunting the other
team's eyes.

## Why this is a good prototype

**It deletes the most expensive thing in the project.** The rifleman role was rated
"very high" cost mostly because it needs *good* enemy AI — perception, cover
selection, pathfinding, suppression response. Combat AI is one of the hardest
problems in games and bad AI destroys realism instantly. Human opponents remove
that requirement completely. That saving pays for a large part of the networking.

**2v2 is the cheapest multiplayer that exists.** Four players, one of whom hosts.
No matchmaking, no dedicated servers, no anti-cheat, no 100-player scale problems.
Godot 4's high-level networking handles this comfortably, and you can test with
two windows on one machine.

**The asymmetry is the hook.** Two players doing completely different jobs, who
need each other, is rare and memorable. Nobody is shipping drone-operator-plus-
infantry as a paired unit, and it is the defining two-person team of this war.

**It is honest about the genre.** A 2v2 round-based game with no respawns is a
complete, finished-feeling thing at small scale, not a stripped-down version of
something bigger.

## The five rules that make it work

These are the design; everything else is implementation.

### 1. The operator is on the map, and can be killed
The drone pilot is not a floating camera in the sky. They are a person sitting in a
basement, a treeline or a dugout, with goggles on and no situational awareness of
their own surroundings. **Kill the operator and their drone drops out of the sky.**

This is the single most important rule in the prototype. It gives the shooter
something to hunt, gives the operator something to fear, and turns "protect your
teammate" into the actual structure of the match. Without it the operator is a
spectator with a camera and the game is boring.

### 2. The drone is visible and audible
A drone overhead is information flowing *both* ways. It tells the enemy that
someone is watching, roughly from which direction it came, and therefore roughly
where its operator might be. The shooter can hear it before they see it, and can
shoot it down.

### 3. Battery
Four to six minutes of flight, then the operator must land and swap — which is a
window where their team is blind and the operator is busy. Windows like this are
what create the rhythm of a round.

### 4. One strike, or eyes — choose at round start
- **FPV strike drone:** one kill, one-way trip. After it hits, your team is blind.
- **Recon drone:** eyes for the whole round, no ability to kill.

A real tradeoff with no dominant answer, chosen before each round.

### 5. No respawn
The round ends when a team is eliminated. Death is permanent for the round. This is
free to implement and does more for tension than any feature you could build.

## Win condition

**Eliminate both enemy players.** Round-based, best of five or seven.

Simple, tense, and requires no objective system, no capture zones and no scoring
logic. Add objectives later if rounds feel stale — they probably will not.

## The map

**Two to four hundred metres square.** One or two buildings, a treeline, a road,
scattered cover. Small enough to build properly in a week, big enough that the
drone genuinely matters.

**Design it around overhead cover.** The key resource is places you cannot be seen
from above: inside buildings, under trees, under netting, in a ditch. That is the
real counter-drone tactic, it makes the map interesting in a way flat cover never
is, and it gives the shooter a way to move without being tracked.

Good map has: open ground that is terrifying to cross, covered routes that are slow,
two or three plausible operator hiding spots per side, and one high building that
is useful and obvious and therefore a trap.

## Not in the prototype

Writing this down is as important as the design.

- The war simulation layer — supply, artillery, electronic warfare, contacts. All
  of it waits. (DESIGN.md is not cancelled, it is postponed.)
- The other five roles.
- Vehicles.
- Matchmaking, ranked play, progression, unlocks, cosmetics.
- More than one map.
- Dedicated servers. One player hosts.
- Anti-cheat. You are playing with friends.

## Build order — this ordering is the whole thing

The trap is building the drone, the shooter and the networking at the same time.
That is three unknowns at once, and it is how projects stall.

### P0 — Walk around (4 weeks)
Godot installed. A rough map. First-person movement: walk, sprint, crouch, stamina.
No weapon, no networking, no enemies.
**Done when:** walking around the map feels weighty and deliberate, not floaty.

### P1 — The networking spike ⚠ (3 weeks)
**Two players, two cubes, connecting over a network and seeing each other move.**
No art. No guns. No drone. Just movement synchronised between machines.

**Do this in month two, not month six.** Retrofitting multiplayer is not a feature,
it is a rewrite: every system you built solo — movement, shooting, damage, death —
has to be torn up to answer the question *"who decides?"*. Build the answer in
first and everything after it is straightforward.

**Done when:** you and a friend are on different machines and can see each other's
cube move smoothly.
**The rule this establishes:** the host is authoritative. Clients send inputs; the
host decides what happened and tells everyone. Never let a client declare its own
hits.

### P2 — The drone, networked (3 weeks)
Flight physics. The operator is a body on the map wearing goggles. Everyone else
can see and hear the drone in the sky.
**Done when:** one player flies while the other watches it pass overhead.

### P3 — Shooting and dying (4 weeks)
A rifle. Real ballistics, real reload times, two-hits-kill lethality. Host-
authoritative hit detection. Death is permanent.
**Done when:** you can kill each other, and it is over in under two seconds.

### P4 — The video feed and the strike (3 weeks)
The goggles shader: low resolution, scanlines, interference, compression
artefacts, signal loss. The FPV drone can dive and kill.
**Done when:** a screenshot of the feed is hard to tell from real footage.

### P5 — The round loop (3 weeks)
Role selection, drone type selection, spawning, elimination, round end, score,
reset. The thing that makes it a game rather than a sandbox.
**Done when:** four people can play a best-of-five without anyone touching a
keyboard between rounds.

### P6 — The realism pass (3 weeks)
Work through REALISM.md Part 1 and delete everything on the list. Then sound:
footsteps, drone buzz at distance, incoming rounds, ear ringing. Then lighting:
overcast, dusk, fog.
**Done when:** it feels tense rather than arcade.

## Timeline

**Roughly five months** at a few hours a week to a genuinely playable 2v2.

That is longer than the three-month drone-only prototype, and it delivers the
actual thing you want instead of a piece of it. It is also still far cheaper than
the original infantry plan, because four humans replace the AI.

## The three ways this goes wrong

1. **Networking left until late.** Covered above. This is the big one.
2. **The operator is invulnerable.** If you skip rule 1 because it is easier, the
   game has no teeth. Build it in from P2.
3. **Building the map before the movement feels good.** A beautiful map with
   floaty movement is worthless. P0 first.
