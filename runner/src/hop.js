import * as THREE from 'three';
import { TUNE } from './movement.js';

// You do not press a button to move. You shoot someone, and killing them throws
// you through where they were standing. Miss and you keep falling, so the gun
// is the movement and aiming is the skill.
export const CHAIN = {
  launchRange: 52,       // kill further away than this and you get no throw
  baseBoost: 8.0,
  perChain: 2.0,
  maxChainBonus: 16,
  keepSpeed: 0.94,
  minExit: 16,
  window: 2.8,
  lift: 3.0,             // always a little upward, so a kill never spikes you
  flyerLift: 14.0,       // flyers throw you up instead of along
  freeze: 0.08,
  freezeScale: 0.25,
};

export class ChainSystem {
  constructor(field, world) {
    this.field = field;
    this.world = world;
    this.chain = 0;
    this.timer = 0;
    this.freeze = 0;
    this.kills = 0;
    this.best = 0;
    this.inRange = new Set();
  }

  reset() {
    this.chain = 0; this.timer = 0; this.freeze = 0;
    this.kills = 0; this.best = 0;
    this.inRange.clear();
  }

  get boost() {
    return CHAIN.baseBoost + Math.min(CHAIN.maxChainBonus, this.chain * CHAIN.perChain);
  }

  // Mark who is close enough that killing them would throw you. Anyone further
  // is dimmed, so you can read at a glance which kills actually move you.
  update(dt, camera, runner) {
    this.freeze = Math.max(0, this.freeze - dt);
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.chain = 0;
    }
    for (const e of this.field.list) {
      if (!e.alive) continue;
      const near = e.pos.distanceTo(runner.pos) <= CHAIN.launchRange;
      const was = this.inRange.has(e);
      if (near !== was) {
        if (near) this.inRange.add(e); else this.inRange.delete(e);
        e.pip.material.color.set(near ? e.kind.pip : 0x6d7a80);
        e.ring.visible = near;
      }
    }
  }

  // Called when a shot kills someone. Returns what happened, or null if they
  // were too far away to throw you.
  onKill(enemy, camera, runner) {
    this.kills++;
    const dist = enemy.pos.distanceTo(runner.pos);
    if (dist > CHAIN.launchRange) return { launched: false, dist };

    const chained = this.timer > 0;
    this.chain = chained ? this.chain + 1 : 1;
    this.timer = CHAIN.window;
    this.best = Math.max(this.best, this.chain);

    let boost = this.boost;
    if (enemy.kindName === 'heavy') boost *= 1.6;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const speed = Math.max(CHAIN.minExit, runner.speed * CHAIN.keepSpeed + boost);

    runner.pos.set(enemy.pos.x, enemy.pos.y + 0.3, enemy.pos.z);
    runner.vel.set(dir.x * speed, dir.y * speed, dir.z * speed);
    runner.vel.y = Math.max(runner.vel.y,
      enemy.kind.lift ? CHAIN.flyerLift : CHAIN.lift);
    const cap = TUNE.maxSpeed * 1.2;
    if (runner.vel.length() > cap) runner.vel.setLength(cap);
    runner.onGround = false;
    runner.coyote = 0;

    this.freeze = CHAIN.freeze;
    return { launched: true, chain: this.chain, speed, kind: enemy.kindName,
             pos: enemy.centre };
  }

  breakChain() { this.chain = 0; this.timer = 0; }
}
