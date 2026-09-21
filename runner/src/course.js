import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from '../../prototype/src/textures.js';
import { EnemyField } from './enemy.js';

// A town you run over the top of. Streets below are not solid - falling drops
// you back to the last rooftop you were on, which costs a second and your chain.
//
// [z, x, width, depth, height]
const BUILDINGS = [
  [20, 0, 26, 30, 26],          // a tall roof - the opening move is to dive off it
  [-28, 0.0, 22, 22, 10.5],
  [-42, -20.0, 16, 18, 5.5],
  [-54.0, 9.4, 22, 22, 13.1],
  [-81.5, 11.7, 22, 22, 15.0],
  [-95.5, -8.3, 16, 18, 10.0],
  [-110.5, 5.1, 22, 22, 17.5],
  [-141.0, -5.3, 22, 22, 14.5],
  [-155.0, 14.7, 16, 18, 9.5],
  [-173.0, -11.7, 22, 22, 12.4],
  [-206.5, -9.3, 22, 22, 9.7],
  [-220.5, 10.7, 16, 18, 5],
  [-241.5, 0.2, 22, 22, 9.2],
  [-278.0, 9.5, 22, 22, 6],
  [-292.0, -10.5, 16, 18, 5],
  [-316.0, 11.6, 22, 22, 6],
  [-355.5, 4.9, 22, 22, 7.0],
  [-369.5, -15.1, 16, 18, 5],
  [-396.5, -5.5, 22, 22, 11.3],
  [-439.0, -11.8, 22, 22, 12.1],
  [-453.0, 8.2, 16, 18, 7.1],
  [-483.0, -9.1, 22, 22, 14.3],
  [-528.5, 0.4, 22, 22, 15.4],
  [-542.5, -19.6, 16, 18, 10.4],
  [-575.5, 9.6, 22, 22, 17.1],
  [-624.0, 11.6, 22, 22, 13.4],
  [-638.0, -8.4, 16, 18, 8.4],
  [-664.0, 0, 30, 30, 16],      // finish roof
];

// [z, x, y, kind] - y is metres above the street.
const ENEMIES = [
  [-28, 0.0, 15.0, 'grunt'],
  [-54.0, 9.4, 17.6, 'flyer'],
  [-81.5, 11.7, 19.5, 'grunt'],
  [-110.5, 5.1, 22.0, 'grunt'],
  [-141.0, -5.3, 19.0, 'heavy'],
  [-173.0, -11.7, 16.9, 'grunt'],
  [-206.5, -9.3, 14.2, 'grunt'],
  [-241.5, 0.2, 13.7, 'flyer'],
  [-278.0, 9.5, 10.2, 'grunt'],
  [-316.0, 11.6, 10.1, 'heavy'],
  [-355.5, 4.9, 11.5, 'flyer'],
  [-396.5, -5.5, 15.8, 'grunt'],
  [-439.0, -11.8, 16.6, 'grunt'],
  [-483.0, -9.1, 18.8, 'flyer'],
  [-528.5, 0.4, 19.9, 'heavy'],
  [-575.5, 9.6, 21.6, 'grunt'],
  [-624.0, 11.6, 17.9, 'flyer'],
];

