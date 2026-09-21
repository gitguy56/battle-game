import * as THREE from 'three';
import { TargetField } from './targets.js';

// A long horizontal run down -z. Platforms are sparse on purpose: the fast
// line is through the targets, and the ground is there to catch you.
const PAL = {
  deck: 0xd8d5cc, deckEdge: 0x8f8c84, rail: 0x5d6b74,
  pillar: 0x9aa0a6, accent: 0x6f9c6a, start: 0x4e6f8a, finish: 0x63b874,
};

// [z, x, y, width, depth] - the spine of the course, hand-placed.
const PLATFORMS = [[10, 0, 0, 16, 26],           // start pad
  [-26, 0, 1.5, 11, 9],
  [-52, 11, 3.0, 10, 8],
  [-78, -10, 4.5, 10, 8],
  [-104, 6, 3.0, 9, 8],
  [-140, 0, 7.0, 12, 10],       // high ledge before the long gap
  [-196, -15, 5.0, 10, 9],       // landing after the pure-chain stretch
  [-224, 8, 8.0, 9, 8],
  [-252, -6, 11.0, 9, 8],
  [-286, 10, 9.0, 10, 9],
  [-318, -11, 13.0, 9, 8],
  [-352, 0, 10.0, 11, 9],
  [-396, 0, 6.0, 20, 22],       // finish deck
];

// [z, x, y, kind] - the visible route.
const TARGETS = [[-6, 0, 3.4, 'normal'],
  [-16, 2, 4.2, 'normal'],
  [-38, 6, 5.0, 'normal'],
  [-46, 11, 5.6, 'normal'],
  [-64, 4, 6.4, 'big'],
  [-70, -6, 6.0, 'normal'],
  [-90, -10, 7.2, 'normal'],
  [-97, -2, 7.0, 'normal'],
  [-116, 6, 7.6, 'normal'],
  [-126, 2, 8.6, 'anchor'],
  [-152, 0, 11.0, 'normal'],
  // the long stretch with nothing underneath - the heart of the course
  [-164, -6, 12.0, 'normal'],
  [-172, -11, 12.6, 'normal'],
  [-180, -15, 12.0, 'big'],
  [-188, -17, 10.6, 'normal'],
  [-206, -8, 9.0, 'normal'],
  [-214, 2, 10.4, 'anchor'],
  [-236, 8, 13.0, 'normal'],
  [-244, 0, 13.6, 'normal'],
  [-264, -6, 15.0, 'big'],
  [-274, 2, 14.0, 'normal'],
  [-296, 10, 13.0, 'normal'],
  [-306, 2, 14.4, 'anchor'],
  [-330, -11, 17.0, 'normal'],
  [-340, -4, 16.0, 'normal'],
  [-364, 0, 13.6, 'big'],
  [-378, 0, 11.0, 'normal'],
];

export function buildCourse(scene) {
  const colliders = [], solids = [];
  const mats = {};
  const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

  const slab = (x, y, z, w, d, color, thick = 0.8) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), mat(color));
    m.position.set(x, y - thick / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); solids.push(m);
    m.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(m));
    return m;
  };

  // sky and a far ground plane, purely so the void has a bottom to read against
  scene.background = new THREE.Color(0x9fc6e0);
  scene.fog = new THREE.FogExp2(0x9fc6e0, 0.0015);   // light enough to see the route
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 1200), mat(0x6f8f6a));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -26, -190);
  floor.receiveShadow = true;
  scene.add(floor);   // deliberately NOT a collider - falling is meant to reset you

  const checkpoints = [];
  PLATFORMS.forEach(([z, x, y, w, d], i) => {
    const color = i === 0 ? PAL.start : (i === PLATFORMS.length - 1 ? PAL.finish : PAL.deck);
    slab(x, y, z, w, d, color);
    slab(x, y + 0.02, z, w - 1.4, d - 1.4, i === 0 ? PAL.start : PAL.deckEdge, 0.06);
    // a pillar dropping into the haze, so height reads at a glance
    const h = y + 24;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, h, 1.5), mat(PAL.pillar));
    p.position.set(x, y - h / 2, z);
    scene.add(p); solids.push(p);
    checkpoints.push(new THREE.Vector3(x, y + 0.1, z + d / 2 - 2));
  });

  // finish gate
  const gate = new THREE.Group();
  for (const sx of [-4, 4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 7, 0.7), mat(PAL.accent));
    post.position.set(sx, 3.5, 0); gate.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.7, 0.7), mat(PAL.accent));
  bar.position.set(0, 7, 0); gate.add(bar);
  gate.position.set(0, 6, -400);
  scene.add(gate);

  const field = new TargetField(scene);
  for (const [z, x, y, kind] of TARGETS) field.add(new THREE.Vector3(x, y, z), kind);

  return {
    colliders, solids, field, checkpoints,
    start: new THREE.Vector3(0, 7.2, 16),
    startYaw: 0,
    finishZ: -400,
    finishBox: new THREE.Box3(
      new THREE.Vector3(-10, 4, -404), new THREE.Vector3(10, 16, -396)),
    length: 416,
    medals: { gold: 34, silver: 44, bronze: 58 },
  };
}
