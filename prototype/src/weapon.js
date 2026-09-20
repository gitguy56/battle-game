import * as THREE from 'three';
import { WEAPONS, buildModel, muzzleZ } from './weapons.js';

// Two headshots or four body shots with a standard rifle. Individual weapons
// scale off this in weapons.js.
export const MAX_HP = 4;
export const HEAD_DAMAGE = 2;
export const BODY_DAMAGE = 1;
const UP = new THREE.Vector3(0, 1, 0);

export class Weapon {
  constructor(camera, scene, audio) {
    this.camera = camera; this.scene = scene; this.audio = audio;
    this.slots = [];
    this.active = 0;
    this.view = null;
    this.spec = WEAPONS.rifle;
    this.cooldown = 0; this.reloading = 0; this.swapping = 0;
    this.recoilPitch = 0; this.recoilYaw = 0; this.kick = 0;
    this.ads = 0;                    // 0..1, how far into the sights
    this.triggerWasDown = false;
    this.tracers = [];
    this._spread = 0.01;

    this.holder = new THREE.Group();
    camera.add(this.holder);
    this.flash = new THREE.PointLight(0xffd9a0, 0, 12, 2);
    camera.add(this.flash);
    this.restPos = new THREE.Vector3(0.155, -0.155, -0.30);
    this.adsPos = new THREE.Vector3(0.0, -0.062, -0.26);
  }

  // ------------------------------------------------------------- loadout ---
  setLoadout(list) {
    this.slots = list.map(s => {
      const spec = WEAPONS[s.id] || WEAPONS.rifle;
      return { id: spec.id, mag: s.mag ?? spec.mag, reserve: s.reserve ?? spec.reserve };
    });
    this.active = 0;
    this.equip(0, true);
  }

  get slot() { return this.slots[this.active]; }
  get mag() { return this.slot ? this.slot.mag : 0; }
  get reserve() { return this.slot ? this.slot.reserve : 0; }

  equip(index, instant = false) {
    if (!this.slots[index]) return;
    this.active = index;
    this.spec = WEAPONS[this.slots[index].id];
    this.reloading = 0;
    this.swapping = instant ? 0 : 0.45;
    if (this.view) this.holder.remove(this.view);
    this.view = buildModel(this.spec.id);
    this.view.scale.setScalar(0.8);
    this.view.rotation.y = -0.05;
    this.view.position.copy(this.restPos);
    this.holder.add(this.view);
    this.muzzle = muzzleZ(this.spec.id);
    this.flash.position.set(0.1, -0.06, this.muzzle * 0.8);
  }

  swap() {
    if (this.slots.length < 2 || this.swapping > 0) return;
    this.equip((this.active + 1) % this.slots.length);
    this.audio?.swap();
  }

  // Take a weapon off the ground into the current slot, keeping the sidearm.
  pickUp(id, mag, reserve) {
    const spec = WEAPONS[id];
    if (!spec) return null;
    const dropped = this.slot ? { ...this.slot } : null;
    this.slots[this.active] = { id: spec.id, mag, reserve };
    this.equip(this.active);
    return dropped;
  }

  reset(loadout) {
    this.cooldown = 0; this.reloading = 0; this.swapping = 0;
    this.recoilPitch = 0; this.recoilYaw = 0; this.kick = 0; this.ads = 0;
    for (const t of this.tracers) this.scene.remove(t.mesh);
    this.tracers.length = 0;
    this.setLoadout(loadout || [{ id: 'rifle' }, { id: 'pistol' }]);
  }

  get spread() { return this._spread; }
  get adsFov() { return 1 + (this.spec.adsFov - 1) * this.ads; }

