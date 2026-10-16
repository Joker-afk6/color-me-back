/**
 * Procedurally drawn canvas textures (no external image assets needed): painterly noise for
 * tactile surfaces, awning stripes, text labels, icon decals and the child's drawing.
 */
import * as THREE from 'three';
import { Rng } from '../utils/rng';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

function toTexture(c: HTMLCanvasElement, repeat = 1, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Soft painterly blotches, centred on white so material color still drives the hue. */
export function paintNoiseTexture(seed = 1, repeat = 6, strength = 0.12): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  const rng = new Rng(seed);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i++) {
    const x = rng.range(0, 256);
    const y = rng.range(0, 256);
    const r = rng.range(6, 34);
    const v = Math.round(255 * (1 - rng.range(0, strength)));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${v},${v},0.55)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = g;
    // draw wrapped so the texture tiles seamlessly
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // tiny brush flecks
  for (let i = 0; i < 900; i++) {
    const v = Math.round(255 * (1 - rng.range(0, strength * 1.4)));
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fillRect(rng.range(0, 256), rng.range(0, 256), rng.range(1, 3), rng.range(1, 2));
  }
  return toTexture(c, repeat);
}

export function stripeTexture(a: string, b: string, stripes = 8): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 64);
  const w = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? a : b;
    ctx.fillRect(i * w, 0, w, 64);
  }
  const t = toTexture(c, 1);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function ginghamTexture(a: string, b: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = a;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 8; i += 2) {
    ctx.fillRect(i * 16, 0, 16, 128);
    ctx.fillRect(0, i * 16, 128, 16);
  }
  return toTexture(c, 2);
}

export interface LabelStyle {
  font?: string;
  color?: string;
  background?: string;
  border?: string;
  padding?: number;
  radius?: number;
}

/** A rounded text badge, e.g. the word labels above the bedroom inspectables. */
export function labelTexture(text: string, style: LabelStyle = {}): { texture: THREE.CanvasTexture; aspect: number } {
  const font = style.font ?? '700 64px Fredoka, system-ui, sans-serif';
  const [m, mctx] = canvas(8, 8);
  void m;
  mctx.font = font;
  const tw = Math.ceil(mctx.measureText(text).width);
  const pad = style.padding ?? 26;
  const w = tw + pad * 2;
  const h = 104;
  const [c, ctx] = canvas(w, h);
  const r = style.radius ?? 40;
  if (style.background) {
    ctx.fillStyle = style.background;
    roundRect(ctx, 4, 4, w - 8, h - 8, r);
    ctx.fill();
    if (style.border) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = style.border;
      ctx.stroke();
    }
  }
  ctx.font = font;
  ctx.fillStyle = style.color ?? '#2b3350';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 3);
  const t = toTexture(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { texture: t, aspect: w / h };
}

export type IconName = 'star' | 'berry' | 'gem' | 'ring' | 'footprint1' | 'footprint2' | 'footprint3' | 'arrow';

