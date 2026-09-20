// The map: a village house on a fenced plot, plus a barn you can fight inside.
//
//        +-------------------+-------------------+
//        |     KITCHEN       |    LIVING ROOM    |
//   z=1  +----+---[d]----+---+--[d]--+-----------+
//        | BED1 |      CORRIDOR      |   BED2    |
//        +------+------[FRONT DOOR]--+-----------+
//
import * as THREE from 'three';
import * as TEX from './textures.js';

const WALL_H = 2.7, WALL_T = 0.25;
const HX = 6, HZ = 4.5;

export function buildMap(scene) {
  const colliders = [], solids = [];

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
    m.position.set(x, y, z); return m;
  };
  const flat = (w, d, mat, x, y, z, rot = -Math.PI / 2) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = rot; m.position.set(x, y, z);
    m.receiveShadow = true; scene.add(m); solids.push(m); return m;
  };

  const M = {
    out: new THREE.MeshLambertMaterial({ map: TEX.plaster('#dfe2da') }),
    in: new THREE.MeshLambertMaterial({ map: TEX.plaster('#e7e3d6') }),
    brick: new THREE.MeshLambertMaterial({ map: TEX.brick(2) }),
    wood: new THREE.MeshLambertMaterial({ map: TEX.wood('#8a6c4c') }),
    barn: new THREE.MeshLambertMaterial({ map: TEX.wood('#7a5d42', 2) }),
    trim: new THREE.MeshLambertMaterial({ map: TEX.paintedWood('#4f7d94') }),
    roof: new THREE.MeshLambertMaterial({ map: TEX.roofMetal(6) }),
    boards: new THREE.MeshLambertMaterial({ map: TEX.floorBoards(5) }),
    boards2: new THREE.MeshLambertMaterial({ map: TEX.floorBoards(4) }),
    tile: new THREE.MeshLambertMaterial({ map: TEX.tile('#c2bfb4', 4) }),
    tile2: new THREE.MeshLambertMaterial({ map: TEX.tile('#a9b2ac', 3) }),
    concrete: new THREE.MeshLambertMaterial({ map: TEX.concrete(3) }),
    crate: new THREE.MeshLambertMaterial({ color: 0x9c7345 }),
    barrel: new THREE.MeshLambertMaterial({ color: 0x53635a }),
    stone: new THREE.MeshLambertMaterial({ color: 0x8e8b82 }),
    dark: new THREE.MeshLambertMaterial({ color: 0x3e3b36 }),
  };

  flat(220, 220, new THREE.MeshLambertMaterial({ map: TEX.ground(50) }), 0, 0, 0);

  // ---- wall builder: openings are measured from the wall's min end ----
  function wall(x1, z1, x2, z2, mat, openings = [], h = WALL_H, t = WALL_T) {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const s = alongX ? Math.min(x1, x2) : Math.min(z1, z2);
    const fixed = alongX ? z1 : x1;
    const seg = (from, to, yB, yT) => {
      if (to - from < 0.001 || yT - yB < 0.001) return;
      const w = to - from, c = s + from + w / 2;
      add(alongX ? box(w, yT - yB, t, mat, c, (yB + yT) / 2, fixed)
                 : box(t, yT - yB, w, mat, fixed, (yB + yT) / 2, c));
    };
    let cursor = 0;
    for (const o of [...openings].sort((a, b) => a.at - b.at)) {
      const a = o.at - o.width / 2, b = o.at + o.width / 2;
      seg(cursor, a, 0, h);
      if (o.bottom > 0) seg(a, b, 0, o.bottom);
      if (o.top < h) seg(a, b, o.top, h);
      cursor = b;
      // frame the opening so it reads as a window or door, not a hole
      const fx = alongX ? s + o.at : fixed, fz = alongX ? fixed : s + o.at;
      const fw = alongX ? o.width + 0.26 : 0.16, fd = alongX ? 0.16 : o.width + 0.26;
      add(box(fw, 0.11, fd, M.trim, fx, o.bottom, fz), false);
      if (o.top < h) add(box(fw, 0.11, fd, M.trim, fx, o.top, fz), false);
    }
    seg(cursor, len, 0, h);
  }
  const win = at => ({ at, width: 1.2, bottom: 1.0, top: 2.2 });
  const door = (at, width = 1.0) => ({ at, width, bottom: 0, top: 2.1 });

  // ---- house shell ----
  wall(-HX, HZ, HX, HZ, M.out, [win(2), door(6, 1.1), win(10)]);
  wall(-HX, -HZ, HX, -HZ, M.out,
    [win(2), win(4.5), { at: 7.5, width: 1.6, bottom: 0.4, top: 2.1 }, win(10)]);
  wall(-HX, -HZ, -HX, HZ, M.out, [win(2.5), win(7.3)]);
  wall(HX, -HZ, HX, HZ, M.out, [win(2.5), win(7.3)]);

  wall(0, -HZ, 0, 1, M.in, [door(3)]);
  wall(-HX, 1, HX, 1, M.in, [door(4.5), door(7.5)]);
  wall(-2, 1, -2, HZ, M.in, [door(1.7)]);
  wall(2, 1, 2, HZ, M.in, [door(1.7)]);

  // exposed brick + rubble around the shell hole
  add(box(1.8, 0.28, 0.3, M.brick, 1.5, 2.24, -HZ), false);
  for (let i = 0; i < 8; i++) {
    add(box(0.32, 0.2, 0.26, M.brick,
      1.5 + (Math.random() - 0.5) * 3, 0.1, -HZ - 0.7 - Math.random() * 1.5));
  }

  // ---- per-room floors, so you always know which room you are in ----
  flat(6, 5.5, M.tile,   -3, 0.02, -1.75); // kitchen
  flat(6, 5.5, M.boards,  3, 0.02, -1.75); // living
  flat(4, 3.5, M.boards2, 0, 0.02, 2.75);  // corridor
  flat(4, 3.5, M.tile2,  -4, 0.02, 2.75);  // bed 1
  flat(4, 3.5, M.tile2,   4, 0.02, 2.75);  // bed 2
  flat(HX * 2, HZ * 2, M.in, 0, WALL_H, 0, Math.PI / 2); // ceiling

  // ---- roof ----
  const rise = 1.5, over = 0.55;
  const slope = Math.atan2(rise, HZ + over), rlen = Math.hypot(rise, HZ + over);
  for (const sgn of [1, -1]) {
    const r = box(HX * 2 + over * 2, 0.12, rlen, M.roof, 0, WALL_H + rise / 2, sgn * (HZ + over) / 2);
    r.rotation.x = sgn * slope;
    r.castShadow = true; scene.add(r); solids.push(r);
  }
  for (const sgn of [1, -1]) {
    const g = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-HX, 0, 0), new THREE.Vector3(HX, 0, 0), new THREE.Vector3(0, rise, 0)]),
      new THREE.MeshLambertMaterial({ map: TEX.plaster('#dfe2da'), side: THREE.DoubleSide }));
    g.geometry.setIndex([0, 1, 2]); g.geometry.computeVertexNormals();
    g.position.set(0, WALL_H, sgn * HZ);
    scene.add(g); solids.push(g);
  }

  // ---- porch ----
  add(box(4.6, 0.18, 2.1, M.concrete, 0, 0.09, HZ + 1.05));
  for (const x of [-2.0, 2.0]) add(box(0.16, 2.3, 0.16, M.wood, x, 1.24, HZ + 1.9));
  add(box(4.6, 0.14, 2.3, M.roof, 0, 2.46, HZ + 1.05), false);
  add(box(1.05, 2.05, 0.08, M.trim, -0.95, 1.02, HZ + 0.06), false);

  // ---- furniture: cover, and something to break sightlines ----
  add(box(1.5, 1.9, 1.3, M.in, -4.6, 0.95, -3.2));     // stove
  add(box(1.7, 0.85, 0.95, M.wood, -2.4, 0.42, -1.9)); // table
  add(box(0.9, 1.75, 0.5, M.wood, -5.4, 0.87, 0.2));   // dresser
  add(box(2.1, 0.6, 0.95, M.wood, 3.7, 0.3, -2.7));    // couch
  add(box(1.2, 0.75, 0.6, M.wood, 1.3, 0.37, -0.3));   // sideboard
  add(box(0.9, 1.8, 0.45, M.wood, 5.4, 0.9, -3.6));    // bookcase
  add(box(1.9, 0.55, 1.05, M.wood, -4.4, 0.27, 3.3));  // bed 1
  add(box(1.9, 0.55, 1.05, M.wood, 4.4, 0.27, 3.3));   // bed 2
  add(box(0.95, 0.8, 0.5, M.wood, 3.2, 0.4, 1.9));     // dresser

  // ---- barn: a second place to fight, with two ways in ----
  const BX = -13, BZ = -6, BW = 7, BD = 6, BH = 3.2;
  wall(BX - BW / 2, BZ + BD / 2, BX + BW / 2, BZ + BD / 2, M.barn, [door(3.5, 1.8)], BH);
  wall(BX - BW / 2, BZ - BD / 2, BX + BW / 2, BZ - BD / 2, M.barn, [win(3.5)], BH);
  wall(BX - BW / 2, BZ - BD / 2, BX - BW / 2, BZ + BD / 2, M.barn, [], BH);
  wall(BX + BW / 2, BZ - BD / 2, BX + BW / 2, BZ + BD / 2, M.barn, [door(3, 1.6)], BH);
  add(box(BW + 0.6, 0.16, BD + 0.6, M.roof, BX, BH + 0.08, BZ), false);
  flat(BW, BD, M.concrete, BX, 0.02, BZ);
  for (const [x, z, h] of [[-1.9, -1.6, 0.8], [-1.9, -0.6, 1.6], [1.8, 1.1, 0.8], [0.4, -1.9, 0.8]])
    add(box(1.0, h, 1.0, M.crate, BX + x, h / 2, BZ + z));

  // ---- yard cover ----
  for (const [x, z, w, d] of [[7.5, 2, 5, 0.5], [-6, 9, 0.5, 5], [10, -3, 0.5, 5]])
    add(box(w, 1.05, d, M.stone, x, 0.52, z));
  for (const [x, z] of [[4.5, 6.5], [-8.5, 3], [9, 7], [-3, -9], [12, -9]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 10), M.barrel);
    b.position.set(x, 0.47, z); b.castShadow = true; scene.add(b); solids.push(b);
    colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 0.47, z), new THREE.Vector3(0.85, 0.95, 0.85)));
  }
  for (const [x, z] of [[-9, -1], [6, -8], [13, 5]]) {
    add(box(1.1, 0.9, 1.1, M.crate, x, 0.45, z));
    add(box(0.9, 0.8, 0.9, M.crate, x + 0.3, 1.25, z - 0.2));
  }

  // ---- fence ----
  const F = 19;
  for (let i = -F; i <= F; i += 1.6) {
    for (const [x, z] of [[i, -F], [i, F], [-F, i], [F, i]]) {
      if (Math.abs(x) < 1.8 && z > 0) continue;
      add(box(0.13, 1.3, 0.13, M.wood, x, 0.65, z), false);
    }
  }
  for (const [x, z, w, d] of [[0, -F, F * 2, 0.07], [0, F, F * 2, 0.07], [-F, 0, 0.07, F * 2], [F, 0, 0.07, F * 2]])
    add(box(w, 0.09, d, M.wood, x, 1.16, z), false);

  flat(1.8, 11, M.concrete, 0, 0.03, 11.5); // path

  // well
  add(box(1.35, 0.9, 1.35, M.stone, 9.5, 0.45, -8));
  for (const x of [8.95, 10.05]) add(box(0.12, 1.6, 0.12, M.wood, x, 1.7, -8), false);
  add(box(1.55, 0.12, 0.65, M.roof, 9.5, 2.5, -8), false);

  // burnt-out car
  add(box(1.95, 0.85, 4.3, M.dark, 6.5, 0.42, 11));
  add(box(1.75, 0.7, 1.95, M.dark, 6.5, 1.2, 11.4));

  // trees
  const bark = new THREE.MeshLambertMaterial({ color: 0x6b5238 });
  const leaf = new THREE.MeshLambertMaterial({ color: 0x5f7040 });
  for (const [x, z] of [[-15, 9], [-9, 13], [13, -14], [16, 4], [-17, -1], [9, 14], [15, 12]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 4.2, 7), bark);
    t.position.set(x, 2.1, z); t.castShadow = true; scene.add(t); solids.push(t);
    colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, 2.1, z), new THREE.Vector3(0.65, 4.2, 0.65)));
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), leaf);
    c.position.set(x, 5.0, z); c.castShadow = true; scene.add(c); solids.push(c);
  }

  return {
    colliders, solids,
    playerSpawn: new THREE.Vector3(0, 0, 15.5),
    houseBounds: new THREE.Box3(new THREE.Vector3(-HX, 0, -HZ), new THREE.Vector3(HX, WALL_H, HZ)),
    indoor: p => (p.x > -6.3 && p.x < 6.3 && p.z > -4.8 && p.z < 4.8 && p.y < 2.6) ||
                 (p.x > BX - 4 && p.x < BX + 4 && p.z > BZ - 3.4 && p.z < BZ + 3.4 && p.y < 3.1),
    enemyPosts: [
      { pos: new THREE.Vector3(-3.5, 0, -3.0), patrol: [new THREE.Vector3(-3.5, 0, -3.0), new THREE.Vector3(-1.2, 0, -0.4)] },
      { pos: new THREE.Vector3(4.0, 0, -2.0), patrol: [new THREE.Vector3(4.0, 0, -2.0), new THREE.Vector3(3.2, 0, 2.4)] },
      { pos: new THREE.Vector3(BX + 2, 0, BZ), patrol: [new THREE.Vector3(BX + 2, 0, BZ), new THREE.Vector3(-7, 0, 4), new THREE.Vector3(2, 0, 8)] },
    ],
  };
}
