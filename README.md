# Unit 2-1

A single-player tactical shooter. You take a village compound held by a garrison,
hold it against a counter-attack, and fall back to the road — seen through a
chest-mounted camera.

**[Play it](prototype/bodycam-prototype.html)** — double-click the file, or open
the hosted link. No install, no server, works offline.

## Where things are

- **[prototype/](prototype/)** — the game. Source in `prototype/src/`, and
  `prototype/README.md` explains how to build and tune it.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — what is built and what is next.
- **[docs/REALISM.md](docs/REALISM.md)** — how the game gets its feel on a
  budget. Still the most useful document here.
- **[docs/TECH.md](docs/TECH.md)** — the stack, and why it is a web page.
- **[docs/RESEARCH.md](docs/RESEARCH.md)** — where real figures come from.

## Shelved

The project started as a plan for an operational wargame, then a 2v2 game
pairing a drone operator with a shooter. Both were dropped in favour of making
the shooter good. The plans are kept because the reasoning in them still holds
and the ideas may come back:

- **[docs/DESIGN.md](docs/DESIGN.md)** — the operational war simulation
- **[docs/ROLES.md](docs/ROLES.md)** — seven roles, including the FPV drone
- **[docs/PROTOTYPE.md](docs/PROTOTYPE.md)** — the 2v2 drone-and-shooter design

## What the game is now

Three phases to a round: clear the garrison, hold against a counter-attack that
arrives down the road behind you, then walk back out to the marked circle.

Five weapons with genuinely different handling, four enemy types that carry
different guns and want to fight at different ranges, and an AI that shouts to
warn the others, breaks for cover after firing, flanks a lost contact, and gets
more accurate the longer it holds you in its sights.

Two headshots or four body shots — both ways.
