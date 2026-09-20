import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Camera rig. A bodycam is strapped to a chest, not bolted to a skull: it lags
// the look direction, swings past it, and never stops moving.
// ---------------------------------------------------------------------------
export class BodycamRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0; this.pitch = 0;
    this.yawVel = 0; this.pitchVel = 0;
    this.roll = 0; this.rollVel = 0;
    this.jolt = 0;
    this.t = 0;
    this.exposure = 1.0;
    this.shake = 0;
  }

  addJolt(a) { this.jolt = Math.min(2.2, this.jolt + a); }

  update(dt, player, indoor) {
    this.t += dt;

    // spring toward where the player is looking, underdamped so it overshoots
    const k = 62, damp = 2 * Math.sqrt(k) * 0.62;
    this.yawVel += ((player.yaw - this.yaw) * k - this.yawVel * damp) * dt;
    this.pitchVel += ((player.pitch - this.pitch) * k - this.pitchVel * damp) * dt;
    this.yaw += this.yawVel * dt;
    this.pitch += this.pitchVel * dt;

    // the camera rolls into turns
    const rollTarget = THREE.MathUtils.clamp(-this.yawVel * 0.055, -0.13, 0.13);
    this.rollVel += ((rollTarget - this.roll) * 90 - this.rollVel * 17) * dt;
    this.roll += this.rollVel * dt;

    const bob = player.bobAmount;
    const ph = player.bobPhase;

    // handheld noise, always present, worse when moving
    const n = (f, o) => Math.sin(this.t * f + o) * Math.sin(this.t * f * 0.37 + o * 2.1);
    const idle = 0.0016 + bob * 0.004;

    this.jolt *= Math.pow(0.0015, dt);

    const px = Math.cos(ph) * 0.045 * bob + n(2.3, 1.0) * idle * 9;
    const py = Math.abs(Math.sin(ph)) * -0.055 * bob + n(1.7, 2.0) * idle * 7;
    const pz = n(1.1, 0.5) * idle * 5;

    const eye = player.eye;
    this.camera.position.set(eye.x + px, eye.y + py, eye.z + pz);

    const jx = (Math.random() - 0.5) * this.jolt * 0.05;
    const jy = (Math.random() - 0.5) * this.jolt * 0.05;

    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + n(2.9, 0.3) * idle * 3 + jx;
    this.camera.rotation.x = this.pitch + Math.sin(ph * 2) * 0.012 * bob + n(3.4, 1.6) * idle * 3 + jy;
    this.camera.rotation.z = this.roll + Math.cos(ph) * 0.03 * bob + n(2.1, 0.9) * idle * 4;

    this.shake = Math.min(1, bob * 0.7 + this.jolt * 0.5);

    // Auto-exposure. Cameras stop down fast in bright light and open up slowly
    // in the dark, which is why stepping into a doorway blows out for a moment.
    const target = indoor ? 1.62 : 1.0;
    const rate = target < this.exposure ? 3.2 : 0.85;
    this.exposure += (target - this.exposure) * Math.min(1, dt * rate);
  }
}

// ---------------------------------------------------------------------------
// The picture. Two passes: build the video signal, then draw it to the screen.
// Splitting them keeps the vignette out of the temporal feedback loop.
// ---------------------------------------------------------------------------
const VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const SIGNAL = `
precision highp float;
uniform sampler2D tScene, tPrev;
uniform float uTime, uShake, uExposure, uAspect, uHistory, uSignal;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 barrel(vec2 uv, float k){
  vec2 c = uv - 0.5; c.x *= uAspect;
  c *= 1.0 + k * dot(c, c);
  c.x /= uAspect; return c + 0.5;
}
vec3 aces(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSRGB(vec3 c){
  return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0/2.4)) - 0.055, step(0.0031308, c));
}

void main(){
  // Wide lens. Chromatic aberration comes free from distorting each channel
  // by a slightly different amount.
  float k = 0.16;
  vec2 uvR = clamp(barrel(vUv, k * 1.055), 0.0015, 0.9985);
  vec2 uvG = clamp(barrel(vUv, k),         0.0015, 0.9985);
  vec2 uvB = clamp(barrel(vUv, k * 0.945), 0.0015, 0.9985);

  vec3 lin = vec3(
    texture2D(tScene, uvR).r,
    texture2D(tScene, uvG).g,
    texture2D(tScene, uvB).b);

  lin *= uExposure;
  vec3 col = toSRGB(aces(lin));

  // cheap sensor grade: desaturate, lift and cool the blacks, soften contrast
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.80);
  col = col * 1.04 - 0.008;
  col += vec3(0.016, 0.019, 0.028);

  // shutter smear
  vec3 prev = texture2D(tPrev, vUv).rgb;
  col = mix(col, prev, uHistory);

  // sensor noise, heavier in the shadows as on a real cheap camera
  float g = hash(vUv * vec2(1920.0, 1080.0) + uTime * 71.3) - 0.5;
  col += g * (0.040 + uShake * 0.030) * (1.35 - l);

  // compression blocks and a dropped line now and then
  float blk = hash(floor(vUv * vec2(60.0, 34.0)) + floor(uTime * 12.0));
  col += (blk - 0.5) * 0.012;
  float band = step(0.9975, hash(vec2(floor(uTime * 9.0), floor(vUv.y * 140.0))));
  col = mix(col, col * 0.4 + 0.22, band * (1.0 - uSignal * 0.7));

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const SCREEN = `
precision highp float;
uniform sampler2D tSignal;
uniform float uAspect, uDamage, uFade, uTime;
varying vec2 vUv;

