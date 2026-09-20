import * as THREE from 'three';

const MAG = 30;
const RPM = 600;

export class Weapon {
  constructor(camera, scene, audio) {
    this.camera = camera; this.scene = scene; this.audio = audio;
    this.mag = MAG; this.reserve = 120;
    this.cooldown = 0; this.reloading = 0;
    this.recoilPitch = 0; this.recoilYaw = 0;
    this.kick = 0;
    this.tracers = [];

    // Viewmodel: crude, but it only has to read as "a rifle" through the camera filter.
    const dark = new THREE.MeshLambertMaterial({ color: 0x1e1e1c });
    const furniture = new THREE.MeshLambertMaterial({ color: 0x4a3626 });
    this.view = new THREE.Group();
    const part = (w, h, d, mat, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); this.view.add(m); return m;
    };
    part(0.06, 0.07, 0.62, dark, 0, 0, -0.18);        // receiver
    part(0.035, 0.035, 0.42, dark, 0, 0.005, -0.58);  // barrel
    part(0.05, 0.05, 0.22, furniture, 0, -0.005, -0.42); // handguard
    part(0.05, 0.16, 0.1, furniture, 0, -0.1, 0.02);  // grip
    part(0.05, 0.09, 0.26, furniture, 0, -0.01, 0.2); // stock
    const mag = part(0.045, 0.17, 0.09, dark, 0, -0.13, -0.16);
    mag.rotation.x = 0.35;
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.01, -0.78);
    this.view.add(this.muzzle);
    camera.add(this.view);

    this.flash = new THREE.PointLight(0xffd9a0, 0, 12, 2);
    this.flash.position.set(0.2, -0.1, -0.8);
    camera.add(this.flash);

    this.view.scale.setScalar(0.72);
    this.restPos = new THREE.Vector3(0.30, -0.26, -0.14);
    this.adsPos = new THREE.Vector3(0.02, -0.115, -0.2);
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
    let s = ads ? 0.004 : 0.03;
    s += Math.min(player.speed / 4.6, 1) * (ads ? 0.02 : 0.045);
    if (player.crouching) s *= 0.65;
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

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // cone of inaccuracy
    const s = this._spread;
    dir.x += (Math.random() - 0.5) * s * 2;
    dir.y += (Math.random() - 0.5) * s * 2;
    dir.z += (Math.random() - 0.5) * s * 2;
    dir.normalize();

    const origin = player.eye.clone();
    const ray = new THREE.Raycaster(origin, dir, 0.1, 300);

    const targets = [...map.solids];
    for (const e of enemies) if (e.alive) targets.push(...e.hitMeshes);
    const hits = ray.intersectObjects(targets, false);

    let end = origin.clone().addScaledVector(dir, 120);
    if (hits.length) {
      const h = hits[0];
      end = h.point.clone();
      const owner = h.object.userData.enemy;
      if (owner) owner.takeHit(h.object.userData.part === 'head' ? 2 : 1, this.audio);
      else this.impact(h.point, h.face?.normal);
    }
    this.tracer(origin.clone().addScaledVector(dir, 0.6), end);

    // recoil, partly random so it cannot be learned perfectly
    this.recoilPitch += 0.016 + Math.random() * 0.01;
    this.recoilYaw += (Math.random() - 0.5) * 0.012;
    player.pitch += this.recoilPitch * 0.9;
    player.yaw += this.recoilYaw * 0.9;
    this.kick = 1;
    this.flash.intensity = 6;
    onShot?.(origin);
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
