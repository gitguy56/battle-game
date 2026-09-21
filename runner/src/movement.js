import * as THREE from 'three';

// Floaty and momentum-driven. Speed builds across a whole level and hurts to
// lose, so the ground is slow on purpose and the air is where the game is.
const RADIUS = 0.34;
const HEIGHT = 1.75;
const STEP_UP = 1.0;   // parapets are 0.7m, so this clears roof furniture

export const TUNE = {
  gravity: 15.5,          // gentler than real, so arcs are long
  groundAccel: 70,
  groundFriction: 5.2,    // the ground steals speed - that is the point
  airAccel: 30,
  airSteer: 0.72,         // how freely you can redirect mid-air, 0..1
  walkSpeed: 11.5,
  maxSpeed: 52,
  jump: 7.4,
  coyote: 0.14,           // grace after walking off an edge
  jumpBuffer: 0.14,       // grace for pressing jump just before landing
  slideBoost: 3.0,
  killFloor: -14,
};

export class Runner {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffered = 0;
    this.airTime = 0;
    this.bob = 0;
    this.lastGroundPos = new THREE.Vector3();
    // the shared Weapon class reads these
    this.alive = true;
    this.slamming = false;
    this.crouching = false;
    this.bobAmount = 0;
    this.bobPhase = 0;
  }

  reset(pos, yaw = 0) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw; this.pitch = 0;
    this.onGround = false;
    this.slamming = false;
    this.coyote = 0; this.jumpBuffered = 0; this.airTime = 0;
    this.lastGroundPos.copy(pos);
  }

  get eye() {
    return new THREE.Vector3(this.pos.x, this.pos.y + HEIGHT - 0.18, this.pos.z);
  }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -1.45, 1.45);
  }

  aabb(pos = this.pos) {
    return new THREE.Box3(
      new THREE.Vector3(pos.x - RADIUS, pos.y, pos.z - RADIUS),
      new THREE.Vector3(pos.x + RADIUS, pos.y + HEIGHT, pos.z + RADIUS));
  }

  blocked(pos) {
    const b = this.aabb(pos);
    for (const c of this.world.colliders) if (c.intersectsBox(b)) return true;
    return false;
  }

  update(dt, input) {
    const T = TUNE;

    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (input.fwd) wish.add(fwd);
    if (input.back) wish.sub(fwd);
    if (input.right) wish.add(right);
    if (input.left) wish.sub(right);
    const wanting = wish.lengthSq() > 0;
    if (wanting) wish.normalize();

    this.coyote = this.onGround ? T.coyote : Math.max(0, this.coyote - dt);
    this.jumpBuffered = input.jump ? T.jumpBuffer : Math.max(0, this.jumpBuffered - dt);

    if (this.onGround) {
      // Friction, then accelerate toward the wish direction.
      const sp = this.speed;
      if (sp > 0.01) {
        const drop = sp * T.groundFriction * dt;
        const k = Math.max(0, sp - drop) / sp;
        this.vel.x *= k; this.vel.z *= k;
      }
      if (wanting) {
        this.vel.x += wish.x * T.groundAccel * dt;
        this.vel.z += wish.z * T.groundAccel * dt;
        const s = this.speed;
        if (s > T.walkSpeed && s > 0) {
          // walking alone cannot exceed walk speed, but momentum from the air is kept
          const target = Math.max(T.walkSpeed, s - T.groundAccel * dt);
          const k = target / s;
          this.vel.x *= k; this.vel.z *= k;
        }
      }
      this.airTime = 0;
    } else {
      this.airTime += dt;
      if (wanting && !this.slamming) {
        // Redirect rather than add: the speed you have is preserved and steered,
        // which is what makes long arcs feel controllable without hidden tech.
        const sp = this.speed;
        const dir = new THREE.Vector3(this.vel.x, 0, this.vel.z);
        if (sp > 0.5) {
          dir.normalize();
          dir.lerp(wish, Math.min(1, T.airSteer * dt * 3.2));
          dir.normalize();
          this.vel.x = dir.x * sp; this.vel.z = dir.z * sp;
        }
        // a little genuine acceleration so you are never stuck
        this.vel.x += wish.x * T.airAccel * 0.25 * dt;
        this.vel.z += wish.z * T.airAccel * 0.25 * dt;
      }
    }

    if (this.jumpBuffered > 0 && this.coyote > 0) {
      this.vel.y = TUNE.jump;
      this.onGround = false;
      this.coyote = 0; this.jumpBuffered = 0;
      this.jumped = true;
    }

    this.vel.y -= T.gravity * (this.slamming ? 2.6 : 1) * dt;

    const sp = this.speed;
    if (sp > T.maxSpeed) {
      const k = T.maxSpeed / sp;
      this.vel.x *= k; this.vel.z *= k;
    }

    this.move(dt);

    if (this.onGround) this.lastGroundPos.copy(this.pos);
    this.bob += dt * (this.onGround ? 4 + this.speed * 0.6 : 1.5);
    this.bobPhase = this.bob;
    this.bobAmount += ((this.onGround ? Math.min(1, this.speed / 9) : 0.12) - this.bobAmount)
      * Math.min(1, dt * 7);
  }

  // Substepped so that at 50 m/s we cannot pass straight through a wall.
  move(dt) {
    const wasGrounded = this.onGround;
    const total = this.vel.clone().multiplyScalar(dt);
    const dist = total.length();
    const steps = Math.max(1, Math.ceil(dist / 0.22));
    const step = total.divideScalar(steps);
    let grounded = false;

    for (let i = 0; i < steps; i++) {
      for (const axis of ['x', 'z', 'y']) {
        const d = step[axis];
        if (d === 0) continue;
        const next = this.pos.clone();
        next[axis] += d;
        if (!this.blocked(next)) { this.pos.copy(next); continue; }
        if (axis === 'y') {
          if (d < 0) {
            grounded = true;
            // Settle onto the surface instead of stopping wherever the substep
            // happened to end. Without this the rest height varies slightly
            // every frame and the view jitters while you walk.
            let lo = 0, hi = -d;
            for (let k = 0; k < 8; k++) {
              const mid = (lo + hi) / 2;
              const probe = this.pos.clone();
              probe.y -= mid;
              if (this.blocked(probe)) hi = mid; else lo = mid;
            }
            this.pos.y -= lo;
          }
          this.vel.y = 0;
          step.y = 0;
        } else {
          // Step over low things - parapets, ducts, kerbs - rather than
          // stopping dead on them. Without this a 0.7m roof edge is a wall.
          const up = next.clone();
          let stepped = false;
          for (let lift = 0.25; wasGrounded && lift <= STEP_UP; lift += 0.25) {
            up.y = next.y + lift;
            if (!this.blocked(up)) { this.pos.copy(up); stepped = true; break; }
          }
          if (!stepped) { this.vel[axis] = 0; step[axis] = 0; }
        }
      }
    }
    this.onGround = grounded;
  }
}
