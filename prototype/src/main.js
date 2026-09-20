import * as THREE from 'three';
import { buildMap } from './map.js';
import { Player } from './player.js';
import { Weapon } from './weapon.js';
import { BodycamRig, PostFX } from './bodycam.js';
import { Audio } from './audio.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';
import { Settings } from './settings.js';
import { Mission, PHASE } from './mission.js';
import { Pickups } from './pickups.js';
import { Effects } from './effects.js';
import { WEAPONS } from './weapons.js';

// ------------------------------------------------------------------ setup ---
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const size = () => [canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight];
renderer.setSize(...size(), false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const SKY = new THREE.Color(0x7d868c);
scene.background = SKY;
scene.fog = new THREE.FogExp2(0x7d868c, 0.011);
scene.add(new THREE.HemisphereLight(0xc2ced6, 0x5a5142, 2.0));
const sun = new THREE.DirectionalLight(0xe8ece8, 2.6);
sun.position.set(-22, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 95 });
sun.shadow.bias = -0.0009;
scene.add(sun);

const map = buildMap(scene);
const settings = new Settings();
const camera = new THREE.PerspectiveCamera(settings.get('fov'), size()[0] / size()[1], 0.05, 400);
scene.add(camera);

const audio = new Audio();
const hud = new HUD(document.getElementById('hud'));
const ui = new UI(document.getElementById('ui'), settings);
const player = new Player(map);
const effects = new Effects(scene);
const weapon = new Weapon(camera, scene, audio, effects);
const rig = new BodycamRig(camera);
const post = new PostFX(renderer);
const pickups = new Pickups(scene);

// Marks where to fall back to once the compound is secure.
const exfilMark = new THREE.Mesh(
  new THREE.CylinderGeometry(3.2, 3.2, 0.06, 20),
  new THREE.MeshBasicMaterial({ color: 0x5fd08a, transparent: true, opacity: 0.35 }));
exfilMark.position.set(0, 0.05, 21);
exfilMark.visible = false;
scene.add(exfilMark);

let mission = null;
let state = 'menu';
let stats = { shots: 0, hits: 0, kills: 0, time: 0 };
let damage = 0, fade = 1, lastHp = 0, endTimer = 0, thumpTimer = 14;
let heartTimer = 0, breathTimer = 0, sprintFov = 0;

// --------------------------------------------------------------- settings ---
function applySettings() {
  camera.fov = settings.get('fov');
  camera.updateProjectionMatrix();
  rig.filter = settings.get('filter') ? 1 : 0;
  audio.setVolume(settings.get('volume'));
}
ui.on.apply = applySettings;
applySettings();

// ------------------------------------------------------------------ input ---
const input = { fwd: 0, back: 0, left: 0, right: 0, sprint: 0, crouch: 0, fire: 0, ads: 0, jump: 0 };
const KEYS = {
  KeyW: 'fwd', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'fwd', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyC: 'crouch', ControlLeft: 'crouch',
  Space: 'jump',
};
const clearInput = () => { for (const k in input) input[k] = 0; };

addEventListener('keydown', e => {
  if (e.code === 'Escape') { if (state === 'playing') pause(); return; }
  if (KEYS[e.code] !== undefined) { input[KEYS[e.code]] = 1; e.preventDefault(); }
  if (state !== 'playing') return;
  if (e.code === 'KeyR') weapon.startReload();
  if (e.code === 'KeyQ' || e.code === 'Digit1' || e.code === 'Digit2') weapon.swap();
  if (e.code === 'KeyE') tryPickUp();
  if (e.code === 'KeyF') hud.say('magazine feels ' + weapon.magFeel());
  if (e.code === 'KeyB') {
    settings.set('filter', settings.get('filter') ? 0 : 1);
    applySettings();
    hud.say('camera filter ' + (settings.get('filter') ? 'on' : 'off'));
  }
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
  const s = settings.get('sensitivity');
  player.look(e.movementX * s, e.movementY * s * (settings.get('invertY') ? -1 : 1));
});
canvas.addEventListener('click', () => {
  if (state === 'playing' && document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && state === 'playing') pause();
});

