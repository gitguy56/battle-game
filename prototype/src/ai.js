import * as THREE from 'three';

// Deliberately simple: see, close, shoot. Enough to test whether the game feels
// right, nowhere near the combat AI a finished single-player mode would need.
const SEE_RANGE = 45;
const FOV_COS = Math.cos(THREE.MathUtils.degToRad(58));

export class Enemy {
  constructor(scene, post, map, audio) {
    this.scene = scene; this.map = map; this.audio = audio;
    this.pos = post.pos.clone();
    this.patrol = post.patrol.map(p => p.clone());
    this.leg = 0;
    this.yaw = 0;
    this.hp = 2;
    this.alive = true;
    this.state = 'patrol';
    this.awareness = 0;
    this.aimTimer = 0;
    this.burst = 0;
    this.shotCooldown = 0;
    this.lastKnown = null;
    this.repathTimer = 0;

    const uniform = new THREE.MeshLambertMaterial({ color: 0x53563f });
    const skin = new THREE.MeshLambertMaterial({ color: 0x8a6a52 });
    const gear = new THREE.MeshLambertMaterial({ color: 0x3a3a2e });

    this.group = new THREE.Group();
    this.hitMeshes = [];
    const part = (w, h, d, mat, x, y, z, tag) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.userData.enemy = this;
      m.userData.part = tag;
      this.group.add(m);
      this.hitMeshes.push(m);
      return m;
    };
    part(0.52, 0.66, 0.3, uniform, 0, 1.18, 0, 'body');   // torso
    part(0.44, 0.3, 0.26, gear, 0, 1.3, 0.02, 'body');    // plate carrier
    part(0.23, 0.26, 0.23, skin, 0, 1.63, 0, 'head');     // head
    part(0.26, 0.12, 0.27, gear, 0, 1.72, 0, 'head');     // helmet
    part(0.16, 0.6, 0.16, uniform, -0.34, 1.15, 0, 'body'); // arms
    part(0.16, 0.6, 0.16, uniform, 0.34, 1.15, 0, 'body');
    part(0.2, 0.85, 0.2, uniform, -0.14, 0.43, 0, 'body'); // legs
    part(0.2, 0.85, 0.2, uniform, 0.14, 0.43, 0, 'body');
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x24221e }));
    rifle.position.set(0.24, 1.2, -0.35);
    this.group.add(rifle);

    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  get eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z); }

  canSee(player) {
    if (!player.alive) return false;
    const to = player.eye.clone().sub(this.eye);
    const dist = to.length();
    if (dist > SEE_RANGE) return false;
    to.normalize();
    const facing = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    if (facing.dot(new THREE.Vector3(to.x, 0, to.z).normalize()) < FOV_COS) return false;
    const ray = new THREE.Raycaster(this.eye, to, 0.2, dist - 0.3);
    return ray.intersectObjects(this.map.solids, false).length === 0;
  }

  update(dt, player, onEnemyShot) {
    if (!this.alive) return;
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);

    const visible = this.canSee(player);
    if (visible) {
      const d = this.eye.distanceTo(player.eye);
      // closer is quicker to notice; crouching and holding still buys you time
      let rate = 2.6 * (1 - Math.min(d / SEE_RANGE, 0.85));
      if (player.crouching) rate *= 0.55;
      if (player.speed < 0.4) rate *= 0.7;
      this.awareness = Math.min(1.4, this.awareness + rate * dt);
      this.lastKnown = player.pos.clone();
    } else {
      this.awareness = Math.max(0, this.awareness - dt * 0.35);
    }

    if (this.awareness >= 1) {
      if (this.state !== 'engage') { this.aimTimer = 0.35 + Math.random() * 0.5; }
      this.state = 'engage';
    } else if (this.lastKnown && this.awareness > 0.25) {
      this.state = 'search';
    } else if (this.state !== 'patrol') {
      this.state = 'patrol'; this.lastKnown = null;
    }

    if (this.state === 'engage') this.engage(dt, player, visible, onEnemyShot);
    else if (this.state === 'search') this.moveTowards(this.lastKnown, dt, 1.7);
    else this.doPatrol(dt);

    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }

  engage(dt, player, visible, onEnemyShot) {
    const to = player.pos.clone().sub(this.pos);
    this.faceTo(to, dt, 7);

    const d = to.length();
    if (!visible) {
      if (this.lastKnown) this.moveTowards(this.lastKnown, dt, 2.0);
      return;
    }
    // close the distance a little, but mostly hold and shoot
    if (d > 14) this.moveTowards(player.pos, dt, 1.9);

    this.aimTimer -= dt;
    if (this.aimTimer > 0 || this.shotCooldown > 0) return;

    if (this.burst <= 0) { this.burst = 2 + Math.floor(Math.random() * 3); }
    this.burst--;
    this.shotCooldown = this.burst > 0 ? 0.11 : 0.9 + Math.random() * 0.9;
    if (this.burst <= 0) this.aimTimer = 0.2 + Math.random() * 0.3;

    this.audio?.gunshotAt(this.pos, player.pos);
    onEnemyShot?.(this.eye, player.eye);

    // Hit chance: a real fight, but survivable enough to be worth playing.
    let p = 0.30 * (1 - Math.min(d / 45, 0.8));
    if (player.crouching) p *= 0.75;
    if (player.speed > 3) p *= 0.7;
    if (Math.random() < p) player.takeHit();
  }

  doPatrol(dt) {
    if (this.patrol.length < 2) { return; }
    const t = this.patrol[this.leg];
    if (this.pos.distanceTo(t) < 0.7) this.leg = (this.leg + 1) % this.patrol.length;
    this.moveTowards(t, dt, 1.2);
  }

  faceTo(dir, dt, rate) {
    const want = Math.atan2(-dir.x, -dir.z);
    let diff = ((want - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.yaw += diff * Math.min(1, dt * rate);
  }

  moveTowards(target, dt, speed) {
    const to = target.clone().sub(this.pos); to.y = 0;
    if (to.lengthSq() < 0.04) return;
    this.faceTo(to, dt, 5);
    to.normalize().multiplyScalar(speed * dt);
    // try the full step, then each axis on its own so we slide along walls
    if (!this.step(to.x, to.z)) { if (!this.step(to.x, 0)) this.step(0, to.z); }
  }

  step(dx, dz) {
    const p = this.pos.clone(); p.x += dx; p.z += dz;
    const b = new THREE.Box3(
      new THREE.Vector3(p.x - 0.32, p.y + 0.35, p.z - 0.32),
      new THREE.Vector3(p.x + 0.32, p.y + 1.7, p.z + 0.32));
    for (const c of this.map.colliders) if (c.intersectsBox(b)) return false;
    this.pos.copy(p);
    return true;
  }

  hearShot(from) {
    if (!this.alive) return;
    if (this.pos.distanceTo(from) < 55) {
      this.awareness = Math.max(this.awareness, 0.6);
      this.lastKnown = from.clone();
    }
  }

  takeHit(damage, audio) {
    if (!this.alive) return;
    this.hp -= damage;
    audio?.flesh();
    this.awareness = 1.4;
    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.group.rotation.x = -Math.PI / 2.1;
      this.group.position.y = 0.25;
      for (const m of this.hitMeshes) { m.userData.enemy = null; }
    }
  }
}
