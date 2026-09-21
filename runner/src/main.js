import * as THREE from 'three';
import { buildCourse } from './course.js';
import { Runner, TUNE } from './movement.js';
import { SlamSystem, SLAM } from './slam.js';
import { Weapon } from '../../prototype/src/weapon.js';
import { WEAPONS } from '../../prototype/src/weapons.js';
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
const audio = new Audio();
const effects = new Effects(scene);
const slam = new SlamSystem(course.field, course);
const weapon = new Weapon(camera, scene, audio, effects);
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
const input = { fwd: 0, back: 0, left: 0, right: 0, jump: 0, fire: 0, ads: 0 };
const KEYS = {
  KeyW: 'fwd', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'fwd', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right',
  Space: 'jump',
};
const clearInput = () => { for (const k in input) input[k] = 0; };

addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    e.preventDefault();
    if (state === 'running' && !runner.onGround) slam.begin(runner);
    else input.jump = 1;
    return;
  }
  if (KEYS[e.code] !== undefined) { input[KEYS[e.code]] = 1; e.preventDefault(); }
  if (e.code === 'Backspace' && (state === 'running' || state === 'results')) { e.preventDefault(); start(); }
  if (e.code === 'KeyR' && state === 'running') weapon.startReload();
  if (e.code === 'Escape' && state === 'running') toMenu();
  if (state !== 'running') return;
  if (e.code === 'KeyQ' || e.code === 'Digit1' || e.code === 'Digit2') weapon.swap();
});
addEventListener('keyup', e => {
  if (e.code === 'Space') { input.jump = 0; return; }
  if (KEYS[e.code] !== undefined) input[KEYS[e.code]] = 0;
});
canvas.addEventListener('mousedown', e => {
  if (document.pointerLockElement !== canvas) { if (state === 'running') canvas.requestPointerLock(); return; }
  if (e.button === 0) input.fire = 1;
  if (e.button === 2) input.ads = 1;
});
addEventListener('mouseup', e => {
  if (e.button === 0) input.fire = 0;
  if (e.button === 2) input.ads = 0;
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
  slam.reset();
  runner.reset(course.start, course.startYaw);
  weapon.reset([{ id: 'rifle' }, { id: 'dmr' }]);
  effects.clear();
  run = { time: 0, topSpeed: 0, peak: 0, shots: 0, hits: 0, restarts: run ? run.restarts + 1 : 0 };
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
    bestChain: slam.best, hops: slam.kills,
    topSpeed: run.topSpeed, falls: run.restarts,
    accuracy: run.shots ? Math.round((run.hits / run.shots) * 100) : 0,
  });
  ui.show('results');
}
ui.on.play = start;
ui.on.menu = toMenu;
toMenu();

function onSlamKill(r) {
  const step = Math.min(r.chain, 12);
  audio.tone({ f0: 150 + step * 20, f1: 60, dur: 0.22, gain: 0.42, type: 'square' });
  audio.burst({ dur: 0.26, freq: 420 + step * 60, type: 'lowpass', gain: 0.38 });
  audio.tone({ f0: 520 + step * 60, f1: 900 + step * 80, dur: 0.16, gain: 0.22, type: 'triangle', delay: 0.05 });
  effects.hit(r.pos, new THREE.Vector3(0, 1, 0), camera);
  effects.impact(r.pos, new THREE.Vector3(0, 1, 0), camera);
  fovKick = Math.min(1.6, fovKick + 0.6);
  shake = Math.min(1, shake + 0.55);
  if (r.chain >= 5 && r.chain % 5 === 0) hud.say(`chain ${r.chain}`, 1.0);
}

function onGroundSlam(r) {
  const killed = slam.groundShock(runner);
  audio.tone({ f0: 90, f1: 38, dur: 0.4, gain: 0.5, type: 'square' });
  audio.burst({ dur: 0.5, freq: 260, type: 'lowpass', gain: 0.4 });
  effects.impact(runner.pos.clone(), new THREE.Vector3(0, 1, 0), camera);
  for (const e of killed) effects.hit(e.centre, new THREE.Vector3(0, 1, 0), camera);
  shake = Math.min(1, shake + 0.45 + killed.length * 0.1);
  if (killed.length) hud.say(`${killed.length} down`, 0.9);
}

