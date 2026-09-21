import * as THREE from 'three';
import { TUNE } from './movement.js';

// The movement verb: fall onto someone and smash down. The impact kills them
// outright and throws you back up, and the further you fell the higher you go -
// so height is the resource and the route is a line of heads to bounce off.
export const SLAM = {
  enterSpeed: 14,        // the dive's kick. Kept low so that how far you FELL,
                         // not the dive itself, is what decides the bounce.
  gravityMul: 2.6,       // and how hard it pulls once you are diving
  hitRadius: 1.9,        // horizontal reach of the smash
  hitAbove: 3.2,         // how far above them you can be and still connect
  // Restitution has to be well under 1 or the bounce runs away: at 0.92 it
  // climbed to the cap and threw a 119m arc at enemies 25m apart.
  restitution: 0.55,
  baseBounce: 10.8,
  maxBounce: 34,        // headroom, so a long drop really does throw you further
  hDamp: 0.68,           // horizontal is damped on impact, then pushed forward,
  forward: 4.5,          // so speed settles instead of growing every bounce
  perChain: 1.6,
  maxChainBonus: 12,
  window: 3.2,           // lose the chain and the run restarts
  groundShock: 6.5,      // a ground slam kills anything this close
  freeze: 0.075,
  freezeScale: 0.28,
};

export class SlamSystem {
  constructor(field, world) {
    this.field = field;
    this.world = world;
    this.chain = 0;
    this.timer = 0;
    this.armed = false;     // the chain clock only starts after your first kill
    this.freeze = 0;
    this.kills = 0;
    this.best = 0;
    this.peakHeight = 0;
    this.slamming = false;
    this.slamFrom = 0;
  }

  reset() {
    this.chain = 0; this.timer = 0; this.armed = false;
    this.freeze = 0; this.kills = 0; this.best = 0;
    this.slamming = false; this.peakHeight = 0;
  }

  get bonus() { return Math.min(SLAM.maxChainBonus, this.chain * SLAM.perChain); }

  // Begin a dive. Only in the air - on the ground there is nothing to fall onto.
  begin(runner) {
    if (this.slamming || runner.onGround) return false;
    this.slamming = true;
    this.slamFrom = runner.pos.y;
    runner.vel.y = Math.min(runner.vel.y, -SLAM.enterSpeed);
    runner.slamming = true;
    return true;
  }

  cancel(runner) {
    this.slamming = false;
    runner.slamming = false;
  }

  // Returns 'enemy' | 'ground' | null describing what the dive hit this frame.
  update(dt, runner, camera) {
    this.freeze = Math.max(0, this.freeze - dt);
    if (this.armed && this.timer > 0) this.timer -= dt;

    if (!this.slamming) return null;

    if (runner.onGround) {
      this.cancel(runner);
      return { type: 'ground', pos: runner.pos.clone(),
               speed: Math.abs(runner.vel.y) };
    }

    // Anything under us, within reach?
    let hit = null, bestDy = Infinity;
    for (const e of this.field.list) {
      if (!e.alive) continue;
      const dx = e.pos.x - runner.pos.x, dz = e.pos.z - runner.pos.z;
      if (dx * dx + dz * dz > SLAM.hitRadius * SLAM.hitRadius) continue;
      const dy = runner.pos.y - e.pos.y;         // we should be above them
      if (dy < -0.6 || dy > SLAM.hitAbove) continue;
      if (dy < bestDy) { bestDy = dy; hit = e; }
    }
    if (!hit) return null;

    const impact = Math.abs(runner.vel.y);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    this.kills++;
    this.chain = this.armed && this.timer > 0 ? this.chain + 1 : 1;
    this.armed = true;
    this.timer = SLAM.window;
    this.best = Math.max(this.best, this.chain);

    const bounce = Math.min(SLAM.maxBounce,
      SLAM.baseBounce + impact * SLAM.restitution + this.bonus);
    runner.pos.set(hit.pos.x, hit.pos.y + 1.6, hit.pos.z);
    runner.vel.y = bounce;
    // carry your horizontal speed and add a push where you are looking
    const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    runner.vel.x = runner.vel.x * SLAM.hDamp + flat.x * (SLAM.forward + this.bonus * 0.1);
    runner.vel.z = runner.vel.z * SLAM.hDamp + flat.z * (SLAM.forward + this.bonus * 0.1);
    const sp = Math.hypot(runner.vel.x, runner.vel.z);
    if (sp > TUNE.maxSpeed) {
      const k = TUNE.maxSpeed / sp;
      runner.vel.x *= k; runner.vel.z *= k;
    }
    runner.onGround = false;
    runner.coyote = 0;

    hit.takeHit(999, null, null);
    this.cancel(runner);
    this.freeze = SLAM.freeze;
    return { type: 'enemy', enemy: hit, chain: this.chain, impact, bounce,
             pos: hit.centre };
  }

  // A slam that lands on a roof instead: kills anything close, but no bounce.
  groundShock(runner) {
    const killed = [];
    for (const e of this.field.list) {
      if (!e.alive) continue;
      if (e.pos.distanceTo(runner.pos) > SLAM.groundShock) continue;
      e.takeHit(999, null, null);
      killed.push(e);
    }
    if (killed.length) {
      this.kills += killed.length;
      this.chain = this.armed && this.timer > 0 ? this.chain + 1 : 1;
      this.armed = true;
      this.timer = SLAM.window;
      this.best = Math.max(this.best, this.chain);
    }
    return killed;
  }

  // True once the chain clock has run out - the run is over.
  get broken() { return this.armed && this.timer <= 0; }
}
