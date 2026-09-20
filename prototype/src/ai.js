import * as THREE from 'three';
import { MAX_HP } from './weapon.js';
import { WEAPONS, buildModel } from './weapons.js';

// Deliberately simple: see, close, shoot. Enough to test whether the game feels
// right, nowhere near the combat AI a finished single-player mode would need.
const SEE_RANGE = 45;
const FOV_COS = Math.cos(THREE.MathUtils.degToRad(58));

// Enemy types. Each carries a different weapon, wants to fight at a different
// distance, and falls off in accuracy at a different rate.
export const KINDS = {
  rifleman: {
    weapon: 'rifle', hp: MAX_HP, speed: 2.0, preferred: 13, rangeFall: 45,
    burst: [2, 4], cadence: [0.75, 1.5], acc: 1.0, cover: 0.5, damage: 1,
    uniform: 0x5c6b43, gear: 0x3b4230,
  },
  rusher: {
    weapon: 'smg', hp: MAX_HP, speed: 3.1, preferred: 4, rangeFall: 24,
    burst: [4, 7], cadence: [0.5, 1.0], acc: 0.85, cover: 0.2, damage: 1,
    uniform: 0x4a5340, gear: 0x30352a,
  },
  marksman: {
    weapon: 'dmr', hp: MAX_HP, speed: 1.5, preferred: 26, rangeFall: 75,
    burst: [1, 1], cadence: [1.5, 2.6], acc: 1.5, cover: 0.75, damage: 2,
    uniform: 0x54603f, gear: 0x2f3a2b,
  },
  shotgunner: {
    // A shotgun blast at four metres is hard to miss and takes half of you with
    // it, so: very likely to hit, and two hits will do it.
    weapon: 'shotgun', hp: MAX_HP + 1, speed: 2.9, preferred: 3.5, rangeFall: 13,
    burst: [1, 1], cadence: [0.75, 1.25], acc: 2.0, cover: 0.25, damage: 2,
    uniform: 0x63614a, gear: 0x3a382c,
  },
};

