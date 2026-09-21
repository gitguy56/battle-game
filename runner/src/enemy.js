import * as THREE from 'three';
import { buildModel } from '../../prototype/src/weapons.js';

// A person standing on a roof, not a floating crystal. You have to shoot them,
// and killing them is what launches you - so the gun IS the movement.
//
// A distance-compensated pip floats above each one so the route is still
// readable from the far end of the course.
const PIP_MIN = 0.3, PIP_MAX = 9, PIP_K = 0.014;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const ENEMY_KINDS = {
  grunt:   { hp: 1, uniform: 0x5c6b43, gear: 0x3b4230, pip: 0xffd15c, weapon: 'rifle',
             boost: 1.0, fires: true,  label: 'grunt' },
  heavy:   { hp: 3, uniform: 0x4a5a63, gear: 0x2d383e, pip: 0x8ee2ff, weapon: 'shotgun',
             boost: 1.7, fires: true,  label: 'heavy' },
  flyer:   { hp: 1, uniform: 0x6b4a63, gear: 0x3d2a39, pip: 0xff85a0, weapon: 'smg',
             boost: 1.0, fires: false, label: 'flyer', lift: true },
};

export class Enemy {
  constructor(scene, pos, kind = 'grunt') {
    this.kindName = kind;
    this.kind = ENEMY_KINDS[kind] || ENEMY_KINDS.grunt;
    this.pos = pos.clone();
    this.hp = this.kind.hp;
    this.alive = true;
    this.t = Math.random() * 6;
    this.yaw = Math.PI;
    this.deathT = 0;
    this.justDied = false;
    this.fireTimer = 1.2 + Math.random() * 2;

    const uniform = new THREE.MeshLambertMaterial({ color: this.kind.uniform });
    const gear = new THREE.MeshLambertMaterial({ color: this.kind.gear });
    const skin = new THREE.MeshLambertMaterial({ color: 0xb08a68 });

    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.hitMeshes = [];
    const mesh = (geo, mat, x, y, z, tag, parent) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.userData.enemy = this; m.userData.part = tag;
      (parent || this.group).add(m);
      if (tag) this.hitMeshes.push(m);
      return m;
    };

    this.body = new THREE.Group();
    this.group.add(this.body);
    mesh(new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), uniform, 0, 1.18, 0, 'body', this.body);
    mesh(new THREE.BoxGeometry(0.44, 0.34, 0.28), gear, 0, 1.24, 0.01, 'body', this.body);
    mesh(new THREE.SphereGeometry(0.115, 12, 10), skin, 0, 1.60, 0, 'head', this.body);
    mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.9),
         gear, 0, 1.60, 0, 'head', this.body);
    for (const s of [-1, 1]) {
      mesh(new THREE.CapsuleGeometry(0.068, 0.34, 4, 8), uniform, s * 0.27, 1.22, 0, 'body', this.body);
      mesh(new THREE.CapsuleGeometry(0.088, 0.44, 4, 8), uniform, s * 0.115, 0.69, 0, 'body', this.body);
      mesh(new THREE.BoxGeometry(0.13, 0.09, 0.26), gear, s * 0.115, 0.45, 0.04, 'body', this.body);
    }
    const gun = buildModel(this.kind.weapon);
    gun.scale.setScalar(0.85);
    gun.position.set(0.24, 1.22, -0.3);
    this.body.add(gun);
    this.gun = gun;

    // the marker that keeps the route legible at range
    this.pip = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 16),
      new THREE.MeshBasicMaterial({ color: this.kind.pip, transparent: true,
        opacity: 0.95, depthWrite: false, depthTest: false }));
    this.pip.position.y = 2.25;
    this.group.add(this.pip);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 18),
      new THREE.MeshBasicMaterial({ color: this.kind.pip, transparent: true, opacity: 0.5,
        side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
    this.ring.position.y = 2.25;
    this.group.add(this.ring);

    scene.add(this.group);
  }

  get eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z); }
  get centre() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.15, this.pos.z); }

  update(dt, camera, runner) {
    this.t += dt;
    if (!this.alive) {
      if (this.deathT < 1) {
        this.deathT = Math.min(1, this.deathT + dt * 3);
        const e = 1 - Math.pow(1 - this.deathT, 3);
        this.body.rotation.x = -Math.PI / 2.05 * e;
        this.body.position.y = -0.1 * e;
        if (this.deathT >= 1) this.group.visible = false;
      }
      return;
    }
    // face the runner, and bob slightly so they read as alive
    const dx = runner.pos.x - this.pos.x, dz = runner.pos.z - this.pos.z;
    this.yaw = Math.atan2(-dx, -dz);
    this.group.rotation.y = this.yaw;
    this.body.position.y = Math.sin(this.t * 2.2) * 0.03;

    if (camera) {
      this.pip.quaternion.copy(camera.quaternion);
      this.ring.quaternion.copy(camera.quaternion);
      const dist = camera.position.distanceTo(this.group.position);
      const s = clamp(dist * PIP_K, PIP_MIN, PIP_MAX);
      const pulse = 0.88 + Math.sin(this.t * 3.4) * 0.12;
      this.pip.scale.setScalar(s * pulse);
      this.ring.scale.setScalar(Math.max(1, s * 1.5));
      this.pip.material.opacity = dist < 7 ? Math.max(0, (dist - 2.5) / 4.5) * 0.95 : 0.95;
      this.ring.material.opacity = this.pip.material.opacity * 0.55;
    }
  }

  // Called by the shared Weapon class on a hit.
  takeHit(damage, audio, dir) {
    if (!this.alive) return;
    this.hp -= damage;
    audio?.flesh();
    if (this.hp <= 0) {
      this.alive = false;
      this.justDied = true;
      this.deathT = 0;
      this.pip.visible = false;
      this.ring.visible = false;
      for (const m of this.hitMeshes) m.userData.enemy = null;
    }
  }

  revive() {
    this.alive = true;
    this.hp = this.kind.hp;
    this.deathT = 0;
    this.justDied = false;
    this.group.visible = true;
    this.body.rotation.x = 0;
    this.body.position.y = 0;
    this.pip.visible = true;
    this.ring.visible = true;
    for (const m of this.hitMeshes) m.userData.enemy = this;
  }

  dispose(scene) { scene.remove(this.group); }
}

export class EnemyField {
  constructor(scene) { this.scene = scene; this.list = []; }
  add(pos, kind) { const e = new Enemy(this.scene, pos, kind); this.list.push(e); return e; }
  update(dt, camera, runner) { for (const e of this.list) e.update(dt, camera, runner); }
  reviveAll() { for (const e of this.list) e.revive(); }
  get remaining() { return this.list.reduce((n, e) => n + (e.alive ? 1 : 0), 0); }
}
