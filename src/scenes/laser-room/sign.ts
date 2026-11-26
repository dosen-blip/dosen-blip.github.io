import * as THREE from "three";
import { offThread, yieldToPage } from "./worker";

// Builds the neon sign from the brand SVGs (the FS monogram over the FREQUENCY SHIFT wordmark, laid out exactly as
// the hero's own lockup lays them out) and turns it into everything the scene needs:
//  - solid letters: the artwork's outlines extruded into channel letters, so the sign has real depth and its
//    returns catch the light as the camera moves,
//  - the shape the tube faces are lit with (alpha, mipmapped so a blurred level tells the middle of a stroke from
//    its edge),
//  - a padded copy blurred by mipmap that the wall and floor use as the sign's near light and reflection,
//  - virtual point lights placed on the tubes, weighted by how much tube is under them.
// Adapted from the OFF GRID hero's wordmark loader.

/**
 * Where each artwork sits in the lockup, in any unit (CSS pixels, when measured from the page). A part is either
 * brand artwork (an SVG's `url`) or drawn here (`draw`: white on the canvas, inside its box): the other pages'
 * rooms hang neon of their own, not the wordmark (see rooms.ts).
 */
export type SignPart = { x: number; y: number; w: number; h: number } & (
  | { url: string; draw?: undefined }
  | { url?: undefined; draw: (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void }
);
export type SignLayout = {
  width: number;
  height: number;
  parts: SignPart[];
  /** false when the first part is not the monogram: nothing in the sign waves */
  monogram?: boolean;
};

export type Sign = {
  /** solid letters: x and y span -0.5..0.5 of the sign's box, z runs from 0 (the face) to -1 (the back). The
   * sides come first; the last six vertices are the face, a plane the size of the box. */
  geometry: THREE.BufferGeometry;
  texture: THREE.Texture;
  /** width / height of the sign */
  aspect: number;
  /** the monogram (the first part): its centre in the sign's box and its radius in box heights */
  icon: { x: number; y: number; r: number };
  glow: THREE.Texture;
  /** the sign's width as a share of the glow texture's width (the rest is room for light to spread) */
  glowFill: number;
  glowAspect: number;
  /** virtual point lights in the sign's uv (0..1, y up), w = share of the total power */
  lights: { x: number; y: number; w: number }[];
  /** the brightest few lights, for the haze */
  hazeLights: { x: number; y: number; w: number }[];
  dispose(): void;
};

const SIGN_W = 4096; // the face is drawn straight from this: twice the screen's own pixels across a wide sign
const PAD = 0.02; // padding round the artwork in the shape texture, as a share of its width
const GLOW_W = 1024;
const GLOW_H = 512;
const GLOW_FILL = 0.62;

/** The desktop hero's lockup (see .neon-lockup in globals.css): the monogram at 35% of the width, then the wordmark. */
export function defaultLayout(base = ""): SignLayout {
  const w = 1000;
  const icon = 350;
  const gap = 40;
  const wordH = w / (1455.54 / 102.77);
  return {
    width: w,
    height: icon + gap + wordH,
    parts: [
      { url: `${base}/media/brand/fs-icon-neon.svg`, x: (w - icon) / 2, y: 0, w: icon, h: icon },
      { url: `${base}/media/brand/frequency-shift-wordmark-neon.svg`, x: 0, y: icon + gap, w, h: wordH },
    ],
  };
}

// The hero's SVGs carry their own CSS (an ignite animation that starts nearly invisible): drop it and paint every
// path plain white, so the artwork reads the same drawn into a canvas and parsed into outlines.
function plain(svg: string) {
  return svg.replace(/<style[\s\S]*?<\/style>/g, "<style>path{fill:#fff;stroke:none}</style>");
}

function loadImage(svg: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The sign artwork did not load"));
    };
    image.src = url;
  });
}

/**
 * The letters' sides, traced from the artwork's coverage with marching squares at half coverage: one wall quad per
 * contour segment, from the face (z = 0) back to z = -1. Normals come from the coverage's gradient, so curves shade
 * smoothly. `frame` maps a grid point to the sign's box (the padded frame's size, its padding, the layout's size);
 * `aspect` is the box's width over its height, which the normals are stretched by so that the mesh's stretch to the
 * sign's size leaves them true. Self-contained: it runs in a worker as its own source (see worker.ts).
 */
