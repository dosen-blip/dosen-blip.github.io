// The laser show: a small rig of emitters and a running order of looks, played on a house tempo.
//
// Each look is a function of beats since it began, returning beams (origin, direction, colour, power). Looks hand
// over to each other with a one-beat crossfade, and every look opens over its first beats (a fan spreads, a cone
// widens) so a change reads as a move, not a cut. Beams move; they never strobe. The only pulse on the beat is a
// gentle swell of at most a fifth of a beam's power.

export type Vec3 = [number, number, number];

/** `k`: the beam's place in its look, which stays put while the look plays (see playShow) */
export type Beam = { o: Vec3; d: Vec3; color: Vec3; power: number; k?: number };

export type Rig = {
  /** above the sign, under the page's header */
  top: Vec3;
  /** two more heads at the same height, out toward either side */
  topLeft: Vec3;
  topRight: Vec3;
  /** on stands either side of the sign */
  left: Vec3;
  right: Vec3;
  /** the floor line, for beam lengths */
  floorY: number;
  /** where the viewer is, for looks aimed past them */
  eye: Vec3;
  /** the rig's lean toward the pointer, radians */
  lean: [number, number];
};

export const BPM = 124;

export const MAGENTA: Vec3 = [1, 0.06, 0.52];
export const CYAN: Vec3 = [0.05, 0.78, 1];

export type LookName = "fan" | "tunnel" | "sheet" | "twin" | "cross" | "scan";

/** the running order, in bars of four beats: the full-width sheets come round most */
export const RUNNING_ORDER: [LookName, number][] = [
  ["fan", 4],
  ["sheet", 8],
  ["tunnel", 4],
  ["twin", 8],
  ["cross", 4],
  ["sheet", 8],
  ["scan", 4],
];

const TAU = Math.PI * 2;
const smoother = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** a direction from yaw (around the vertical, 0 = straight at the viewer) and pitch (up) */
function dir(yaw: number, pitch: number): Vec3 {
  return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
}

function beam(o: Vec3, yaw: number, pitch: number, color: Vec3, power: number, rig: Rig): Beam {
  return { o, d: dir(yaw + rig.lean[0], pitch + rig.lean[1]), color, power };
}

/**
 * A sheet of n beams from one head, centred on `yaw`, `spread` either side. Its outer beams angle down more than
 * its middle ones (`droop`), so it opens like an umbrella across the top of the screen, the outermost running
 * down toward its edges. A slow wave runs across it.
 */
function sheetFrom(o: Vec3, n: number, yaw: number, spread: number, pitch: number, droop: number, t: number, color: (u: number) => Vec3, power: number, rig: Rig) {
  return Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1) - 0.5;
    // resonance: a wave runs across the sheet, one beam after the next, two beats a cycle
    const wave = 0.01 * Math.sin(Math.PI * t - u * 9);
    return beam(o, yaw + u * 2 * spread, pitch - droop * Math.abs(u) * 2 + wave, color(u), power, rig);
  });
}

type Look = (t: number, rig: Rig) => Beam[];