addEventListener('resize', () => {
  const [w, h] = size();
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.setSize(w, h);
});

// ------------------------------------------------------------------- flow ---
function tryPickUp() {
  const it = pickups.nearest(player);
  if (!it) return;
  const old = weapon.pickUp(it.id, it.mag, it.reserve);
  pickups.take(it);
  if (old) pickups.drop(old.id, player.pos, old.mag, old.reserve);
  audio.pickup();
  hud.say('picked up ' + WEAPONS[it.id].name);
}

function startMission() {
  mission?.dispose();
  pickups.clear();
  effects.clear();
  const diff = settings.difficulty;
  player.reset(diff.playerHp);
  weapon.reset([{ id: 'rifle' }, { id: 'pistol' }]);
  rig.yaw = player.yaw; rig.pitch = player.pitch;
  mission = new Mission(scene, map, audio, diff, pickups);
  mission.start();
  stats = { shots: 0, hits: 0, kills: 0, time: 0 };
  damage = 0; fade = 1; endTimer = 0;
  lastHp = player.hp;
  exfilMark.visible = false;
  hud.setHealth(player.hp, player.maxHp);
  hud.setVisible(true);
  hud.showBanner(mission.objective);
  state = 'playing';
  ui.show(null);
  audio.resume();
  canvas.requestPointerLock();
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  clearInput();
  document.exitPointerLock();
  ui.show('pause');
}
function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  ui.show(null);
  canvas.requestPointerLock();
}
function toMenu() {
  state = 'menu';
  clearInput();
  document.exitPointerLock();
  hud.setVisible(false);
  ui.show('menu');
}
function endRound(win) {
  if (state === 'results') return;
  state = 'results';
  clearInput();
  document.exitPointerLock();
  hud.setVisible(false);
  ui.setResults({ ...stats, win, hpLeft: player.hp, maxHp: player.maxHp });
  ui.show('results');
}
ui.on.play = startMission;
ui.on.restart = startMission;
ui.on.resume = resume;
ui.on.quit = toMenu;
ui.show('menu');
hud.setVisible(false);

// ------------------------------------------------------------------- loop ---
// Where a point sits left-to-right relative to where the player is facing.
function panFor(pos) {
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  return (dx * rx + dz * rz) / d;
}

// Bearing of a point relative to the way the player is looking: 0 is straight
// ahead, positive to the right.
function bearingTo(pos) {
  const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
  const fwd = dx * -Math.sin(player.yaw) + dz * -Math.cos(player.yaw);
  const right = dx * Math.cos(player.yaw) + dz * -Math.sin(player.yaw);
  return Math.atan2(right, fwd);
}

