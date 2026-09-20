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

## Start here

1. **[docs/ROLES.md](docs/ROLES.md)** — the roles, what each costs to build, and the build order
2. **[docs/REALISM.md](docs/REALISM.md)** — how to look and feel realistic on a beginner's budget
3. **[docs/TECH.md](docs/TECH.md)** — Godot 4, and the two-layer architecture rule
4. **[docs/ROADMAP.md](docs/ROADMAP.md)** — fourteen milestones, playable game at month three
5. **[docs/DESIGN.md](docs/DESIGN.md)** — the war simulation that runs underneath
6. **[docs/RESEARCH.md](docs/RESEARCH.md)** — where the real numbers come from

## Three things that decide whether this works

**Build the cheapest role first.** An FPV drone is a flying camera — no character,
no animation, no enemy AI. A third-person rifleman needs 100+ animations and good
combat AI, and costs roughly fifty times as much. Start with the drone, which is
also the most distinctive thing in the game. (ROLES.md)

**Realism is mostly deletion.** No crosshair, no health bar, no hit markers, no
minimap, no respawn. These cost nothing and do more than a year of art.
(REALISM.md Part 1)

**Never let the roles touch the simulation directly.** Layer 1 is plain data and
pure logic that runs headless. Layer 2 is Godot scenes that read it. Break this and
the project becomes unfixable around role four. (TECH.md section 2)
