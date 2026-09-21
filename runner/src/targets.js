import * as THREE from 'three';

// Hoppable targets. They are deliberately bright and readable from far away,
// because the line of them IS the route - you should be able to see where the
// level wants you to go from the moment you spawn.
const COLORS = {
  normal: { core: 0xffd15c, shell: 0xc98f2a },
  big:    { core: 0x8ee2ff, shell: 0x3f9ec4 },   // bigger boost
  anchor: { core: 0xff85a0, shell: 0xc4506c },   // throws you upward instead
};

// Markers are scaled by distance so they hold a roughly constant size on
// screen. That is what makes the whole route legible as a line of beads from
// the start of the level, which is the entire point of the design.
const PIP_MIN = 0.26, PIP_MAX = 9.0, PIP_K = 0.013;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class Target {
  constructor(scene, pos, kind = 'normal') {
    this.pos = pos.clone();
    this.kind = kind;
    this.alive = true;
    this.t = Math.random() * 6;
    const c = COLORS[kind] || COLORS.normal;

    this.group = new THREE.Group();
    this.group.position.copy(pos);

    const shell = new THREE.Mesh(
      new THREE.OctahedronGeometry(kind === 'big' ? 0.78 : 0.62, 0),
      new THREE.MeshLambertMaterial({ color: c.shell }));
    this.group.add(shell);
    this.shell = shell;

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(kind === 'big' ? 0.34 : 0.26, 12, 10),
      new THREE.MeshBasicMaterial({ color: c.core }));
    this.group.add(this.core);

    // A bright billboarded pip that never shrinks below a readable size, so the
    // target is findable from the other end of the course.
    this.pip = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 16),
      new THREE.MeshBasicMaterial({ color: c.core, transparent: true, opacity: 0.95,
        depthWrite: false, depthTest: false }));
    this.group.add(this.pip);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.76, 20),
      new THREE.MeshBasicMaterial({ color: c.core, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
    this.group.add(this.ring);

    // highlight shown when this is the one you would hop to
    this.halo = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.28, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95,
        side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
    this.halo.visible = false;
    this.group.add(this.halo);

    scene.add(this.group);
  }

  update(dt, camera) {
    this.t += dt;
    if (!this.alive) return;
    this.group.position.y = this.pos.y + Math.sin(this.t * 1.6) * 0.18;
    this.shell.rotation.y += dt * 0.9;
    this.shell.rotation.x = Math.sin(this.t * 0.7) * 0.3;

    const pulse = 0.85 + Math.sin(this.t * 3.4) * 0.15;
    this.core.scale.setScalar(pulse);

    if (!camera) return;
    for (const m of [this.pip, this.ring, this.halo]) m.quaternion.copy(camera.quaternion);
    const dist = camera.position.distanceTo(this.group.position);
    const s = clamp(dist * PIP_K, PIP_MIN, PIP_MAX);
    this.pip.scale.setScalar(s * pulse);
    this.ring.scale.setScalar(Math.max(1, s * 1.5));
    this.halo.scale.setScalar(Math.max(0.9, s * 1.7));
    // fade the pip out when you are right on top of it, so the solid shape reads
    this.pip.material.opacity = dist < 6 ? Math.max(0, (dist - 2) / 4) * 0.95 : 0.95;
  }

  setHighlight(on) { if (this.alive) this.halo.visible = on; }

  take() {
    this.alive = false;
    this.group.visible = false;
  }

  revive() {
    this.alive = true;
    this.group.visible = true;
    this.halo.visible = false;
  }

  dispose(scene) { scene.remove(this.group); }
}

export class TargetField {
  constructor(scene) { this.scene = scene; this.list = []; }

  add(pos, kind) {
    const t = new Target(this.scene, pos, kind);
    this.list.push(t);
    return t;
  }

  update(dt, camera) { for (const t of this.list) t.update(dt, camera); }
  reviveAll() { for (const t of this.list) t.revive(); }
  clear() { for (const t of this.list) t.dispose(this.scene); this.list.length = 0; }
  get remaining() { return this.list.reduce((n, t) => n + (t.alive ? 1 : 0), 0); }
}