/** White-on-transparent icon decals (tinted by the material). */
export function iconTexture(name: IconName): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  ctx.translate(128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (name) {
    case 'star':
      starPath(ctx, 0, 0, 100, 44, 5);
      ctx.fill();
      break;
    case 'berry':
      ctx.beginPath();
      ctx.arc(0, 18, 76, 0, Math.PI * 2);
      ctx.lineWidth = 16;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -58);
      ctx.quadraticCurveTo(30, -100, 70, -92);
      ctx.quadraticCurveTo(40, -60, 0, -58);
      ctx.fill();
      for (const [x, y] of [[-26, 0], [24, 8], [-6, 44], [30, 46], [-36, 40]] as const) {
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'gem':
      ctx.beginPath();
      ctx.moveTo(0, -100);
      ctx.lineTo(86, 70);
      ctx.lineTo(-86, 70);
      ctx.closePath();
      ctx.lineWidth = 18;
      ctx.stroke();
      break;
    case 'ring':
      ctx.beginPath();
      ctx.arc(0, 0, 112, 0, Math.PI * 2);
      ctx.lineWidth = 16;
      ctx.stroke();
      ctx.setLineDash([22, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, 84, 0, Math.PI * 2);
      ctx.lineWidth = 8;
      ctx.stroke();
      break;
    case 'footprint1':
    case 'footprint2':
    case 'footprint3': {
      const n = Number(name.slice(-1));
      ctx.beginPath();
      ctx.ellipse(0, 22, 62, 78, 0, 0, Math.PI * 2);
      ctx.lineWidth = 14;
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-40 + i * 40, -82, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '900 92px Fredoka, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), 0, 30);
      break;
    }
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(0, -110);
      ctx.lineTo(80, -10);
      ctx.lineTo(32, -10);
      ctx.lineTo(32, 100);
      ctx.lineTo(-32, 100);
      ctx.lineTo(-32, -10);
      ctx.lineTo(-80, -10);
      ctx.closePath();
      ctx.fill();
      break;
  }
  const t = toTexture(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * The child's drawing (Prologue P0): blue ocean, red fruit, yellow sun, crayon style.
 * Returns both the colorful and the faded version so the cinematic can crossfade them.
 */
export function drawingTextures(): { color: THREE.CanvasTexture; gray: THREE.CanvasTexture } {
  const draw = (gray: boolean): HTMLCanvasElement => {
    const [c, ctx] = canvas(512, 384);
    const col = (hex: string) => {
      if (!gray) return hex;
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      const l = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
      const v = Math.round(l * 0.85 + 0.15 * 190);
      return `rgb(${v},${v},${v})`;
    };
    ctx.fillStyle = '#fbf8f0';
    ctx.fillRect(0, 0, 512, 384);
    const rng = new Rng(77);
    const crayon = (color: string, pts: Array<[number, number]>, width: number) => {
      ctx.strokeStyle = col(color);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + rng.range(-2, 2), y + rng.range(-2, 2)) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    // Yellow sun with rays
    ctx.fillStyle = col('#FACC15');
    ctx.beginPath();
    ctx.arc(410, 82, 46, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      crayon('#F5B800', [[410 + Math.cos(a) * 58, 82 + Math.sin(a) * 58], [410 + Math.cos(a) * 82, 82 + Math.sin(a) * 82]], 9);
    }
    // Blue ocean waves
    ctx.fillStyle = col('#3B82F6');
    ctx.beginPath();
    ctx.moveTo(0, 270);
    for (let x = 0; x <= 512; x += 32) ctx.quadraticCurveTo(x + 16, 250 + (x % 64 ? 10 : -10), x + 32, 270);
    ctx.lineTo(512, 384);
    ctx.lineTo(0, 384);
    ctx.fill();
    for (let row = 0; row < 3; row++) {
      const pts: Array<[number, number]> = [];
      for (let x = 10; x < 510; x += 20) pts.push([x, 300 + row * 26 + Math.sin(x / 18) * 6]);
      crayon('#93C5FD', pts, 6);
    }
    // Red fruit (apples) on a little tree
    crayon('#8B5A2B', [[150, 250], [150, 150]], 16);
    ctx.fillStyle = col('#7CB342');
    ctx.beginPath();
    ctx.arc(150, 130, 62, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y] of [[120, 110], [176, 128], [140, 160], [184, 92]] as const) {
      ctx.fillStyle = col('#EF4444');
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    // A big red apple on the ground
    ctx.fillStyle = col('#EF4444');
    ctx.beginPath();
    ctx.arc(290, 220, 34, 0, Math.PI * 2);
    ctx.fill();
    crayon('#5D4037', [[290, 188], [296, 172]], 6);
    // Stick-figure explorer holding a brush
    crayon('#334155', [[240, 250], [240, 205]], 6);
    ctx.strokeStyle = col('#334155');
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(240, 190, 15, 0, Math.PI * 2);
    ctx.stroke();
    crayon('#334155', [[222, 222], [258, 214]], 6);
    // Paper edge shading
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 374);
    return c;
  };
  const color = toTexture(draw(false), 1);
  const gray = toTexture(draw(true), 1);
  for (const t of [color, gray]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { color, gray };
}

/** Pencil-sketch view of the gray village seen through the bedroom window. */
export function pencilVillageTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 320);
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#dfe3e8');
  g.addColorStop(1, '#c4c9cf');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#6b7380';
  ctx.lineWidth = 3;
  const rng = new Rng(5);
  // hills
  ctx.fillStyle = '#b3b9c0';
  ctx.beginPath();
  ctx.moveTo(0, 230);
  ctx.quadraticCurveTo(140, 170, 270, 220);
  ctx.quadraticCurveTo(400, 180, 512, 210);
  ctx.lineTo(512, 320);
  ctx.lineTo(0, 320);
  ctx.fill();
  // houses
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 96 + rng.range(-10, 10);
    const y = 210 + rng.range(-8, 8);
    ctx.fillStyle = '#eef0f2';
    ctx.fillRect(x, y - 50, 60, 50);
    ctx.strokeRect(x, y - 50, 60, 50);
    ctx.fillStyle = '#9aa2ab';
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 50);
    ctx.lineTo(x + 30, y - 92);
    ctx.lineTo(x + 68, y - 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7b8490';
    ctx.fillRect(x + 22, y - 30, 16, 30);
  }
  // sketchy hatching
  ctx.strokeStyle = 'rgba(80,90,100,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 220; i++) {
    const x = rng.range(0, 512);
    const y = rng.range(150, 320);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10, y - 6);
    ctx.stroke();
  }
  const t = toTexture(c, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
