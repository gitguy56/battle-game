import * as THREE from 'three';

// Weapon data. Everything that defines how a gun feels lives here, so a new one
// is a table entry rather than new code.
//
// Damage is in hit points against MAX_HP (4 by default):
//   head 2 / body 1  = two headshots or four body shots
//   head 4 / body 2  = a headshot kills outright, two body shots kill
// Spread is the cone half-angle in radians.

const MAT = {
  steel: 0x43484e, dark: 0x2f3338, black: 0x1f2226,
  wood: 0x8a6741, woodDark: 0x6d4f31, poly: 0x3a3f39, brass: 0x9c7b3f,
};

export const WEAPONS = {
  rifle: {
    id: 'rifle', name: 'Assault rifle', short: 'AR',
    mag: 30, reserve: 120, rpm: 600, auto: true,
    head: 2, body: 1, pellets: 1,
    spreadAds: 0.0006, spreadHip: 0.012, spreadMove: 0.016, spreadAdsMove: 0.004,
    recoil: 0.009, recoilRand: 0.005, yawKick: 0.006,
    reload: 2.8, adsFov: 0.80, weight: 1,
    sound: { crack: 4200, body: 900, thump: 160, gain: 0.85 },
  },
  smg: {
    id: 'smg', name: 'Submachine gun', short: 'SMG',
    mag: 32, reserve: 160, rpm: 900, auto: true,
    head: 2, body: 1, pellets: 1,
    spreadAds: 0.0022, spreadHip: 0.020, spreadMove: 0.022, spreadAdsMove: 0.008,
    recoil: 0.0065, recoilRand: 0.006, yawKick: 0.009,
    reload: 2.2, adsFov: 0.88, weight: 0.8,
    sound: { crack: 3400, body: 1100, thump: 130, gain: 0.7 },
  },
  shotgun: {
    id: 'shotgun', name: 'Pump shotgun', short: 'SG',
    mag: 7, reserve: 40, rpm: 75, auto: false,
    head: 1, body: 1, pellets: 9,
    spreadAds: 0.030, spreadHip: 0.055, spreadMove: 0.02, spreadAdsMove: 0.012,
    recoil: 0.030, recoilRand: 0.012, yawKick: 0.012,
    reload: 3.4, adsFov: 0.92, weight: 1.15,
    sound: { crack: 2200, body: 550, thump: 90, gain: 1.0 },
  },
  dmr: {
    id: 'dmr', name: 'Marksman rifle', short: 'DMR',
    mag: 10, reserve: 60, rpm: 240, auto: false,
    head: 4, body: 2, pellets: 1,
    spreadAds: 0.0002, spreadHip: 0.020, spreadMove: 0.024, spreadAdsMove: 0.006,
    recoil: 0.022, recoilRand: 0.004, yawKick: 0.004,
    reload: 3.0, adsFov: 0.45, weight: 1.25,
    sound: { crack: 5200, body: 700, thump: 190, gain: 1.0 },
  },
  pistol: {
    id: 'pistol', name: 'Sidearm', short: 'PST',
    mag: 15, reserve: 60, rpm: 420, auto: false,
    head: 2, body: 1, pellets: 1,
    spreadAds: 0.0030, spreadHip: 0.026, spreadMove: 0.020, spreadAdsMove: 0.009,
    recoil: 0.011, recoilRand: 0.006, yawKick: 0.007,
    reload: 1.9, adsFov: 0.90, weight: 0.5,
    sound: { crack: 3000, body: 1000, thump: 120, gain: 0.6 },
  },
};

// ---------------------------------------------------------------------------
// Models. Each gun is a short list of boxes, written out rather than generated,
// so the silhouettes actually differ from one another.
// ---------------------------------------------------------------------------
const PARTS = {
  rifle: [
    [0.062, 0.075, 0.30, 'steel', 0, 0, -0.10],
    [0.030, 0.030, 0.40, 'dark', 0, 0.008, -0.44],
    [0.050, 0.052, 0.20, 'wood', 0, -0.004, -0.31],
    [0.052, 0.030, 0.07, 'dark', 0, 0.042, -0.20],
    [0.016, 0.040, 0.03, 'dark', 0, 0.042, -0.62],
    [0.046, 0.150, 0.095, 'wood', 0, -0.095, 0.01],
    [0.048, 0.085, 0.26, 'wood', 0, -0.012, 0.18],
    [0.042, 0.165, 0.085, 'dark', 0, -0.115, -0.09, 0.32],
  ],
  smg: [
    [0.058, 0.080, 0.24, 'poly', 0, 0, -0.06],
    [0.026, 0.026, 0.20, 'dark', 0, 0.008, -0.28],
    [0.050, 0.046, 0.12, 'poly', 0, -0.004, -0.20],
    [0.048, 0.028, 0.06, 'dark', 0, 0.046, -0.14],
    [0.044, 0.140, 0.085, 'poly', 0, -0.090, 0.00],
    [0.040, 0.210, 0.070, 'dark', 0, -0.140, -0.06],
    [0.036, 0.055, 0.20, 'dark', 0, 0.010, 0.17],   // folding stock strut
  ],
  shotgun: [
    [0.066, 0.080, 0.28, 'steel', 0, 0, -0.10],
    [0.042, 0.042, 0.50, 'dark', 0, 0.012, -0.50],
    [0.034, 0.034, 0.44, 'dark', 0, -0.036, -0.47],  // magazine tube
    [0.058, 0.058, 0.16, 'woodDark', 0, -0.036, -0.34], // pump
    [0.050, 0.030, 0.05, 'dark', 0, 0.050, -0.22],
    [0.050, 0.130, 0.10, 'woodDark', 0, -0.085, 0.02],
    [0.054, 0.105, 0.30, 'woodDark', 0, -0.020, 0.21],
  ],
  dmr: [
    [0.060, 0.078, 0.34, 'steel', 0, 0, -0.12],
    [0.028, 0.028, 0.58, 'dark', 0, 0.008, -0.58],
    [0.048, 0.050, 0.22, 'wood', 0, -0.004, -0.36],
    [0.046, 0.046, 0.26, 'black', 0, 0.075, -0.16],  // scope tube
    [0.028, 0.040, 0.03, 'black', 0, 0.048, -0.06],  // scope mount
    [0.028, 0.040, 0.03, 'black', 0, 0.048, -0.26],
    [0.044, 0.145, 0.09, 'wood', 0, -0.092, 0.00],
    [0.050, 0.090, 0.32, 'wood', 0, -0.012, 0.22],
    [0.038, 0.120, 0.075, 'dark', 0, -0.095, -0.10, 0.18],
  ],
  pistol: [
    [0.044, 0.062, 0.22, 'steel', 0, 0, -0.06],
    [0.036, 0.030, 0.06, 'dark', 0, 0.036, -0.14],
    [0.040, 0.130, 0.075, 'black', 0, -0.090, 0.03, 0.22],
  ],
};

export function buildModel(id) {
  const g = new THREE.Group();
  const cache = {};
  for (const p of PARTS[id] || PARTS.rifle) {
    const [w, h, d, mat, x, y, z, rx = 0] = p;
    if (!cache[mat]) cache[mat] = new THREE.MeshLambertMaterial({ color: MAT[mat] });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cache[mat]);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  }
  return g;
}

// Muzzle distance, so the flash and tracer start at the right place.
export function muzzleZ(id) {
  const parts = PARTS[id] || PARTS.rifle;
  let z = 0;
  for (const p of parts) z = Math.min(z, p[6] - p[2] / 2);
  return z - 0.02;
}