const LOOKS: Record<LookName, Look> = {
  // thirteen beams from the middle head spreading open and swaying over the room, with the outer heads fanning
  // out to either side
  fan(t, rig) {
    const open = smoother(0, 3, t);
    const spread = 0.82 * open;
    const sway = 0.24 * Math.sin((TAU * t) / 16);
    const pitch = -0.08 + 0.03 * Math.sin((TAU * t) / 8);
    const n = 13;
    // resonance: each beam trembles very slightly on the beat, a standing wave across the fan
    const middle = Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      const tremble = 0.005 * Math.sin(Math.PI * u) * Math.sin(Math.PI * t);
      return beam(rig.top, sway + (u - 0.5) * 2 * spread + tremble, pitch, MAGENTA, 1, rig);
    });
    const outer: Beam[] = [];
    for (let i = 0; i < 5; i++) {
      const yaw = (0.3 + i * 0.17) * open + 0.12 * Math.sin((TAU * t) / 8 + i * 0.4);
      // angled down across the room, the outermost most, so they run down toward the screen's edges
      const p = pitch - 0.05 - 0.03 * i;
      outer.push(beam(rig.topLeft, -yaw, p, CYAN, 0.8, rig), beam(rig.topRight, yaw, p, CYAN, 0.8, rig));
    }
    return [...middle, ...outer];
  },

  // a turning cone aimed down round the viewer: the beams close in on all sides of the camera, a tunnel of light
  // through the room rather than a cluster leaving the top of the screen
  tunnel(t, rig) {
    const open = smoother(0, 2, t);
    const axisYaw = Math.atan2(rig.eye[0] - rig.top[0], rig.eye[2] - rig.top[2]);
    const dz = rig.eye[2] - rig.top[2];
    const axisPitch = Math.atan2(rig.eye[1] + 0.45 - rig.top[1], dz);
    const radius = 0.13 * open;
    const turn = (TAU * t) / 16;
    const n = 16;
    return Array.from({ length: n }, (_, i) => {
      const a = turn + (TAU * i) / n;
      return beam(rig.top, axisYaw + Math.cos(a) * radius * 1.25, axisPitch + Math.sin(a) * radius, CYAN, 0.85, rig);
    });
  },

  // the full-width sheet: a dense flat fan from the middle head reaching right across the screen. Seen from
  // below through the haze it reads as a ceiling of light, slowly lowering and lifting
  sheet(t, rig) {
    const open = smoother(0, 4, t);
    // tilted a little down toward the viewer, so the sheet runs out over the room as a ceiling of light filling
    // the top of the screen (it still clears the viewer's head), rather than leaving straight out of the frame
    const pitch = -0.17 + 0.03 * Math.sin((TAU * t) / 32 - Math.PI / 2);
    return sheetFrom(rig.top, 32, 0.08 * Math.sin((TAU * t) / 16), 1.32 * open, pitch, 0.13 * open, t, (u) => (Math.abs(u) > 0.46 ? CYAN : MAGENTA), 0.42, rig);
  },

  // two sheets from the outer heads, each reaching across to the far side, crossing over the sign at slightly
  // different heights and swaying against each other
  twin(t, rig) {
    const open = smoother(0, 4, t);
    const sway = 0.14 * Math.sin((TAU * t) / 16);
    const pitch = -0.16 + 0.025 * Math.sin((TAU * t) / 16);
    return [
      ...sheetFrom(rig.topLeft, 16, 0.3 + sway, 0.95 * open, pitch, 0.1 * open, t, () => MAGENTA, 0.5, rig),
      ...sheetFrom(rig.topRight, 16, -0.3 - sway, 0.95 * open, pitch + 0.03, 0.1 * open, t + 1, () => CYAN, 0.5, rig),
    ];
  },

  // the stands fire up and across at each other: cyan from the left, magenta from the right. The fans cross
  // in an X above the sign and scissor slowly
  cross(t, rig) {
    const open = smoother(0, 2, t);
    const out: Beam[] = [];
    for (let i = 0; i < 5; i++) {
      const k = (i - 2) / 2;
      const swing = 0.14 * Math.sin((TAU * t) / 8 + k * 0.6);
      const pitch = 1.45 - (0.67 + 0.07 * Math.sin((TAU * t) / 4 + i * 1.3) + k * 0.12) * open;
      const yaw = 0.95 + swing + k * 0.12;
      out.push(beam(rig.left, yaw, pitch, CYAN, 0.85, rig));
      out.push(beam(rig.right, -yaw, pitch, MAGENTA, 0.85, rig));
    }
    return out;
  },

  // single beams from every head, tilting up and down on a two-beat swing, out of step with each other
  scan(t, rig) {
    const open = smoother(0, 1.5, t);
    const tilt = (p: number) => (0.04 + 0.16 * Math.sin((TAU * t) / 4 + p)) * open;
    return [
      beam(rig.left, 0.16, tilt(0), CYAN, 1, rig),
      beam(rig.top, 0, tilt(Math.PI * 0.66) + 0.02, MAGENTA, 1, rig),
      beam(rig.right, -0.16, tilt(Math.PI * 1.33), CYAN, 1, rig),
      beam(rig.left, 0.34, tilt(Math.PI) + 0.06, MAGENTA, 0.7, rig),
      beam(rig.right, -0.34, tilt(Math.PI * 0.33) + 0.06, MAGENTA, 0.7, rig),
      beam(rig.topLeft, -0.25, tilt(Math.PI * 0.5) + 0.05, CYAN, 0.8, rig),
      beam(rig.topRight, 0.25, tilt(Math.PI * 1.5) + 0.05, CYAN, 0.8, rig),
    ];
  },
};

