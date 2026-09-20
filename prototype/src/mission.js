import * as THREE from 'three';
import { Enemy } from './ai.js';

// The mission arc: take the compound, hold it against a counter-attack, then
// walk back out. Three phases give the round a shape that "kill everyone" does
// not.
export const PHASE = { ASSAULT: 'assault', COUNTER: 'counter', EXFIL: 'exfil', DONE: 'done' };

const GARRISON_POSTS = [
  { pos: [-3.5, 0, -3.0], patrol: [[-3.5, 0, -3.0], [-1.2, 0, -0.4]], kind: 'rifleman' },
  { pos: [4.0, 0, -2.0],  patrol: [[4.0, 0, -2.0], [3.2, 0, 2.4]],    kind: 'rifleman' },
  { pos: [-11, 0, -6],    patrol: [[-11, 0, -6], [-7, 0, 4], [2, 0, 8]], kind: 'rifleman' },
  { pos: [0, 0, -11],     patrol: [[0, 0, -11], [-8, 0, -12], [7, 0, -9]], kind: 'rifleman' },
  { pos: [9, 0, 6],       patrol: [[9, 0, 6], [12, 0, -4], [6, 0, -9]],  kind: 'rifleman' },
  { pos: [-4.7, 0, 3.3],  patrol: [[-4.7, 0, 3.3], [-1, 0, 3.0]],       kind: 'rifleman' },
  { pos: [4.5, 0, -3.5],  patrol: [[4.5, 0, -3.5], [5.2, 0, 0.2]],      kind: 'rifleman' },
  { pos: [-13, 0, -7],    patrol: [[-13, 0, -7], [-14, 0, -2]],         kind: 'rifleman' },
];

// The counter-attack comes down the road, so it arrives behind you.
const COUNTER_SPAWNS = [
  [-6, 0, 24], [2, 0, 26], [9, 0, 24], [-12, 0, 22], [14, 0, 23], [-2, 0, 28],
];

export class Mission {
  constructor(scene, map, audio, difficulty) {
    this.scene = scene; this.map = map; this.audio = audio; this.diff = difficulty;
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
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    if (this.phase === PHASE.ASSAULT && this.alive === 0) {
      this.counterQueue = COUNTER_SPAWNS.slice(0, this.diff.counter).map((s, i) => ({
        pos: s, at: 2.5 + i * 2.2,
      }));
      this.counterTimer = 0;
      this.setPhase(PHASE.COUNTER, 'Counter-attack inbound - hold the compound');
    } else if (this.phase === PHASE.COUNTER) {
      this.counterTimer += dt;
      while (this.counterQueue.length && this.counterQueue[0].at <= this.counterTimer) {
        const s = this.counterQueue.shift();
        const e = this.spawn({ pos: s.pos, patrol: [s.pos, [0, 0, 6]] });
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