void main(){
  vec3 col = texture2D(tSignal, vUv).rgb;
  vec2 c = vUv - 0.5; c.x *= uAspect;
  float r = length(c);

  // lens vignette
  col *= mix(0.46, 1.0, smoothstep(0.95, 0.24, r));
  // faint rolling scanline, the tell that this is a recording
  col *= 1.0 - 0.030 * sin(vUv.y * 900.0 + uTime * 2.0);
  // being hit
  col = mix(col, vec3(0.42, 0.05, 0.03), uDamage * 0.60 * smoothstep(0.15, 0.8, r));
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    const opts = { depthBuffer: true, type: THREE.HalfFloatType };
    this.sceneRT = new THREE.WebGLRenderTarget(s.x, s.y, opts);
    this.sceneRT.texture.colorSpace = THREE.LinearSRGBColorSpace;

    const lo = { depthBuffer: false, type: THREE.UnsignedByteType };
    this.a = new THREE.WebGLRenderTarget(s.x, s.y, lo);
    this.b = new THREE.WebGLRenderTarget(s.x, s.y, lo);
    for (const rt of [this.a, this.b]) rt.texture.colorSpace = THREE.LinearSRGBColorSpace;

    this.signalMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SIGNAL, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: null }, tPrev: { value: null },
        uTime: { value: 0 }, uShake: { value: 0 }, uExposure: { value: 1 },
        uAspect: { value: s.x / s.y }, uHistory: { value: 0.14 }, uSignal: { value: 1 },
      },
    });
    this.screenMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SCREEN, depthTest: false, depthWrite: false,
      uniforms: {
        tSignal: { value: null }, uAspect: { value: s.x / s.y },
        uDamage: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 },
      },
    });

    const quad = new THREE.PlaneGeometry(2, 2);
    this.scene = new THREE.Scene();
    this.mesh = new THREE.Mesh(quad, this.signalMat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.cam = new THREE.Camera();
  }

  setSize(w, h) {
    this.sceneRT.setSize(w, h); this.a.setSize(w, h); this.b.setSize(w, h);
    this.signalMat.uniforms.uAspect.value = w / h;
    this.screenMat.uniforms.uAspect.value = w / h;
  }

  render(scene, camera, opts) {
    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    const u = this.signalMat.uniforms;
    u.tScene.value = this.sceneRT.texture;
    u.tPrev.value = this.b.texture;
    u.uTime.value = opts.time;
    u.uShake.value = opts.shake;
    u.uExposure.value = opts.exposure;
    u.uSignal.value = opts.signal ?? 1;
    this.mesh.material = this.signalMat;
    r.setRenderTarget(this.a);
    r.render(this.scene, this.cam);

    const s = this.screenMat.uniforms;
    s.tSignal.value = this.a.texture;
    s.uDamage.value = opts.damage;
    s.uFade.value = opts.fade;
    s.uTime.value = opts.time;
    this.mesh.material = this.screenMat;
    r.setRenderTarget(null);
    r.render(this.scene, this.cam);

    const t = this.a; this.a = this.b; this.b = t; // ping-pong the history
  }
}
