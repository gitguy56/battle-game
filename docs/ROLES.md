# Roles — one war, many jobs

> **Shelved.** This plan is not being built. The project is now a single-player
> tactical shooter — see the root [README](../README.md) and
> [ROADMAP](ROADMAP.md). This document is kept because its reasoning still
> holds and the ideas may come back.

## The idea

The war is simulated once, underneath. You choose which job you do inside it.

This is a genuinely strong design instinct, and it is *also* the thing that makes
the project affordable — because most of the interesting roles in this war do not
involve running around with a rifle at all. The drone operator sits in a dugout
looking at a screen. The mortar crew never sees the enemy. The EW operator fights
entirely through a spectrum display.

Those roles are cheap to build **and** more distinctive than anything else on the
market. The rifleman is the expensive one, and every other shooter already has it.

> **The prototype uses two of these roles.** The 2v2 prototype in PROTOTYPE.md
> pairs the FPV drone operator with the first-person rifleman. That changes the
> economics below in one important way: **player-versus-player deletes the enemy
> AI requirement**, which is most of what made the rifleman expensive. The full
> seven-role plan here is still the long-term shape.

## Cost reality

Roles differ in build cost by roughly 50x. Knowing which is which decides your
whole build order.

| Role | Needs a character? | Needs animation? | Needs enemy AI? | Cost |
|---|---|---|---|---|
| FPV strike drone | No | No | No | **Very low** |
| Recon drone / spotter | No | No | No | **Very low** |
| Mortar / gun crew | Barely (hands) | Minimal | No | **Low** |
| EW operator | No | No | No | **Low** |
| Sapper / demolitions | Yes | Some | Yes (patrols) | Medium |
| Vehicle crew | Partly | Some | Yes | Medium-high |
| Infantry rifleman | Yes | **Everything** | **Yes, good** | **Very high** |

**In player-versus-player, the "enemy AI" column becomes No for every role** — and
that column is most of the rifleman's cost. This is why the 2v2 prototype can
afford an infantry role that the single-player plan had to postpone for a year.

## First person on foot — decided

**Decision: first person on foot, third person in vehicles.** This is settled, and
it is the single largest cost saving in the project. The reasoning is kept below
because it explains a lot about how the rest of the game should be built.

**1. Third person costs roughly ten times as much.** A third-person character must
look correct from the outside in every possible pose. That means idle, walk, run,
sprint, crouch, crouch-walk, prone, prone-crawl, every transition between them,
eight-direction aim offsets so the body points where the gun points, per-weapon
reloads, vaulting, climbing, and deaths. It is well over a hundred animations,
plus inverse kinematics so feet touch the ground on slopes. Get any of it slightly
wrong and it reads as broken.

First person needs a pair of arms and a weapon: idle, fire, reload, draw, holster,
aim in, aim out, sprint. Roughly eight animations per weapon.

**2. First person is more realistic.** A third-person camera lets you see around
corners your character cannot see around, and over walls they cannot see over. It
is an arcade affordance. *Arma*, *Squad*, *Insurgency*, *Escape from Tarkov* and
*Ready or Not* all default to first person specifically because it is honest about
what you can and cannot know — which is the same principle driving the fog of war
in the simulation layer.

**Vehicles stay third person**, which is what *Squad* does. Vehicles need an
external camera anyway for driving, and a vehicle is a rigid body with no animation
problem at all — a hull, a turret and some wheels. So the third-person feel lives
exactly where it is cheap and genuinely useful, and nowhere else.

**What this buys you:** roughly a hundred animations you no longer have to make,
rig, blend or fix, plus the entire inverse-kinematics problem of feet meeting
sloped ground. In practice this is the difference between the infantry role taking
six months and taking eighteen.

---

## The roles in detail

### 1. FPV strike drone operator — *build this first*

**What you see:** a grainy analogue video feed from the drone's nose, in a goggles
vignette. Interference bars. A battery percentage. Nothing else — no crosshair, no
map, no health bar.

**What you do:** launch from a tree line, fly a route out to the target area, find
the vehicle, identify it, and dive on it.

**What makes it tense:** the battery is draining. The video link degrades the
further you go. Flying near an enemy jammer fills the screen with static and you
may lose the drone entirely. You have to hit a weak point, not just the vehicle.
It is a one-way trip. And somebody down there is shooting at you.

**Why it is first:** no character model, no animation, no inventory, no enemy AI.
It is a camera with flight physics and a good shader. This is the only role where
a beginner can plausibly reach *commercial quality*, and it is the single most
recognisable image of this war.

**Bonus:** the degraded-video aesthetic is authentic **and** it hides your art
budget. Low resolution, compression artefacts and interference make simple models
look correct. See REALISM.md.

