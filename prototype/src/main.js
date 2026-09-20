import * as THREE from 'three';
import { buildMap } from './map.js';
import { Player } from './player.js';
import { Weapon } from './weapon.js';
import { Enemy } from './ai.js';
import { BodycamRig, PostFX } from './bodycam.js';
import { Audio } from './audio.js';
import { HUD } from './hud.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping; // done in the bodycam shader instead

const scene = new THREE.Scene();
const SKY = new THREE.Color(0x7d868c);      // overcast: flat light is forgiving
scene.background = SKY;
scene.fog = new THREE.FogExp2(0x7d868c, 0.011);

const hemi = new THREE.HemisphereLight(0xc2ced6, 0x5a5142, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xe8ece8, 2.6);
sun.position.set(-22, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 90;
sun.shadow.bias = -0.0009;
scene.add(sun);

const map = buildMap(scene);

// A wide lens, as a bodycam has.
const camera = new THREE.PerspectiveCamera(88, innerWidth / innerHeight, 0.05, 400);
scene.add(camera);

const audio = new Audio();
const hud = new HUD(document.getElementById('hud'));
const player = new Player(map);
const weapon = new Weapon(camera, scene, audio);
const rig = new BodycamRig(camera);
const post = new PostFX(renderer);

const enemies = map.enemyPosts.map(p => new Enemy(scene, p, map, audio));

// ---------------------------------------------------------------- input ----
const input = { fwd: 0, back: 0, left: 0, right: 0, sprint: 0, crouch: 0, fire: 0, ads: 0 };
const KEYS = {
  KeyW: 'fwd', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'fwd', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyC: 'crouch', ControlLeft: 'crouch',
};

let state = 'briefing';
const briefing = document.getElementById('briefing');

addEventListener('keydown', e => {
  if (KEYS[e.code] !== undefined) { input[KEYS[e.code]] = 1; e.preventDefault(); }
  if (state !== 'playing') return;
  if (e.code === 'KeyR') weapon.startReload();
  if (e.code === 'KeyF') hud.say('magazine feels ' + weapon.magFeel());
});
addEventListener('keyup', e => { if (KEYS[e.code] !== undefined) input[KEYS[e.code]] = 0; });

canvas.addEventListener('mousedown', e => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) input.fire = 1;
  if (e.button === 2) input.ads = 1;
});
addEventListener('mouseup', e => {
  if (e.button === 0) input.fire = 0;
  if (e.button === 2) input.ads = 0;
});
addEventListener('contextmenu', e => e.preventDefault());

addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || state !== 'playing') return;
  player.look(e.movementX * 0.0022, e.movementY * 0.0022);
});

function start() {
  canvas.requestPointerLock();
  audio.resume();
}
briefing.addEventListener('click', start);
canvas.addEventListener('click', () => { if (state === 'playing') canvas.requestPointerLock(); else start(); });

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked && state === 'briefing') {
    state = 'playing';
    briefing.style.display = 'none';
    hud.say('recording started');
  } else if (!locked && state === 'playing') {
    briefing.style.display = 'flex';
    briefing.querySelector('h1').textContent = 'PAUSED';
    briefing.querySelector('#bc-start').textContent = 'click to resume';
    state = 'briefing';
  }
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  post.setSize(innerWidth, innerHeight);
});

// ----------------------------------------------------------------- loop ----
let damage = 0, fade = 1, lastHits = 0, over = 0;
const clock = new THREE.Clock();

function enemyTracer(from, to) {
  const jitter = new THREE.Vector3(
    (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.6);
  const g = new THREE.BufferGeometry().setFromPoints([from, to.clone().add(jitter)]);
  const m = new THREE.Line(g, new THREE.LineBasicMaterial({
    color: 0xffd090, transparent: true, opacity: 0.9 }));
  scene.add(m);
  setTimeout(() => scene.remove(m), 60);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'playing') {
    player.update(dt, input);
    if (player.stepped) audio.step(player.speed > 3);

    weapon.update(dt, input, player, enemies, map, origin => {
      rig.addJolt(0.55);
      for (const e of enemies) e.hearShot(origin);
    });

    for (const e of enemies) e.update(dt, player, enemyTracer);

    if (player.hits !== lastHits) {
      lastHits = player.hits;
      damage = 1;
      rig.addJolt(1.6);
      audio.hurt();
      hud.say(player.alive ? 'HIT - you can take one more' : '');
    }

    if (!player.alive && !over) {
      over = 1;
      hud.bigText('<b>END OF RECORDING</b><span>press R to restart</span>');
    }
    if (!over && enemies.every(e => !e.alive)) {
      over = 2;
      hud.bigText('<b>HOUSE CLEAR</b><span>press R to restart</span>');
    }
  }

  if (over && input.fire === 0) {
    addEventListener('keydown', e => { if (e.code === 'KeyR') location.reload(); }, { once: true });
  }

  damage = Math.max(0, damage - dt * 1.4);
  fade += ((over === 1 ? 0.25 : 1) - fade) * Math.min(1, dt * 1.1);

  const indoor = player.pos.x > -6.3 && player.pos.x < 6.3 &&
                 player.pos.z > -4.8 && player.pos.z < 4.8 && player.pos.y < 2.6;
  rig.update(dt, player, indoor);
  hud.update(dt);

  post.render(scene, camera, {
    time: performance.now() / 1000,
    shake: rig.shake,
    exposure: rig.exposure,
    damage: Math.min(1, damage + (player.hits >= 1 && player.alive ? 0.18 : 0)),
    fade,
    signal: 1,
  });
}
tick();

// Debug hook: lets you poke at the game from the browser console, and lets the
// automated smoke test drive it without a mouse. Harmless to leave in.
window.__dbg = {
  player, enemies, rig, weapon, map, scene, renderer,
  play() { state = 'playing'; briefing.style.display = 'none'; },
  teleport(x, y, z) { player.pos.set(x, y, z); player.vel.set(0, 0, 0); },
  face(yaw, pitch = 0) { player.yaw = yaw; player.pitch = pitch; rig.yaw = yaw; rig.pitch = pitch; },
};