function mergeStatics(scene, meshes) {
  const groups = new Map(), keep = [];
  for (const m of meshes) {
    if (!m.isMesh || !m.material || m.material.length) { keep.push(m); continue; }
    const k = m.material.uuid;
    if (!groups.has(k)) groups.set(k, { material: m.material, list: [] });
    groups.get(k).list.push(m);
  }
  const out = [...keep];
  for (const { material, list } of groups.values()) {
    if (list.length < 2) { out.push(...list); continue; }
    const geos = list.map(m => {
      m.updateMatrixWorld(true);
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      return g;
    });
    let combined = null;
    try { combined = mergeGeometries(geos, false); } catch { combined = null; }
    if (!combined) { out.push(...list); geos.forEach(g => g.dispose()); continue; }
    list.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    geos.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(combined, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
    out.push(mesh);
  }
  return out;
}

export function buildCourse(scene) {
  const colliders = [], solids = [];
  const M = {
    wall: new THREE.MeshLambertMaterial({ map: TEX.plaster('#c9c4b8', 3) }),
    wall2: new THREE.MeshLambertMaterial({ map: TEX.brick(3) }),
    roof: new THREE.MeshLambertMaterial({ color: 0x7c8086 }),
    trim: new THREE.MeshLambertMaterial({ color: 0x5d6b74 }),
    metal: new THREE.MeshLambertMaterial({ map: TEX.roofMetal(3) }),
    street: new THREE.MeshLambertMaterial({ color: 0x4a4e52 }),
    accent: new THREE.MeshLambertMaterial({ color: 0x2f8f7a }),
    start: new THREE.MeshLambertMaterial({ color: 0x2c5f7a }),
  };

  const add = (mesh, collide = true) => {
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh); solids.push(mesh);
    if (collide) {
      mesh.updateMatrixWorld(true);
      colliders.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  };

  scene.background = new THREE.Color(0x9ec4de);
  scene.fog = new THREE.FogExp2(0x9ec4de, 0.0016);

  // the street far below - deliberately not solid, falling resets you
  const street = new THREE.Mesh(new THREE.PlaneGeometry(320, 900), M.street);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0, -190);
  street.receiveShadow = true;
  scene.add(street);

  const checkpoints = [];
  BUILDINGS.forEach(([z, x, w, d, h], i) => {
    const first = i === 0, last = i === BUILDINGS.length - 1;
    add(box(w, h, d, first ? M.start : (i % 3 === 1 ? M.wall2 : M.wall), x, h / 2, z));
    add(box(w + 0.8, 0.5, d + 0.8, last ? M.accent : M.roof, x, h + 0.25, z), true);
    // a parapet, so roof edges read clearly when you are moving fast
    for (const [ox, oz, pw, pd] of [[0, -d / 2, w + 0.8, 0.4], [0, d / 2, w + 0.8, 0.4],
                                    [-w / 2, 0, 0.4, d + 0.8], [w / 2, 0, 0.4, d + 0.8]])
      add(box(pw, 0.7, pd, M.trim, x + ox, h + 0.85, z + oz), true);
    // Rooftop clutter. Bare roofs read as featureless planes at speed, and you
    // need edges and silhouettes to judge distance while moving.
    if (!last) {
      add(box(2.2, 1.6, 2.2, M.metal, x + w / 4, h + 1.3, z - d / 4), true);
      add(box(3.0, 0.9, 1.6, M.metal, x - w / 3, h + 0.95, z - d / 3), true);
      add(box(1.4, 0.55, 1.4, M.trim, x + w / 3, h + 0.78, z + d / 3), true);
      // a low duct running across, which also works as cover
      add(box(w * 0.6, 0.8, 1.1, M.trim, x, h + 0.9, z + d / 5), true);
      if (i % 2 === 0) {
        add(box(1.0, 3.2, 1.0, M.trim, x - w / 4, h + 2.1, z + d / 4), true);
        add(box(2.6, 1.4, 2.6, M.metal, x - w / 4, h + 4.4, z + d / 4), true);
      }
      if (i % 3 === 0) {
        for (let k = 0; k < 3; k++)
          add(box(0.5, 2.4, 0.5, M.trim, x - w / 2 + 1.5 + k * 1.1, h + 1.7, z - d / 2 + 1.5), true);
      }
    }
    checkpoints.push(new THREE.Vector3(x, h + 0.6, z + d / 2 - 2.5));
  });

  // finish gate on the last roof
  const gate = new THREE.Group();
  for (const sx of [-5, 5]) gate.add(box(0.8, 8, 0.8, M.accent, sx, 4, 0));
  gate.add(box(10.8, 0.8, 0.8, M.accent, 0, 8, 0));
  gate.position.set(0, 14.5, -400);
  scene.add(gate);

  const field = new EnemyField(scene);
  for (const [z, x, y, kind] of ENEMIES) field.add(new THREE.Vector3(x, y, z), kind);

  const merged = mergeStatics(scene, solids);

  return {
    colliders, solids: merged, field, checkpoints,
    start: new THREE.Vector3(0, 26.8, 26),
    startYaw: 0,
    finishZ: -664.0,
    finishBox: new THREE.Box3(
      new THREE.Vector3(-13, 15, -671.0), new THREE.Vector3(13, 34, -657.0)),
    medals: { gold: 60, silver: 80, bronze: 105 },
  };
}
