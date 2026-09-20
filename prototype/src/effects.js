import * as THREE from 'three';

// Pooled particles. Everything reuses a fixed set of meshes so a firefight
// never allocates, and nothing has to be garbage collected mid-round.
const G = -18;

class Pool {
  constructor(scene, count, make) {
    this.scene = scene;
    this.free = [];
    this.live = [];
    for (let i = 0; i < count; i++) {
      const m = make();
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.free.push(m);
    }
  }
  spawn(setup, life) {
    const m = this.free.pop() || this.live.shift()?.mesh;
    if (!m) return null;
    m.visible = true;
    setup(m);
    const p = { mesh: m, life, max: life, vel: new THREE.Vector3(), spin: 0 };
    this.live.push(p);
    return p;
  }
  update(dt, step) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.free.push(p.mesh);
        this.live.splice(i, 1);
        continue;
      }
      step(p, dt);
    }
  }
  clear() {
    for (const p of this.live) { p.mesh.visible = false; this.free.push(p.mesh); }
    this.live.length = 0;
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;

    const dust = new THREE.MeshBasicMaterial({ color: 0xbfb7a6, transparent: true });
    this.dust = new Pool(scene, 120, () =>
      new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), dust.clone()));

    const blood = new THREE.MeshBasicMaterial({ color: 0x8a1f16, transparent: true });
    this.blood = new Pool(scene, 90, () =>
      new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.09), blood.clone()));

    const brass = new THREE.MeshLambertMaterial({ color: 0x9a7c33 });
    this.casings = new Pool(scene, 40, () =>
      new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.011, 0.034), brass));

    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd08a, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.flashes = new Pool(scene, 8, () =>
      new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.20), flashMat.clone()));

    const decalMat = new THREE.MeshBasicMaterial({
      color: 0x241f1a, transparent: true, opacity: 0.85, depthWrite: false });
    this.decals = new Pool(scene, 60, () =>
      new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), decalMat));
  }

  // A round striking the world: a puff of dust and a mark left behind.
  impact(point, normal, camera) {
    const n = normal || new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 5; i++) {
      const p = this.dust.spawn(m => {
        m.position.copy(point);
        m.material.opacity = 0.55;
        m.scale.setScalar(0.5 + Math.random() * 0.9);
      }, 0.32 + Math.random() * 0.25);
      if (!p) break;
      p.vel.set(
        n.x * 1.4 + (Math.random() - 0.5) * 2.1,
        n.y * 1.4 + Math.random() * 1.8,
        n.z * 1.4 + (Math.random() - 0.5) * 2.1);
      p.camera = camera;
    }
    this.decals.spawn(m => {
      m.position.copy(point).addScaledVector(n, 0.012);
      m.lookAt(point.clone().add(n));
      m.scale.setScalar(0.55 + Math.random() * 0.6);
      m.material.opacity = 0.85;
    }, 12);
  }

  // A round striking a person.
  hit(point, dir, camera) {
    for (let i = 0; i < 7; i++) {
      const p = this.blood.spawn(m => {
        m.position.copy(point);
        m.material.opacity = 0.85;
        m.scale.setScalar(0.5 + Math.random() * 1.0);
      }, 0.4 + Math.random() * 0.3);
      if (!p) break;
      p.vel.set(
        dir.x * 2.6 + (Math.random() - 0.5) * 2.4,
        1.2 + Math.random() * 1.8,
        dir.z * 2.6 + (Math.random() - 0.5) * 2.4);
      p.camera = camera;
    }
  }

  muzzle(point, dir) {
    this.flashes.spawn(m => {
      m.position.copy(point).addScaledVector(dir, 0.12);
      m.material.opacity = 0.75;
      m.scale.setScalar(0.5 + Math.random() * 0.5);
      m.rotation.z = Math.random() * Math.PI;
      m.lookAt(point.clone().addScaledVector(dir, -1));
    }, 0.045);
  }

  casing(point, right, up) {
    const p = this.casings.spawn(m => {
      m.position.copy(point);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    }, 2.2);
    if (!p) return;
    p.vel.copy(right).multiplyScalar(1.6 + Math.random() * 1.2)
      .addScaledVector(up, 1.4 + Math.random() * 0.9);
    p.spin = 14 + Math.random() * 14;
    p.bounce = true;
  }

  update(dt, camera) {
    const billboard = (p) => {
      p.vel.y += G * dt * 0.35;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, (p.life / p.max) * 0.85);
      if (camera) p.mesh.quaternion.copy(camera.quaternion);
    };
    this.dust.update(dt, billboard);
    this.blood.update(dt, billboard);
    this.flashes.update(dt, p => {
      p.mesh.material.opacity = Math.max(0, p.life / p.max);
    });
    this.decals.update(dt, p => {
      if (p.life < 2) p.mesh.material.opacity = (p.life / 2) * 0.85;
    });
    this.casings.update(dt, p => {
      p.vel.y += G * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.z += p.spin * 0.6 * dt;
      if (p.mesh.position.y < 0.02 && p.vel.y < 0) {
        p.mesh.position.y = 0.02;
        p.vel.y *= -0.32;
        p.vel.x *= 0.55; p.vel.z *= 0.55;
        p.spin *= 0.4;
      }
    });
  }

  clear() {
    for (const p of [this.dust, this.blood, this.casings, this.flashes, this.decals]) p.clear();
  }
}