/** how long a running order is, in beats */
export const orderBeats = (order: [LookName, number][] = RUNNING_ORDER) => order.reduce((a, [, bars]) => a + bars * 4, 0);

/**
 * Looks kept for a treat: each plays on only one pass through the running order in this many (the last). The
 * turning tunnel comes round about once every three and a half minutes on the home page.
 */
const RARE: Partial<Record<LookName, number>> = { tunnel: 3 };
/** what plays in a rare look's place on the other passes: a light look (few beams), not the one either side of it.
 * Leaving the slot out would put the sheet straight before the twin, 64 beams at once in the handover. */
const STAND_INS: LookName[] = ["cross", "scan", "fan"];

const spread = new WeakMap<[LookName, number][], [LookName, number][]>();
/** the order as actually played: as many passes as the rarest look needs, a rare look only on its own pass */
export function asPlayed(order: [LookName, number][]): [LookName, number][] {
  let out = spread.get(order);
  if (out) return out;
  const passes = Math.max(1, ...order.map(([name]) => RARE[name] ?? 1));
  out = [];
  for (let p = 0; p < passes; p++) {
    order.forEach(([name, bars], i) => {
      const every = RARE[name];
      if (!every || (p + 1) % every === 0) return out!.push([name, bars]);
      const near = [order[(i + order.length - 1) % order.length][0], order[(i + 1) % order.length][0]];
      out!.push([STAND_INS.find((s) => !near.includes(s)) ?? "scan", bars]);
    });
  }
  spread.set(order, out);
  return out;
}

/**
 * Every beam playing `beat` beats into the show. `open` (0..1) fades the whole show in, and `lock` plays one look
 * on its own (for the lab). `order` is the running order (the home page's by default: each page's room plays its
 * own, see rooms.ts) and `tempo` how fast the looks move against the beat (a half: every sweep takes twice as long).
 */
export function playShow(
  beat: number,
  rig: Rig,
  { open = 1, lock, order = RUNNING_ORDER, tempo = 1 }: { open?: number; lock?: LookName; order?: [LookName, number][]; tempo?: number } = {},
): Beam[] {
  if (beat < 0 || open <= 0) return [];
  const pulse = 0.85 + 0.15 * Math.exp(-(((beat % 1) + 1) % 1) * 4);
  beat *= tempo;

  if (lock) return LOOKS[lock](beat, rig).map((b, k) => ({ ...b, k, power: b.power * open * pulse }));

  order = asPlayed(order);
  const total = orderBeats(order);
  const inOrder = beat % total;
  let start = 0;
  let index = 0;
  for (; index < order.length; index++) {
    const length = order[index][1] * 4;
    if (inOrder < start + length) break;
    start += length;
  }
  const local = inOrder - start;
  // the look before hands over during this look's first beat (except at the very start of the show)
  const handover = beat >= 1 ? smoother(0, 1, local) : 1;
  const now = LOOKS[order[index][0]](local, rig).map((b, k) => ({ ...b, k, power: b.power * handover }));
  if (handover >= 1) return now.map((b) => ({ ...b, power: b.power * open * pulse }));
  const prevIndex = (index + order.length - 1) % order.length;
  const prevLength = order[prevIndex][1] * 4;
  const before = LOOKS[order[prevIndex][0]](prevLength + local, rig).map((b, k) => ({
    ...b,
    k,
    power: b.power * (1 - handover),
  }));
  return [...before, ...now].map((b) => ({ ...b, power: b.power * open * pulse }));
}