  // -------------------------------------------------------------- update ---
  update(dt, input, player, enemies, map, onShot) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.swapping = Math.max(0, this.swapping - dt);
    const s = this.spec;

    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = s.mag - this.slot.mag;
        const take = Math.min(need, this.slot.reserve);
        this.slot.mag += take; this.slot.reserve -= take;
      }
    }

    const aiming = input.ads && this.reloading <= 0 && this.swapping <= 0;
    this.ads += ((aiming ? 1 : 0) - this.ads) * Math.min(1, dt * 12);

    const target = this.restPos.clone().lerp(this.adsPos, this.ads);
    this.view.position.lerp(target, Math.min(1, dt * 16));
    const sway = player.bobAmount * (1 - this.ads * 0.8);
    this.view.position.x += Math.cos(player.bobPhase) * 0.012 * sway;
    this.view.position.y += Math.abs(Math.sin(player.bobPhase)) * -0.014 * sway;
    this.view.position.z = target.z + this.kick * 0.09 - this.swapping * 0.25;
    this.view.rotation.z = -this.kick * 0.5 + Math.cos(player.bobPhase) * 0.02 * sway;
    this.view.rotation.x = this.swapping * 0.9;
    this.kick *= Math.pow(0.001, dt);

    // accuracy
    const moving = Math.min(player.speed / 4.6, 1);
    let sp = this.ads > 0.5
      ? s.spreadAds + moving * s.spreadAdsMove
      : s.spreadHip + moving * s.spreadMove;
    if (player.crouching) sp *= 0.6;
    this._spread = sp;

    const rec = Math.min(1, dt * 7);
    player.pitch -= this.recoilPitch * rec;
    player.yaw -= this.recoilYaw * rec;
    this.recoilPitch *= 1 - rec; this.recoilYaw *= 1 - rec;
    this.flash.intensity *= Math.pow(0.0001, dt);

    const trigger = !!input.fire;
    const canFire = s.auto ? trigger : (trigger && !this.triggerWasDown);
    this.triggerWasDown = trigger;

    if (canFire && this.cooldown <= 0 && this.reloading <= 0 && this.swapping <= 0 && player.alive) {
      if (this.slot.mag > 0) this.fire(player, enemies, map, onShot);
      else { this.cooldown = 0.25; this.audio?.dryFire(); }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / 0.06);
      if (t.life <= 0) { this.scene.remove(t.mesh); this.tracers.splice(i, 1); }
    }
  }

  // ---------------------------------------------------------------- fire ---
  fire(player, enemies, map, onShot) {
    const s = this.spec;
    this.slot.mag--;
    this.cooldown = 60 / s.rpm;
    this.audio?.gunshot(s.sound);

    // Origin AND direction both come from the camera, so the shot goes exactly
    // through the centre of the screen - which is where the crosshair is.
    const origin = new THREE.Vector3();
    const base = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(base);

    const targets = [...map.solids];
    for (const e of enemies) if (e.alive) targets.push(...e.hitMeshes);

    let bestTag = null;
    for (let p = 0; p < s.pellets; p++) {
      const dir = base.clone();
      const spread = this._spread;
      if (spread > 0) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * spread;
        const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
        const up = new THREE.Vector3().crossVectors(right, dir).normalize();
        dir.addScaledVector(right, Math.cos(ang) * rad)
           .addScaledVector(up, Math.sin(ang) * rad).normalize();
      }
      const hits = new THREE.Raycaster(origin, dir, 0.1, 300).intersectObjects(targets, false);
      let end = origin.clone().addScaledVector(dir, 120);
      if (hits.length) {
        const h = hits[0];
        end = h.point.clone();
        const owner = h.object.userData.enemy;
        if (owner) {
          const head = h.object.userData.part === 'head';
          owner.takeHit(head ? s.head : s.body, this.audio);
          if (head || !bestTag) bestTag = head ? 'head' : 'body';
        } else if (p < 3) {
          this.impact(h.point, h.face?.normal);
        }
      }
      if (p < 4) this.tracer(origin.clone().addScaledVector(dir, 0.5), end);
    }

    this.recoilPitch += s.recoil + Math.random() * s.recoilRand;
    this.recoilYaw += (Math.random() - 0.5) * s.yawKick;
    player.pitch += this.recoilPitch * 0.85;
    player.yaw += this.recoilYaw * 0.85;
    this.kick = 1;
    this.flash.intensity = s.pellets > 1 ? 9 : 5;
    onShot?.(origin, bestTag);
  }

  tracer(a, b) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const m = new THREE.Line(g, new THREE.LineBasicMaterial({
      color: 0xffe0a0, transparent: true, opacity: 1 }));
    this.scene.add(m);
    this.tracers.push({ mesh: m, life: 0.06 });
  }

  impact(point, normal) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3),
      new THREE.MeshBasicMaterial({ color: 0x3a3630 }));
    g.position.copy(point);
    if (normal) g.position.addScaledVector(normal, 0.02);
    this.scene.add(g);
    setTimeout(() => this.scene.remove(g), 9000);
  }

  startReload() {
    if (this.reloading > 0 || this.swapping > 0) return;
    if (this.slot.mag >= this.spec.mag || this.slot.reserve <= 0) return;
    this.reloading = this.spec.reload;
    this.audio?.reload(this.spec.reload);
  }

  magFeel() {
    if (this.reserve <= 0 && this.mag === 0) return 'nothing left';
    const f = this.mag / this.spec.mag;
    if (f === 0) return 'empty';
    if (f < 0.2) return 'nearly empty';
    if (f < 0.5) return 'under half';
    if (f < 0.85) return 'about half';
    return 'full';
  }
}
