// Clean, flat-shaded materials. Readability beats grit: a few big areas of
// honest colour beat mottled "realistic" noise that just reads as mush.
import * as THREE from 'three';

function canvas(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

// Just enough variation to stop a surface looking like flat paint.
function tint(ctx, size, amount) {
  const img = ctx.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function finish(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function plaster(base = '#d5d8d2', repeat = 1) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
  tint(ctx, 128, 9);
  return finish(c, repeat, repeat);
}

export function brick(repeat = 2) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#7d5c4a'; ctx.fillRect(0, 0, 128, 128);
  const bh = 16, bw = 32;
  for (let row = 0; row < 8; row++) {
    const off = (row % 2) * bw / 2;
    for (let col = -1; col < 5; col++) {
      const v = 0.92 + Math.random() * 0.16;
      ctx.fillStyle = `rgb(${Math.floor(168 * v)},${Math.floor(106 * v)},${Math.floor(82 * v)})`;
      ctx.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  return finish(c, repeat, repeat);
}

export function wood(base = '#8a6c4c', repeat = 1) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = 0; i < 128; i += 21) ctx.fillRect(0, i, 128, 1.5);
  tint(ctx, 128, 7);
  return finish(c, repeat, repeat);
}

export function paintedWood(base = '#4f7d94') { return wood(base, 1); }

export function roofMetal(repeat = 5) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#6f7a70'; ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = 'rgba(255,255,255,0.11)'; ctx.fillRect(x, 0, 8, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(x + 8, 0, 8, 128);
  }
  return finish(c, repeat, repeat);
}

export function ground(repeat = 34) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#7d8158'; ctx.fillRect(0, 0, 128, 128);
  tint(ctx, 128, 13);
  return finish(c, repeat, repeat);
}

export function concrete(repeat = 3) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#9a9890'; ctx.fillRect(0, 0, 128, 128);
  tint(ctx, 128, 9);
  return finish(c, repeat, repeat);
}

export function floorBoards(repeat = 5) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = '#9c7a52'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let i = 0; i < 128; i += 26) ctx.fillRect(0, i, 128, 1.5);
  tint(ctx, 128, 7);
  return finish(c, repeat, repeat);
}

export function tile(base = '#b9b6ad', repeat = 4) {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  for (let i = 0; i < 128; i += 32) { ctx.fillRect(0, i, 128, 2); ctx.fillRect(i, 0, 2, 128); }
  tint(ctx, 128, 6);
  return finish(c, repeat, repeat);
}