/** the most beams any moment of the show can play: the largest handover (the sheet after the fan, 32 + 23) and
 * the opening burst's extra stand beams over the fan */
export const MAX_BEAMS = 64;

/**
 * Rigs round the room, out of the frame, that the page brings in as it scrolls: their heads are never seen, only
 * their beams coming in from the edges of the screen.
 */
export type PageRig = {
  /** heads on the side walls, halfway up, firing across the room */
  flankL: Vec3;
  flankR: Vec3;
  /** heads low at either side, skimming the wet floor */
  skimL: Vec3;
  skimR: Vec3;
  /** heads in the ceiling over the floor seen at the end of the page, firing straight down (in pairs) */
  rain: Vec3[];
  /** the sign's middle and half size */
  sign: [number, number, number, number];
  floorY: number;
  /** the viewer, for the heads behind them */
  eye: Vec3;
  /** a head low on the left wall, just over the fog, that lays a sheet of light across the floor */
  sheetL: Vec3;
  /** a head in the ceiling over the floor the camera looks down on, fanning a sheet straight down */
  sheetTop: Vec3;
};

/** the most beams the page's rigs add at once (two rigs overlap at a time, and the sheets' edges) */
export const PAGE_BEAMS = 36;

/**
 * A laser sheet: one beam swept across a fan faster than the eye can follow, so it shows as a flat slice of light
 * through the fog. `o` is the head, `n` the plane's normal, `u` the fan's middle direction (in the plane), `half`
 * its half angle, `reach` how far it carries.
 */
export type Sheet = { o: Vec3; n: Vec3; u: Vec3; half: number; reach: number; color: Vec3; power: number };
export const MAX_SHEETS = 4;

const zone = (g: number, a: number, b: number, fade = 0.08) => smoother(a - fade, a + fade, g) * (1 - smoother(b - fade, b + fade, g));
const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * The page's rigs, `g` of the way down the page (0 the hero, 1 the footer), `beat` beats into the show. Each one
 * comes in over its own stretch of the page and hands over to the next: crossfire from the side walls behind the
 * next night, beams over the viewer's shoulders landing on the floor ahead through the archive, beams skimming the
 * floor from either side, then a curtain of light either side of the sign as the footer arrives. `density` thins
 * them (a phone).
 */
/** the rigs round the room, and the two sheets of light, by name */
export type PageRigName = "flank" | "behind" | "skim" | "rain" | "floor" | "scan";
/**
 * `slosh`: the page's scroll as a spring (about -1..1), which swings the rigs and settles when the scroll stops.
 * `only`: instead of each rig taking its own stretch of the page (the home page), just these play, at strength `on`
 * (the other pages' rooms each bring their own in as the camera turns to the floor, and keep them).
 */
type PageOptions = { open?: number; density?: number; slosh?: number; only?: readonly PageRigName[]; on?: number };
const stretch = (name: PageRigName, g: number, a: number, b: number, { only, on = 1 }: PageOptions) => (only ? (only.includes(name) ? on : 0) : zone(g, a, b));

