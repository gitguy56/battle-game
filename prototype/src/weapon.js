import * as THREE from 'three';

const MAG = 30;
// Two headshots kill, four body shots kill - same for the player and the AI.
export const MAX_HP = 4;
export const HEAD_DAMAGE = 2;
export const BODY_DAMAGE = 1;
const UP = new THREE.Vector3(0, 1, 0);
const RPM = 600;

export class Weapon {
  constructor(camera, scene, audio) {
    this.camera = camera; this.scene = scene; this.audio = audio;
    this.mag = MAG; this.reserve = 120;
    this.cooldown = 0; this.reloading = 0;
    this.recoilPitch = 0; this.recoilYaw = 0;
    this.kick = 0;
    this.tracers = [];

    // Viewmodel. Lighter than the old one and held further from the lens, so
    // it reads as a rifle instead of a black wedge in the corner.
    const metal = new THREE.MeshLambertMaterial({ color: 0x43484e });
    const metalDark = new THREE.MeshLambertMaterial({ color: 0x2f3338 });
    const furniture = new THREE.MeshLambertMaterial({ color: 0x8a6741 });
    this.view = new THREE.Group();
    const part = (w, h, d, mat, x, y, z, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); m.rotation.x = rx;
      this.view.add(m); return m;
    };
    part(0.062, 0.075, 0.30, metal, 0, 0, -0.10);        // receiver
    part(0.030, 0.030, 0.40, metalDark, 0, 0.008, -0.44); // barrel
    part(0.050, 0.052, 0.20, furniture, 0, -0.004, -0.31); // handguard
    part(0.052, 0.030, 0.07, metalDark, 0, 0.042, -0.20);  // rear sight
    part(0.016, 0.040, 0.03, metalDark, 0, 0.042, -0.62);  // front post
    part(0.046, 0.15, 0.095, furniture, 0, -0.095, 0.01);  // pistol grip
    part(0.048, 0.085, 0.26, furniture, 0, -0.012, 0.18);  // stock
    part(0.042, 0.165, 0.085, metalDark, 0, -0.115, -0.09, 0.32); // magazine
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.01, -0.64);
    this.view.add(this.muzzle);
    camera.add(this.view);

    this.flash = new THREE.PointLight(0xffd9a0, 0, 12, 2);
    this.flash.position.set(0.14, -0.08, -0.66);
    camera.add(this.flash);

    this.view.scale.setScalar(0.8);
    this.view.rotation.y = -0.05;
    this.restPos = new THREE.Vector3(0.155, -0.155, -0.30);
    this.adsPos = new THREE.Vector3(0.0, -0.062, -0.26);
    this.view.position.copy(this.restPos);
  }

  get spread() { return this._spread ?? 0.01; }

  update(dt, input, player, enemies, map, onShot) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = MAG - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take; this.reserve -= take;
      }
    }

    // where the rifle sits in view
    const ads = input.ads && this.reloading <= 0;
    const target = ads ? this.adsPos : this.restPos;
    this.view.position.lerp(target, Math.min(1, dt * 14));
    const sway = player.bobAmount * (ads ? 0.2 : 1);
    this.view.position.x += Math.cos(player.bobPhase) * 0.012 * sway;
    this.view.position.y += Math.abs(Math.sin(player.bobPhase)) * -0.014 * sway;
    this.view.rotation.z = -this.kick * 0.5 + Math.cos(player.bobPhase) * 0.02 * sway;
    this.view.position.z = target.z + this.kick * 0.09;
    this.kick *= Math.pow(0.001, dt);

    // accuracy: still and aimed is good, moving and hip-fired is not
    // Cone half-angle in radians. Aimed and still is near-perfect: the shot
    // goes exactly where the crosshair is.
    let s = ads ? 0.0006 : 0.012;
    s += Math.min(player.speed / 4.6, 1) * (ads ? 0.004 : 0.016);
    if (player.crouching) s *= 0.6;
    this._spread = s;

    // recoil recovery
    const rec = Math.min(1, dt * 7);
    player.pitch -= this.recoilPitch * rec;
    player.yaw -= this.recoilYaw * rec;
    this.recoilPitch *= 1 - rec; this.recoilYaw *= 1 - rec;

    this.flash.intensity *= Math.pow(0.0001, dt);

    if (input.fire && this.cooldown <= 0 && this.reloading <= 0 && player.alive) {
      if (this.mag > 0) this.fire(player, enemies, map, onShot);
      else { this.cooldown = 0.25; this.audio?.dryFire(); }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / 0.06);
      if (t.life <= 0) { this.scene.remove(t.mesh); this.tracers.splice(i, 1); }
    }
  }

  fire(player, enemies, map, onShot) {
    this.mag--;
    this.cooldown = 60 / RPM;
    this.audio?.gunshot();

    // Origin AND direction both come from the camera, so the shot goes exactly
    // through the centre of the screen - which is where the crosshair is.
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(dir);

    // Scatter inside a proper cone rather than nudging the vector's components.
    const s = this._spread;
    if (s > 0) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * s;
      const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      dir.addScaledVector(right, Math.cos(ang) * rad)
         .addScaledVector(up, Math.sin(ang) * rad).normalize();
    }

    const ray = new THREE.Raycaster(origin, dir, 0.1, 300);
    const targets = [...map.solids];
    for (const e of enemies) if (e.alive) targets.push(...e.hitMeshes);
    const hits = ray.intersectObjects(targets, false);

    let end = origin.clone().addScaledVector(dir, 120);
    let hitTag = null;
    let killed = false;
    if (hits.length) {
      const h = hits[0];
      end = h.point.clone();
      const owner = h.object.userData.enemy;
      if (owner) {
        const head = h.object.userData.part === 'head';
        owner.takeHit(head ? HEAD_DAMAGE : BODY_DAMAGE, this.audio);
        hitTag = head ? 'head' : 'body';
        killed = !owner.alive;
      } else {
        this.impact(h.point, h.face?.normal);
      }
    }
    this.tracer(origin.clone().addScaledVector(dir, 0.5), end);

    this.recoilPitch += 0.009 + Math.random() * 0.005;
    this.recoilYaw += (Math.random() - 0.5) * 0.006;
    player.pitch += this.recoilPitch * 0.85;
    player.yaw += this.recoilYaw * 0.85;
    this.kick = 1;
    this.flash.intensity = 5;
    onShot?.(origin, hitTag, killed);
  }

  reset() {
    this.mag = MAG; this.reserve = 120;
    this.cooldown = 0; this.reloading = 0;
    this.recoilPitch = 0; this.recoilYaw = 0; this.kick = 0;
    for (const t of this.tracers) this.scene.remove(t.mesh);
    this.tracers.length = 0;
  }

  tracer(a, b) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const m = new THREE.Line(g, new THREE.LineBasicMaterial({
      color: 0xffe0a0, transparent: true, opacity: 1,
    }));
    this.scene.add(m);
    this.tracers.push({ mesh: m, life: 0.06 });
  }

  impact(point, normal) {
    const g = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 4, 3),
      new THREE.MeshBasicMaterial({ color: 0x3a3630 }));
    g.position.copy(point);
    if (normal) g.position.addScaledVector(normal, 0.02);
    this.scene.add(g);
    setTimeout(() => this.scene.remove(g), 9000);
  }

  startReload() {
    if (this.reloading > 0 || this.mag >= MAG || this.reserve <= 0) return;
    this.reloading = 2.8;
    this.audio?.reload();
  }

  // No ammo counter on screen - you ask for a rough answer, like checking the weight.
  magFeel() {
    if (this.reserve <= 0 && this.mag === 0) return 'nothing left';
    const f = this.mag / MAG;
    if (f === 0) return 'empty';
    if (f < 0.2) return 'nearly empty';
    if (f < 0.5) return 'under half';
    if (f < 0.85) return 'about half';
    return 'full';
  }
}
