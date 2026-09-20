# Roadmap

The project is a single-player tactical shooter. Earlier plans for an
operational wargame and a 2v2 drone-and-shooter game are shelved — see the root
[README](../README.md).

## Built

Each of these shipped as a playable, tested build.

**A game, not a demo.** Menu, pause, restart without reloading, and an
after-action screen with a grade. Settings that apply live and persist: mouse
sensitivity, field of view, volume, camera filter, inverted aim. Three
difficulties setting garrison size, counter-attack size, enemy accuracy and how
many hits you survive.

**A mission with a shape.** Clear the garrison, hold against a counter-attack
that arrives down the road behind you, fall back to the marked exfil point.

**Five weapons**, defined as data: assault rifle, submachine gun, pump shotgun,
marksman rifle, sidearm. Each with its own rate of fire, spread, recoil, reload,
optic and firing voice. You carry a primary and a sidearm, and can take anything
off the ground.

**Four enemy types** — rifleman, rusher, marksman, shotgunner — differing in
weapon, speed, preferred fighting distance, burst length, accuracy falloff and
how readily they break for cover.

**AI worth fighting.** They shout to warn anyone nearby, break for cover after
firing by testing your line of sight to candidate positions, approach a lost
contact from one side, sweep where they last saw you, and ramp accuracy the
longer they hold you in their sights — so breaking line of sight resets it.

**Feel.** Pooled particle effects: dust and lasting marks on the world, blood on
people, muzzle flashes, ejected brass. Limbs on pivots so enemies walk, flinch
when hit and fall the way the shot pushed them.

**Sound that carries information.** Shots panned to their side and delayed by
distance, rounds cracking past your head, footsteps that change with the surface,
shouts, bodies landing, distant artillery, and a heartbeat when you are badly
hurt.

**A compound worth fighting in.** A house of four rooms off a corridor, a barn
and a workshop you can fight inside, a raised platform for overwatch, a
sandbagged position, a rubble mound, and cover across a 50m plot.

## Next, in rough order of value

1. **More missions.** The compound is one map and one mission. A second map, or
   the same map at night, roughly doubles the game for a fraction of the work
   that got the first one here.
2. **Night and weather.** Real darkness with night vision, and fog that changes
   what both sides can see. Both are mostly lighting work, and both change every
   tactic.
3. **A wave mode.** Hold the compound against successive attacks. Cheap, given
   the counter-attack phase already exists, and endlessly replayable.
4. **Suppression.** Rounds cracking past should make you and the AI shoot worse,
   not just sound frightening. Ties the audio work into the mechanics.
5. **Better enemy movement.** They slide along obstacles rather than pathfinding,
   so they can hang up on an awkward corner.
6. **Lean.** Peeking round a corner without exposing your whole body.

## Rules that have held

1. **Always shippable.** Every milestone above was tested and published before
   starting the next one. The game has never been left broken.
2. **Test the thing, not the impression.** Several bugs here looked fine on
   screen and were caught by a test: a shell hole 1.73m tall against a 1.78m
   player, furniture sitting in doorways, a platform reached by crates too tall
   to climb.
3. **Data over code.** Weapons, enemy types and difficulties are tables. Tuning
   is editing numbers.
4. **Watch out for the test being wrong.** Roughly half the failures in this
   project were the test aiming at a wall, killing an enemy with 999 health, or
   not allowing for the sim running at 0.4x under software rendering.
