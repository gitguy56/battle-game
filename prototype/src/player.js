import * as THREE from 'three';
import { MAX_HP } from './weapon.js';

const RADIUS = 0.30;
const H_STAND = 1.78;
const H_CROUCH = 1.15;
const STEP_UP = 0.55;     // auto-step: kerbs, rubble, the lip of the shell hole
const VAULT_MAX = 1.45;   // climbing: window sills, low walls, crate stacks
const VAULT_H = 1.0;      // you duck while going through

export class Player {
  constructor(map) {
    this.map = map;
    this.pos = map.playerSpawn.clone();
    this.vel = new THREE.Vector3();
    this.yaw = 0;                // facing the house (yaw 0 looks down -z)
    this.pitch = 0;
    this.height = H_STAND;
    this.crouching = false;
    this.stamina = 1;
    this.onGround = true;
    this.alive = true;
    this.maxHp = MAX_HP;
    this.hp = MAX_HP;            // two headshots, or four body shots
    this.vaulting = 0;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.speed = 0;
    this.lastStep = 0;
    this.stepped = false;
  }

  reset(maxHp = MAX_HP) {
    this.pos.copy(this.map.playerSpawn);
    this.vel.set(0, 0, 0);
    this.yaw = 0; this.pitch = 0;
    this.height = H_STAND;
    this.crouching = false;
    this.stamina = 1;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.alive = true;
    this.onGround = true;
    this.vaulting = 0;
    this.bobPhase = 0; this.bobAmount = 0; this.speed = 0;
  }

  get eye() {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.height - 0.16, this.pos.z);
  }

  aabb(pos = this.pos, h = this.height) {
    return new THREE.Box3(
      new THREE.Vector3(pos.x - RADIUS, pos.y, pos.z - RADIUS),
      new THREE.Vector3(pos.x + RADIUS, pos.y + h, pos.z + RADIUS));
  }

  blocked(pos, h = this.height) {
    const b = this.aabb(pos, h);
    for (const c of this.map.colliders) if (c.intersectsBox(b)) return true;
    return false;
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -1.45, 1.45);
  }

  update(dt, input) {
    if (!this.alive) return;
    this.vaulting = Math.max(0, this.vaulting - dt);

    // stance
    const wantCrouch = input.crouch;
    const targetH = wantCrouch ? H_CROUCH : H_STAND;
    if (targetH > this.height && this.blocked(this.pos, targetH)) {
      // something overhead, stay down
    } else {
      this.height += (targetH - this.height) * Math.min(1, dt * 12);
    }
    this.crouching = this.height < (H_STAND + H_CROUCH) / 2;

    if (input.jump) this.tryVault();

    // intent
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (input.fwd) wish.add(fwd);
    if (input.back) wish.sub(fwd);
    if (input.right) wish.add(right);
    if (input.left) wish.sub(right);
    const moving = wish.lengthSq() > 0;
    if (moving) wish.normalize();

    // Deliberately slow. Sprinting costs stamina and cannot be held.
    const canSprint = input.sprint && !this.crouching && this.stamina > 0.05 && input.fwd;
    let spd = this.crouching ? 1.6 : (canSprint ? 5.2 : 3.1);
    if (input.ads) spd *= 0.55;

    if (canSprint && moving) this.stamina = Math.max(0, this.stamina - dt * 0.28);
    else this.stamina = Math.min(1, this.stamina + dt * 0.16);
    if (this.stamina < 0.2) spd *= 0.75 + this.stamina;

    const target = wish.multiplyScalar(spd);
    const accel = this.onGround ? 18 : 2.5;
    this.vel.x += (target.x - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, dt * accel);

    // gravity
    this.vel.y -= 22 * dt;

    this.moveAxis('x', this.vel.x * dt);
    this.moveAxis('z', this.vel.z * dt);
    this.moveVertical(this.vel.y * dt);

    if (this.pos.y < 0) { this.pos.y = 0; this.vel.y = 0; this.onGround = true; }

    // head bob, and the step sound trigger
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    const bobTarget = this.onGround ? Math.min(1, this.speed / 4.6) : 0;
    this.bobAmount += (bobTarget - this.bobAmount) * Math.min(1, dt * 8);
    const prev = this.bobPhase;
    this.bobPhase += dt * (4.2 + this.speed * 1.5);
    this.stepped = Math.floor(prev / Math.PI) !== Math.floor(this.bobPhase / Math.PI) && this.speed > 0.6;
  }

  // Climb through a window, the shell hole, or over a wall. The whole path has
  // to be clear at the raised height, so you cannot vault through solid wall -
  // only through an actual opening.
  tryVault() {
    if (!this.onGround || this.vaulting > 0) return false;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    // Only climb when something is actually in the way. Without this, holding
    // the key in the open hops you forward across open ground.
    const ahead = this.pos.clone().addScaledVector(fwd, 0.45);
    if (!this.blocked(ahead)) return false;
    for (let h = 0.45; h <= VAULT_MAX; h += 0.12) {
      for (const reach of [1.0, 1.45]) {
        let clear = true;
        for (const t of [0.35, 0.6, 0.8, 1.0]) {
          const probe = this.pos.clone().addScaledVector(fwd, reach * t);
          probe.y += h;
          if (this.blocked(probe, VAULT_H)) { clear = false; break; }
        }
        if (!clear) continue;
        const dest = this.pos.clone().addScaledVector(fwd, reach);
        dest.y += h;
        this.pos.copy(dest);
        this.vel.set(0, 0, 0);
        this.vaulting = 0.35;
        return true;
      }
    }
    return false;
  }

  moveAxis(axis, d) {
    if (d === 0) return;
    const next = this.pos.clone();
    next[axis] += d;
    if (!this.blocked(next)) { this.pos.copy(next); return; }
    // try stepping up over a kerb, porch or sandbag
    const up = next.clone(); up.y += STEP_UP;
    if (!this.blocked(up)) { this.pos.copy(up); return; }
    this.vel[axis] = 0;
  }

  moveVertical(d) {
    if (d === 0) return;
    const next = this.pos.clone();
    next.y += d;
    if (!this.blocked(next)) {
      this.pos.copy(next);
      this.onGround = false;
      return;
    }
    // settle onto whatever we hit
    if (d < 0) {
      for (let s = 0; s < 12; s++) {
        const t = this.pos.clone(); t.y += d * (1 - s / 12);
        if (!this.blocked(t)) { this.pos.copy(t); break; }
      }
      this.onGround = true;
    }
    this.vel.y = 0;
  }

  takeHit(damage = 1) {
    if (!this.alive) return false;
    this.hp -= damage;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; return true; }
    return false;
  }
}
