# Battle Game (working title)

A realistic modern-war game where you choose **which job you do** — FPV drone
pilot, artillery spotter, mortar crew, electronic warfare operator, sapper,
rifleman — inside one continuously simulated frontline sector.

**Status:** planning. No code yet.

## The idea

The war is simulated once, underneath, and keeps running whether you are watching
or not: contacts, artillery, supply, electronic warfare, weather. You pick a role
and see it through that window.

Kill a supply truck with an FPV drone and the battalion it fed is short of shells
tomorrow. Destroy an electronic warfare station as a sapper and your side's drone
pilots can suddenly fly ten kilometres deeper. The jobs are different; the war is
the same war.

## Playable now

**[`prototype/bodycam-prototype.html`](prototype/bodycam-prototype.html)** — double-click
it. A first-person slice: clear a village house, three enemies, seen through a
chest-mounted camera. No install, no server, works offline.

It is a *feel test*, not the real build — see [prototype/README.md](prototype/README.md)
for why it is a web page rather than Godot, and what transfers.

## What is being built first

**A 2v2 multiplayer prototype.** Each team has one **operator** flying a drone and
one **shooter** on the ground in first person. The operator sees; the shooter acts.
Both are on the map, and both can die — kill the enemy operator and their drone
falls out of the sky.

Each team is one pair of eyes and one trigger, and each team is hunting the other
team's eyes. Round-based, no respawns. Roughly five months of work, and it is a
complete game on its own. See **[docs/PROTOTYPE.md](docs/PROTOTYPE.md)**.

Everything else in this repository is the long game.

## Start here

1. **[docs/PROTOTYPE.md](docs/PROTOTYPE.md)** — the 2v2 prototype: rules, map, build order ← *start here*
2. **[docs/ROLES.md](docs/ROLES.md)** — all seven roles, what each costs, and why
3. **[docs/REALISM.md](docs/REALISM.md)** — how to look and feel realistic on a beginner's budget
4. **[docs/TECH.md](docs/TECH.md)** — Godot 4, and the two-layer architecture rule
5. **[docs/ROADMAP.md](docs/ROADMAP.md)** — fourteen milestones, playable game at month three
6. **[docs/DESIGN.md](docs/DESIGN.md)** — the war simulation that runs underneath
7. **[docs/RESEARCH.md](docs/RESEARCH.md)** — where the real numbers come from

## Three things that decide whether this works

**Player-versus-player deletes the enemy AI.** The rifleman was the most expensive
role almost entirely because it needs *good* combat AI — one of the hardest problems
in games. Four humans remove that requirement outright, which is most of what pays
for the networking. First person on foot; third person only in vehicles. (ROLES.md)

**Do the networking spike in month two.** Retrofitting multiplayer is not a feature,
it is a rewrite — every system built solo has to be torn up to answer *"who
decides?"*. Two cubes on two machines, before anything else is built on top.
(PROTOTYPE.md, P1)

**Realism is mostly deletion.** No crosshair, no health bar, no hit markers, no
minimap, no respawn. These cost nothing and do more than a year of art.
(REALISM.md Part 1)

**The host decides.** Clients send inputs; the host works out what happened and
tells everyone. A client never declares its own hits. This is the multiplayer form
of the same two-layer rule that keeps the simulation separate from what draws it.
(TECH.md sections 2 and 4b)
