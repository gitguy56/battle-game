import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from '../../prototype/src/textures.js';
import { EnemyField } from './enemy.js';

// A town you run over the top of. Streets below are not solid - falling drops
// you back to the last rooftop you were on, which costs a second and your chain.
//
// [z, x, width, depth, height]
const BUILDINGS = [
  [14, 0, 20, 26, 9],        // the roof you start on
  [-14, -12, 16, 18, 7],
  [-16, 10, 18, 20, 11],
  [-44, -6, 20, 20, 13],
  [-48, 16, 14, 16, 8],
  [-76, 4, 22, 22, 16],
  [-80, -18, 16, 18, 10],
  [-110, -8, 18, 20, 19],
  [-114, 14, 16, 18, 12],
  [-146, 2, 20, 22, 15],
  [-152, -20, 14, 16, 22],
  [-182, 10, 18, 20, 18],
  [-186, -12, 18, 18, 12],
  [-216, -2, 22, 22, 24],
  [-222, 20, 14, 16, 14],
  [-252, -14, 18, 20, 20],
  [-258, 8, 16, 18, 26],
  [-288, -4, 20, 22, 17],
  [-294, 18, 14, 16, 22],
  [-324, -16, 18, 20, 25],
  [-330, 6, 18, 20, 19],
  [-362, 0, 22, 24, 21],
  [-396, 0, 26, 26, 14],     // finish roof
];

// [z, x, y, kind] - y is metres above the street.
const ENEMIES = [
  [-4, -4, 10.0, 'grunt'],
  [-16, 10, 11.2, 'grunt'],
  [-30, 2, 12.0, 'flyer'],
  [-44, -6, 13.2, 'grunt'],
  [-48, 16, 8.2, 'grunt'],
  [-62, 6, 14.5, 'flyer'],
  [-76, 4, 16.2, 'heavy'],
  [-80, -18, 10.2, 'grunt'],
  [-96, -12, 17.0, 'flyer'],
  [-110, -8, 19.2, 'grunt'],
  [-114, 14, 12.2, 'grunt'],
  [-130, 6, 16.0, 'flyer'],
  [-146, 2, 15.2, 'heavy'],
  [-152, -20, 22.2, 'grunt'],
  [-168, -6, 19.0, 'flyer'],
  [-182, 10, 18.2, 'grunt'],
  [-186, -12, 12.2, 'grunt'],
  [-202, 0, 21.0, 'flyer'],
  [-216, -2, 24.2, 'heavy'],
  [-222, 20, 14.2, 'grunt'],
  [-238, 4, 22.0, 'flyer'],
  [-252, -14, 20.2, 'grunt'],
  [-258, 8, 26.2, 'heavy'],
  [-274, -4, 22.0, 'flyer'],
  [-288, -4, 17.2, 'grunt'],
  [-294, 18, 22.2, 'grunt'],
  [-310, 0, 23.0, 'flyer'],
  [-324, -16, 25.2, 'heavy'],
  [-330, 6, 19.2, 'grunt'],
  [-346, -4, 22.0, 'flyer'],
  [-362, 0, 21.2, 'grunt'],
  [-380, 0, 18.0, 'flyer'],
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
    start: new THREE.Vector3(0, 9.8, 20),
    startYaw: 0,
    finishZ: -400,
    finishBox: new THREE.Box3(
      new THREE.Vector3(-11, 14, -406), new THREE.Vector3(11, 26, -394)),
    medals: { gold: 42, silver: 56, bronze: 75 },
  };
}
