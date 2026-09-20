# Looking and feeling realistic on a beginner's budget

## The thesis

The realistic *feeling* of *Arma*, *Squad*, *Insurgency* and *Tarkov* comes from
three things, in this order:

1. **What they take away** — free, and by far the biggest effect
2. **Sound** — cheap, and the second biggest effect
3. **Environment and light** — moderately cheap with free assets

Character models and animation come a distant fourth. This is extremely good news,
because that is the one thing you cannot afford.

*Call of Duty* has vastly better character art than *Squad* and feels like a
cartoon next to it. The difference is almost entirely in the list below.

---

## Part 1 — Things to remove (free, enormous effect)

Do these and the game feels serious before you have made a single asset.

> **What the game actually did.** Four of these were put back, on purpose, after
> playing it: the crosshair, a health display, hit confirmation and an ammunition
> count. Each was reversed for a concrete reason, not a loss of nerve —
> the crosshair because a shot that does not visibly go where you point is
> indistinguishable from a bug; health pips because a game with four discrete
> hit points needs them legible; hit marks because you cannot tell a miss from a
> hit on an enemy who does not react; and the ammunition count because you
> cannot choose between five weapons you cannot read. Everything else on this
> list held, and the list is still the highest-value page in these documents.

1. **No crosshair.** Use the weapon's actual sight. A floating dot in the middle of
   the screen is the single most arcade thing a shooter can have.
2. **No health bar.** You learn you are hurt from your breathing, your screen, your
   inability to sprint and the blood loss timer you now have to deal with.
3. **No hit markers, no kill feed, no damage numbers.** You do not get told whether
   you hit. You watch and you guess. This is genuinely how it works.
4. **No health regeneration.** Wounds need treatment, by you or by someone else.
5. **No minimap.** A real map you have to physically pull out, which covers part of
   your screen, and on which you have to work out where *you* are.
6. **No respawn inside a mission.** If the death has no weight, nothing has weight.
7. **No enemy outlines or nameplates.** Identifying a shape at 400 metres as enemy
   or friendly is the hardest and most interesting problem in infantry combat.
8. **No ammunition counter.** Check the magazine to get a rough answer — "about
   half" — not a number.
9. **No objective markers hovering in the world.** Grid references on the map, and
   you navigate.

Each of these is a *deletion*. They cost nothing and they are worth more than a
year of art.

## Part 2 — Things to add (cheap, high impact)

10. **Weapon sway** tied to breathing, stance and stamina. Hold your breath to
    steady it, for a couple of seconds only.
11. **Reloads take real time** — three to four seconds — and rushing one loses the
    partial magazine on the ground.
12. **Two hits kill. Sometimes one.** Fights end in under two seconds. This changes
    player behaviour more than any other single number.
13. **Stamina and weight that actually bite.** Carrying more armour and ammunition
    means arriving exhausted and unable to shoot straight.
14. **Sound as the primary information channel.** Footsteps on different surfaces,
    engines at distance, the direction of fire, and the whistle of an incoming
    shell arriving *before* the shell does. Players should navigate by ear.
15. **Ear ringing and muffled audio** for twenty seconds after a nearby explosion.
    Astonishingly effective for about thirty lines of code.
16. **Real darkness at night.** Not blue-tinted daylight. Night vision is a piece of
    equipment with a battery and a narrow field of view, and it is unpleasant to
    use — which is the point.
17. **Weather that changes what is possible.** Fog grounds the drones. Mud stops
    vehicles leaving the road. Rain masks sound.
18. **Movement is slow.** Crossing two hundred metres of open ground should take a
    while and feel like a decision, not a sprint.
19. **Let it be quiet.** Most of the time, nothing happens. Games are afraid of
    this; realistic games are made by it. The quiet is what makes the noise work.
20. **Death is abrupt and unexplained.** Most of the time you do not see who did it.
    No dramatic slow motion, no killcam. Screen goes.
21. **Radio as the only coordination** — and it degrades badly under jamming, which
    ties directly into the EW system.

## Part 3 — Where to spend the art budget

Realism in a scene comes from **environment and light**, not from characters. A
muddy tree line at dusk in fog looks photoreal with very simple geometry. A
close-up of a human face does not, ever, at your budget.

**Spend effort on:**
- Terrain and ground materials — this is most of the screen, most of the time
- Vegetation, especially tree lines and unmown grass
- Lighting, and specifically **overcast, dusk, dawn and night** — flat grey skies
  are forgiving, harsh midday sun is not
- Volumetric fog and haze — hides distance, adds depth, costs nothing artistically
- Post-processing: a muted colour grade, film grain, restrained bloom, slight
  chromatic aberration, camera shake
- Weather particles: rain, snow, dust, smoke
- **Sound.** Seriously. Audio is half of perceived realism and it is the cheapest
  half.

**Avoid:**
- Human faces, and any close-up of hands
- Complex character animation on display
- Shiny, clean, new-looking surfaces — everything should be wet, muddy or worn
- Bright saturated colour
- Wide open sunlit vistas, which show every weakness at once

### The drone camera is your best friend

The FPV and reconnaissance roles render through a degraded video feed: low
resolution, compression artefacts, interference, rolling shutter, or monochrome
thermal. This is **authentic** — it is exactly what those operators see — and it
simultaneously conceals almost every limitation of simple models and textures.

It is very rare to get a shortcut that makes something both cheaper *and* more
authentic. Take it, and note that it is one more argument for building the drone
roles first.

## Part 4 — Free and cheap assets

You are not going to model a war. Use asset libraries; every solo developer does.

| Source | What | Licence |
|---|---|---|
| **Poly Haven** | PBR materials and HDRI skies | CC0 — public domain |
| **Ambient CG** | PBR materials, huge library | CC0 |
| **Quaternius** | Low-poly models, some military | CC0 |
| **Kenney** | Game assets, prototyping kits | CC0 |
| **Mixamo** | Free character animations, auto-rigging | Free with account |
| **Sketchfab** | Filter by CC0 / CC-BY | Varies — check each |
| **Freesound / Pixabay** | Sound effects | Varies — check each |
| **Synty Studios** | Cohesive stylised packs, military sets | Paid, inexpensive |

**Poly Haven's HDRIs are the highest-value item on this list.** Realistic lighting
is most of realistic rendering, and an HDRI sky gives you correct ambient light and
reflections for free. An overcast HDRI over simple geometry looks startlingly good.

### One rule about art style

**Cohesive beats photoreal-attempted.** A consistent stylised look reads as
deliberate. A failed attempt at photorealism reads as broken. Mixing a
photoscanned rock with a low-poly truck looks worse than either on its own.

Pick one level of fidelity and hold it everywhere.

## Part 5 — Study these

Play them with a notebook. This is real work, not procrastination.

- **Squad** — the gold standard for infantry realism as *restraint*. Note how much
  of the tension is waiting, walking and radio discipline.
- **Arma 3 / Arma Reforger** — scale, ballistics, and how slow everything is.
- **Insurgency: Sandstorm** — lethality and sound. Fights last two seconds.
- **Escape from Tarkov** — audio design, and the physical weight of inventory.
- **Ready or Not** — first-person tension and lighting in dark interiors.
- **Zero Hour** — what a small team can achieve on a modest budget.
- Any FPV drone simulator — for flight feel and the video-feed aesthetic.

For each one, write down three things it *removed* that you expected to be there.
That list is your design document.