function traceLetters(
  a: Float32Array,
  W: number,
  H: number,
  frame: [frameW: number, frameH: number, padX: number, width: number, height: number],
  aspect: number,
): { pos: Float32Array; nrm: Float32Array } {
  const [frameW, frameH, padX, lw, lh] = frame;
  const toBox = (gx: number, gy: number): [number, number] => [
    (((gx + 0.5) / W) * frameW - padX) / lw - 0.5,
    0.5 - (((gy + 0.5) / H) * frameH - padX) / lh,
  ];
  const ISO = 0.5;
  const at = (x: number, y: number) => a[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const pos: number[] = [];
  const nrm: number[] = [];
  // the outward normal at a point: down the coverage's slope (grid y runs down, the box's runs up)
  const normal = (x: number, y: number): [number, number] => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    const gx = at(xi + 1, yi) - at(xi - 1, yi) + 0.5 * (at(xi + 1, yi - 1) - at(xi - 1, yi - 1) + at(xi + 1, yi + 1) - at(xi - 1, yi + 1));
    const gy = at(xi, yi + 1) - at(xi, yi - 1) + 0.5 * (at(xi - 1, yi + 1) - at(xi - 1, yi - 1) + at(xi + 1, yi + 1) - at(xi + 1, yi - 1));
    const nx = -gx;
    const ny = gy;
    const l = Math.hypot(nx, ny) || 1;
    return [(nx / l) * aspect, ny / l];
  };
  const wall = (x0: number, y0: number, x1: number, y1: number) => {
    const [ax, ay] = toBox(x0, y0);
    const [bx, by] = toBox(x1, y1);
    const [anx, any] = normal(x0, y0);
    const [bnx, bny] = normal(x1, y1);
    pos.push(ax, ay, 0, bx, by, 0, bx, by, -1, ax, ay, 0, bx, by, -1, ax, ay, -1);
    nrm.push(anx, any, 0, bnx, bny, 0, bnx, bny, 0, anx, any, 0, bnx, bny, 0, anx, any, 0);
  };
  const cross = (p: number, q: number) => (ISO - p) / (q - p);
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const tl = a[y * W + x];
      const tr = a[y * W + x + 1];
      const br = a[(y + 1) * W + x + 1];
      const bl = a[(y + 1) * W + x];
      const c = (tl > ISO ? 8 : 0) | (tr > ISO ? 4 : 0) | (br > ISO ? 2 : 0) | (bl > ISO ? 1 : 0);
      if (c === 0 || c === 15) continue;
      // where the edge crosses each side of the cell: top, right, bottom, left
      const e = [
        () => [x + cross(tl, tr), y],
        () => [x + 1, y + cross(tr, br)],
        () => [x + cross(bl, br), y + 1],
        () => [x, y + cross(tl, bl)],
      ];
      const seg = (i: number, j: number) => {
        const [x0, y0] = e[i]();
        const [x1, y1] = e[j]();
        wall(x0, y0, x1, y1);
      };
      const centre = (tl + tr + br + bl) / 4 > ISO;
      switch (c) {
        case 1: case 14: seg(3, 2); break;
        case 2: case 13: seg(2, 1); break;
        case 3: case 12: seg(3, 1); break;
        case 4: case 11: seg(0, 1); break;
        case 6: case 9: seg(0, 2); break;
        case 7: case 8: seg(3, 0); break;
        // saddles: the middle of the cell decides which corners join
        case 5: if (centre) { seg(0, 3); seg(1, 2); } else { seg(0, 1); seg(3, 2); } break;
        case 10: if (centre) { seg(0, 1); seg(3, 2); } else { seg(0, 3); seg(1, 2); } break;
      }
    }
  }
  // the face: the whole box, drawn with the artwork's coverage
  pos.push(-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0);
  for (let i = 0; i < 6; i++) nrm.push(0, 0, 1);
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm) };
}

