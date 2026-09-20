// Procedural textures drawn on a 2D canvas at load time.
// Keeps the prototype a single self-contained file with no asset downloads.
import * as THREE from 'three';

function canvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function grain(ctx, size, amount, alpha = 1) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
    if (alpha < 1) d[i + 3] *= alpha;
  }
  ctx.putImageData(img, 0, 0);
}

function blotches(ctx, size, count, color, rMin, rMax, alpha) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = rMin + Math.random() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function finish(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Painted plaster over brick - the characteristic village house wall.
export function plaster(base = '#d8d3c4', repeat = 2) {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  blotches(ctx, 256, 70, 'rgba(112,104,88,0.45)', 6, 26, 0.26);
  blotches(ctx, 256, 24, 'rgba(255,255,255,0.5)', 10, 34, 0.18);
  // grime rising from the ground
  const g = ctx.createLinearGradient(0, 256, 0, 150);
  g.addColorStop(0, 'rgba(70,62,50,0.3)');
  g.addColorStop(1, 'rgba(70,62,50,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  // hairline cracks
  ctx.strokeStyle = 'rgba(90,80,70,0.45)'; ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    let x = Math.random() * 256, y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let s = 0; s < 8; s++) { x += (Math.random() - 0.5) * 30; y += Math.random() * 18; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  grain(ctx, 256, 22);
  return finish(c, repeat, repeat);
}

// Exposed brick, used where the plaster has been blown off.
export function brick(repeat = 2) {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#6b5647'; ctx.fillRect(0, 0, 256, 256);
  const bh = 16, bw = 64;
  for (let row = 0; row < 256 / bh; row++) {
    const off = (row % 2) * bw / 2;
    for (let col = -1; col < 256 / bw + 1; col++) {
      const x = col * bw + off, y = row * bh;
      const v = 0.78 + Math.random() * 0.35;
      ctx.fillStyle = `rgb(${Math.floor(150 * v)},${Math.floor(92 * v)},${Math.floor(70 * v)})`;
      ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    }
  }
  grain(ctx, 256, 26);
  return finish(c, repeat, repeat);
}

export function wood(base = '#6d5741', repeat = 1) {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
    ctx.fillRect(0, i, 256, 2);
  }
  // plank seams
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let i = 0; i < 256; i += 32) ctx.fillRect(0, i, 256, 2);
  grain(ctx, 256, 18);
  return finish(c, repeat, repeat);
}

// Painted window surround - these are usually a contrasting blue or green.
export function paintedWood(base = '#3f6d86') { return wood(base, 1); }

// Ribbed sheet metal roofing, rusted.
export function roofMetal(repeat = 6) {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#5c6357'; ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g; ctx.fillRect(x, 0, 16, 256);
  }
  blotches(ctx, 256, 30, 'rgba(140,70,35,0.8)', 8, 40, 0.5); // rust
  grain(ctx, 256, 16);
  return finish(c, repeat, repeat);
}

export function ground(repeat = 40) {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#6b6449'; ctx.fillRect(0, 0, 256, 256);
  blotches(ctx, 256, 60, 'rgba(116,122,74,0.9)', 10, 45, 0.55); // scrubby grass
  blotches(ctx, 256, 40, 'rgba(70,60,45,0.9)', 8, 30, 0.5);   // mud
  grain(ctx, 256, 30);
  return finish(c, repeat, repeat);
}

export function concrete(repeat = 4) {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#767469'; ctx.fillRect(0, 0, 256, 256);
  blotches(ctx, 256, 25, 'rgba(60,58,54,0.7)', 10, 40, 0.4);
  grain(ctx, 256, 24);
  return finish(c, repeat, repeat);
}

export function floorBoards(repeat = 4) {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#7a6144'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 26) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.1})`;
    ctx.fillRect(0, i, 256, 26);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, i, 256, 2);
  }
  blotches(ctx, 256, 20, 'rgba(40,30,20,0.6)', 10, 40, 0.35);
  grain(ctx, 256, 20);
  return finish(c, repeat, repeat);
}