// Light return fire. It cannot end your run - randomness should never do that.
function enemyFire(dt) {
  for (const e of course.field.list) {
    if (!e.alive || !e.kind.fires) continue;
    const d = e.pos.distanceTo(runner.pos);
    if (d > 65) continue;
    e.fireTimer -= dt;
    if (e.fireTimer > 0) continue;
    e.fireTimer = 1.4 + Math.random() * 2.2;
    const to = runner.eye.clone().sub(e.eye);
    const dist = to.length();
    to.normalize();
    if (new THREE.Raycaster(e.eye, to, 0.5, dist - 0.5)
        .intersectObjects(course.solids, false).length) continue;
    const rx = Math.cos(runner.yaw), rz = -Math.sin(runner.yaw);
    const pan = ((e.pos.x - runner.pos.x) * rx + (e.pos.z - runner.pos.z) * rz) / (d || 1);
    audio.gunshotAt(e.pos, runner.pos, WEAPONS[e.kind.weapon].sound, pan);
    effects.muzzle(e.eye.clone().addScaledVector(to, 0.4), to);
    if (Math.random() < 0.22 * (1 - Math.min(d / 65, 0.8))) shake = Math.min(1, shake + 0.4);
  }
}

// One rule, and it is the whole tension: lose the chain and you start again.
function failRun(reason) {
  hud.say(reason, 1.1);
  audio.tone({ f0: 260, f1: 70, dur: 0.38, gain: 0.32, type: 'sawtooth' });
  start();
}

// ------------------------------------------------------------------ loop ---
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const raw = Math.min(clock.getDelta(), 0.05);

  // a beat of slow motion on each hop keeps long chains readable
  timeScale += ((slam.freeze > 0 ? SLAM.freezeScale : 1) - timeScale) * Math.min(1, raw * 26);
  const dt = raw * timeScale;

  if (state === 'running') {
    run.time += raw;                       // the clock is never slowed
    runner.update(dt, input);
    const hit = slam.update(dt, runner, camera);
    if (hit?.type === 'enemy') onSlamKill(hit);
    else if (hit?.type === 'ground') onGroundSlam(hit);

    weapon.update(dt, input, runner, course.field.list, course, (origin, tag) => {
      run.shots++;
      if (tag) run.hits++;
    });
    for (const e of course.field.list) e.justDied = false;   // gun kills give no bounce
    enemyFire(dt);
    run.topSpeed = Math.max(run.topSpeed, runner.speed);
    run.peak = Math.max(run.peak, runner.pos.y);

    if (slam.broken) { failRun('chain lost'); return; }

    if (runner.pos.y < TUNE.killFloor) { failRun('fell'); return; }

    if (course.finishBox.containsPoint(runner.pos) || runner.pos.z < course.finishZ - 6) finish();
  }

  course.field.update(dt, camera, runner);
  effects.update(dt, camera);

  // camera: speed opens the lens and leans into turns
  const sp = runner.speed;
  fovKick += ((Math.min(1, sp / TUNE.maxSpeed) * 1.0) - fovKick) * Math.min(1, raw * 3.4);
  shake *= Math.pow(0.02, raw);
  const targetRoll = THREE.MathUtils.clamp((input.right - input.left) * 0.045, -0.05, 0.05);
  camRoll += (targetRoll - camRoll) * Math.min(1, raw * 6);

  camera.fov = (BASE_FOV + fovKick * 14) * weapon.adsFov;
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
      time: run.time, speed: sp, chain: slam.chain,
      chainTimer: slam.armed ? slam.timer : SLAM.window,
      chainMax: SLAM.window, armed: slam.armed, slamming: slam.slamming,
      hasTarget: true, medals: course.medals,
      weapon: weapon.spec.short, mag: weapon.mag, reserve: weapon.reserve,
      reloading: weapon.reloading > 0,
    });
  }
  renderer.render(scene, camera);
}
tick();

// Debug hook for the automated tests and for poking from the console.
window.__run = {
  runner, slam, course, camera, scene, renderer, input, audio, effects, weapon,
  get state() { return state; },
  get run() { return run; },
  start, finish, toMenu,
  teleport(x, y, z) { runner.pos.set(x, y, z); runner.vel.set(0, 0, 0); },
  face(yaw, pitch = 0) { runner.yaw = yaw; runner.pitch = pitch; },
};
