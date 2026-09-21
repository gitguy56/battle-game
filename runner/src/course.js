import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from '../../prototype/src/textures.js';
import { EnemyField } from './enemy.js';

// A town you run over the top of. Streets below are not solid - falling drops
// you back to the last rooftop you were on, which costs a second and your chain.
//
// [z, x, width, depth, height]
const BUILDINGS = [
  [14, 0, 18, 16, 34],          // a tall narrow roof - you start near the edge,
                                //  looking down at the first target
  [-10.5, 0.0, 22, 22, 17.4],
  [-24.5, -20.0, 16, 18, 12.4],
  [-36.5, 9.4, 22, 22, 16.6],
  [-64.0, 11.7, 22, 22, 18.5],
  [-78.0, -8.3, 16, 18, 13.5],
  [-93.0, 5.1, 22, 22, 21.0],
  [-123.5, -5.3, 22, 22, 18.0],
  [-137.5, 14.7, 16, 18, 13.0],
  [-155.5, -11.7, 22, 22, 15.9],
  [-189.0, -9.3, 22, 22, 13.2],
  [-203.0, 10.7, 16, 18, 8.2],
  [-224.0, 0.2, 22, 22, 12.7],
  [-260.5, 9.5, 22, 22, 9.2],
  [-274.5, -10.5, 16, 18, 5],
  [-298.5, 11.6, 22, 22, 9.1],
  [-338.0, 4.9, 22, 22, 10.5],
  [-352.0, -15.1, 16, 18, 5.5],
  [-379.0, -5.5, 22, 22, 14.8],
  [-421.5, -11.8, 22, 22, 15.6],
  [-435.5, 8.2, 16, 18, 10.6],
  [-465.5, -9.1, 22, 22, 17.8],
  [-511.0, 0.4, 22, 22, 18.9],
  [-525.0, -19.6, 16, 18, 13.9],
  [-558.0, 9.6, 22, 22, 20.6],
  [-606.5, 11.6, 22, 22, 16.9],
  [-620.5, -8.4, 16, 18, 11.9],
  [-646.5, 0, 30, 30, 16],      // finish roof
];

// [z, x, y, kind] - y is metres above the street.
const ENEMIES = [
  [-10.5, 0.0, 17.95, 'grunt'],
  [-36.5, 9.4, 22.65, 'flyer'],
  [-64.0, 11.7, 19.05, 'grunt'],
  [-93.0, 5.1, 21.55, 'grunt'],
  [-123.5, -5.3, 18.55, 'heavy'],
  [-155.5, -11.7, 16.45, 'grunt'],
  [-189.0, -9.3, 13.75, 'grunt'],
  [-224.0, 0.2, 18.75, 'flyer'],
  [-260.5, 9.5, 9.75, 'grunt'],
  [-298.5, 11.6, 9.65, 'heavy'],
  [-338.0, 4.9, 16.55, 'flyer'],
  [-379.0, -5.5, 15.35, 'grunt'],
  [-421.5, -11.8, 16.15, 'grunt'],
  [-465.5, -9.1, 23.85, 'flyer'],
  [-511.0, 0.4, 19.45, 'heavy'],
  [-558.0, 9.6, 21.15, 'grunt'],
  [-606.5, 11.6, 22.95, 'flyer'],
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
    // Rooftop clutter, kept to the edges. The middle of every roof is where
    // the enemy stands and where you land on them, and clutter there both
    // blocks the landing and can wedge you in place.
    if (!first && !last) {
      const edge = (fx, fz) => [x + fx * (w / 2 - 1.8), z + fz * (d / 2 - 1.8)];
      let [cx, cz] = edge(0.9, -0.9);
      add(box(2.2, 1.6, 2.2, M.metal, cx, h + 1.3, cz), true);
      [cx, cz] = edge(-0.9, -0.85);
      add(box(3.0, 0.9, 1.6, M.metal, cx, h + 0.95, cz), true);
      [cx, cz] = edge(0.85, 0.9);
      add(box(1.4, 0.55, 1.4, M.trim, cx, h + 0.78, cz), true);
      // a duct along one edge rather than across the middle
      [cx, cz] = edge(-0.95, 0);
      add(box(1.1, 0.8, d * 0.5, M.trim, cx, h + 0.9, cz), true);
      if (i % 2 === 0) {
        [cx, cz] = edge(-0.88, 0.88);
        add(box(1.0, 3.2, 1.0, M.trim, cx, h + 2.1, cz), true);
        add(box(2.6, 1.4, 2.6, M.metal, cx, h + 4.4, cz), true);
      }
      if (i % 3 === 0) {
        [cx, cz] = edge(0.2, -0.95);
        for (let k = 0; k < 3; k++)
          add(box(0.5, 2.4, 0.5, M.trim, cx + k * 1.1, h + 1.7, cz), true);
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

  // Guard against exactly the bug that shipped once: a piece of rooftop clutter
  // landing on the spawn and wedging the player in place.
  const start = new THREE.Vector3(0, BUILDINGS[0][4] + 0.8, BUILDINGS[0][0] + 5);
  const sb = new THREE.Box3(
    new THREE.Vector3(start.x - 0.34, start.y, start.z - 0.34),
    new THREE.Vector3(start.x + 0.34, start.y + 1.75, start.z + 0.34));
  const spawnBlocked = colliders.some(c => c.intersectsBox(sb));
  if (spawnBlocked) console.error('Chainrunner: the spawn point is inside geometry');

  // Every target needs clear air around it, or you cannot land on them and can
  // get wedged in the clutter beside them.
  const crowded = [];
  field.list.forEach((e, i) => {
    const box = new THREE.Box3(
      new THREE.Vector3(e.pos.x - 3, e.pos.y + 0.25, e.pos.z - 3),   // above their feet, so the roof itself does not count
      new THREE.Vector3(e.pos.x + 3, e.pos.y + 6, e.pos.z + 3));
    if (colliders.some(c => c.intersectsBox(box))) crowded.push(i);
  });
  if (crowded.length) console.error('Chainrunner: clutter around targets', crowded);

  return {
    spawnBlocked,
    colliders, solids: merged, field, checkpoints,
    start,
    startYaw: 0,
    finishZ: -646.5,
    finishBox: new THREE.Box3(
      new THREE.Vector3(-13, 15, -653.5), new THREE.Vector3(13, 34, -639.5)),
    medals: { gold: 68, silver: 86, bronze: 112 },
  };
}