export function playPage(beat: number, g: number, rig: PageRig, options: PageOptions = {}): Beam[] {
  const { open = 1, density = 1, slosh = 0 } = options;
  if (beat < 0 || open <= 0) return [];
  const out: Beam[] = [];
  const pulse = open * (0.85 + 0.15 * Math.exp(-(((beat % 1) + 1) % 1) * 4));
  const count = (n: number) => Math.max(2, Math.round(n * density));
  const [sx] = rig.sign;

  // each rig's beams are numbered along each side (k), so the floor's reflection, which takes every other one
  // (or every fourth), takes from both sides
  const sides = (left: Beam[], right: Beam[]) => {
    left.forEach((b, k) => out.push({ ...b, k }));
    right.forEach((b, k) => out.push({ ...b, k }));
  };

  // the side walls: a fan from each, low across the room and back toward the wall, some landing on the floor in
  // front of it, the two sweeping against each other
  const flank = stretch("flank", g, 0.12, 0.5, options) * pulse;
  if (flank > 0.005) {
    const n = count(8);
    const swayL = 0.28 * Math.sin((TAU * beat) / 16) + 0.3 * slosh;
    const swayR = 0.28 * Math.sin((TAU * beat) / 16 + Math.PI * 0.6) + 0.3 * slosh;
    const left: Beam[] = [];
    const right: Beam[] = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      const p = -0.05 - 0.1 * Math.abs(u) + 0.03 * Math.sin((TAU * beat) / 8 + i * 0.9);
      left.push({ o: rig.flankL, d: dir(1.95 + swayL + u * 0.8, p), color: CYAN, power: flank });
      right.push({ o: rig.flankR, d: dir(-1.95 - swayR - u * 0.8, p), color: MAGENTA, power: flank });
    }
    sides(left, right);
  }

  // behind the viewer, high on either side: beams over their shoulders landing on the floor where they're looking,
  // their spots circling slowly
  const behind = stretch("behind", g, 0.3, 0.68, options) * pulse;
  if (behind > 0.005) {
    const n = count(5);
    const [ex, ey, ez] = rig.eye;
    const [left, right] = [-1, 1].map((side) => {
      const o: Vec3 = [ex + side * 2.6, ey + 2.8, ez + 2.2];
      return Array.from({ length: n }, (_, i): Beam => {
        const a = (TAU * i) / n + ((TAU * beat) / 32) * side + (side > 0 ? 0.5 : 0);
        const target: Vec3 = [sx + side * 0.5 + Math.cos(a) * 2.4, rig.floorY, rig.eye[2] - 5.6 + Math.sin(a) * 1.8];
        return { o, d: unit([target[0] - o[0], target[1] - o[1], target[2] - o[2]]), color: side < 0 ? MAGENTA : CYAN, power: 0.8 * behind };
      });
    });
    sides(left, right);
  }

  // low at either side: near-flat beams skimming the floor, crossing in the middle and scissoring, doubled in the water
  const skim = stretch("skim", g, 0.5, 0.86, options) * pulse;
  if (skim > 0.005) {
    const n = count(5);
    const left: Beam[] = [];
    const right: Beam[] = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const scissor = 0.2 * Math.sin((TAU * beat) / 8 + u * 1.4) + 0.25 * slosh;
      const yaw = Math.PI / 2 - 0.12 + u * 0.6 + scissor;
      const p = 0.01 * Math.sin((TAU * beat) / 4 + i);
      left.push({ o: rig.skimL, d: dir(yaw, p), color: i % 2 ? MAGENTA : CYAN, power: 0.9 * skim });
      right.push({ o: rig.skimR, d: dir(-yaw, p), color: i % 2 ? CYAN : MAGENTA, power: 0.9 * skim });
    }
    sides(left, right);
  }

  // the ceiling, as the footer arrives: columns of light falling straight down into the fog, swaying, their spots
  // dancing on the floor under it. They stay to the end.
  const rain = stretch("rain", g, 0.74, 1.2, options) * pulse;
  if (rain > 0.005) {
    const heads = rig.rain.slice(0, count(rig.rain.length));
    const left: Beam[] = [];
    const right: Beam[] = [];
    heads.forEach((o, j) => {
      const side = o[0] < 0 ? -1 : 1;
      const k = j >> 1;
      const sway = 0.15 * Math.sin((TAU * beat) / 8 + k * 0.9 + (side > 0 ? 1.3 : 0));
      const nod = 0.1 * Math.sin((TAU * beat) / 16 + k * 1.7);
      (side < 0 ? left : right).push({ o, d: unit([sway, -1, nod]), color: (k + (side > 0 ? 1 : 0)) % 2 ? MAGENTA : CYAN, power: 0.9 * rain });
    });
    sides(left, right);
  }
  return out;
}

