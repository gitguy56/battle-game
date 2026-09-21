import * as THREE from 'three';
import { buildCourse } from './course.js';
import { Runner, TUNE } from './movement.js';
import { HopSystem, HOP } from './hop.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';
import { Audio } from '../../prototype/src/audio.js';
import { Effects } from '../../prototype/src/effects.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const size = () => [canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight];
renderer.setSize(...size(), false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xcfe4f2, 0x6a7360, 2.2));
const sun = new THREE.DirectionalLight(0xfff4e2, 2.4);
sun.position.set(40, 80, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 });
sun.shadow.bias = -0.0008;
scene.add(sun);
scene.add(sun.target);

const BASE_FOV = 82;
const camera = new THREE.PerspectiveCamera(BASE_FOV, size()[0] / size()[1], 0.05, 1400);
scene.add(camera);

const course = buildCourse(scene);
const runner = new Runner(course);
const hop = new HopSystem(course.field, course);
const audio = new Audio();
const effects = new Effects(scene);
const hud = new HUD(document.getElementById('hud'));
const ui = new UI(document.getElementById('ui'));

const BEST_KEY = 'chainrunner.best.v1';
let best = null;
try { const v = localStorage.getItem(BEST_KEY); if (v) best = parseFloat(v); } catch { /* fine */ }

let state = 'menu';
let run = null;
let timeScale = 1;
let camRoll = 0, fovKick = 0, shake = 0;

// ----------------------------------------------------------------- input ---
const input = { fwd: 0, back: 0, left: 0, right: 0, jump: 0 };
const KEYS = {
  KeyW: 'fwd', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'fwd', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right',
  Space: 'jump',
};
const clearInput = () => { for (const k in input) input[k] = 0; };

