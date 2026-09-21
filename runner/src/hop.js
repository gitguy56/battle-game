import * as THREE from 'three';
import { TUNE } from './movement.js';

// The whole game in one verb: take a target's place and come out faster than
// you went in. Chain them and the boost grows, so the skill is never breaking
// the chain - a number on screen going up, which is depth you can actually see.
export const HOP = {
  range: 46,
  cone: Math.cos(THREE.MathUtils.degToRad(38)),
  baseBoost: 7.5,
  perChain: 1.9,
  maxChainBonus: 15,
  bigMultiplier: 1.7,        // 'big' targets give more
  anchorLift: 13.5,          // 'anchor' targets throw you upward
  keepSpeed: 0.94,           // how much of your speed survives the hop
  minExit: 15,               // you never come out of a hop slow
  chainWindow: 2.6,
  freeze: 0.085,             // a beat of slow motion so chains stay readable
  freezeScale: 0.22,
};

export class HopSystem {
  constructor(field, world) {
    this.field = field;
    this.world = world;
    this.chain = 0;
    this.chainTimer = 0;
    this.best = null;
    this.freeze = 0;
    this.lastHopAt = null;
    this.hops = 0;
    this.bestChain = 0;
  }

  reset() {
    this.chain = 0; this.chainTimer = 0; this.best = null;
    this.freeze = 0; this.hops = 0; this.bestChain = 0;
  }

  get boost() {
    return HOP.baseBoost + Math.min(HOP.maxChainBonus, this.chain * HOP.perChain);
  }

  // The target you would take if you pressed the key now: in front of you,
  // in range, not behind a wall, and closest to the centre of the screen.
  pick(camera) {
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    camera.getWorldPosition(origin);
    camera.getWorldDirection(dir);

    let best = null, bestScore = -Infinity;
    for (const t of this.field.list) {
      if (!t.alive) continue;
      const to = t.group.position.clone().sub(origin);
      const dist = to.length();
      if (dist > HOP.range || dist < 0.8) continue;
      to.divideScalar(dist);
      const dot = to.dot(dir);
      if (dot < HOP.cone) continue;
      const blocked = new THREE.Raycaster(origin, to, 0.5, dist - 1.0)
        .intersectObjects(this.world.solids, false).length > 0;
      if (blocked) continue;
      // strongly prefer what you are actually looking at, mildly prefer near
      const score = dot * 10 - dist / HOP.range;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  update(dt, camera, runner) {
    this.freeze = Math.max(0, this.freeze - dt);
    if (this.chainTimer > 0) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) this.chain = 0;
    }
    const next = this.pick(camera);
    if (next !== this.best) {
      this.best?.setHighlight(false);
      next?.setHighlight(true);
      this.best = next;
    }
  }

  // Returns a description of what happened, or null if there was nothing to take.
  tryHop(camera, runner) {
    const t = this.best;
    if (!t || !t.alive) return null;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);

    const chained = this.chainTimer > 0;
    this.chain = chained ? this.chain + 1 : 1;
    this.chainTimer = HOP.chainWindow;
    this.bestChain = Math.max(this.bestChain, this.chain);
    this.hops++;

    let boost = this.boost;
    if (t.kind === 'big') boost *= HOP.bigMultiplier;

    const speed = Math.max(HOP.minExit, runner.speed * HOP.keepSpeed + boost);

    runner.pos.set(t.group.position.x, t.group.position.y - 0.6, t.group.position.z);
    runner.vel.set(dir.x * speed, dir.y * speed, dir.z * speed);
    // never launch you straight into the floor, and always give a little lift
    runner.vel.y = Math.max(runner.vel.y, t.kind === 'anchor' ? HOP.anchorLift : 2.4);
    if (runner.vel.lengthSq() > TUNE.maxSpeed * TUNE.maxSpeed * 1.44) {
      runner.vel.setLength(TUNE.maxSpeed * 1.2);
    }
    runner.onGround = false;
    runner.coyote = 0;

    t.take();
    this.best = null;
    this.freeze = HOP.freeze;
    this.lastHopAt = t.group.position.clone();
    return { chain: this.chain, kind: t.kind, speed, pos: this.lastHopAt };
  }
}
