// The map: a single-storey village house on a fenced plot.
// Layout (looking down, north is -z):
//
//        +-------------------+-------------------+
//        |     KITCHEN       |    LIVING ROOM    |
//   z=1  +----+---[d]----+---+--[d]--+-----------+
//        | BED1 |      CORRIDOR      |   BED2    |
//        +------+------[FRONT DOOR]--+-----------+
//
import * as THREE from 'three';
import * as TEX from './textures.js';

const WALL_H = 2.7;
const WALL_T = 0.25;
const HX = 6, HZ = 4.5; // house half-extents

export function buildMap(scene) {
  const colliders = [];
  const solids = [];   // meshes the bullets can hit

  const add = (mesh, collide = true) => {
    scene.add(mesh);
    mesh.castShadow = true; mesh.receiveShadow = true;
    solids.push(mesh);
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

  // ---- materials ----
  const matPlaster = new THREE.MeshLambertMaterial({ map: TEX.plaster('#b3b9b0', 2) });
  const matPlasterIn = new THREE.MeshLambertMaterial({ map: TEX.plaster('#bfb8a6', 2) });
  const matBrick = new THREE.MeshLambertMaterial({ map: TEX.brick(2) });
  const matWood = new THREE.MeshLambertMaterial({ map: TEX.wood('#6d5741') });
  const matTrim = new THREE.MeshLambertMaterial({ map: TEX.paintedWood('#3f6d86') });
  const matRoof = new THREE.MeshLambertMaterial({ map: TEX.roofMetal(8) });
  const matFloor = new THREE.MeshLambertMaterial({ map: TEX.floorBoards(6) });
  const matConcrete = new THREE.MeshLambertMaterial({ map: TEX.concrete(3) });
  const matDark = new THREE.MeshLambertMaterial({ color: 0x2a2724 });

  // ---- ground ----
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
    new THREE.MeshLambertMaterial({ map: TEX.ground(60) }));
  gnd.rotation.x = -Math.PI / 2;
  gnd.receiveShadow = true;
  scene.add(gnd);
  solids.push(gnd);

  // ---- wall builder with door/window openings ----
  // Openings are measured from the start of the wall along its axis.
  function wall(x1, z1, x2, z2, mat, openings = [], h = WALL_H, t = WALL_T) {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const s = alongX ? Math.min(x1, x2) : Math.min(z1, z2);
    const fixed = alongX ? z1 : x1;

    const seg = (from, to, yBot, yTop) => {
      if (to - from < 0.001 || yTop - yBot < 0.001) return;
      const w = to - from, cy = (yBot + yTop) / 2, hh = yTop - yBot;
      const c = s + from + w / 2;
      add(alongX ? box(w, hh, t, mat, c, cy, fixed) : box(t, hh, w, mat, fixed, cy, c));
    };

    const ops = [...openings].sort((a, b) => a.at - b.at);
    let cursor = 0;
    for (const o of ops) {
      const a = o.at - o.width / 2, b = o.at + o.width / 2;
      seg(cursor, a, 0, h);
      if (o.bottom > 0) seg(a, b, 0, o.bottom);      // sill under a window
      if (o.top < h) seg(a, b, o.top, h);            // lintel over the opening
      cursor = b;
    }
    seg(cursor, len, 0, h);
  }

  const win = (at) => ({ at, width: 1.1, bottom: 1.0, top: 2.2 });
  const door = (at, width = 0.95) => ({ at, width, bottom: 0, top: 2.1 });

  // ---- exterior walls (openings measured from the min end of each wall) ----
  // South (front) wall: front door in the middle, a window each side.
  wall(-HX, HZ, HX, HZ, matPlaster, [win(2), door(6, 1.05), win(10)]);
  // North (back) wall: windows, plus a shell hole punched through it.
  wall(-HX, -HZ, HX, -HZ, matPlaster,
    [win(2), win(4.5), { at: 7.5, width: 1.5, bottom: 0.45, top: 2.05 }, win(10)]);
  // West and east walls.
  wall(-HX, -HZ, -HX, HZ, matPlaster, [win(2.5), win(7.3)]);
  wall(HX, -HZ, HX, HZ, matPlaster, [win(2.5), win(7.3)]);

  // ---- interior walls ----
  wall(0, -HZ, 0, 1, matPlasterIn, [door(3)]);                 // kitchen | living
  wall(-HX, 1, HX, 1, matPlasterIn, [door(4.5), door(7.5)]);   // north rooms | south rooms
  wall(-2, 1, -2, HZ, matPlasterIn, [door(1.7)]);              // bed1 | corridor
  wall(2, 1, 2, HZ, matPlasterIn, [door(1.7)]);                // bed2 | corridor

  // exposed brick around the shell hole
  add(box(1.7, 0.3, 0.3, matBrick, 1.5, 2.2, -HZ), false);
  for (let i = 0; i < 9; i++) {
    add(box(0.3 + Math.random() * 0.25, 0.2, 0.25, matBrick,
      1.5 + (Math.random() - 0.5) * 3, 0.1, -HZ - 0.6 - Math.random() * 1.6));
  }

  // ---- floor, ceiling, roof ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02;
  floor.receiveShadow = true; scene.add(floor); solids.push(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), matPlasterIn);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = WALL_H;
  scene.add(ceil); solids.push(ceil);

  // gabled roof, two slabs meeting at the ridge
  const rise = 1.5, over = 0.5;
  const slope = Math.atan2(rise, HZ + over);
  const rlen = Math.hypot(rise, HZ + over);
  for (const sgn of [1, -1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(HX * 2 + over * 2, 0.12, rlen), matRoof);
    r.position.set(0, WALL_H + rise / 2, sgn * (HZ + over) / 2);
    r.rotation.x = sgn * slope;
    r.castShadow = true; scene.add(r); solids.push(r);
  }
  // gable ends
  for (const sgn of [1, -1]) {
    const g = new THREE.Mesh(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-HX, 0, 0), new THREE.Vector3(HX, 0, 0), new THREE.Vector3(0, rise, 0)]),
      matPlaster);
    g.geometry.setIndex([0, 1, 2]); g.geometry.computeVertexNormals();
    g.position.set(0, WALL_H, sgn * HZ);
    g.material = new THREE.MeshLambertMaterial({ map: TEX.plaster('#b3b9b0', 1), side: THREE.DoubleSide });
    scene.add(g); solids.push(g);
  }

  // ---- window trim ----
  for (const [x, z, ax] of [[-4, HZ, 'x'], [4, HZ, 'x'], [-4, -HZ, 'x'], [-1.5, -HZ, 'x'],
  [4, -HZ, 'x'], [-HX, -2, 'z'], [-HX, 2.8, 'z'], [HX, -2, 'z'], [HX, 2.8, 'z']]) {
    const w = ax === 'x' ? 1.35 : 0.14, d = ax === 'x' ? 0.14 : 1.35;
    add(box(w, 0.12, d, matTrim, x, 0.96, z), false);
    add(box(w, 0.12, d, matTrim, x, 2.26, z), false);
  }

  // ---- porch ----
  add(box(4.4, 0.18, 2.0, matConcrete, 0, 0.09, HZ + 1.0));
  for (const x of [-1.9, 1.9]) add(box(0.16, 2.3, 0.16, matWood, x, 1.24, HZ + 1.85));
  add(box(4.4, 0.14, 2.2, matRoof, 0, 2.45, HZ + 1.0), false);
  add(box(1.1, 2.05, 0.08, matTrim, -0.9, 1.02, HZ + 0.05), false); // door, hanging open

  // ---- furniture: cover to fight around ----
  add(box(1.5, 1.9, 1.3, matPlasterIn, -4.6, 0.95, -3.2));  // masonry stove
  add(box(1.6, 0.85, 0.9, matWood, -2.5, 0.42, -2.0));      // kitchen table
  add(box(2.0, 0.55, 0.95, matWood, 3.6, 0.27, -2.6));      // couch
  add(box(1.1, 0.7, 0.55, matWood, 1.2, 0.35, -0.2));       // sideboard
  add(box(1.9, 0.55, 1.0, matWood, -4.3, 0.27, 3.2));       // bed 1
  add(box(1.9, 0.55, 1.0, matWood, 4.3, 0.27, 3.2));        // bed 2
  add(box(0.9, 0.75, 0.5, matWood, 3.3, 0.37, 1.9));        // dresser

  // ---- yard ----
  const F = 17;
  const fenceMat = new THREE.MeshLambertMaterial({ map: TEX.wood('#5e5346') });
  for (let i = -F; i <= F; i += 1.5) {
    for (const [x, z] of [[i, -F], [i, F], [-F, i], [F, i]]) {
      if (Math.abs(x) < 1.6 && z > 0) continue; // gateway
      add(box(0.12, 1.3, 0.12, fenceMat, x, 0.65, z), false);
    }
  }
  for (const [x, z, w, d] of [[0, -F, F * 2, 0.06], [0, F, F * 2, 0.06], [-F, 0, 0.06, F * 2], [F, 0, 0.06, F * 2]]) {
    add(box(w, 0.08, d, fenceMat, x, 1.15, z), false);
  }

  // path from the gate to the porch
  add(box(1.6, 0.06, 10, matConcrete, 0, 0.03, 11), false);

  // shed
  add(box(3.4, 2.3, 2.8, matWood, -11.5, 1.15, -7));
  add(box(3.8, 0.12, 3.2, matRoof, -11.5, 2.35, -7), false);

  // well
  add(box(1.3, 0.9, 1.3, matConcrete, 9.5, 0.45, -8));
  for (const x of [8.95, 10.05]) add(box(0.12, 1.6, 0.12, matWood, x, 1.7, -8), false);
  add(box(1.5, 0.12, 0.6, matRoof, 9.5, 2.5, -8), false);

  // sandbags by the porch
  for (let i = 0; i < 7; i++) {
    add(box(0.65, 0.28, 0.4, matDark, -3.2 + (i % 4) * 0.68, 0.14 + Math.floor(i / 4) * 0.28, HZ + 1.9));
  }

  // burnt-out car by the gate
  add(box(1.9, 0.8, 4.2, matDark, 6.5, 0.4, 10));
  add(box(1.7, 0.7, 1.9, matDark, 6.5, 1.15, 10.4));

  // trees
  const bark = new THREE.MeshLambertMaterial({ color: 0x4a3c2e });
  const leaf = new THREE.MeshLambertMaterial({ color: 0x4b5334 });
  for (const [x, z] of [[-13, 8], [-9, 12], [12, -13], [14, 4], [-15, -2], [9, 13]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 4.2, 6), bark);
    t.position.set(x, 2.1, z); t.castShadow = true; scene.add(t); solids.push(t);
    colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 2.1, z), new THREE.Vector3(0.6, 4.2, 0.6)));
    const c = new THREE.Mesh(new THREE.SphereGeometry(2.1, 7, 5), leaf);
    c.position.set(x, 4.9, z); c.castShadow = true; scene.add(c); solids.push(c);
  }

  // garden rows behind the house
  const soil = new THREE.MeshLambertMaterial({ color: 0x3e3527 });
  for (let i = 0; i < 6; i++) add(box(7, 0.16, 0.7, soil, -8, 0.08, -12 + i * 1.3), false);

  return {
    colliders, solids,
    playerSpawn: new THREE.Vector3(0, 0, 14.5),
    houseBounds: new THREE.Box3(
      new THREE.Vector3(-HX, 0, -HZ), new THREE.Vector3(HX, WALL_H, HZ)),
    enemyPosts: [
      { pos: new THREE.Vector3(-3.5, 0, -3.0), patrol: [new THREE.Vector3(-3.5, 0, -3.0), new THREE.Vector3(-1.0, 0, -0.5)] },
      { pos: new THREE.Vector3(4.0, 0, -2.0), patrol: [new THREE.Vector3(4.0, 0, -2.0), new THREE.Vector3(3.0, 0, 2.2)] },
      { pos: new THREE.Vector3(-10.5, 0, -4.0), patrol: [new THREE.Vector3(-10.5, 0, -4.0), new THREE.Vector3(-6.0, 0, 6.0), new THREE.Vector3(2.0, 0, 8.0)] },
    ],
  };
}