function enemyTracer(from, to, enemy) {
  const dir = to.clone().sub(from).normalize();
  effects.muzzle(from.clone().addScaledVector(dir, 0.35), dir);
  if (enemy) {
    const pan = panFor(enemy.pos);
    audio.gunshotAt(enemy.pos, player.pos, WEAPONS[enemy.type.weapon].sound, pan);
    // a round going past your head - the clearest cue that you are being shot at
    if (enemy.lastShotMiss > 0.45) audio.whizz(enemy.lastShotMiss, pan);
  }
  const j = new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.6);
  const g = new THREE.BufferGeometry().setFromPoints([from, to.clone().add(j)]);
  const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffd090, transparent: true, opacity: 0.9 }));
  scene.add(m);
  setTimeout(() => scene.remove(m), 60);
}

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'playing') {
    stats.time += dt;
    player.update(dt, input);
    if (player.stepped) audio.step(map.surfaceAt(player.pos), player.speed > 3);

    weapon.update(dt, input, player, mission.enemies, map, (origin, tag) => {
      stats.shots++;
      if (tag) { stats.hits++; hud.markHit(tag === 'head'); }
      rig.addJolt(0.35);
      for (const e of mission.enemies) e.hearShot(origin);
    });

    for (const e of mission.enemies) {
      e.update(dt, player, enemyTracer);
      if (e.justAlerted) { e.justAlerted = false; audio.alert(panFor(e.pos)); }
      if (e.justDied) { e.justDied = false; audio.bodyfall(panFor(e.pos)); }
    }
    mission.update(dt, player);
    stats.kills = mission.enemies.reduce((n, e) => n + (e.alive ? 0 : 1), 0);

    if (player.hp !== lastHp) {
      lastHp = player.hp;
      damage = 1;
      rig.addJolt(1.2);
      audio.hurt();
      hud.setHealth(player.hp, player.maxHp);
      if (player.lastHitFrom) hud.showDamageFrom(bearingTo(player.lastHitFrom));
    }
    if (mission.banner && mission.banner.life > 3.3) hud.showBanner(mission.objective);

    const near = pickups.nearest(player);
    hud.setPrompt(near ? `<b>E</b> ${WEAPONS[near.id].name}` : '');
    hud.setWeapon(weapon.spec.short, weapon.spec.name, weapon.mag, weapon.reserve,
      weapon.reloading > 0);

    // Sights magnify by however much this weapon's optic is worth; sprinting
    // opens the lens a little, which reads as effort.
    sprintFov += ((player.sprinting ? 1 : 0) - sprintFov) * Math.min(1, dt * 6);
    const want = settings.get('fov') * weapon.adsFov + sprintFov * 6 * (1 - weapon.ads);
    if (Math.abs(camera.fov - want) > 0.01) { camera.fov = want; camera.updateProjectionMatrix(); }

    exfilMark.visible = mission.phase === PHASE.EXFIL;
    hud.setObjective(mission.objective,
      mission.phase === PHASE.EXFIL || mission.phase === PHASE.DONE ? null : mission.alive);

    // Badly hurt: your heart and your breathing become the loudest things.
    const hurtFrac = 1 - player.hp / Math.max(1, player.maxHp);
    if (player.alive && hurtFrac >= 0.5) {
      heartTimer -= dt;
      if (heartTimer <= 0) { audio.heartbeat(hurtFrac); heartTimer = 1.15 - hurtFrac * 0.45; }
      breathTimer -= dt;
      if (breathTimer <= 0) { audio.breath(); breathTimer = 1.9 - hurtFrac * 0.6; }
    }

    // Distant artillery, so the fight sits inside a bigger war.
    thumpTimer -= dt;
    if (thumpTimer <= 0) { audio.distantThump(); thumpTimer = 14 + Math.random() * 26; }

    if (!player.alive) { endTimer += dt; if (endTimer > 2.2) endRound(false); }
    else if (mission.phase === PHASE.DONE) { endTimer += dt; if (endTimer > 1.4) endRound(true); }
  }

  damage = Math.max(0, damage - dt * 1.4);
  const dying = state === 'playing' && !player.alive;
  fade += ((dying ? 0.2 : 1) - fade) * Math.min(1, dt * 1.1);

  effects.update(dt, camera);
  rig.update(dt, player, map.indoor(player.pos));
  hud.showCrosshair(state === 'playing' && player.alive);
  hud.update(dt, weapon.spread, camera.fov, size()[1]);

  post.render(scene, camera, {
    time: performance.now() / 1000,
    shake: rig.shake,
    exposure: rig.exposure,
    damage: Math.min(1, damage + (player.alive ? (1 - player.hp / Math.max(1, player.maxHp)) * 0.22 : 0)),
    fade,
    filter: rig.filter,
  });
}
tick();

// Debug hook: poke at the game from the browser console, and let the automated
// smoke tests drive it without a mouse.
window.__dbg = {
  player, weapon, rig, map, scene, renderer, input, settings, ui, hud, pickups, effects,
  audioRef: audio,
  get enemies() { return mission ? mission.enemies : []; },
  get mission() { return mission; },
  get state() { return state; },
  play: startMission,
  teleport(x, y, z) { player.pos.set(x, y, z); player.vel.set(0, 0, 0); },
  face(yaw, pitch = 0) { player.yaw = yaw; player.pitch = pitch; rig.yaw = yaw; rig.pitch = pitch; },
};