export async function loadSign(
  layout: SignLayout,
  { grid = [6, 4] as [number, number], hazeCount = 6 } = {},
): Promise<Sign> {
  const images = await Promise.all(
    layout.parts.map(async (p) => {
      if (!p.url) return null;
      const response = await fetch(p.url);
      if (!response.ok) throw new Error(`The sign artwork did not load: ${p.url}`);
      return loadImage(plain(await response.text()));
    }),
  );
  const aspect = layout.width / layout.height;

  // the texture's frame: the layout plus a little padding, so the blurred levels have room at the edges
  const padX = layout.width * PAD;
  const frameW = layout.width + padX * 2;
  const frameH = layout.height + padX * 2;
  const scale = SIGN_W / frameW;
  const height = Math.round(frameH * scale);

  // ---- the shape: white, with the artwork's coverage as alpha
  const canvas = document.createElement("canvas");
  canvas.width = SIGN_W;
  canvas.height = height;
  const c = canvas.getContext("2d", { willReadFrequently: true })!;
  c.fillStyle = c.strokeStyle = "#fff";
  layout.parts.forEach((p, i) => {
    const box = [(p.x + padX) * scale, (p.y + padX) * scale, p.w * scale, p.h * scale] as const;
    const image = images[i];
    if (image) c.drawImage(image, ...box);
    else if (p.draw) {
      c.save();
      p.draw(c, ...box);
      c.restore();
    }
  });
  // (each of the heavy steps below is a task of its own: the page gets a turn between them)
  await yieldToPage();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  // the texture covers the padded frame; the geometry covers the layout. Map one onto the other in the shader.
  texture.repeat.set(layout.width / frameW, layout.height / frameH);
  texture.offset.set(padX / frameW, padX / frameH);

  // ---- solid letters: the sides are traced from the artwork as the browser draws it (not parsed from the SVG
  // paths, whose holes and overlaps do not all survive a triangulator), so they follow every stroke exactly; the
  // face is the drawn artwork itself, on a plane over them.
  const CW = 1536;
  const CH = Math.max(8, Math.round((CW * height) / SIGN_W));
  const trace = document.createElement("canvas");
  trace.width = CW;
  trace.height = CH;
  const t = trace.getContext("2d", { willReadFrequently: true })!;
  t.drawImage(canvas, 0, 0, CW, CH);
  const td = t.getImageData(0, 0, CW, CH).data;
  const alpha = new Float32Array(CW * CH);
  for (let i = 0; i < alpha.length; i++) alpha[i] = td[i * 4 + 3] / 255;
  const traced = offThread(traceLetters, alpha, CW, CH, [frameW, frameH, padX, layout.width, layout.height], aspect);
  await yieldToPage();

  // ---- glow texture: the sign, centred with room around it, as greyscale light
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = GLOW_W;
  glowCanvas.height = GLOW_H;
  const g = glowCanvas.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, GLOW_W, GLOW_H);
  let drawW = GLOW_W * GLOW_FILL;
  let drawH = drawW / aspect;
  if (drawH > GLOW_H * 0.8) {
    // a tall sign (the phone's stacked lockup) fits the height instead
    drawH = GLOW_H * 0.8;
    drawW = drawH * aspect;
  }
  const glowFill = drawW / GLOW_W;
  const sx = padX * scale;
  g.drawImage(canvas, sx, sx, canvas.width - sx * 2, canvas.height - sx * 2, (GLOW_W - drawW) / 2, (GLOW_H - drawH) / 2, drawW, drawH);
  const glow = new THREE.CanvasTexture(glowCanvas);
  glow.colorSpace = THREE.NoColorSpace;
  glow.generateMipmaps = true;
  glow.minFilter = THREE.LinearMipmapLinearFilter;
  glow.magFilter = THREE.LinearFilter;
  glow.wrapS = glow.wrapT = THREE.ClampToEdgeWrapping;

  // ---- a small copy for measuring (the layout only, no padding)
  const SW = 192;
  const SH = Math.max(8, Math.round(SW / aspect));
  const small = document.createElement("canvas");
  small.width = SW;
  small.height = SH;
  const s = small.getContext("2d", { willReadFrequently: true })!;
  s.drawImage(canvas, sx, sx, canvas.width - sx * 2, canvas.height - sx * 2, 0, 0, SW, SH);
  const data = s.getImageData(0, 0, SW, SH).data;
  const w = new Float32Array(SW * SH);
  for (let i = 0; i < w.length; i++) w[i] = data[i * 4 + 3] / 255;

  // ---- virtual point lights: one per grid cell, at the tubes' centre of mass in that cell
  const [gx, gy] = aspect < 1.6 ? [grid[1], grid[0]] : grid; // a tall sign gets more rows than columns
  const lights: Sign["lights"] = [];
  for (let cy = 0; cy < gy; cy++) {
    for (let cx = 0; cx < gx; cx++) {
      let sum = 0;
      let mx = 0;
      let my = 0;
      const x0 = Math.floor((cx / gx) * SW);
      const x1 = Math.floor(((cx + 1) / gx) * SW);
      const y0 = Math.floor((cy / gy) * SH);
      const y1 = Math.floor(((cy + 1) / gy) * SH);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = w[y * SW + x];
          sum += v;
          mx += v * x;
          my += v * y;
        }
      }
      if (sum > 0) lights.push({ x: (mx / sum + 0.5) / SW, y: 1 - (my / sum + 0.5) / SH, w: sum });
    }
  }
  const { pos, nrm } = await traced;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  const total = lights.reduce((a, l) => a + l.w, 0) || 1;
  lights.forEach((l) => (l.w /= total));
  // a fixed-size uniform array: pad with powerless lights
  while (lights.length < grid[0] * grid[1]) lights.push({ x: 0.5, y: 0.5, w: 0 });
  const hazeLights = [...lights].sort((a, b) => b.w - a.w).slice(0, hazeCount);
  const hazeTotal = hazeLights.reduce((a, l) => a + l.w, 0) || 1;
  const haze = hazeLights.map((l) => ({ ...l, w: l.w / hazeTotal }));

  return {
    geometry,
    texture,
    aspect,
    glow,
    glowFill,
    icon: (() => {
      // no monogram: a ring far off the sign, so nothing on it is inside the ring's wave
      if (layout.monogram === false) return { x: 40, y: 40, r: 0.01 };
      const p = layout.parts[0];
      return { x: (p.x + p.w / 2) / layout.width - 0.5, y: 0.5 - (p.y + p.h / 2) / layout.height, r: p.w / 2 / layout.height };
    })(),
    glowAspect: GLOW_W / GLOW_H,
    lights,
    hazeLights: haze,
    dispose() {
      geometry.dispose();
      texture.dispose();
      glow.dispose();
    },
  };
}