### 2. Recon drone operator / artillery spotter

**What you see:** a stabilised camera from a small quadcopter, looking down and
out. A grid overlay. A battery timer.

**What you do:** loiter over the enemy's rear, find something worth killing, mark
it, call it in, and then watch the fall of shot and correct — "drop one hundred,
left fifty" — while the target realises what is happening and starts to scatter.

**What makes it tense:** transmitting reveals roughly where *you* are. Your battery
is finite. The guns have a limited number of shells and a delay measured in
minutes, so every correction costs time the target uses to escape.

**Cost:** reuses everything from role 1. Adds a marking interface and a hook into
the artillery simulation.

### 3. Mortar / gun crew

**What you see:** the tube, the ammunition, the sight, a firing table, and a radio.

**What you do:** receive a grid reference over the radio. Work out charge,
elevation and deflection. Fire. Wait through the flight time. Take the spotter's
correction. Adjust. Fire for effect. Then **displace immediately**, because
counterbattery fire is already on its way.

**What makes it tense:** the maths is real, the clock is real, and if you get
greedy and fire one more mission before moving, you die.

**Cost:** low. A static scene and a lot of interface. Extremely authentic for
almost no 3D work.

### 4. Electronic warfare operator

**What you see:** a spectrum display. Signals appear as they start transmitting.

**What you do:** identify what is in the air over your sector, decide what to jam
and when, and hunt enemy emitters by direction-finding them.

**What makes it tense:** **jamming reveals you.** The moment you transmit you are a
beacon, and a loitering munition is twenty minutes away. You are constantly
choosing between protecting the infantry from FPVs and staying alive yourself.

**Cost:** almost pure interface. Cheap, and no other game does this.

### 5. Sapper / demolitions — the "bomb planter"

**What you see:** night, through a night-vision tube with a narrow field of view
and real grain. Or nothing, if you have no NVGs.

**What you do:** cross open ground to a bridge, a road junction or a parked
vehicle. Avoid thermal cameras and foot patrols. Place a charge. Set a timer or
run a command wire. Then get back to a safe distance — which is the hard part,
because now you are tired, it is getting light, and they may already know.

**What makes it tense:** being seen is usually just death, with no fight. You move
slowly because you are carrying weight. The withdrawal is more frightening than
the approach.

**Cost:** medium. Needs a character controller, an interaction system, enemy
patrols with perception, and convincing night rendering. First person makes this
considerably cheaper.

### 6. Infantry rifleman — *build this last*

**What you see:** a tree line. Mud. Your own position, which you dug.

**What you do:** hold ground. Watch the sky. Fight off an assault when it comes.

**What makes it tense:** most of the time nothing happens, and then everything
happens at once, and it is over in ninety seconds and you are not sure what hit
you.

**Cost:** the highest, by a wide margin. Character controller, gunplay, ballistics,
a damage model, full animation, and enemy AI that has to be *good* — bad combat AI
destroys the realism instantly, and combat AI is genuinely one of the hardest
things in the field.

**First person, as decided above.** You see arms and a weapon, roughly eight
animations per weapon, and you cannot see around corners your character cannot.

**Do not start here.** Everything you build in roles 1-5 makes this one better when
you finally get to it, because the artillery that lands on you will be fired by a
real simulated battery, and the drone overhead will be flying a real route.

### 7. Vehicle crew — *optional*

Driver, gunner and commander as separate seats. Third-person camera is correct and
cheap here, because a vehicle is a rigid body — a hull, a turret and some wheels,
with no animation problem at all.

---

## Build order

```
FPV drone  ->  recon drone + mortar crew  ->  EW operator  ->  sapper  ->  infantry  ->  vehicles
   ^                    ^                                                      ^
 cheapest          the recon-strike loop,                              the expensive one,
 and most          playable from three angles                          and it needs all
 distinctive                                                           the others first
```

The first three roles together already give you a complete, genuinely novel game:
one person finds the target, one person kills it with a drone, one person shells
it — and the enemy is doing exactly the same thing back.

## How roles connect to the simulation

Each role is a different **window onto the same running war**, not a separate game
mode. The simulation described in DESIGN.md keeps running underneath regardless of
which window you are looking through.

That means your actions matter beyond the mission. Kill a supply truck with an FPV
drone, and the battalion it was feeding drops to a reduced rate of fire tomorrow.
Destroy an EW station as a sapper, and the drone pilots on your side suddenly find
they can fly ten kilometres deeper. Miss the counterbattery window as a mortar
crew, and the guns your side needed next week are gone.

This is the payoff of the original operational design. Nothing in it is wasted —
it becomes the world your roles live inside.
