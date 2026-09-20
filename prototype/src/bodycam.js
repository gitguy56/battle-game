import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Camera rig. Still chest-mounted, but it now tracks your look almost exactly -
// the heavy spring lag it had before read as the camera "shifting" when you
// turned, which made aiming feel broken. What is left is a hint of weight.
// ---------------------------------------------------------------------------
export class BodycamRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0; this.pitch = 0;
    this.yawVel = 0; this.pitchVel = 0;
    this.roll = 0;
    this.jolt = 0;
    this.t = 0;
    this.exposure = 1.0;
    this.shake = 0;
    this.filter = 1;          // 0 = clean render, 1 = full camera look
    this.motion = 0.35;       // global multiplier on bob and handheld noise
  }

  addJolt(a) { this.jolt = Math.min(1.6, this.jolt + a); }

  update(dt, player, indoor) {
    this.t += dt;

    // Stiff and near-critically damped: follows the mouse with a touch of
    // weight and no overshoot.
    const k = 420, damp = 2 * Math.sqrt(k) * 0.95;
    this.yawVel += ((player.yaw - this.yaw) * k - this.yawVel * damp) * dt;
    this.pitchVel += ((player.pitch - this.pitch) * k - this.pitchVel * damp) * dt;
    this.yaw += this.yawVel * dt;
    this.pitch += this.pitchVel * dt;

    const m = this.motion;
    const bob = player.bobAmount * m;
    const ph = player.bobPhase;

    this.roll += (THREE.MathUtils.clamp(-this.yawVel * 0.012, -0.03, 0.03) - this.roll)
      * Math.min(1, dt * 10);

    const n = (f, o) => Math.sin(this.t * f + o) * Math.sin(this.t * f * 0.37 + o * 2.1);
    const idle = (0.0005 + bob * 0.0018) * m;
    this.jolt *= Math.pow(0.0008, dt);

    const eye = player.eye;
    this.camera.position.set(
      eye.x + Math.cos(ph) * 0.022 * bob + n(2.3, 1.0) * idle * 7,
      eye.y + Math.abs(Math.sin(ph)) * -0.026 * bob + n(1.7, 2.0) * idle * 6,
      eye.z + n(1.1, 0.5) * idle * 4);

    const jx = (Math.random() - 0.5) * this.jolt * 0.022;
    const jy = (Math.random() - 0.5) * this.jolt * 0.022;

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + jx;
    this.camera.rotation.x = this.pitch + Math.sin(ph * 2) * 0.004 * bob + jy;
    this.camera.rotation.z = this.roll + Math.cos(ph) * 0.010 * bob;

    this.shake = Math.min(1, bob * 0.5 + this.jolt * 0.4);

    // Cameras stop down fast in bright light and open up slowly in the dark.
    const target = indoor ? 1.55 : 1.0;
    this.exposure += (target - this.exposure) * Math.min(1, dt * (target < this.exposure ? 3.2 : 1.1));
  }
}

// ---------------------------------------------------------------------------
// Picture. Much lighter than before: a clean image with a hint of camera on it.
// uFilter scales every artifact at once, so the look can be switched off.
// ---------------------------------------------------------------------------
const VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const SIGNAL = `
precision highp float;
uniform sampler2D tScene, tPrev;
uniform float uTime, uShake, uExposure, uAspect, uHistory, uFilter;
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
  // Distortion is radially symmetric about the centre, so the centre pixel is
  // never displaced - the crosshair still marks exactly where the shot goes.
  float k = 0.035 * uFilter;
  vec2 uvR = clamp(barrel(vUv, k * 1.03), 0.0015, 0.9985);
  vec2 uvG = clamp(barrel(vUv, k),        0.0015, 0.9985);
  vec2 uvB = clamp(barrel(vUv, k * 0.97), 0.0015, 0.9985);

  vec3 lin = vec3(
    texture2D(tScene, uvR).r,
    texture2D(tScene, uvG).g,
    texture2D(tScene, uvB).b);

  vec3 col = toSRGB(aces(lin * uExposure));

  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, mix(vec3(l), col, 0.90) + vec3(0.008, 0.010, 0.015), uFilter);

  vec3 prev = texture2D(tPrev, vUv).rgb;
  col = mix(col, prev, uHistory * uFilter);

  float g = hash(vUv * vec2(1920.0, 1080.0) + uTime * 71.3) - 0.5;
  col += g * (0.012 + uShake * 0.012) * uFilter;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const SCREEN = `
precision highp float;
uniform sampler2D tSignal;
uniform float uAspect, uDamage, uFade, uTime, uFilter;
varying vec2 vUv;

void main(){
  vec3 col = texture2D(tSignal, vUv).rgb;
  vec2 c = vUv - 0.5; c.x *= uAspect;
  float r = length(c);

  col *= mix(1.0, mix(0.70, 1.0, smoothstep(1.02, 0.30, r)), uFilter);
  col *= 1.0 - 0.010 * uFilter * sin(vUv.y * 900.0 + uTime * 2.0);
  col = mix(col, vec3(0.45, 0.05, 0.04), uDamage * 0.55 * smoothstep(0.1, 0.85, r));
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.sceneRT = new THREE.WebGLRenderTarget(s.x, s.y, { depthBuffer: true, type: THREE.HalfFloatType });
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
        uAspect: { value: s.x / s.y }, uHistory: { value: 0.05 }, uFilter: { value: 1 },
      },
    });
    this.screenMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: SCREEN, depthTest: false, depthWrite: false,
      uniforms: {
        tSignal: { value: null }, uAspect: { value: s.x / s.y },
        uDamage: { value: 0 }, uFade: { value: 1 }, uTime: { value: 0 }, uFilter: { value: 1 },
      },
    });

    this.scene = new THREE.Scene();
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.signalMat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.cam = new THREE.Camera();
  }

  setSize(w, h) {
    this.sceneRT.setSize(w, h); this.a.setSize(w, h); this.b.setSize(w, h);
    this.signalMat.uniforms.uAspect.value = w / h;
    this.screenMat.uniforms.uAspect.value = w / h;
  }

  render(scene, camera, o) {
    const r = this.renderer;
    r.setRenderTarget(this.sceneRT); r.clear(); r.render(scene, camera);

    const u = this.signalMat.uniforms;
    u.tScene.value = this.sceneRT.texture; u.tPrev.value = this.b.texture;
    u.uTime.value = o.time; u.uShake.value = o.shake;
    u.uExposure.value = o.exposure; u.uFilter.value = o.filter;
    this.mesh.material = this.signalMat;
    r.setRenderTarget(this.a); r.render(this.scene, this.cam);

    const s = this.screenMat.uniforms;
    s.tSignal.value = this.a.texture; s.uDamage.value = o.damage;
    s.uFade.value = o.fade; s.uTime.value = o.time; s.uFilter.value = o.filter;
    this.mesh.material = this.screenMat;
    r.setRenderTarget(null); r.render(this.scene, this.cam);

    const t = this.a; this.a = this.b; this.b = t;
  }
}