addEventListener('keydown', e => {
  if (KEYS[e.code] !== undefined) { input[KEYS[e.code]] = 1; e.preventDefault(); }
  if (e.code === 'KeyR' && (state === 'running' || state === 'results')) start();
  if (e.code === 'Escape' && state === 'running') toMenu();
});
addEventListener('keyup', e => { if (KEYS[e.code] !== undefined) input[KEYS[e.code]] = 0; });
canvas.addEventListener('mousedown', e => {
  if (document.pointerLockElement !== canvas) { if (state === 'running') canvas.requestPointerLock(); return; }
  if (e.button === 0) doHop();
});
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || state !== 'running') return;
  runner.look(e.movementX * 0.0022, e.movementY * 0.0022);
});
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && state === 'running') toMenu();
});
addEventListener('resize', () => {
  const [w, h] = size();
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

// ------------------------------------------------------------------ flow ---
function start() {
  course.field.reviveAll();
  hop.reset();
  runner.reset(course.start, course.startYaw);
  effects.clear();
  run = { time: 0, falls: 0, topSpeed: 0, checkpoint: 0 };
  timeScale = 1; fovKick = 0; shake = 0; camRoll = 0;
  state = 'running';
  ui.show(null);
  hud.setVisible(true);
  hud.say('go', 0.8);
  audio.resume();
  canvas.requestPointerLock();
}
function toMenu() {
  state = 'menu';
  clearInput();
  document.exitPointerLock();
  hud.setVisible(false);
  ui.setBest(best, course.medals);
  ui.show('menu');
}
function finish() {
  state = 'results';
  clearInput();
  document.exitPointerLock();
  hud.setVisible(false);
  const prev = best;
  if (best == null || run.time < best) {
    best = run.time;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* fine */ }
  }
  ui.setResults({
    time: run.time, best: prev, medals: course.medals,
    bestChain: hop.bestChain, hops: hop.hops,
    topSpeed: run.topSpeed, falls: run.falls,
  });
  ui.show('results');
}
ui.on.play = start;
ui.on.menu = toMenu;
toMenu();

function doHop() {
  const r = hop.tryHop(camera, runner);
  if (!r) { audio.burst({ dur: 0.05, freq: 900, type: 'bandpass', q: 3, gain: 0.12 }); return; }
  // the pitch climbs with the chain, so a long chain is audible as well as visible
  const step = Math.min(r.chain, 12);
  audio.tone({ f0: 300 + step * 48, f1: 620 + step * 70, dur: 0.14, gain: 0.30, type: 'triangle' });
  audio.burst({ dur: 0.16, freq: 1600 + step * 120, type: 'bandpass', q: 1.4, gain: 0.22 });
  if (r.kind === 'anchor') audio.tone({ f0: 180, f1: 420, dur: 0.24, gain: 0.26, type: 'sine' });
  effects.hit(r.pos, new THREE.Vector3(0, 1, 0), camera);
  effects.muzzle(r.pos, new THREE.Vector3(0, 1, 0));
  fovKick = Math.min(1.4, fovKick + 0.55);
  shake = Math.min(1, shake + 0.35);
  if (r.chain >= 5 && r.chain % 5 === 0) hud.say(`chain ${r.chain}`, 1.0);
}

// ------------------------------------------------------------------ loop ---
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const raw = Math.min(clock.getDelta(), 0.05);

  // a beat of slow motion on each hop keeps long chains readable
  timeScale += ((hop.freeze > 0 ? HOP.freezeScale : 1) - timeScale) * Math.min(1, raw * 26);
  const dt = raw * timeScale;

  if (state === 'running') {
    run.time += raw;                       // the clock is never slowed
    runner.update(dt, input);
    hop.update(dt, camera, runner);
    run.topSpeed = Math.max(run.topSpeed, runner.speed);

    // which checkpoint have we passed?
    for (let i = run.checkpoint + 1; i < course.checkpoints.length; i++) {
      if (runner.pos.z < course.checkpoints[i].z + 3) run.checkpoint = i; else break;
    }

    if (runner.pos.y < TUNE.killFloor) {
      run.falls++;
      run.time += 1.0;                     // falling costs a second, not a life
      hop.chain = 0; hop.chainTimer = 0;
      const cp = course.checkpoints[run.checkpoint];
      runner.reset(cp, runner.yaw);
      hud.say('-1s', 1.0);
      audio.tone({ f0: 300, f1: 90, dur: 0.3, gain: 0.25, type: 'sawtooth' });
    }

    if (course.finishBox.containsPoint(runner.pos) || runner.pos.z < course.finishZ - 6) finish();
  }

  course.field.update(dt, camera);
  effects.update(dt, camera);

  // camera: speed opens the lens and leans into turns
  const sp = runner.speed;
  fovKick += ((Math.min(1, sp / TUNE.maxSpeed) * 1.0) - fovKick) * Math.min(1, raw * 3.4);
  shake *= Math.pow(0.02, raw);
  const targetRoll = THREE.MathUtils.clamp((input.right - input.left) * 0.045, -0.05, 0.05);
  camRoll += (targetRoll - camRoll) * Math.min(1, raw * 6);

  camera.fov = BASE_FOV + fovKick * 14;
  camera.updateProjectionMatrix();
  const eye = runner.eye;
  camera.position.set(
    eye.x + (Math.random() - 0.5) * shake * 0.05,
    eye.y + Math.sin(runner.bob) * (runner.onGround ? 0.028 : 0.006) + (Math.random() - 0.5) * shake * 0.05,
    eye.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(runner.pitch, runner.yaw, camRoll);
  sun.position.set(runner.pos.x + 40, runner.pos.y + 80, runner.pos.z + 30);
  sun.target.position.copy(runner.pos);

  if (state === 'running') {
    hud.update(raw, {
      time: run.time, speed: sp, chain: hop.chain, chainTimer: hop.chainTimer,
      hasTarget: !!hop.best, medals: course.medals,
    });
  }
  renderer.render(scene, camera);
}
tick();

// Debug hook for the automated tests and for poking from the console.
window.__run = {
  runner, hop, course, camera, scene, renderer, input, audio, effects,
  get state() { return state; },
  get run() { return run; },
  start, finish, toMenu,
  doHop,
  teleport(x, y, z) { runner.pos.set(x, y, z); runner.vel.set(0, 0, 0); },
  face(yaw, pitch = 0) { runner.yaw = yaw; runner.pitch = pitch; },
};
