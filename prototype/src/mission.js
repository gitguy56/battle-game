import * as THREE from 'three';
import { Enemy } from './ai.js';

// The mission arc: take the compound, hold it against a counter-attack, then
// walk back out. Three phases give the round a shape that "kill everyone" does
// not.
export const PHASE = { ASSAULT: 'assault', COUNTER: 'counter', EXFIL: 'exfil', DONE: 'done' };

// Ordered so the first few (used on Recruit) are a fair mix, and the later
// additions on harder settings are the nastier types.
const GARRISON_POSTS = [
  { pos: [-3.5, 0, -3.0], patrol: [[-3.5, 0, -3.0], [-1.2, 0, -0.4]], kind: 'rifleman' },
  { pos: [4.0, 0, -2.0],  patrol: [[4.0, 0, -2.0], [3.2, 0, 2.4]],    kind: 'shotgunner' },
  { pos: [-19, 0, 7],     patrol: [[-19, 0, 7]],                      kind: 'marksman' },
  { pos: [-11, 0, -6],    patrol: [[-11, 0, -6], [-7, 0, 4], [2, 0, 8]], kind: 'rifleman' },
  { pos: [9, 0, 6],       patrol: [[9, 0, 6], [14, 0, -6], [6, 0, -9]],  kind: 'rusher' },
  { pos: [15, 0, -3],     patrol: [[15, 0, -3], [12, 0, -6], [17, 0, 2]], kind: 'rifleman' },
  { pos: [-5.5, 0, -13.5], patrol: [[-5.5, 0, -13.5], [-8, 0, -12]],   kind: 'shotgunner' },
  { pos: [-4.7, 0, 3.3],  patrol: [[-4.7, 0, 3.3], [-1, 0, 3.0]],      kind: 'rusher' },
];

// The counter-attack comes down the road, so it arrives behind you.
const COUNTER_SPAWNS = [
  { pos: [-6, 0, 24], kind: 'rusher' },
  { pos: [2, 0, 26],  kind: 'rifleman' },
  { pos: [9, 0, 24],  kind: 'shotgunner' },
  { pos: [-12, 0, 22], kind: 'rifleman' },
  { pos: [14, 0, 23], kind: 'rusher' },
  { pos: [-2, 0, 28], kind: 'marksman' },
];

export class Mission {
  constructor(scene, map, audio, difficulty, pickups) {
    this.scene = scene; this.map = map; this.audio = audio; this.diff = difficulty;
    this.pickups = pickups;
    this.enemies = [];
    this.phase = PHASE.ASSAULT;
    this.time = 0;
    this.counterQueue = [];
    this.counterTimer = 0;
    this.exfil = new THREE.Vector3(0, 0, 21);
    this.objective = 'Clear the compound';
    this.banner = null;
    this.kills = 0;
  }

  start() {
    const posts = GARRISON_POSTS.slice(0, this.diff.garrison);
    for (const p of posts) this.spawn(p);
    this.setPhase(PHASE.ASSAULT, 'Clear the compound');
  }

  spawn(p) {
    const post = {
      pos: new THREE.Vector3(...p.pos),
      patrol: (p.patrol || [p.pos]).map(v => new THREE.Vector3(...v)),
    };
    const e = new Enemy(this.scene, post, this.map, this.audio, p.kind || 'rifleman');
    e.accuracyScale = this.diff.enemyAccuracy;
    this.enemies.push(e);
    for (const m of this.enemies) m.squad = this.enemies;
    return e;
  }

  setPhase(phase, objective) {
    this.phase = phase;
    this.objective = objective;
    this.banner = { text: objective, life: 3.4 };
  }

  get alive() { return this.enemies.filter(e => e.alive).length; }

  update(dt, player) {
    this.time += dt;

    // Anyone who just died leaves their weapon on the ground.
    for (const e of this.enemies) {
      if (e.dropped) { this.pickups?.drop(e.dropped.id, e.dropped.pos); e.dropped = null; }
    }
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    if (this.phase === PHASE.ASSAULT && this.alive === 0) {
      this.counterQueue = COUNTER_SPAWNS.slice(0, this.diff.counter).map((s, i) => ({
        pos: s.pos, kind: s.kind, at: 2.5 + i * 2.2,
      }));
      this.counterTimer = 0;
      this.setPhase(PHASE.COUNTER, 'Counter-attack inbound - hold the compound');
    } else if (this.phase === PHASE.COUNTER) {
      this.counterTimer += dt;
      while (this.counterQueue.length && this.counterQueue[0].at <= this.counterTimer) {
        const s = this.counterQueue.shift();
        const e = this.spawn({ pos: s.pos, kind: s.kind, patrol: [s.pos, [0, 0, 6]] });
        e.awareness = 0.9;              // they arrive already looking for you
        e.lastKnown = player.pos.clone();
      }
      if (!this.counterQueue.length && this.alive === 0) {
        this.setPhase(PHASE.EXFIL, 'Compound secure - fall back to the road');
      }
    } else if (this.phase === PHASE.EXFIL) {
      const d = Math.hypot(player.pos.x - this.exfil.x, player.pos.z - this.exfil.z);
      if (d < 3.5) this.setPhase(PHASE.DONE, 'Extracted');
    }
  }

  dispose() {
    for (const e of this.enemies) this.scene.remove(e.group);
    this.enemies.length = 0;
  }
}