const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** `v` turned by `a` round the unit axis `n` (v at right angles to n) */
const turn = (v: Vec3, n: Vec3, a: number): Vec3 => {
  const w = cross3(n, v);
  return [v[0] * Math.cos(a) + w[0] * Math.sin(a), v[1] * Math.cos(a) + w[1] * Math.sin(a), v[2] * Math.cos(a) + w[2] * Math.sin(a)];
};

/**
 * The page's sheets of light, over the stretch of the page where the camera looks down at the floor. Each one
 * also fires its two edge beams (where a real scanner turns, and lingers), returned with the sheets.
 *
 * - Over the floor: a sheet from the left wall just over the floor, nearly flat, so it slices the fog bank and
 *   shows it rolling. It rises and dips through the bank, and the page's scroll tilts it like a liquid sloshing.
 * - Down from the ceiling: a fan straight down that sweeps side to side across the floor like a scanner, a
 *   glowing curtain in the fog with a line of light where it meets the floor.
 */
export function pageSheets(beat: number, g: number, rig: PageRig, options: PageOptions = {}): { sheets: Sheet[]; edges: Beam[] } {
  const { open = 1, slosh = 0 } = options;
  const sheets: Sheet[] = [];
  const edges: Beam[] = [];
  if (beat < 0 || open <= 0) return { sheets, edges };
  const pulse = open * (0.85 + 0.15 * Math.exp(-(((beat % 1) + 1) % 1) * 4));
  const add = (sheet: Sheet, edge: number) => {
    sheets.push(sheet);
    for (const side of [-1, 1]) edges.push({ o: sheet.o, d: turn(sheet.u, sheet.n, side * sheet.half), color: sheet.color, power: sheet.power * edge, k: side > 0 ? 0 : 1 });
  };

  // from just past the hero to the end of the page: the page ends looking down at the floor
  const floor = stretch("floor", g, 0.12, 1.2, options) * pulse;
  if (floor > 0.005) {
    const tiltX = 0.035 * Math.sin((TAU * beat) / 16) + 0.07 * slosh;
    const tiltZ = 0.045 * Math.sin((TAU * beat) / 8 + 1.1) - 0.04 * slosh;
    const n = unit([-tiltX, 1, tiltZ]);
    // across the room, a little toward the viewer, laid into the plane
    const a: Vec3 = [1, 0, 0.1];
    const along = a[0] * n[0] + a[1] * n[1] + a[2] * n[2];
    const u = unit([a[0] - n[0] * along, a[1] - n[1] * along, a[2] - n[2] * along]);
    // wide enough that its edges (which fade over their last 20 degrees) stay off the floor in view
    add({ o: rig.sheetL, n, u, half: 1.45, reach: 32, color: CYAN, power: floor }, 0.4);
  }

  const scan = stretch("scan", g, 0.36, 0.82, options) * pulse;
  if (scan > 0.005) {
    const w = 0.42 * Math.sin((TAU * beat) / 16 + 0.8) + 0.12 * slosh;
    const n: Vec3 = [Math.cos(w), Math.sin(w), 0];
    // straight down in the plane, fanning toward and away from the viewer
    const u: Vec3 = [Math.sin(w), -Math.cos(w), 0];
    add({ o: rig.sheetTop, n, u, half: 0.75, reach: 14, color: MAGENTA, power: 0.9 * scan }, 0.6);
  }
  return { sheets, edges };
}