export class Enemy {
  constructor(scene, post, map, audio, kind = 'rifleman') {
    this.scene = scene; this.map = map; this.audio = audio;
    this.kind = kind;
    this.type = KINDS[kind] || KINDS.rifleman;
    this.accuracyScale = 1;
    this.pos = post.pos.clone();
    this.patrol = post.patrol.map(p => p.clone());
    this.leg = 0; this.yaw = 0;
    this.hp = this.type.hp;
    this.alive = true;
    this.state = 'patrol';
    this.awareness = 0;
    this.aimTimer = 0; this.burst = 0; this.shotCooldown = 0;
    this.lastKnown = null;
    this.squad = [];            // set by main, so they can warn each other
    this.aimTime = 0;           // how long they have had you in their sights
    this.lastSeen = 99;
    this.coverTarget = null;
    this.coverCooldown = 0;
    this.flank = Math.random() < 0.5 ? -1 : 1;

    const uniform = new THREE.MeshLambertMaterial({ color: this.type.uniform });
    const gear = new THREE.MeshLambertMaterial({ color: this.type.gear });
    const skin = new THREE.MeshLambertMaterial({ color: 0xb08a68 });

    this.group = new THREE.Group();
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
    // Limbs hang off pivot groups placed at the hip and shoulder, so they can
    // actually swing rather than slide.
    const pivot = (x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      this.group.add(g);
      return g;
    };

    this.torso = mesh(new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), uniform, 0, 1.18, 0, 'body');
    mesh(new THREE.BoxGeometry(0.44, 0.34, 0.28), gear, 0, 1.24, 0.01, 'body');
    mesh(new THREE.SphereGeometry(0.115, 12, 10), skin, 0, 1.60, 0, 'head');
    mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.9),
         gear, 0, 1.60, 0, 'head');

    this.legs = []; this.arms = [];
    for (const s of [-1, 1]) {
      const hip = pivot(s * 0.115, 0.95, 0);
      mesh(new THREE.CapsuleGeometry(0.088, 0.44, 4, 8), uniform, 0, -0.26, 0, 'body', hip);
      mesh(new THREE.BoxGeometry(0.13, 0.09, 0.26), gear, 0, -0.50, 0.04, 'body', hip);
      this.legs.push(hip);

      const sh = pivot(s * 0.27, 1.42, 0);
      mesh(new THREE.CapsuleGeometry(0.068, 0.34, 4, 8), uniform, 0, -0.2, 0, 'body', sh);
      this.arms.push(sh);
    }

    // They carry the weapon they actually shoot, so you can see what is coming.
    this.weaponModel = buildModel(this.type.weapon);
    this.weaponModel.scale.setScalar(0.85);
    this.weaponModel.position.set(0.24, 1.22, -0.3);
    this.group.add(this.weaponModel);

    this.walkPhase = Math.random() * Math.PI * 2;
    this.lastPos = this.pos.clone();
    this.deathT = 0;
    this.deathTilt = 0;
    this.flinch = 0;

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
    return new THREE.Raycaster(this.eye, to, 0.2, dist - 0.3)
      .intersectObjects(this.map.solids, false).length === 0;
  }

  update(dt, player, onEnemyShot) {
    if (!this.alive) { this.animateDeath(dt); return; }
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    this.coverCooldown = Math.max(0, this.coverCooldown - dt);

    const visible = this.canSee(player);
    if (visible) {
      const d = this.eye.distanceTo(player.eye);
      let rate = 2.6 * (1 - Math.min(d / SEE_RANGE, 0.85));
      if (player.crouching) rate *= 0.55;
      if (player.speed < 0.4) rate *= 0.7;
      this.awareness = Math.min(1.5, this.awareness + rate * dt);
      this.lastKnown = player.pos.clone();
      this.lastSeen = 0;
      this.aimTime += dt;
      if (this.awareness >= 1) this.callOut();
    } else {
      this.awareness = Math.max(0, this.awareness - dt * 0.3);
      this.lastSeen += dt;
      this.aimTime = Math.max(0, this.aimTime - dt * 1.5); // lose the sight picture
    }

    if (this.awareness >= 1) {
      if (this.state !== 'engage') {
        this.aimTimer = 0.3 + Math.random() * 0.35;
        this.justAlerted = true;          // main plays a shout
      }
      this.state = 'engage';
    } else if (this.lastKnown && this.awareness > 0.25) {
      this.state = 'search';
    } else if (this.state !== 'patrol') {
      this.state = 'patrol'; this.lastKnown = null; this.coverTarget = null;
    }

    if (this.state === 'engage') this.engage(dt, player, visible, onEnemyShot);
    else if (this.state === 'search') this.search(dt);
    else this.doPatrol(dt);

    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    this.animate(dt);
  }

  // Legs and arms swing in proportion to how fast they are actually moving.
  animate(dt) {
    // A visible reaction to being hit, so you can tell you connected even
    // when the target does not go down.
    if (this.flinch > 0) {
      this.flinch = Math.max(0, this.flinch - dt * 4.5);
      this.torso.rotation.x = -this.flinch * 0.42;
      this.torso.position.z = this.flinch * 0.06;
    }
    const moved = this.pos.distanceTo(this.lastPos) / Math.max(dt, 0.0001);
    this.lastPos.copy(this.pos);
    const gait = Math.min(moved / 3.0, 1);
    this.walkPhase += dt * (5.5 + moved * 1.8);
    const swing = Math.sin(this.walkPhase) * 0.75 * gait;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    // The left arm swings; the right holds the weapon up and steady.
    this.arms[0].rotation.x = -swing * 0.6;
    this.arms[1].rotation.x = -0.9;
    this.arms[1].rotation.z = 0.25;
    this.group.position.y = this.pos.y + Math.abs(Math.sin(this.walkPhase)) * 0.035 * gait;
    if (this.weaponModel) {
      this.weaponModel.position.y = 1.22 + Math.abs(Math.sin(this.walkPhase)) * 0.02 * gait;
    }
  }

  // Fall over the way the shot pushed them, rather than snapping flat.
  animateDeath(dt) {
    if (this.deathT >= 1) return;
    this.deathT = Math.min(1, this.deathT + dt * 2.6);
    const e = 1 - Math.pow(1 - this.deathT, 3);       // ease out
    this.group.rotation.x = this.deathTilt * e;
    this.group.rotation.z = this.deathRoll * e;
    this.group.position.y = this.pos.y - 0.12 * e;
    for (const l of this.legs) l.rotation.x *= 1 - dt * 3;
    for (const a of this.arms) { a.rotation.x *= 1 - dt * 3; a.rotation.z *= 1 - dt * 3; }
  }

  // Shout. Anyone close enough now knows roughly where you are, so walking into
  // one of them means walking into all of them.
  callOut() {
    for (const m of this.squad) {
      if (m === this || !m.alive) continue;
      if (m.pos.distanceTo(this.pos) > 26) continue;
      if (m.awareness < 0.85) {
        m.awareness = Math.max(m.awareness, 0.85);
        m.lastKnown = this.lastKnown.clone();
      }
    }
  }

  // Look for a spot where the player's line to our chest is blocked. Sampled
  // rather than solved, which is cheap and looks deliberate enough.
  findCover(player) {
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * 7;
      const c = new THREE.Vector3(
        this.pos.x + Math.cos(a) * r, this.pos.y, this.pos.z + Math.sin(a) * r);
      if (!this.freeAt(c)) continue;
      const chest = c.clone(); chest.y += 1.2;
      const to = chest.sub(player.eye);
      const dist = to.length();
      const hidden = new THREE.Raycaster(player.eye, to.normalize(), 0.3, dist - 0.4)
        .intersectObjects(this.map.solids, false).length > 0;
      if (!hidden) continue;
      // close to us, and still near enough to the player to stay in the fight
      const score = -c.distanceTo(this.pos) - Math.abs(c.distanceTo(player.pos) - 11) * 0.4;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  freeAt(p) {
    const b = new THREE.Box3(
      new THREE.Vector3(p.x - 0.34, p.y + 0.3, p.z - 0.34),
      new THREE.Vector3(p.x + 0.34, p.y + 1.7, p.z + 0.34));
    for (const c of this.map.colliders) if (c.intersectsBox(b)) return false;
    return true;
  }

  engage(dt, player, visible, onEnemyShot) {
    const aimAt = visible ? player.pos : (this.lastKnown || player.pos);
    this.faceTo(aimAt.clone().sub(this.pos), dt, 8);
    const d = this.pos.distanceTo(player.pos);

    // moving to cover we already chose
    if (this.coverTarget) {
      this.moveTowards(this.coverTarget, dt, 2.6);
      if (this.pos.distanceTo(this.coverTarget) < 0.8) this.coverTarget = null;
    } else if (!visible) {
      // lost them: push to where they were, approaching off to one side
      if (this.lastSeen > 0.9 && this.lastKnown) {
        const perp = new THREE.Vector3(
          -(this.lastKnown.z - this.pos.z), 0, this.lastKnown.x - this.pos.x).normalize();
        const goal = this.lastKnown.clone().addScaledVector(perp, this.flank * 4);
        this.moveTowards(this.freeAt(goal) ? goal : this.lastKnown, dt, 2.2);
      }
    } else if (d > this.type.preferred) {
      this.moveTowards(player.pos, dt, this.type.speed);
    }

    if (!visible) return;

    this.aimTimer -= dt;
    if (this.aimTimer > 0 || this.shotCooldown > 0) return;

    const K = this.type;
    if (this.burst <= 0) this.burst = K.burst[0] + Math.floor(Math.random() * (K.burst[1] - K.burst[0] + 1));
    this.burst--;
    const gap = K.cadence[0] + Math.random() * (K.cadence[1] - K.cadence[0]);
    this.shotCooldown = this.burst > 0 ? 60 / (WEAPONS[K.weapon].rpm) : gap;
    if (this.burst <= 0) {
      this.aimTimer = 0.2 + Math.random() * 0.3;
      // having fired, displace to somewhere the player is not already aiming
      if (this.coverCooldown <= 0 && Math.random() < K.cover) {
        this.coverTarget = this.findCover(player);
        this.coverCooldown = 3.5;
      }
    }

    // Accuracy ramps as they settle on you, and resets when you break line of
    // sight. Standing still in the open is what gets you killed.
    const settle = 0.14 + 0.30 * Math.min(this.aimTime / 2.0, 1);
    let p = settle * (1 - Math.min(d / K.rangeFall, 0.82)) * K.acc;
    if (player.crouching) p *= 0.78;
    if (player.speed > 3) p *= 0.7;
    if (this.coverTarget) p *= 0.5;            // shooting on the move is poor
    p *= this.accuracyScale;                   // difficulty
    if (Math.random() < p) {
      // the occasional round finds something important
      player.takeHit(K.damage + (Math.random() < 0.15 ? 1 : 0), this.pos);
      this.lastShotMiss = 0;
    } else {
      // How near it went. Biased by how good the shot was, so a dangerous
      // enemy sounds dangerous.
      this.lastShotMiss = Math.min(1, Math.random() * (0.35 + p * 4));
    }
    onEnemyShot?.(this.eye, player.eye, this);
  }

  search(dt) {
    if (!this.lastKnown) return;
    if (this.pos.distanceTo(this.lastKnown) > 1.2) {
      this.moveTowards(this.lastKnown, dt, 1.9);
    } else {
      this.yaw += dt * 1.3;                     // sweep the area
    }
  }

  doPatrol(dt) {
    if (this.patrol.length < 2) return;
    const t = this.patrol[this.leg];
    if (this.pos.distanceTo(t) < 0.7) this.leg = (this.leg + 1) % this.patrol.length;
    this.moveTowards(t, dt, this.type.speed * 0.55);
  }

  faceTo(dir, dt, rate) {
    const want = Math.atan2(-dir.x, -dir.z);
    const diff = ((want - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.yaw += diff * Math.min(1, dt * rate);
  }

  moveTowards(target, dt, speed) {
    const to = target.clone().sub(this.pos); to.y = 0;
    if (to.lengthSq() < 0.04) return;
    this.faceTo(to, dt, 5);
    to.normalize().multiplyScalar(speed * dt);
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
    if (!this.alive || !from) return;
    if (this.pos.distanceTo(from) < 55) {
      this.awareness = Math.max(this.awareness, 0.6);
      this.lastKnown = from.clone();
    }
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  takeHit(damage, audio, fromDir) {
    if (!this.alive) return;
    this.hp -= damage;
    this.flinch = 1;
    audio?.flesh();
    this.awareness = 1.5;
    this.aimTime = 0;
    this.coverTarget = null;
    this.coverCooldown = 0;   // take cover now
    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      // Tip over away from whoever shot them, with a bit of roll for variety.
      this.deathTilt = (fromDir && fromDir.dot(this.forward()) > 0 ? 1 : -1) * (Math.PI / 2.05);
      this.deathRoll = (Math.random() - 0.5) * 0.5;
      this.deathT = 0;
      for (const m of this.hitMeshes) m.userData.enemy = null;
      if (this.weaponModel) this.group.remove(this.weaponModel);
      this.dropped = { id: this.type.weapon, pos: this.pos.clone() };
      this.justDied = true;
    }
  }
}
