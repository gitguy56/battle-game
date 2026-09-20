import * as THREE from 'three';
import { WEAPONS, buildModel } from './weapons.js';

// Weapons dropped by the dead, lying where they fell.
export class Pickups {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  drop(id, pos, mag = null, reserve = null) {
    const spec = WEAPONS[id];
    if (!spec) return;
    const g = buildModel(id);
    g.scale.setScalar(1.0);
    g.position.set(pos.x, 0.12, pos.z);
    g.rotation.set(Math.PI / 2 * 0.06, Math.random() * Math.PI * 2, Math.PI / 2 * 0.9);
    this.scene.add(g);
    this.items.push({
      id, group: g,
      pos: new THREE.Vector3(pos.x, 0, pos.z),
      // A dropped weapon comes with what is left in it plus a little spare.
      mag: mag ?? Math.max(1, Math.round(spec.mag * (0.3 + Math.random() * 0.5))),
      reserve: reserve ?? Math.round(spec.reserve * (0.25 + Math.random() * 0.35)),
    });
  }

  // The closest pickup within reach, or null.
  nearest(player, range = 2.2) {
    let best = null, bestD = range;
    for (const it of this.items) {
      const d = Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z);
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  take(item) {
    const i = this.items.indexOf(item);
    if (i >= 0) { this.scene.remove(item.group); this.items.splice(i, 1); }
  }

  clear() {
    for (const it of this.items) this.scene.remove(it.group);
    this.items.length = 0;
  }
}
