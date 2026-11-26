import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AtmospherePass, Flare, LaserPass, Power } from "./fx";
import { PAN_PROFILE } from "./pan";
import { buildNoise3D } from "./noise3d";
import { yieldToPage } from "./worker";
import {
  DUST_FRAG,
  DUST_VERT,
  FLOOR_FRAG,
  FS_VERT,
  AURA_FRAG,
  AURA_VERT,
  GRADE_FRAG,
  MOTION_FRAG,
  SIGN_FRAG,
  SIGN_VERT,
  SURFACE_VERT,
  WALL_FRAG,
} from "./shaders";
import { BPM, CYAN as LASER_CYAN, MAGENTA as LASER_MAGENTA, MAX_BEAMS, MAX_SHEETS, PAGE_BEAMS, RUNNING_ORDER, pageSheets, playPage, playShow, type Beam, type LookName, type PageRig, type PageRigName, type Rig, type Sheet, type Vec3 } from "./show";
import { defaultLayout, loadSign, type Sign, type SignLayout } from "./sign";

// Ported from the Frequency Shift site (~/Documents/FREQUEMCY 2, components/laser-room/scene.ts at b4d893c) for the
// portfolio's case study. The changes are all options (see LaserRoomOptions), off unless asked for: `neon: false` leaves
// the letters to the page, `follow` keeps the unseen sign behind the page's wordmark (hang and followPage, split out of
// placeBay), `headInBand` hangs the laser head clear of the words over the sign, `rigCentre` hangs the rig over the
// middle of the room and `fog` sets the fog bank's strength (for the card art's bake). Everything else is the site's
// own, so a later version can be copied over and these made again.
//
// The laser room:the Frequency Shift sign hangs on the back wall of a dark, hazy room and lights it. A laser rig
// above and beside it plays a show through the haze. The structure follows the OFF GRID hero
// (~/CITY:GRID/src/scenes/offgrid/hero.ts), which follows the Instinct wall: one factory, a handle with destroy(),
// quality tiers, a paused loop when hidden, a frame-time watchdog and onFail for the page to fall back to a still.
//
// With `launch`, the scene opens as a full-screen power-on: the camera starts close and a little off to one side,
// so the letters' depth shows while the sign strikes and catches, then pulls back to the hero's resting view as the
// page around it arrives (onLaunchEnd).

/**
 * Intro timeline, seconds: a moment of black, a short run of failed strikes, then the sign catches and the lasers
 * hit in the same instant (the burst lands a beat after the catch's flare), and the camera starts pulling back as
 * they spread. The room comes up under it all.
 */
export const INTRO = { strike: 0.3, ignite: 1.35, roomEnd: 3, lasers: 1.43, settled: 2.8, land: 1.43, landFor: 1.9 };

const CAM_Z = 14;
const FOV = 32;
const LOGO_Z = 0.32; // the back of the letters, off the wall on standoffs
// FS pink (#eb73c1): the tubes are the brand pink through and through, only their hottest middles a little paler.
// The glow round them is the flat sign's own: pink close in, violet (#c548f0) further out.
const TUBE = new THREE.Color(0xeb73c1);
const CORE = new THREE.Color(1, 0.62, 0.88);
const PINK = new THREE.Color(0xeb73c1);
const CYAN_BURST: Vec3 = [0.05, 0.78, 1];
const PINK_BURST: Vec3 = [1, 0.06, 0.52];
const VIOLET = new THREE.Color(0xc548f0);
const WHITE = new THREE.Color(1, 1, 1);
const LIGHT_COLOR = new THREE.Color(1, 0.2, 0.66);
const LIGHT_POWER = 5;
const SMOKE = 0.24;
// how far the monogram's wave lines move, as a share of its radius (a few pixels on a wide screen)
const WAVE = 0.011; // thin: a bank of haze along the floor and around the sign, clear dark air above
const WALL_TILE = 6.5;
const FLOOR_TILE = 5.5;
// the launch's camera: closer than the hero's, a little low and to the left, so the returns of the letters show
const LAUNCH_CAM = { x: -1.1, y: -0.5, z: CAM_Z - 1.15 };

// beams: the most the laser pass takes. A phone keeps the show's own 64 (its GPU may only hold that many in a
// shader's uniforms); the page's rigs come in thinner there and are the first to give way.
// The smoke is drawn at a quarter of the screen each way on both: on a phone it was at half and 32 steps, which
// was over half of a phone's whole frame for a picture that can't be told from this one (measured 2026-11-24).
const QUALITY = {
  full: { pixels: 9.5e6, dpr: 2, samples: 0, grid: [6, 4] as [number, number], haze: 6, taps: 64, steps: 48, smokeShift: 2, dust: 1800, beams: MAX_BEAMS + PAGE_BEAMS, pageDensity: 1 },
  phone: { pixels: 1.6e6, dpr: 2, samples: 0, grid: [4, 3] as [number, number], haze: 4, taps: 36, steps: 16, smokeShift: 2, dust: 600, beams: MAX_BEAMS, pageDensity: 0.5 },
};
// a room that can't be drawn in this long (ms) at the last stage of the pace gives up the live scene
const HOPELESS_FRAME = 70;
/** seconds into the show by which its opening burst is over (see burst) */
const BURST_OVER = 3;
// The governor's ladder (see govern): the resolution at each level. Level 1 is still full resolution, with the
// soft layers (the smoke's steps, the rays' taps) trimmed to SOFT_DETAIL of their own, as they are from there down.
const LADDER = [1, 1, 0.88, 0.78, 0.69, 0.61, 0.55];
const SOFT_DETAIL = 0.67;
// The room's pace (see govern): how many times a second it is drawn, and at which level of the ladder, best
// first. A steady rate comes before the picture: a room that can't keep 60 as it is (or with the soft layers
// trimmed, which doesn't show) is drawn 30 times a second, every one on time, with everything as it was, before
// anything is made smaller. Only a room that can't keep 30 goes down the ladder, and at its foot the rate once more.
const PACE: [rate: number, level: number][] = [[60, 0], [60, 1], [30, 0], [30, 1], [30, 2], [30, 3], [30, 4], [30, 5], [30, 6], [20, 6]];
const FIRST_AT_30 = 2;
// What a frame may cost, as timed at the start of a visit (see timeFrames), for the room to start at a rate: a
// share of that rate's own frame. The rest is for what the timing can't see: the page's own drawing while it
// scrolls, the floor's reflections further down, a phone warming up. Set from measurements (2026-11-25, nine
// sizes and speeds of GPU, each stage held through a scroll down the page and back): at 30 a stage came through
// without a late frame when a lit frame took up to about 0.68 of its turn; at 60, up to about 0.8.
const ROOM_AT_60 = 0.92;
const ROOM_AT_60_UNTRIMMED = 0.75;
const ROOM_AT_30 = 0.575;
// the timed frames are of a dark room: with the beams on a frame costs about this much more (1.75 to 2.3)
const LIT = 1.9;
// and a calm room's frame (the pages other than home) against the home page's
const CALM_TO_HOME = 1.5;
// The same for a frame timed later in the visit, lit and at the size it is drawn at, which needs no guessing
const ROOM_LIT_AT_60 = 0.8;
const ROOM_LIT_AT_30 = 0.68;
// the soft layers trimmed (level 1) are worth about this much of a frame
const TRIMMED = 0.85;
// a part of a frame drawn on each frame of the screen (see tick) may take up to this share of it: the rest is for the
// last pass, which shows it, and for the page's own drawing
const PART_FITS = 0.68;
// how quickly the camera catches up with the page's scroll (per second): quick enough to feel tied to the wheel,
// slow enough that a flick glides
const TRAVEL_EASE = 5;
// the camera's shutter while it travels between bays: open for this share of each frame (see step)
const SHUTTER = 0.65;

const smoother = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** every layer, each with a switch so it can be judged on its own */
export const LAYERS = ["sign", "room", "smoke", "rays", "lasers", "reflect", "dust", "bloom", "grade", "resonance", "fog", "cards"] as const;
export type Layer = (typeof LAYERS)[number];

/** a box in the container, in CSS pixels from its top left */
export type Box = { x: number; y: number; w: number; h: number };

/** one of the page's cards over the room (a photo, the poster, a panel): where it is, its colour and its light */
export type CardLight = Box & { color: [number, number, number]; power: number };
const MAX_CARDS = 8;

/** what the room's light is doing right now, each 0..1 */
export type RoomLight = {
  /** the sign's light, flicker and all */
  sign: number;
  /** how much laser light is in the air, and how much of it is pink and how much cyan */
  lasers: number;
  pink: number;
  cyan: number;
  /** a soft hit on every beat, and a bigger one on the first beat of each bar */
  beat: number;
  bar: number;
  /** the opening burst's wash of light */
  flash: number;
  /** how far the camera has turned from the sign down to the floor: 0 in the hero, 1 once it's past it */
  travel: number;
  /** the show's place in its bar of four beats, 0..1; -1 while no show is playing (before it opens, or a still) */
  clock: number;
};

/**
 * The camera's path down the home page is one move, not one per section. Leaving the hero it tilts down, right
 * away from the sign, until the sign has gone off the top of the frame and there is only the wet floor, the beams
 * over it and their reflections in it; the room drifts up with the page, slower than the words. Through the middle
 * of the page and on to the footer it drifts slowly back from the wall, still looking down, so the floor keeps
 * sliding up with the page: the page ends in the room, not back at the sign. The scroll position drives it directly
 * (eased), so it never stops between sections. In world units built from the room's own layout (the wall is z = 0,
 * the floor y = floorY, the sign's middle is at logoX, logoY).
 */
type View = { halfW: number; halfH: number; logoW: number; logoH: number; logoX: number; logoY: number; face: number; floorY: number };
type Shot = { eye: [number, number, number]; look: [number, number, number] };
/**
 * The move the scroll carries the camera through, which each page's room makes its own (see rooms.ts): how far it
 * turns from the wall toward the floor (`tilt`, 1 = all the way: the sign leaves the frame), how far it walks along
 * the wall (`slide`) and back from it (`back`, or toward it when negative) by the end of the page, how high over
 * the floor it looks down from (`height`, climbing by `rise` down the page), and how far ahead the middle of the
 * frame meets the floor (`ahead`). All in world units.
 */
export type CameraPath = { tilt: number; slide: number; back: number; height: number; rise: number; ahead: number };
const HOME_PATH: CameraPath = { tilt: 1, slide: 1.2, back: 3.6, height: 2.6, rise: 0, ahead: 5.2 };
/**
 * A calm room (the pages other than home) moves less: its camera walks a share of its path along, toward or back
 * from the wall and up (`path`), drifts and follows the pointer a share as far (`sway`), and its rigs round the
 * room keep the show's slower pace and only a share of the scroll's whip and swing (`scroll`). On trial (25 Nov):
 * no walking and no drift at all, the camera only turning down to the floor with the scroll (was path 0.45,
 * sway 0.4).
 */
const CALM_MOVE = { path: 0, sway: 0, scroll: 0.35 };
/**
 * The pages other than home, once the camera has turned down to the floor: a few beams through dark air, not a
 * show (the client, 25 Nov: "fewer lasers ... very overstimulating"), but each one at full strength so it still
 * pops (the user, the same evening: dimming them as well looked "like watching through sunglasses"). The show keeps
 * one beam in `keep` (the home page: one in four) at `show` of its strength; the rigs round the room play `rigs` of
 * their beams at `rigPower`; the sheets of light over the floor at `sheets`. The home page keeps its full intensity.
 */
const BELOW = { keep: 8, show: 1, rigs: 0.5, rigPower: 1, sheets: 0.8 };
/** how far the camera and its aim follow the pointer on the home page, and drift on their own (were 0.7 / 0.3 and
 * 0.18 / 0.08: enough that the sign wandered off the middle as the pointer moved) */
const PARALLAX = { x: 0.25, y: 0.1, driftX: 0.1, driftY: 0.04 };

/**
 * What makes one page's room its own: the colours of its neon (from its left end to its right) and of the light
 * it throws, its two laser colours, the looks its show runs through and how fast and bright they play, and the
 * camera's move down the page. The home page's room is the default for each.
 */
export type RoomLook = {
  tube?: [THREE.ColorRepresentation, THREE.ColorRepresentation];
  light?: Vec3;
  lasers?: [Vec3, Vec3];
  order?: [LookName, number][];
  tempo?: number;
  gain?: number;
  path?: Partial<CameraPath>;
  /** the rigs round the room this page brings in once its camera has turned to the floor, and keeps (see show.ts
   * playPage): without it, the home page's, each over its own stretch of the page */
  rigs?: readonly PageRigName[];
  /** the neon never quite settles */
  restless?: boolean;
  /** a quieter room, for reading in: every other beam of its show, and those dimmer (the other pages' rooms, so the
   * home page's is the one that goes all out) */
  calm?: boolean;
};
function calmPath(p: CameraPath, calm: boolean): CameraPath {
  if (!calm) return p;
  const k = CALM_MOVE.path;
  return { ...p, slide: p.slide * k, back: p.back * k, rise: p.rise * k };
}
/** how many screens of scroll the camera takes to tilt down out of the hero */
const DIP = 0.9;
/** the view down onto the floor, `g` of the way down the page (the home page's: from 2.6 up and 5.2 ahead, the top
 * of the frame meets the wall just under the sign's lowest letters, and soon the floor) */
function floorShot(v: View, g: number, out: Shot, p: CameraPath) {
  const x = v.logoX - p.slide / 2 + p.slide * g;
  const z = CAM_Z - 0.6 + p.back * g;
  out.eye[0] = x;
  out.eye[1] = v.floorY + p.height + p.rise * g;
  out.eye[2] = z;
  out.look[0] = x + 0.2 * Math.sign(p.slide || 1);
  out.look[1] = v.floorY;
  out.look[2] = z - p.ahead;
  return out;
}

export type LaserRoomOptions = {
  textures: { albedo: string; surface: string };
  /** where the monogram and wordmark sit in the lockup; defaults to the desktop hero's lockup */
  layout?: SignLayout;
  /** names the sign the layout makes, so another page with the same sign can reuse it (see BayInit) */
  signKey?: string;
  /** where the lockup is in the container, so the sign lands on the page's own layout; without it, the sign is centred */
  anchor?: () => Box | null;
  /** how much of the container's top the page covers (its header), in CSS pixels: the laser head sits below it */
  topClear?: () => number;
  /**
   * Where the page has scrolled to (`at`) and how far it can go (`end`), both in screen heights: the camera's path
   * through the room (see floorShot). Without it the camera stays put.
   */
  page?: () => { at: number; end: number };
  /** the show's light, each frame, for the page around the room to take its colour from */
  onLight?: (light: RoomLight) => void;
  /** the page's cards on the screen right now: they stand on the floor as lightboxes while the camera looks down */
  cards?: () => CardLight[];
  quality?: "full" | "phone";
  /**
   * false: the page draws the neon itself, in front of the room (the portfolio's case study keeps its own wordmark).
   * The channel letters and the glow round them are not drawn, but the sign is still built from the layout, and its
   * light, its haze, its god rays and its reflection come from where it hangs, as they would from the letters. Keep it
   * behind the page's neon with `follow`: anywhere else, its halo and the gap it leaves in the smoke show its letters.
   */
  neon?: boolean;
  /**
   * true: the laser head hangs in the clear band between the page's header and the sign, not just over the sign (the
   * case study has a line of words right above its wordmark, which the head would otherwise sit on).
   */
  headInBand?: boolean;
  /**
   * The page's own neon, where it is on the screen right now (container px): with it, the sign (unseen, with `neon:
   * false`) is kept behind it every frame, whatever the camera does (see followPage). Without it, the sign stays where
   * `anchor` put it, which matches the page only while the camera is at rest.
   */
  follow?: () => Box | null;
  /** the laser rig hangs over the middle of the room, not over the sign (the case study's sign is off to one side) */
  rigCentre?: boolean;
  /**
   * The fog bank along the floor at this strength (1 is the site's, looking down at the floor), whatever the camera's
   * turn. Without it the bank thickens as the camera turns down to the floor. (The case study's card art bakes the
   * hero's view with the bank rolling under the show.)
   */
  fog?: number;
  /** one finished frame, no loop (reduced motion) */
  still?: boolean;
  /** open as a full-screen power-on, and pull back to the resting view once it ends */
  launch?: boolean;
  /** play one look on its own */
  lock?: LookName;
  /** this page's room: its colours, its show, its camera move (the home page's by default) */
  look?: RoomLook;
  /**
   * Start with the room already up, this many seconds into the show: the other pages open on a room that has been
   * running since the site was opened, not on another power-on. Without it the room powers on.
   */
  settled?: number;
  /** testing only: draw the room this many times larger each way than it shows, as a slower GPU would feel */
  handicap?: number;
  /** the show has started, `since` seconds ago */
  onShow?: (since: number) => void;
  layers?: Partial<Record<Layer, boolean>>;
  signal?: AbortSignal;
  debug?: boolean;
  onStart?: () => void;
  /** the launch is over: the camera starts pulling back and the page can arrive */
  onLaunchEnd?: () => void;
  onFail?: () => void;
};

export type LaserRoom = {
  canvas: HTMLCanvasElement;
  destroy(): void;
  pulse(amp?: number): void;
  /** jump past the strikes; a launch ends shortly after */
  skipIntro(): void;
  setLayer(layer: Layer, on: boolean): void;
  lock(look: LookName | undefined): void;
  /** stop the clock at `t` seconds (forward or back), or let it run again with `undefined` */
  freeze(t: number | undefined): void;
  /** measure the page again (after a layout change) */
  relayout(): void;
  /** change the room's colours while it runs (a night's page takes them from its own photographs) */
  tint(look: Pick<RoomLook, "tube" | "light" | "lasers">): void;
  /** build a sign ahead of time (a link to its page is under the pointer), so the travel there starts sooner */
  preload(key: string, layout: () => SignLayout): Promise<void>;
  /** get the next page's bay ready one bay over (`dir` 1: to the right), its sign built and uploaded; returns how
   * far the old and new pages' neon move across the screen for one screen of camera travel, for the page's own
   * content to move with it */
  prepare(next: BayInit, dir: 1 | -1): Promise<[number, number]>;
  /** travel there, from `t0` (performance.now) for `ms`: resolves once the camera has arrived */
  travel(t0: number, ms: number): Promise<void>;
  /** arrive now, wherever the travel had got to */
  settle(): void;
  /** hold a travel at `u` of its time, to judge a frame of it (undefined lets it run) */
  holdTravel(u: number | undefined): void;
  stats(): { fps: number; ms: number; resolution: number; level: number; dpr: number; time: number; beams: number; rate: number; stage: number; draws: number; late: number; timed: number; parts: number; completed: number; presented: number; behind: number; whole: number };
};

/** the next page's bay of the room: its neon and look, and where its page puts things (see LaserRoomOptions) */
export type BayInit = {
  key: string;
  layout: () => SignLayout;
  look?: RoomLook;
  anchor?: () => Box | null;
  follow?: () => Box | null;
  page?: () => { at: number; end: number };
  cards?: () => CardLight[];
};

export async function createLaserRoom(container: HTMLElement, opts: LaserRoomOptions): Promise<LaserRoom | null> {
  const { quality = "full", still = false, signal, onStart = () => {}, onFail = () => {}, onLaunchEnd = () => {} } = opts;
  const launch = !!opts.launch && !still;
  const tier = QUALITY[quality];
  const aborted = () => !!signal?.aborted;
  const layers: Record<Layer, boolean> = Object.fromEntries(LAYERS.map((l) => [l, opts.layers?.[l] ?? true])) as Record<Layer, boolean>;
  let locked = opts.lock;

  // ------------------------------------------------------------------ assets
  const loader = new THREE.TextureLoader();
  const tex = async (url: string, srgb: boolean) => {
    const t = await loader.loadAsync(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  // the signs, by name: a page's sign is kept a while after the camera has left it, so going back costs nothing
  const bays: Bay[] = [];
  type Held = { sign: Promise<Sign>; used: number };
  const signs = new Map<string, Held>();
  let signsUsed = 0;
  function signFor(key: string, layout: () => SignLayout): Promise<Sign> {
    let held = signs.get(key);
    if (!held) {
      held = { sign: loadSign(layout(), { grid: tier.grid, hazeCount: tier.haze }), used: 0 };
      signs.set(key, held);
      // a sign that failed to build is not kept
      held.sign.catch(() => signs.delete(key));
    }
    held.used = ++signsUsed;
    // the oldest of those no bay is showing go, past a few (each is a few tens of megabytes on the GPU)
    if (signs.size > 4) {
      const old = [...signs.entries()].filter(([k]) => !bays.some((b) => b.key === k)).sort((a, b) => a[1].used - b[1].used);
      for (const [k, h] of old.slice(0, signs.size - 4)) {
        signs.delete(k);
        h.sign.then((sg) => sg.dispose(), () => {});
      }
    }
    return held.sign;
  }
  const firstKey = opts.signKey ?? "first";
  // the smoke's noise volume is built in a worker meanwhile (see noise3d.ts)
  const [sign, floorA, floorS, noise] = await Promise.all([
    signFor(firstKey, () => opts.layout ?? defaultLayout()),
    tex(opts.textures.albedo, true),
    tex(opts.textures.surface, false),
    buildNoise3D(128),
  ]);
  const textures = [floorA, floorS];
  if (aborted()) {
    sign.dispose();
    textures.forEach((t) => t.dispose());
    noise.dispose();
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "laser-room__canvas";
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: still });
  // Neutral rather than ACES: ACES pushes saturated pink and cyan toward salmon and white
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 1);
  const baseDpr = Math.min(devicePixelRatio, tier.dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  // ------------------------------------------------------------------ shared uniforms
  const nvpl = tier.grid[0] * tier.grid[1];
  const U = {
    uTime: { value: 0 },
    uLight: { value: 0 },
    uLightCol: { value: LIGHT_COLOR.clone().multiplyScalar(LIGHT_POWER) },
    uVpl: { value: Array.from({ length: nvpl }, () => new THREE.Vector4()) },
    uGlowTex: { value: sign.glow },
    uGlowCenter: { value: new THREE.Vector2() },
    uGlowSize: { value: new THREE.Vector2() },
    uLogoC: { value: new THREE.Vector2() },
    uLogoHalf: { value: new THREE.Vector2() },
    uLogoZ: { value: LOGO_Z },
    uFloorY: { value: -2 },
    uEye: { value: new THREE.Vector3() },
    uRoom: { value: 0 },
    uAmb: { value: new THREE.Color(0.045, 0.04, 0.065) },
    uHalo: { value: 0.95 },
    uPx: { value: 1 },
  };
  // the lit beams, packed for the shaders (see writeBeams)
  const beamU = {
    uBeamCount: { value: 0 },
    uReflectCount: { value: 0 },
    uSpotA: { value: 0 },
    uSpotB: { value: 0 },
    uBeamO: { value: Array.from({ length: tier.beams }, () => new THREE.Vector4()) },
    uBeamD: { value: Array.from({ length: tier.beams }, () => new THREE.Vector4()) },
    uBeamC: { value: Array.from({ length: tier.beams }, () => new THREE.Vector4()) },
  };
  const defines = { NVPL: nvpl };

  // ------------------------------------------------------------------ wall
  const wallU = {
    ...U,
    uAlbedo: { value: floorA },
    uSurface: { value: floorS },
    uTile: { value: WALL_TILE },
    uAlbedoScale: { value: 0.32 },
  };
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 44),
    new THREE.ShaderMaterial({ uniforms: wallU, defines, vertexShader: SURFACE_VERT, fragmentShader: WALL_FRAG }),
  );
  scene.add(wall);

  // ------------------------------------------------------------------ floor
  const floorGeo = new THREE.PlaneGeometry(70, 34);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(0, 0, 17);
  const floorU = {
    ...U,
    uAlbedo: { value: floorA },
    uSurface: { value: floorS },
    uTile: { value: FLOOR_TILE },
    uReflect: { value: 2.2 },
    uMirror: { value: 1 },
    uCardCount: { value: 0 },
    uCardA: { value: Array.from({ length: MAX_CARDS }, () => new THREE.Vector4()) },
    uCardB: { value: Array.from({ length: MAX_CARDS }, () => new THREE.Vector4()) },
  };
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.ShaderMaterial({ uniforms: floorU, defines: { ...defines, MAXCARDS: MAX_CARDS }, vertexShader: SURFACE_VERT, fragmentShader: FLOOR_FRAG }),
  );
  scene.add(floor);

  // ------------------------------------------------------------------ the bays
  // The site is one long room. Each page hangs its neon in a bay of the wall of its own, one screen wide, side by
  // side in the order the pages run (see travel.ts). Going from one page to another, the camera travels along the
  // wall to the next bay while the last one's neon slides off the screen, and the show plays on. A bay is the neon
  // (its channel letters, the glow round them and the light they throw), the laser rig over it, the colours and the
  // show it plays, and the move the page's scroll carries the camera through. Most of the time there is one; while
  // travelling, two (the one being left first).
  const occScene = new THREE.Scene();
  type SignLightU = {
    uVpl: { value: THREE.Vector4[] };
    uLight: { value: number };
    uLightCol: { value: THREE.Color };
    uGlowTex: { value: THREE.Texture };
    uGlowCenter: { value: THREE.Vector2 };
    uGlowSize: { value: THREE.Vector2 };
    uLogoC: { value: THREE.Vector2 };
    uLogoHalf: { value: THREE.Vector2 };
    uLogoZ: { value: number };
  };
  type Bay = {
    key: string;
    /** which bay of the wall: one screen's width of it each */
    col: number;
    sign: Sign;
    path: CameraPath;
    order: [LookName, number][];
    tempo: number;
    gain: number;
    rigs?: readonly PageRigName[];
    calm: boolean;
    palette: [Vec3, Vec3];
    tube: [THREE.Color, THREE.Color];
    core: [THREE.Color, THREE.Color];
    lightColor: THREE.Color;
    ownLight: boolean;
    lightScale: number;
    /** the neon's own light, for its letters and glow (the room's is mixed from the bays': see lightRoom) */
    own: SignLightU;
    /** the neon's brightest lights first, and its light in the haze, placed */
    brightest: number[];
    haze: THREE.Vector4[];
    signU: Record<string, THREE.IUniform>;
    auraU: Record<string, THREE.IUniform>;
    mesh: THREE.Mesh;
    aura: THREE.Mesh;
    occ: THREE.Mesh;
    view: View;
    /** where the neon hangs now: `view` at rest, or kept behind the page's own neon (see followPage) */
    shown: View;
    rig: Rig;
    pageRig: PageRig;
    power: Power;
    light: number;
    anchor?: () => Box | null;
    follow?: () => Box | null;
    page?: () => { at: number; end: number };
    cards?: () => CardLight[];
    /** the page's scroll (screens, eased), how far the camera has turned down to the floor, how far down the page */
    at: number;
    end: number;
    travel: number;
    along: number;
    shot: Shot;
    low: Shot;
  };

  function makeBay(key: string, sign: Sign, look: RoomLook, col: number, hooks: Omit<BayInit, "key" | "layout" | "look">, settled: boolean): Bay {
    // the room's colours: its neon (left end, right end; each with a paler middle for its hottest strokes), the
    // light the neon throws on the room, and its two lasers
    const tube: [THREE.Color, THREE.Color] = [new THREE.Color(look.tube?.[0] ?? TUBE), new THREE.Color(look.tube?.[1] ?? look.tube?.[0] ?? TUBE)];
    const core: [THREE.Color, THREE.Color] = look.tube ? [tube[0].clone().lerp(WHITE, 0.45), tube[1].clone().lerp(WHITE, 0.45)] : [CORE.clone(), CORE.clone()];
    const lightColor = look.light ? new THREE.Color(...look.light) : LIGHT_COLOR.clone();
    const own: SignLightU = {
      uVpl: { value: Array.from({ length: nvpl }, () => new THREE.Vector4()) },
      uLight: { value: 0 },
      uLightCol: { value: lightColor.clone().multiplyScalar(LIGHT_POWER) },
      uGlowTex: { value: sign.glow },
      uGlowCenter: { value: new THREE.Vector2() },
      uGlowSize: { value: new THREE.Vector2() },
      uLogoC: { value: new THREE.Vector2() },
      uLogoHalf: { value: new THREE.Vector2() },
      uLogoZ: { value: LOGO_Z },
    };
    // solid channel letters
    const tm = sign.texture;
    const signU = {
      ...U,
      ...own,
      uMark: { value: sign.texture },
      uMarkST: { value: new THREE.Vector4(tm.repeat.x, tm.repeat.y, tm.offset.x, tm.offset.y) },
      uScale: { value: new THREE.Vector3(1, 1, 1) },
      uEmit: { value: 0.9 },
      uFlash: { value: 0 },
      uSwell: { value: 0 },
      uPass: { value: 0 },
      uCoreLod: { value: 3.2 },
      uIcon: { value: new THREE.Vector3(sign.icon.x, sign.icon.y, sign.icon.r) },
      uBoxAspect: { value: sign.aspect },
      uWave: { value: WAVE },
      uFringe: { value: 0.45 },
      uTubeCol: { value: tube[0] },
      uCoreCol: { value: core[0] },
      uTubeColB: { value: tube[1] },
      uCoreColB: { value: core[1] },
    };
    const signMat = new THREE.ShaderMaterial({ uniforms: signU, defines, vertexShader: SIGN_VERT, fragmentShader: SIGN_FRAG, transparent: true });
    const mesh = new THREE.Mesh(sign.geometry, signMat);
    mesh.renderOrder = 2;
    scene.add(mesh);
    // the glow round the tubes, under them: pink close in and violet further out on the home page's sign; another
    // room's neon glows in its own colours
    const auraU = {
      ...U,
      ...own,
      uPink: { value: look.tube ? tube[0].clone().lerp(tube[1], 0.5) : PINK.clone() },
      uViolet: { value: look.tube ? tube[0].clone().lerp(tube[1], 0.5).lerp(VIOLET, 0.35) : VIOLET.clone() },
      uAura: { value: 0.6 },
    };
    const aura = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        uniforms: auraU,
        defines,
        vertexShader: AURA_VERT,
        fragmentShader: AURA_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    aura.renderOrder = 1;
    scene.add(aura);
    // the same letters, emission only, for the god-ray source
    const occMat = signMat.clone();
    occMat.uniforms = { ...signU, uPass: { value: 1 } };
    const occ = new THREE.Mesh(sign.geometry, occMat);
    occScene.add(occ);

    let power = new Power(INTRO.strike, INTRO.ignite, look.restless);
    if (settled) {
      // the room is already up: this neon is lit, past its power-on
      power = new Power(-10, -9, look.restless);
      power.value = 0.95;
    }
    const brightest = sign.lights.map((_, i) => i).sort((a, b) => sign.lights[b].w - sign.lights[a].w);
    return {
      key,
      col,
      sign,
      path: calmPath({ ...HOME_PATH, ...look.path }, !!look.calm),
      order: look.order ?? RUNNING_ORDER,
      tempo: look.tempo ?? 1,
      gain: look.gain ?? 1,
      rigs: look.rigs,
      calm: !!look.calm,
      palette: look.lasers ? [look.lasers[0], look.lasers[1]] : [LASER_MAGENTA, LASER_CYAN],
      tube,
      core,
      lightColor,
      ownLight: !!look.light,
      lightScale: LIGHT_POWER,
      own,
      brightest,
      haze: sign.hazeLights.map(() => new THREE.Vector4()),
      signU,
      auraU,
      mesh,
      aura,
      occ,
      view: { halfW: 1, halfH: 1, logoW: 1, logoH: 1, logoX: 0, logoY: 0, face: LOGO_Z, floorY: -2 },
      shown: { halfW: 1, halfH: 1, logoW: 1, logoH: 1, logoX: 0, logoY: 0, face: LOGO_Z, floorY: -2 },
      rig: { top: [0, 0, 0], topLeft: [0, 0, 0], topRight: [0, 0, 0], left: [0, 0, 0], right: [0, 0, 0], floorY: -2, eye: [0, 0, CAM_Z], lean: [0, 0] },
      pageRig: { flankL: [0, 0, 0], flankR: [0, 0, 0], skimL: [0, 0, 0], skimR: [0, 0, 0], rain: [], sign: [0, 0, 1, 1], floorY: -2, eye: [0, 0, CAM_Z], sheetL: [0, 0, 0], sheetTop: [0, 0, 0] },
      power,
      light: 0,
      anchor: hooks.anchor,
      follow: hooks.follow,
      page: hooks.page,
      cards: hooks.cards,
      at: 0,
      end: 0,
      travel: 0,
      along: 0,
      shot: { eye: [0, 0, CAM_Z], look: [0, 0, 0] },
      low: { eye: [0, 0, CAM_Z], look: [0, 0, 0] },
    };
  }

  function dropBay(b: Bay) {
    scene.remove(b.mesh, b.aura);
    occScene.remove(b.occ);
    (b.mesh.material as THREE.Material).dispose();
    (b.occ.material as THREE.Material).dispose();
    (b.aura.material as THREE.Material).dispose();
    b.aura.geometry.dispose();
  }

  bays.push(makeBay(firstKey, sign, opts.look ?? {}, 0, { anchor: opts.anchor, follow: opts.follow, page: opts.page, cards: opts.cards }, opts.settled !== undefined && !opts.launch && !still));
  bays[0].at = Math.max(0, opts.page?.().at ?? 0);

  // ------------------------------------------------------------------ dust
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tier.dust * 3), 3));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(tier.dust * 4).map(() => Math.random()), 4));
  const dustU = { ...U, ...beamU, uBoxMin: { value: new THREE.Vector3() }, uBoxSize: { value: new THREE.Vector3() }, uLaserDust: { value: 2.5 } };
  const dust = new THREE.Points(
    dustGeo,
    new THREE.ShaderMaterial({
      uniforms: dustU,
      defines: { MAXB: tier.beams },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dust.frustumCulled = false;
  dust.renderOrder = 3;
  scene.add(dust);

  // ------------------------------------------------------------------ post
  // no multisampling: on Apple GPUs a multisampled half-float target turns the bloom into a white flood (seen
  // 2026-11-23), and at the screen's own resolution the letters' outlines are clean without it
  // The passes are driven here (see drawWorld), not by the composer, which only keeps the list. Three frame-sized
  // targets: two the passes go back and forth between, and the last finished frame, which is what the screen is
  // shown (see present) while the next one is being drawn.
  const frameTarget = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.samples });
  const composer = new EffectComposer(renderer, frameTarget());
  let bufA = frameTarget();
  let bufB = frameTarget();
  let bufP = frameTarget();
  const scenePass = new RenderPass(scene, camera);
  composer.addPass(scenePass);
  const atmos = new AtmospherePass({ taps: tier.taps, hazeCount: tier.haze, steps: tier.steps, noise, smokeShift: tier.smokeShift });
  atmos.uniforms.uFloorY = U.uFloorY;
  atmos.uniforms.uEye = U.uEye;
  atmos.uniforms.uTime = U.uTime;
  atmos.uniforms.uLight = U.uLight;
  atmos.uniforms.uLightCol = U.uLightCol;
  atmos.uniforms.uSmoke.value = SMOKE;
  // the god rays are the neon's own light: in its colour, at the strength the home sign's pink has
  const rayColor = (b: Bay) => {
    const c = atmos.uniforms.uRayCol.value as THREE.Color;
    if (!b.ownLight) return c.setRGB(1, 0.3, 0.7);
    const l = b.lightColor;
    const top = Math.max(l.r, l.g, l.b, 1e-4);
    c.setRGB(Math.max(0.3, l.r / top), Math.max(0.3, l.g / top), Math.max(0.3, l.b / top));
  };
  composer.addPass(atmos);
  const lasers = new LaserPass({ maxBeams: tier.beams, maxSheets: MAX_SHEETS, maxCards: MAX_CARDS, noise, surface: floorS });
  // the fog bank is one volume: the smoke draws its body, the lasers light it (the same uniforms), and the floor's
  // reflections lie under it (the smoke's transmittance)
  lasers.uniforms.uFog = atmos.uniforms.uFog;
  lasers.uniforms.uFogH = atmos.uniforms.uFogH;
  lasers.uniforms.uFogCover = atmos.uniforms.uFogCover;
  lasers.uniforms.tSmoke.value = atmos.smoke.texture;
  // the cards the floor shows, the same ones lighting the fog
  lasers.uniforms.uCardCount = floorU.uCardCount;
  lasers.uniforms.uCardA = floorU.uCardA;
  lasers.uniforms.uCardB = floorU.uCardB;
  lasers.uniforms.uFloorY = U.uFloorY;
  lasers.uniforms.uEye = U.uEye;
  lasers.uniforms.uTime = U.uTime;
  lasers.uniforms.uInvViewProj = atmos.uniforms.uInvViewProj;
  lasers.uniforms.uBeamCount = beamU.uBeamCount;
  lasers.uniforms.uReflectCount = beamU.uReflectCount;
  lasers.uniforms.uSpotA = beamU.uSpotA;
  lasers.uniforms.uSpotB = beamU.uSpotB;
  lasers.uniforms.uBeamO = beamU.uBeamO;
  lasers.uniforms.uBeamD = beamU.uBeamD;
  lasers.uniforms.uBeamC = beamU.uBeamC;
  lasers.uniforms.uRipple = { value: 0 };
  lasers.uniforms.uPhase = { value: 0 };
  composer.addPass(lasers);
  // a low threshold: saturated pink and cyan carry little luminance, and that's what the bloom keys on
  // a wide, soft bloom: the glow spreads well out round the tubes (neon) without smearing their edges (the
  // wide levels carry most of it, the tight ones little)
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.82, 0.36);
  composer.addPass(bloom);
  // the camera's shutter while it travels from one bay to the next (off the rest of the time)
  const motion = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: FS_VERT, fragmentShader: MOTION_FRAG });
  motion.enabled = false;
  composer.addPass(motion);
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: U.uTime,
      uCA: { value: 0.15 },
      uVignette: { value: 0.85 },
      uGrain: { value: 0.022 },
      uLift: { value: 0 },
      uLiftCol: { value: new THREE.Vector3(0.0016, 0.0006, 0.0034) },
      uRes: { value: new THREE.Vector2() },
      uExposure: { value: 1 },
      uFlash: { value: 0 },
      uFlashCol: { value: new THREE.Color(1, 0.5, 0.86) },
      uWarp: { value: 0 },
      uNowInv: { value: new THREE.Matrix4() },
      uThen: { value: new THREE.Matrix4() },
      uEyeNow: { value: new THREE.Vector3() },
      uWarpFloor: { value: -2 },
      uWarpSign: { value: new THREE.Vector4() },
      uWarpFace: { value: 0 },
      uTexel: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: FS_VERT,
    fragmentShader: GRADE_FRAG,
  });
  // the last pass is drawn on every frame of the screen (see present), straight to it, with the screen's own clock
  // for its grain
  grade.renderToScreen = true;
  // (a full-screen pass: nothing in the scene, so the scene's camera and lights don't matter to it)
  // the colour fringe stays faint: the letters run out to the screen's edges, where it is strongest
  const gradeDefaults = { uCA: 0.15, uVignette: 0.85, uGrain: 0.022 };

  // ------------------------------------------------------------------ layout
  let resolution = 1;
  // for testing: every frame drawn this many times larger each way, to stand in for a slower GPU
  const handicap = opts.handicap ?? 1;
  // while the camera travels between bays the room was drawn a little smaller (0.8), behind the blur: making the
  // drawing buffers again at the start and end of every move cost a frame each, and the room is now drawn a band at
  // a time when it can't keep the screen's pace (see tick), so it keeps its size
  let moveScale = 1;
  const MOVE_SCALE = 1;
  const rescale = (k: number) => {
    if (moveScale === k) return;
    moveScale = k;
    if (container.clientWidth && container.clientHeight) applyResolution(container.clientWidth, container.clientHeight);
  };
  let dpr = baseDpr;
  const lightScreen = new THREE.Vector3();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  // which part of the next frame is drawn next (0: none under way; see tick), and whether a finished frame is
  // waiting to be shown (bufP)
  let part = 0;
  let finished = false;

  // ------------------------------------------------------------------ the beams' tiles
  // The screen in tiles of BIN pixels, and for each the beams that can reach it (see binBeams): four 32-bit words,
  // bit i for beam i of the packed list.
  const BIN_SHIFT = 6;
  let binsX = 1;
  let binsY = 1;
  let binData = new Uint32Array(4);
  let binTex: THREE.DataTexture | null = null;
  // the frame's size in whole pixels, as the GPU draws it
  const binPx = [1, 1];
  function sizeBins(W: number, H: number) {
    binPx[0] = Math.floor(W);
    binPx[1] = Math.floor(H);
    binsX = Math.max(1, Math.ceil(Math.floor(W) / (1 << BIN_SHIFT)));
    binsY = Math.max(1, Math.ceil(Math.floor(H) / (1 << BIN_SHIFT)));
    binData = new Uint32Array(binsX * binsY * 4);
    binTex?.dispose();
    binTex = new THREE.DataTexture(binData, binsX, binsY, THREE.RGBAIntegerFormat, THREE.UnsignedIntType);
    binTex.internalFormat = "RGBA32UI";
    binTex.minFilter = binTex.magFilter = THREE.NearestFilter;
    binTex.generateMipmaps = false;
    binTex.flipY = false;
    binTex.needsUpdate = true;
    lasers.uniforms.uBins.value = binTex;
    lasers.uniforms.uBinShift.value = BIN_SHIFT;
  }

  function applyResolution(w: number, h: number) {
    dpr = Math.min(baseDpr, Math.sqrt(tier.pixels / (w * h))) * resolution * moveScale * handicap;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    // the frame's own size, as the composer counted it, for every target and pass
    const W = w * dpr;
    const H = h * dpr;
    for (const t of [bufA, bufB, bufP]) t.setSize(W, H);
    for (const p of composer.passes) p.setSize(W, H);
    grade.setSize(W, H);
    U.uPx.value = (h * dpr) / (2 * tanHalf);
    lasers.uniforms.uPixAngle.value = (2 * tanHalf) / (h * dpr);
    (grade.uniforms.uRes.value as THREE.Vector2).set(w * dpr, h * dpr);
    (grade.uniforms.uTexel.value as THREE.Vector2).set(1 / Math.floor(W), 1 / Math.floor(H));
    sizeBins(W, H);
    // a frame part drawn, and the last one finished, were the old size: start afresh
    part = 0;
    finished = false;
  }

  // the screen, in world units at the wall: one bay of the wall is one screen wide
  const screen = { w: 1, h: 1, aspect: 1, halfW: 1, halfH: 1 };
  let bayW = 1;
  function layout() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    applyResolution(w, h);
    camera.aspect = viewCam.aspect = w / h;
    camera.updateProjectionMatrix();
    viewCam.updateProjectionMatrix();
    const aspect = w / h;
    const halfH = CAM_Z * tanHalf;
    const halfW = halfH * aspect;
    Object.assign(screen, { w, h, aspect, halfW, halfH });
    bayW = 2 * halfW;
    // The room's surfaces are built to the screen (to the home page's sign, which spans most of it: see
    // .home-hero .neon-lockup), not to any one page's neon, so the floor runs on unchanged from one bay to the next.
    // A smaller screen (a phone) gets a finer floor.
    const ref = (aspect < 1 ? Math.min(0.86 * w, 544) : Math.min(0.84 * w, 1280, (h - 72) * 1.3)) / w;
    const roomScale = Math.max(0.6, (ref * 2 * halfW * 0.97) / 6);
    wallU.uTile.value = WALL_TILE * roomScale;
    floorU.uTile.value = FLOOR_TILE * roomScale;
    lasers.uniforms.uTile.value = floorU.uTile.value;
    dustU.uBoxSize.value.set(halfW * 2.5, halfH * 2.4, 9);
    for (const b of bays) placeBay(b);
  }

  function placeBay(b: Bay) {
    const { w, h, aspect, halfW, halfH } = screen;
    const sign = b.sign;
    const view = b.view;
    const rig = b.rig;
    const pageRig = b.pageRig;
    const X = b.col * bayW;

    // The sign's size and place. From the page's lockup when there is one: the resting camera looks straight down
    // the z axis, so a box on the screen maps to a box on the letters' face plane by similar triangles. The depth
    // is a share of the width, so the face plane depends on the width it gives: two passes settle it.
    let logoW = 0;
    let logoX = 0;
    let logoY = 0;
    let depth = 0;
    const box = b.anchor?.();
    for (let pass = 0; pass < 2; pass++) {
      const face = LOGO_Z + depth;
      const k = (CAM_Z - face) / CAM_Z; // the face plane is nearer than the wall: a screen unit covers less there
      if (box && box.w > 0) {
        logoW = (box.w / w) * 2 * halfW * k;
        logoX = ((box.x + box.w / 2) / w - 0.5) * 2 * halfW * k;
        logoY = (0.5 - (box.y + box.h / 2) / h) * 2 * halfH * k;
      } else {
        logoW = Math.min(halfW * 2 * (aspect < 1 ? 0.82 : 0.56), halfH * 2 * 0.62 * sign.aspect) * k;
        logoX = 0;
        logoY = halfH * 0.04 * k;
      }
      depth = logoW * 0.032;
    }
    // its bay: the camera at rest in front of it sees it where the page put it
    logoX += X;
    const logoH = logoW / sign.aspect;
    const face = LOGO_Z + depth;
    // the floor sits below the sign, with room for the hero's words and buttons over it
    const floorY = Math.min(-halfH * (aspect < 1 ? 0.55 : 0.5), logoY - logoH / 2 - 0.5);
    Object.assign(view, { halfW, halfH, logoW, logoH, logoX, logoY, face, floorY });
    Object.assign(b.shown, view);

    // a smaller sign gives off less light
    const scale = logoW / 6;
    // a big sign is a lot of tube: its light grows with it, but less than its size, or the room washes out pink
    b.lightScale = LIGHT_POWER * Math.min(0.85, Math.max(0.55, scale * 0.55));
    b.own.uLightCol.value.copy(b.lightColor).multiplyScalar(b.lightScale);
    hang(b, logoX, logoY, logoW, logoH);

    // the rig: one head just above the sign, and a stand either side of it, a little forward of the wall (or, with
    // `rigCentre`, over the middle of the room)
    const unit = Math.max(scale, 0.7);
    const rigX = opts.rigCentre ? X : logoX;
    // the head sits in the clear band under the page's header, a little nearer the header than the sign, so its
    // beams have room to show before they leave the screen
    const clear = opts.topClear?.() ?? 0;
    const signTop = box && box.w > 0 ? box.y : h * (0.5 - (logoY + logoH / 2) / (2 * halfH));
    const headScreen = (clear + 0.42 * Math.max(0, signTop - clear)) / h;
    const headY = (0.5 - headScreen) * 2 * halfH * ((CAM_Z - 0.7) / CAM_Z);
    // (a page with words right over its sign hangs the head in the band itself, clear of them: see `headInBand`)
    rig.top = [rigX, opts.headInBand ? headY : Math.min(headY, logoY + logoH / 2 + 0.6 * unit), 0.7];
    // the outer heads hang at the same height, out over the ends of the wordmark
    const outerX = Math.min(halfW * 0.62, logoW * 0.4);
    rig.topLeft = [rigX - outerX, rig.top[1] + 0.05, 0.75];
    rig.topRight = [rigX + outerX, rig.top[1] + 0.05, 0.75];
    const standX = Math.min(halfW * 0.86, logoW / 2 + 1.6 * unit);
    rig.left = [rigX - standX, floorY + 1.1 * unit, 0.9];
    rig.right = [rigX + standX, floorY + 1.1 * unit, 0.9];
    rig.floorY = floorY;

    // the page's rigs, all well outside the frame wherever the camera is on its path: on the side walls and low
    // at the sides, out where the stretch of floor the camera looks down on during their part of the page is, and
    // in the ceiling either side of the sign (the heads behind the viewer move with them)
    const wide = Math.max(halfW, 4.5);
    pageRig.flankL = [logoX - wide * 1.5, floorY + 1.3, 9];
    pageRig.flankR = [logoX + wide * 1.5, floorY + 1.3, 9];
    pageRig.skimL = [logoX - wide * 1.6, floorY + 0.3, 10.5];
    pageRig.skimR = [logoX + wide * 1.6, floorY + 0.3, 10.5];
    // the ceiling heads hang over the floor the camera looks down on at the end of the page, in pairs either side
    // of the middle, at a few depths, nearest the middle first
    pageRig.rain = [];
    for (let k = 0; k < 4; k++) {
      const z = 7 + k * 1.5;
      const x = 0.5 + k * 0.5;
      pageRig.rain.push([logoX - x, floorY + 7, z], [logoX + x, floorY + 7, z]);
    }
    // just over the fog bank, so it lights the tops of the billows that rise through it
    pageRig.sheetL = [logoX - wide * 1.6, floorY + 0.55, 9.5];
    // well in front of the camera, so it never looks along the curtain from inside it
    pageRig.sheetTop = [logoX + 0.3, floorY + 6.5, 6];
    pageRig.sign = [logoX, logoY, logoW / 2, logoH / 2];
    pageRig.floorY = floorY;
  }

  /**
   * Hangs a bay's neon `w` by `h` with its middle at x, y on its face plane: the letters, the glow round them, their
   * god-ray source, and the light they throw (the halo and reflection, the room's lights and the haze's). Its depth,
   * and how much light it gives, stay as placeBay set them. `shown` keeps where it hangs now.
   */
  function hang(b: Bay, x: number, y: number, w: number, h: number) {
    const sign = b.sign;
    const { face, logoW } = b.view;
    const depth = face - LOGO_Z;
    b.mesh.scale.set(w, h, depth);
    b.mesh.position.set(x, y, face);
    (b.signU.uScale.value as THREE.Vector3).set(w, h, depth);
    // the glow round the letters, stretched as they are (followed, a screen's box can land a little taller or wider)
    const glowW = w / sign.glowFill;
    const glowH = (glowW / sign.glowAspect) * ((h * sign.aspect) / w);
    b.aura.scale.set(glowW, glowH, 1);
    b.aura.position.set(x, y, face - depth * 0.5);
    b.occ.scale.copy(b.mesh.scale);
    b.occ.position.copy(b.mesh.position);
    b.own.uLogoC.value.set(x, y);
    b.own.uLogoHalf.value.set(w / 2, h / 2);
    b.own.uLogoZ.value = face;
    b.own.uGlowCenter.value.set(x, y);
    b.own.uGlowSize.value.set(glowW, glowH);
    const lightZ = face - depth * 0.5;
    // the lights sit a little in front of the face, so the wall right behind a letter is lit softly, not in hot spots
    sign.lights.forEach((l, i) => b.own.uVpl.value[i].set(x + (l.x - 0.5) * w, y + (l.y - 0.5) * h, lightZ + depth * 0.5 + 0.3, l.w));
    sign.hazeLights.forEach((l, i) => b.haze[i].set(x + (l.x - 0.5) * w, y + (l.y - 0.5) * h, face + 0.2, l.w * Math.min(1, logoW / 6)));
    Object.assign(b.shown, { logoX: x, logoY: y, logoW: w, logoH: h });
  }

  /**
   * `follow`: the page's own neon, on the screen now (see LaserRoomOptions). The unseen sign is hung on the wall just
   * where the camera, as it is this frame, sees the page's neon, so whatever the scroll, the turn down to the floor or
   * the camera's sway, its light, its rays and its reflection stay behind it. The rig stays where it is: the lasers
   * belong to the room. A screen and more above the top of the screen, it is left where it was last.
   */
  const followRay = new THREE.Vector3();
  const followAt = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function followHit(sx: number, sy: number, face: number, out: THREE.Vector3) {
    followRay.set((sx / screen.w) * 2 - 1, 1 - (sy / screen.h) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    if (followRay.z > -1e-3) return false;
    out.copy(camera.position).addScaledVector(followRay, (face - camera.position.z) / followRay.z);
    return true;
  }
  function followPage(b: Bay) {
    const box = b.follow?.();
    if (!box || box.w <= 0 || box.y + box.h < -screen.h) return;
    const face = b.view.face;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const [C, L, R, T, B] = followAt;
    if (!followHit(cx, cy, face, C) || !followHit(box.x, cy, face, L) || !followHit(box.x + box.w, cy, face, R)) return;
    if (!followHit(cx, box.y, face, T) || !followHit(cx, box.y + box.h, face, B)) return;
    hang(b, C.x, C.y, R.x - L.x, T.y - B.y);
  }

  // ------------------------------------------------------------------ the room's light, from its bays
  // At rest the room is lit by the one neon in it, exactly as it always was. Travelling, it is lit by both: each
  // sign gives the room its brightest half of the lights it is made of, at its own power, so its light goes with it
  // as it slides off the screen and the next one's comes in with it. The letter-shaped light each throws on the
  // wall close to it (its halo, and its reflection in the floor) is one texture, so it belongs to whichever is
  // nearer the middle: it fades out as the two pass halfway, and in again on the other.
  let travelHold: number | undefined;
  const travel = { from: null as Bay | null, to: null as Bay | null, t0: 0, ms: 1, u: 0, e: 0, done: null as (() => void) | null };
  const blend = new THREE.Color();
  function lightRoom(): Bay {
    const [a, b] = bays;
    const moving = !!(travel.from && travel.to);
    const near = moving && travel.e >= 0.5 ? b : a;
    const dip = moving ? Math.cos(Math.PI * travel.e) ** 2 : 1;
    U.uGlowTex.value = near.own.uGlowTex.value;
    U.uGlowCenter.value.copy(near.own.uGlowCenter.value);
    U.uGlowSize.value.copy(near.own.uGlowSize.value);
    U.uLogoC.value.copy(near.own.uLogoC.value);
    U.uLogoHalf.value.copy(near.own.uLogoHalf.value);
    U.uLogoZ.value = near.own.uLogoZ.value;
    const haze = atmos.uniforms.uHazeL.value as THREE.Vector4[];
    if (!moving) {
      U.uLight.value = a.light;
      U.uLightCol.value.copy(a.own.uLightCol.value);
      a.own.uVpl.value.forEach((v, i) => U.uVpl.value[i].copy(v));
      a.haze.forEach((v, i) => haze[i].copy(v));
      U.uHalo.value = 0.95;
      floorU.uMirror.value = 1;
      return a;
    }
    // the light's colour runs from one neon's to the other's as the camera goes
    U.uLightCol.value.copy(blend.copy(a.own.uLightCol.value).lerp(b.own.uLightCol.value, travel.e));
    // the bays' own powers go into their lights' shares (uLight is then 1), so each sign keeps its own
    U.uLight.value = 1;
    let n = 0;
    let m = 0;
    for (const bay of [a, b]) {
      const lights = bay.own.uVpl.value;
      const take = bay.brightest.slice(0, nvpl >> 1);
      const sum = take.reduce((acc, i) => acc + lights[i].w, 0) || 1;
      for (const i of take) {
        const v = lights[i];
        U.uVpl.value[n++].set(v.x, v.y, v.z, (v.w / sum) * bay.light);
      }
      const hz = bay.haze.slice(0, Math.max(1, tier.haze >> 1));
      const hsum = hz.reduce((acc, v) => acc + v.w, 0) || 1;
      for (const v of hz) if (m < haze.length) haze[m++].set(v.x, v.y, v.z, (v.w / hsum) * bay.light * Math.min(1, bay.view.logoW / 6));
    }
    while (n < nvpl) U.uVpl.value[n++].set(0, 0, 0, 0);
    while (m < haze.length) haze[m++].set(0, 0, 0, 0);
    U.uHalo.value = 0.95 * near.light * dip;
    floorU.uMirror.value = near.light * dip;
    return near;
  }

  // ------------------------------------------------------------------ beams into uniforms
  // Every beam in the shader's list costs every pixel, lit or not, so the list holds only the lit ones, packed:
  // first those the floor reflects, then the rest, and in each group those that land on the floor first (they
  // leave spots). The floor reflects every other beam of each look and rig (by its place in it, k), each standing
  // in for the one it skips; `thin` crossfades that to every fourth (looking down at the floor, where the
  // reflection is everywhere).
  let beamCount = 0;
  const groups: number[][] = [[], [], [], []];
  const lengths: number[] = [];
  const weights: number[] = [];
  function writeBeams(list: Beam[], thin: number, floorY: number) {
    groups.forEach((g) => (g.length = 0));
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.power < 0.004) continue;
      const [, oy, oz] = b.o;
      const [, dy, dz] = b.d;
      // a beam ends where it meets the floor or the wall, or fades out well past the viewer
      let length = 40;
      let lands = false;
      if (dy < -1e-4 && (floorY - oy) / dy < length) {
        length = (floorY - oy) / dy;
        lands = true;
      }
      if (dz < -1e-4 && -oz / dz < length) {
        length = -oz / dz;
        lands = false;
      }
      const k = b.k ?? i;
      const weight = k % 4 === 0 ? 2 * (1 + thin) : k % 2 === 0 ? 2 * (1 - thin) : 0;
      lengths[i] = length;
      weights[i] = weight;
      groups[(weight > 0.01 ? 0 : 2) + (lands ? 0 : 1)].push(i);
    }
    let n = 0;
    const E = camera.position;
    const counts = groups.map((g) => {
      const from = n;
      for (const i of g) {
        if (n >= tier.beams) break;
        const b = list[i];
        // a beam pointing straight at the eye flares at its head (see LASER_FRAG beamAt): its length goes in negative
        const ox = b.o[0] - E.x;
        const oy = b.o[1] - E.y;
        const oz = b.o[2] - E.z;
        const into = -(b.d[0] * ox + b.d[1] * oy + b.d[2] * oz) / (Math.hypot(ox, oy, oz) || 1);
        stares[n] = into > 0.97;
        beamU.uBeamO.value[n].set(b.o[0], b.o[1], b.o[2], b.power);
        beamU.uBeamD.value[n].set(b.d[0], b.d[1], b.d[2], stares[n] ? -lengths[i] : lengths[i]);
        beamU.uBeamC.value[n].set(b.color[0], b.color[1], b.color[2], weights[i]);
        n++;
      }
      return n - from;
    });
    beamCount = n;
    beamU.uBeamCount.value = layers.lasers ? n : 0;
    beamU.uReflectCount.value = counts[0] + counts[1];
    beamU.uSpotA.value = counts[0];
    beamU.uSpotB.value = counts[2];
    binBeams(layers.lasers ? n : 0);
  }
  const stares: boolean[] = [];

  // Which tiles of the screen each beam can reach, seen from the eye: everywhere the laser pass would look at it at
  // all (LASER_FRAG beamAt: within six haze widths, or three core widths, of the beam, both of which grow with the
  // distance; within a few widths of its head, or ninety for a head pointing at the eye). The beam is walked in
  // short pieces; each piece with that reach round it is a ball, and the ball's outline on the screen marks the
  // tiles. Generous on purpose: a tile marked for nothing costs a little, a tile missed would lose light.
  function binBeams(n: number) {
    binData.fill(0);
    const tex = binTex!;
    tex.needsUpdate = true;
    if (!n) return;
    const m = camera.matrixWorldInverse.elements;
    const px = camera.projectionMatrix.elements[0];
    const py = camera.projectionMatrix.elements[5];
    const pixAngle = lasers.uniforms.uPixAngle.value as number;
    const E = camera.position;
    const tile = 1 << BIN_SHIFT;
    const fullW = binPx[0];
    const H = binPx[1];
    // the nearest a view ray in the laser pass starts looking (tMin .6, at the screen's corners), a little less
    const NEAR = 0.4;
    const reach = (t: number) => Math.max(3 * Math.max(0.012, t * pixAngle * 0.85), 6 * (0.05 + 0.012 * t));
    let word = 0;
    let bit = 0;
    const mark = (cx: number, cy: number, cz: number, rho: number) => {
      const x = m[0] * cx + m[4] * cy + m[8] * cz + m[12];
      const y = m[1] * cx + m[5] * cy + m[9] * cz + m[13];
      const d = -(m[2] * cx + m[6] * cy + m[10] * cz + m[14]);
      if (d + rho < NEAR) return;
      let x0 = 0;
      let x1 = binsX - 1;
      let y0 = 0;
      let y1 = binsY - 1;
      if (d - rho > NEAR) {
        // the ball's outline: the lines from the eye that touch it, each way
        const den = d * d - rho * rho;
        const kx = Math.sqrt(x * x + den);
        const ky = Math.sqrt(y * y + den);
        const ax0 = ((x * d - rho * kx) / den) * px;
        const ax1 = ((x * d + rho * kx) / den) * px;
        const ay0 = ((y * d - rho * ky) / den) * py;
        const ay1 = ((y * d + rho * ky) / den) * py;
        if (ax1 < -1 || ax0 > 1 || ay1 < -1 || ay0 > 1) return;
        x0 = Math.max(0, Math.floor(((ax0 * 0.5 + 0.5) * fullW) / tile));
        x1 = Math.min(binsX - 1, Math.floor(((ax1 * 0.5 + 0.5) * fullW) / tile));
        y0 = Math.max(0, Math.floor(((ay0 * 0.5 + 0.5) * H) / tile));
        y1 = Math.min(binsY - 1, Math.floor(((ay1 * 0.5 + 0.5) * H) / tile));
      }
      for (let ty = y0; ty <= y1; ty++) {
        let at = (ty * binsX + x0) * 4 + word;
        for (let tx = x0; tx <= x1; tx++, at += 4) binData[at] |= bit;
      }
    };
    for (let i = 0; i < n; i++) {
      word = i >> 5;
      bit = (1 << (i & 31)) >>> 0;
      const O = beamU.uBeamO.value[i];
      const Dv = beamU.uBeamD.value[i];
      const L = Math.abs(Dv.w);
      // the head
      const toHead = Math.hypot(O.x - E.x, O.y - E.y, O.z - E.z);
      mark(O.x, O.y, O.z, (stares[i] ? 90 : 6) * Math.max(0.035, toHead * pixAngle * 1.5));
      // the beam, piece by piece: each piece about as long as its glow is wide there
      let s = 0;
      while (s < L) {
        const qx = O.x + Dv.x * s - E.x;
        const qy = O.y + Dv.y * s - E.y;
        const qz = O.z + Dv.z * s - E.z;
        const step = Math.min(L - s, Math.max(0.25, Math.min(6, 1.2 * reach(Math.hypot(qx, qy, qz)))));
        const half = step / 2;
        const cx = O.x + Dv.x * (s + half);
        const cy = O.y + Dv.y * (s + half);
        const cz = O.z + Dv.z * (s + half);
        const dc = Math.hypot(cx - E.x, cy - E.y, cz - E.z);
        // the farthest along its ray the laser pass can be when it looks at this piece
        mark(cx, cy, cz, half + reach((dc + half) * 1.1 + 1));
        s += step;
      }
    }
  }

  // ------------------------------------------------------------------ input
  const pointer = { active: false, nx: 0, ny: 0 };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const r = container.getBoundingClientRect();
    pointer.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointer.active = true;
  };
  const onLeave = () => {
    pointer.active = false;
  };

  // ------------------------------------------------------------------ state
  let flares = new Flare();
  let time = 0;
  let ignited = false;
  let shown = false;
  if (opts.settled !== undefined && !launch && !still) {
    // the room is already up: past the power-on and the opening burst, `settled` seconds into the show
    time = INTRO.lasers + Math.max(BURST_OVER, opts.settled);
    ignited = true;
  }
  // the launch hands over to the hero at landAt; until then the camera follows the launch path
  let landAt = launch ? INTRO.land : -1;
  let launchEnded = !launch;
  const camBase = new THREE.Vector2();
  const lean = new THREE.Vector2();
  const launchFrom = new THREE.Vector3();
  // the frame's time (performance.now), for the travel between bays
  let frameNow = 0;

  /** the camera `y` screens down a page `end` screens long, in front of its bay (see floorShot) */
  const dir = new THREE.Vector3();
  function pathAt(b: Bay, y: number, end: number, out: Shot) {
    // a short page tilts down over its whole length
    b.travel = smoother(0, Math.min(DIP, end), y);
    b.along = end > 0 ? Math.min(1, Math.max(0, y / end)) : 0;
    floorShot(b.view, b.along, b.low, b.path);
    const low = b.low;
    // from the hero's straight-on view, as far toward the floor's as this room's camera turns
    const turned = b.travel * b.path.tilt;
    for (let j = 0; j < 3; j++) {
      const hero = j === 2 ? CAM_Z : j === 0 ? b.col * bayW : 0;
      out.eye[j] = hero + (low.eye[j] - hero) * turned;
    }
    // it turns from straight on (down -z) toward the floor by blending directions, so it tilts at an even rate
    dir.set(low.look[0] - low.eye[0], low.look[1] - low.eye[1], low.look[2] - low.eye[2]).normalize();
    dir.set(dir.x * turned, dir.y * turned, -(1 - turned) + dir.z * turned).normalize();
    out.look[0] = out.eye[0] + dir.x * 10;
    out.look[1] = out.eye[1] + dir.y * 10;
    out.look[2] = out.eye[2] + dir.z * 10;
    return out;
  }

  // the light the page takes from the room
  const roomLight: RoomLight = { sign: 0, lasers: 0, pink: 0, cyan: 0, beat: 0, bar: 0, flash: 0, travel: 0, clock: -1 };
  function shareLight(list: Beam[], light: number, beat: number, bar: number, flash: number, open: number, travelled: number) {
    if (!opts.onLight) return;
    let total = 0;
    let pink = 0;
    let cyan = 0;
    if (layers.lasers) {
      for (const b of list) {
        total += b.power;
        pink += b.power * b.color[0];
        cyan += b.power * b.color[1];
      }
    }
    const share = pink + cyan || 1;
    roomLight.sign = Math.min(1, light);
    roomLight.lasers = 1 - Math.exp(-total / 6);
    roomLight.pink = pink / share;
    roomLight.cyan = cyan / share;
    roomLight.beat = open * Math.exp(-(((beat % 1) + 1) % 1) * 5);
    roomLight.bar = open * Math.exp(-bar * 8);
    roomLight.flash = flash;
    roomLight.travel = travelled;
    roomLight.clock = open && !still ? bar : -1;
    opts.onLight(roomLight);
  }

  function skipIntro() {
    if (time < INTRO.ignite - 0.05) time = INTRO.ignite - 0.05;
    if (!launchEnded) landAt = Math.min(landAt, Math.max(time, INTRO.ignite) + (INTRO.land - INTRO.ignite));
  }

  function launchPose(t: number, out: THREE.Vector3) {
    // a slow drift in through the power-on, then a held breath before the pull back. A tall screen has the sign
    // across its whole width already, so it comes in less close and less far round.
    const k = smoother(0, INTRO.land, t);
    const room = Math.min(1, camera.aspect / 1.4);
    const near = (CAM_Z - LAUNCH_CAM.z) * room * room;
    return out.set(LAUNCH_CAM.x * room * (1 - 0.35 * k), LAUNCH_CAM.y * (1 - 0.3 * k), CAM_Z - near - 0.5 * k * room);
  }

  /** one bay's show, `weight` of its full strength (a bay the camera is leaving, or arriving at) */
  function playBay(b: Bay, beat: number, open: number, since: number, weight: number, out: { beams: Beam[]; sheets: Sheet[] }) {
    let beams = playShow(beat, b.rig, { open, lock: locked, order: b.order, tempo: b.tempo });
    // the opening burst is the first bay's alone
    if (b === bays[0] && !travel.to) beams = burst(beams, since, b.rig);
    // Down the page, the rigs round the room come in (not in the lab, where a look plays on its own), with the
    // sheets of light over the floor. Every beam costs every pixel, and looking down at the floor the reflection is
    // everywhere: so as the camera turns down, and the rig over the sign leaves the frame, three in four of the
    // show's beams fade out, and the floor reflects every fourth beam instead of every other one (the ones the show
    // keeps). The page's scroll runs the rigs ahead (whip) and swings them (slosh).
    let sheets: Sheet[] = [];
    if (b.page && !locked) {
      b.pageRig.eye = b.rig.eye;
      const below = b.calm ? BELOW : { keep: 4, show: 1, rigs: 1, rigPower: 1, sheets: 1 };
      const dim = 1 - (1 - below.show) * b.travel;
      for (const bm of beams) bm.power *= bm.k !== undefined && bm.k % below.keep ? 1 - b.travel : dim;
      // a calm room's rigs keep its show's slower pace, and only some of the scroll's push
      const push = b.calm ? CALM_MOVE.scroll : 1;
      const at = (b.calm ? beat * b.tempo : beat) + whip * push;
      const drive = { open, density: tier.pageDensity * below.rigs, slosh: slosh * push, only: b.rigs, on: b.travel };
      const played = pageSheets(at, b.along, b.pageRig, drive);
      sheets = played.sheets;
      for (const sh of sheets) sh.power *= below.sheets;
      const rigBeams = [...playPage(at, b.along, b.pageRig, drive), ...played.edges];
      for (const bm of rigBeams) bm.power *= below.rigPower;
      beams = [...beams, ...rigBeams];
    }
    // the bay's two colours, whatever they are
    const [p0, p1] = b.palette;
    const recolour = p0 !== LASER_MAGENTA || p1 !== LASER_CYAN;
    // two bays at once would be twice the beams (each costs every pixel): each keeps every other one meanwhile,
    // which nobody sees through the move's blur
    const halve = !!travel.to || b.calm;
    beams.forEach((bm, i) => {
      if (halve && i & 1) return;
      if (recolour) bm.color = bm.color === LASER_MAGENTA ? p0 : bm.color === LASER_CYAN ? p1 : bm.color;
      if (weight < 1) bm.power *= weight;
      out.beams.push(bm);
    });
    for (const sh of sheets) {
      if (recolour) sh.color = sh.color === LASER_MAGENTA ? p0 : sh.color === LASER_CYAN ? p1 : sh.color;
      sh.power *= weight;
      out.sheets.push(sh);
    }
  }

  const played = { beams: [] as Beam[], sheets: [] as Sheet[] };
  const palette: [Vec3, Vec3] = [[0, 0, 0], [0, 0, 0]];
  const prevViewProj = new THREE.Matrix4();
  const viewProj = new THREE.Matrix4();
  const probe = new THREE.Vector3();
  const probeNow = new THREE.Vector3();
  const lookA = new THREE.Vector3();
  const lookB = new THREE.Vector3();
  const between: Shot = { eye: [0, 0, CAM_Z], look: [0, 0, 0] };
  // the bay whose neon lights the room's halo and casts the rays this frame (see lightRoom)
  let lit: Bay = bays[0];
  let blurOn = 0;
  // The camera's view, on every frame of the screen (see tick): the clock, the launch, the move between bays, the
  // scroll's path, the drift and the pointer, into `viewCam`. The room's next frame is drawn from there
  // (worldStep), and the frame on the screen is turned to it (present).
  const viewCam = camera.clone();
  let vShot: Shot = bays[0].shot;
  let vTravelled = 0;
  // the camera's pose a frame of the screen ago, and how long that frame was (ms): how fast it is moving
  const lastViewPos = new THREE.Vector3();
  const lastViewQuat = new THREE.Quaternion();
  let lastViewMs = 0;
  function viewStep(dt: number) {
    lastViewPos.copy(viewCam.position);
    lastViewQuat.copy(viewCam.quaternion);
    lastViewMs = dt * 1000;
    time += dt;
    if (!launchEnded && time >= landAt) {
      launchEnded = true;
      launchPose(time, launchFrom);
      landAt = time;
      onLaunchEnd();
    }

    // the travel between bays: how far through its time, and how far along its way
    const moving = !!(travel.from && travel.to);
    if (moving) {
      travel.u = travelHold ?? Math.min(1, Math.max(0, (frameNow - travel.t0) / travel.ms));
      travel.e = PAN_PROFILE.E(travel.u);
    }
    const e = moving ? travel.e : 0;

    // camera: drift and pointer parallax at rest; during a launch, the launch path, then a pull back to rest
    const ease = 1 - Math.exp(-dt * 2.2);
    const sway = (moving ? travel.to! : bays[0]).calm ? CALM_MOVE.sway : 1;
    const tx = ((pointer.active ? pointer.nx * PARALLAX.x : 0) + Math.sin(time * 0.13) * PARALLAX.driftX) * sway;
    const ty = ((pointer.active ? pointer.ny * PARALLAX.y : 0) + Math.sin(time * 0.17) * PARALLAX.driftY) * sway;
    camBase.x += (tx - camBase.x) * ease;
    camBase.y += (ty - camBase.y) * ease;
    if (launch && !launchEnded) {
      launchPose(time, viewCam.position);
    } else if (launch) {
      const k = smoother(landAt, landAt + INTRO.landFor, time);
      viewCam.position.set(
        launchFrom.x + (camBase.x - launchFrom.x) * k,
        launchFrom.y + (camBase.y - launchFrom.y) * k,
        launchFrom.z + (CAM_Z - launchFrom.z) * k,
      );
    } else {
      const dolly = 1 - Math.pow(1 - Math.min(1, time / INTRO.settled), 3);
      viewCam.position.set(camBase.x, camBase.y, CAM_Z - 1.2 * (1 - dolly));
    }
    // The page's scroll carries the camera down into the room and back; the hero's view (the top of the page) looks
    // straight down z, which the anchor's mapping relies on. Travelling, the camera goes from where it was in front
    // of the bay it is leaving to where the next page opens in front of its own, along the move's curve: it pans,
    // and rises or sinks if the two pages are scrolled to different depths.
    const cur = moving ? travel.to! : bays[0];
    const page = cur.page?.();
    if (page) {
      const goal = Math.max(0, Math.min(page.end, page.at));
      cur.at += (goal - cur.at) * (1 - Math.exp(-dt * TRAVEL_EASE));
      if (Math.abs(goal - cur.at) < 1e-4) cur.at = goal;
      cur.end = page.end;
      if (!moving) scrollDrive(dt, cur.at);
    }
    pathAt(cur, cur.at, cur.end, cur.shot);
    let shot = cur.shot;
    let travelled = cur.travel;
    if (moving) {
      const from = travel.from!;
      pathAt(from, from.at, from.end, from.shot);
      const a = from.shot;
      const b = cur.shot;
      lookA.set(a.look[0] - a.eye[0], a.look[1] - a.eye[1], a.look[2] - a.eye[2]).normalize();
      lookB.set(b.look[0] - b.eye[0], b.look[1] - b.eye[1], b.look[2] - b.eye[2]).normalize();
      lookA.lerp(lookB, e).normalize();
      for (let j = 0; j < 3; j++) {
        between.eye[j] = a.eye[j] + (b.eye[j] - a.eye[j]) * e;
        between.look[j] = between.eye[j] + lookA.getComponent(j) * 10;
      }
      shot = between;
      travelled = from.travel + (cur.travel - from.travel) * e;
    }
    viewCam.position.x += shot.eye[0];
    viewCam.position.y += shot.eye[1];
    viewCam.position.z += shot.eye[2] - CAM_Z;
    viewCam.lookAt(shot.look[0], shot.look[1], shot.look[2]);
    viewCam.updateMatrixWorld();
    vShot = shot;
    vTravelled = travelled;

    // the rig leans a little toward the pointer, slower than the camera follows it
    const leanEase = 1 - Math.exp(-dt * 1.2);
    lean.x += ((pointer.active ? pointer.nx * 0.1 : 0) - lean.x) * leanEase;
    lean.y += ((pointer.active ? pointer.ny * 0.05 : 0) - lean.y) * leanEase;
  }

  // The room's state for the frame about to be drawn: the neon's power, the light, the show and its beams, from the
  // camera's view now. `dt` for what eases over time is the time since the last frame drawn.
  let worldAt = time;
  // Where the camera will be `ahead` ms from now, going on as it is going: a frame drawn a part at a time is shown a
  // frame or two after it was begun, and turned to where the camera is then (see present); drawn from about the
  // middle of those, the turning is smaller either way, and so are the strips at the screen's edges it never saw.
  // A jump (a launch landing, a move setting off) is not carried forward.
  const aheadPos = new THREE.Vector3();
  const aheadQuat = new THREE.Quaternion();
  function predicted(ahead: number) {
    aheadPos.copy(viewCam.position);
    aheadQuat.copy(viewCam.quaternion);
    if (ahead <= 0 || lastViewMs < 4 || lastViewMs > 60) return;
    const k = 1 + ahead / lastViewMs;
    if (viewCam.position.distanceTo(lastViewPos) > 0.6 || viewCam.quaternion.angleTo(lastViewQuat) > 0.1) return;
    aheadPos.lerpVectors(lastViewPos, viewCam.position, k);
    aheadQuat.slerpQuaternions(lastViewQuat, viewCam.quaternion, k);
  }
  function worldStep(ahead = 0) {
    const dt = Math.max(0, time - worldAt);
    worldAt = time;
    U.uTime.value = time;

    if (!ignited && time >= INTRO.ignite) {
      ignited = true;
      flares.fire(time, 1);
    }
    const flare = flares.flare(time);
    const room = smoother(INTRO.ignite - 0.2, INTRO.roomEnd, time);

    // The show starts with a burst: every beam aimed straight at the viewer in a flash of light, then spreading out
    // into the first look. After a launch it starts as the camera pulls back; otherwise once the room is up.
    const showStart = launch ? (launchEnded ? landAt : Infinity) : INTRO.lasers;
    const since = time - showStart;
    const beat = (since * BPM) / 60;
    const showOpen = beat > 0 ? 1 : 0;
    if (showOpen && !shown) {
      shown = true;
      opts.onShow?.(since);
    }
    // the wash of light while the beams are in the lens, gone as they leave it
    const flash = since >= 0 ? Math.exp(-Math.max(0, since - 0.12) * 6) * (1 - smoother(0.1, 0.7, since)) : 0;
    // resonance: one soft swell of the sign at the top of each bar, a ring of its light running out over the wall,
    // and a faint wave travelling along every beam
    const res = layers.resonance ? showOpen : 0;
    const bar = beat > 0 ? (beat % 4) / 4 : 1;
    lasers.uniforms.uRipple.value = 0.14 * res;
    lasers.uniforms.uPhase.value = beat * Math.PI;
    for (const b of bays) {
      b.signU.uSwell.value = 0.06 * res * Math.exp(-bar * 10);
      // the lines answer the bar too: a little more movement as each bar lands
      b.signU.uWave.value = WAVE * (1 + 0.35 * res * Math.exp(-bar * 4));
      b.signU.uFlash.value = flare * 0.2;
      b.light = layers.sign ? b.power.update(dt, time) * (1 + flare * 0.55) : 0;
      b.own.uLight.value = b.light;
    }

    const moving = !!(travel.from && travel.to);
    const e = moving ? travel.e : 0;
    const near = lightRoom();
    lit = near;
    const dipped = moving ? Math.cos(Math.PI * e) ** 2 : 1;
    U.uRoom.value = room;
    atmos.uniforms.uRays.value = layers.rays ? near.light * dipped * (0.55 + 0.45 * room) : 0;
    rayColor(near);
    grade.uniforms.uLift.value = layers.grade ? room : 0;
    grade.uniforms.uExposure.value = 1 + flare * 0.15 + flash * 0.12;
    grade.uniforms.uFlash.value = layers.lasers ? flash * 0.16 : 0;

    // the camera the view has now, or will have by the time this frame is shown
    predicted(ahead);
    camera.position.copy(aheadPos);
    camera.quaternion.copy(aheadQuat);
    camera.updateMatrixWorld();
    U.uEye.value.copy(camera.position);
    // a sign kept behind the page's own neon is hung for this camera, and the room takes its light from there
    if (bays.some((b) => b.follow)) {
      for (const b of bays) followPage(b);
      lightRoom();
    }
    const cur = moving ? travel.to! : bays[0];
    const shot = vShot;
    const travelled = vTravelled;

    // the room's surfaces go with the camera (they are drawn in the world's own coordinates, so their texture stays
    // put on them): the wall and the floor run on for ever either way
    const floorY = moving ? travel.from!.view.floorY + (cur.view.floorY - travel.from!.view.floorY) * e : cur.view.floorY;
    U.uFloorY.value = floorY;
    wall.position.set(camera.position.x, floorY + 22, 0);
    floor.position.set(camera.position.x, floorY, 0);
    dustU.uBoxMin.value.set(camera.position.x - screen.halfW * 1.25, floorY, 0.15);

    // the rig: where the eye is, its lean toward the pointer, and its dip with the page's scroll, swinging back
    // when it stops
    for (const b of bays) {
      b.rig.eye = [camera.position.x, camera.position.y, camera.position.z];
      b.rig.lean = [lean.x, lean.y - 0.06 * slosh * (b.calm ? CALM_MOVE.scroll : 1)];
    }

    // the shows: the bay being left fades out over the first part of the move, the next one in over the last
    played.beams.length = 0;
    played.sheets.length = 0;
    if (moving) {
      playBay(travel.from!, beat, showOpen, since, 1 - smoother(0.3, 0.8, e), played);
      playBay(cur, beat, showOpen, since, smoother(0.2, 0.7, e), played);
    } else playBay(cur, beat, showOpen, since, 1, played);
    const beams = played.beams;
    // the page takes the show's light as the show plays it (in its two colours, whatever they are in this room)
    shareLight(beams, near.light, beat, bar, flash, showOpen, travelled);
    const pa = moving ? travel.from!.palette : cur.palette;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) palette[i][j] = pa[i][j] + (cur.palette[i][j] - pa[i][j]) * e;
    lightTheFog(beams, travelled);
    writeBeams(beams, travelled, floorY);
    writeSheets(layers.lasers ? played.sheets : []);
    const gain = moving ? travel.from!.gain + (cur.gain - travel.from!.gain) * e : cur.gain;
    lasers.uniforms.uGain.value = (1 + 0.35 * rush) * gain;
    placeCards(moving ? null : cur);

    // The shutter: the frame is smeared the way the room moves across the screen, for half of a frame's time (a
    // half-open shutter), and the colour fringe widens with the speed, a camera whipping round. Across: one bay is
    // one screen, so the move's own speed says how far the wall goes in a frame. Up and down (the camera rising or
    // sinking between pages scrolled to different depths): how far the point in the middle of the screen moved.
    camera.updateMatrixWorld();
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const whipped = moving ? PAN_PROFILE.speed(travel.u) ** 0.7 : 0;
    blurOn = moving ? 1 : Math.max(0, blurOn - dt * 6);
    if (blurOn > 0 && layers.grade) {
      const look = dir.set(shot.look[0] - shot.eye[0], shot.look[1] - shot.eye[1], shot.look[2] - shot.eye[2]).normalize();
      const toWall = look.z < -0.05 ? camera.position.z / -look.z : 14;
      const toFloor = look.y < -0.05 ? (floorY - camera.position.y) / look.y : Infinity;
      probe.copy(camera.position).addScaledVector(look, Math.min(toWall, toFloor, 30));
      probeNow.copy(probe).applyMatrix4(viewProj);
      probe.applyMatrix4(prevViewProj);
      const across = moving ? (PAN_PROFILE.rate(travel.u) * (1000 / 60)) / travel.ms : 0;
      const v = motion.uniforms.uDir.value as THREE.Vector2;
      // (how far it moved since the last frame drawn, as a sixtieth of a second's worth: the shutter's time is the
      // same however often the room is drawn)
      v.set(across, (probeNow.y - probe.y) * 0.5 * Math.min(1, 1 / (60 * Math.max(dt, 1e-3)))).multiplyScalar(SHUTTER * blurOn);
      if (v.length() > 0.06) v.setLength(0.06);
      motion.enabled = v.length() * screen.w > 1.5;
    } else motion.enabled = false;
    prevViewProj.copy(viewProj);
    grade.uniforms.uCA.value = layers.grade ? gradeDefaults.uCA * (1 + 2.5 * whipped) : 0;

  }

  function step(dt: number) {
    viewStep(dt);
    worldStep();
    // arrived
    if (travel.from && travel.to && travel.u >= 1) arrive();
  }

  function arrive() {
    const from = travel.from;
    const to = travel.to;
    if (!from || !to) return;
    travel.from = travel.to = null;
    // a frame being drawn a part at a time had both bays in it: it starts again with the one left
    part = 0;
    settling();
    atmos.setDetail(level > 0 ? SOFT_DETAIL : 1);
    rescale(1);
    bays.splice(bays.indexOf(from), 1);
    dropBay(from);
    // the scroll drive carries on from the new page's place, without a jolt
    lastAt = to.at;
    speed = slosh = sloshV = 0;
    const done = travel.done;
    travel.done = null;
    done?.();
  }

  // The page's scroll drives the lasers: how fast it's moving (screens a second); a spring that swings with it and
  // overshoots a little as it settles once the scroll stops (slosh, about -1..1); a phase that runs the rigs ahead
  // while it moves, so they sweep faster (whip, in beats); and how much it's rushing (0..1), which brightens them.
  let lastAt = bays[0].at;
  let speed = 0;
  let slosh = 0;
  let sloshV = 0;
  let whip = 0;
  let rush = 0;
  function scrollDrive(dt: number, at: number) {
    if (dt <= 0) return;
    const v = (at - lastAt) / dt;
    lastAt = at;
    speed += (v - speed) * (1 - Math.exp(-dt * 10));
    const target = Math.max(-1, Math.min(1, speed * 0.6));
    sloshV += (40 * (target - slosh) - 6.5 * sloshV) * dt;
    slosh += sloshV * dt;
    whip += Math.abs(speed) * dt * 3;
    rush = 1 - Math.exp(-Math.abs(speed) / 1.5);
  }

  function writeSheets(list: Sheet[]) {
    const n = Math.min(list.length, MAX_SHEETS);
    const u = lasers.uniforms;
    for (let i = 0; i < n; i++) {
      const sh = list[i];
      (u.uSheetO.value as THREE.Vector4[])[i].set(sh.o[0], sh.o[1], sh.o[2], sh.power);
      (u.uSheetN.value as THREE.Vector4[])[i].set(sh.n[0], sh.n[1], sh.n[2], sh.half);
      (u.uSheetU.value as THREE.Vector4[])[i].set(sh.u[0], sh.u[1], sh.u[2], sh.reach);
      (u.uSheetC.value as THREE.Vector3[])[i].set(sh.color[0], sh.color[1], sh.color[2]);
    }
    u.uSheetCount.value = n;
  }

  // The fog bank rolls in as the camera turns down to the floor (a little of it lies in the hero's floor too). It
  // is lit from above by the show, in the colour of its light, more with more beams in the air.
  const FOG = 1;
  const fogCol = new THREE.Color();
  const PALE = new THREE.Color(0.8, 0.8, 0.9);
  function lightTheFog(list: Beam[], travelled: number) {
    let pink = 0;
    let cyan = 0;
    for (const b of list) {
      pink += b.power * b.color[0];
      cyan += b.power * b.color[1];
    }
    const total = pink + cyan;
    const share = total > 0 ? cyan / total : 0.5;
    const glow = 0.3 + 0.5 * (1 - Math.exp(-total / 8));
    fogCol.setRGB(
      palette[0][0] + (palette[1][0] - palette[0][0]) * share,
      palette[0][1] + (palette[1][1] - palette[0][1]) * share,
      palette[0][2] + (palette[1][2] - palette[0][2]) * share,
    );
    // fog scatters every colour: its light is the show's, paled a little
    (atmos.uniforms.uFogAmb.value as THREE.Color).copy(fogCol).lerp(PALE, 0.3).multiplyScalar(glow);
    atmos.uniforms.uFog.value = layers.fog && bays[bays.length - 1].page ? (opts.fog ?? FOG * (0.2 + 0.8 * travelled)) : 0;
  }

  // The page's cards stand on the floor as lightboxes (see FLOOR_FRAG cardLight) once the camera looks down at it:
  // each one's lower edge, carried down the camera's view to the floor, is where it stands, and its top, carried to
  // that depth, how tall it is. So it covers just the patch of screen the card does, and stands on its own edge.
  const cardRay = new THREE.Vector3();
  function floorHit(x: number, y: number, w: number, h: number, out: THREE.Vector3, floorY: number) {
    cardRay.set((x / w) * 2 - 1, 1 - (y / h) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    if (cardRay.y > -0.02) return false;
    const t = (floorY - camera.position.y) / cardRay.y;
    out.copy(camera.position).addScaledVector(cardRay, t);
    return out.z > 0.3 && out.z < 30;
  }
  const footL = new THREE.Vector3();
  const footR = new THREE.Vector3();
  /** the bay's page's cards (none while travelling: the page being left has gone from where they were measured) */
  function placeCards(b: Bay | null) {
    const fade = b && layers.cards ? smoother(0.5, 0.95, b.travel) : 0;
    const list = b && fade > 0.01 ? (b.cards?.() ?? []) : [];
    const floorY = b?.view.floorY ?? -2;
    // (the size from the last layout: reading the container's again, right after the page's light was written,
    // made the browser work out the whole page's style anew every frame)
    const { w, h } = screen;
    let n = 0;
    for (const card of list) {
      if (n >= MAX_CARDS || !w || !h) break;
      const bottom = card.y + card.h;
      if (!floorHit(card.x, bottom, w, h, footL, floorY) || !floorHit(card.x + card.w, bottom, w, h, footR, floorY)) continue;
      const z = (footL.z + footR.z) / 2;
      cardRay.set(((card.x + card.w / 2) / w) * 2 - 1, 1 - (card.y / h) * 2, 0.5).unproject(camera).sub(camera.position).normalize();
      if (cardRay.z > -0.01) continue;
      const top = camera.position.y + (cardRay.y * (z - camera.position.z)) / cardRay.z;
      const height = Math.max(0.1, Math.min(6, top - floorY));
      floorU.uCardA.value[n].set(Math.min(footL.x, footR.x), Math.max(footL.x, footR.x), z, height);
      floorU.uCardB.value[n].set(card.color[0], card.color[1], card.color[2], card.power * fade);
      n++;
    }
    floorU.uCardCount.value = n;
  }

  // The opening burst, as the camera pulls back. For a moment every beam points straight into the lens: the heads
  // flare as hard points of light and the screen washes with their colour. Then the beams sweep off the lens
  // (their aim points open out round the viewer, so each one shows as a streak running out of its head), and swing
  // on to where the show has them. The stands fire with them and fade as they spread.
  const BURST = { hold: 0.2, clear: 0.85, spread: 2.4, stand: 4 };
  function burst(list: Beam[], since: number, rig: Rig): Beam[] {
    if (since < 0 || since > BURST.spread + 0.1) return list;
    const k = smoother(BURST.clear * 0.6, BURST.spread, since);
    const leave = smoother(BURST.hold, BURST.clear, since);
    const boost = 1 + 0.8 * Math.exp(-since * 2.5);
    const toward = (o: Vec3, i: number, n: number): Vec3 => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const r = (1.0 + 0.4 * (((i * 7) % 3) / 2)) * leave;
      const x = rig.eye[0] + Math.cos(a) * r * 1.4 - o[0];
      const y = rig.eye[1] + (0.5 + Math.sin(a) * 0.8) * r - o[1];
      const z = rig.eye[2] - o[2];
      const l = Math.hypot(x, y, z) || 1;
      return [x / l, y / l, z / l];
    };
    const swing = (from: Vec3, to: Vec3): Vec3 => {
      const x = from[0] + (to[0] - from[0]) * k;
      const y = from[1] + (to[1] - from[1]) * k;
      const z = from[2] + (to[2] - from[2]) * k;
      const l = Math.hypot(x, y, z) || 1;
      return [x / l, y / l, z / l];
    };
    const out = list.map((b, i) => ({ ...b, d: swing(toward(b.o, i, list.length), b.d), power: b.power * boost }));
    const fade = 1 - k;
    if (fade > 0.01) {
      for (let i = 0; i < BURST.stand; i++) {
        for (const [o, side, color] of [[rig.left, 1, CYAN_BURST], [rig.right, -1, PINK_BURST]] as [Vec3, number, Vec3][]) {
          const away: Vec3 = [Math.sin(side * (0.5 + i * 0.12)) * 0.6, 0.78, 0.6];
          out.push({ o, d: swing(toward(o, i + (side > 0 ? 0 : BURST.stand), BURST.stand * 2), away), color, power: 0.9 * fade * boost });
        }
      }
    }
    return out;
  }

  // whether any of the sign is on the screen (its box's corners, with a little room for the monogram's waving lines)
  const corner = new THREE.Vector3();
  function signInView(view: View) {
    let left = Infinity;
    let right = -Infinity;
    let bottom = Infinity;
    let top = -Infinity;
    for (let i = 0; i < 4; i++) {
      corner.set(view.logoX + (i & 1 ? 0.5 : -0.5) * view.logoW, view.logoY + (i & 2 ? 0.5 : -0.5) * view.logoH, view.face).project(camera);
      if (corner.z > 1) return true; // behind the lens, where a projection means nothing: take no chances
      left = Math.min(left, corner.x);
      right = Math.max(right, corner.x);
      bottom = Math.min(bottom, corner.y);
      top = Math.max(top, corner.y);
    }
    return right > -1.05 && left < 1.05 && top > -1.05 && bottom < 1.05;
  }

  /** a whole frame, now, shown as drawn (the loop draws one a band at a time when it has to: see tick) */
  function render() {
    // (a frame being drawn a part at a time is given up: its targets are this one's)
    part = 0;
    drawWorld(0, 1);
    present(false);
  }

  /**
   * Part `k` of `n` of the room's next frame (0 of 1: all of it). With the first part go the sign's light for the
   * god rays and the rays themselves (a blur across the whole screen, drawn small); then a band of the screen's rows
   * through the scene, the smoke and the lasers, each pass only shading those rows; with the last part, the bloom
   * and the shutter, which need the whole frame. Every part draws from the same state (worldStep is not run between
   * them) and the same camera. The finished frame becomes the one the screen is shown (bufP).
   */
  const frameShown = { vp: new THREE.Matrix4(), floorY: -2, sign: new THREE.Vector4(), face: 0, eye: new THREE.Vector3() };
  function drawWorld(k: number, n: number) {
    if (k === 0) {
      // the god rays' source is the sign as it shows on the screen: down the page, with the camera turned to the
      // floor, it is off it, and neither the source nor the rays are drawn
      const view = lit.shown;
      const seen = signInView(view);
      atmos.signInView = seen;
      renderer.setRenderTarget(atmos.occ);
      renderer.clear();
      // the rays come from the neon lighting the room (see lightRoom)
      for (const b of bays) b.occ.visible = b === lit;
      if (seen) renderer.render(occScene, camera);
      renderer.setRenderTarget(null);

      const reach = view.logoW * 0.32;
      lightScreen.set(view.logoX - reach, view.logoY, view.face).project(camera);
      (atmos.uniforms.uLightA.value as THREE.Vector2).set(lightScreen.x * 0.5 + 0.5, lightScreen.y * 0.5 + 0.5);
      lightScreen.set(view.logoX + reach, view.logoY, view.face).project(camera);
      (atmos.uniforms.uLightB.value as THREE.Vector2).set(lightScreen.x * 0.5 + 0.5, lightScreen.y * 0.5 + 0.5);
      (atmos.uniforms.uInvViewProj.value as THREE.Matrix4).multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    }
    const rows = Math.floor(bufA.height);
    const band = n > 1 ? { y0: Math.floor((rows * k) / n), y1: Math.floor((rows * (k + 1)) / n), first: k === 0 } : null;
    let read = bufA;
    let write = bufB;
    if (band) {
      for (const t of [bufA, bufB]) {
        t.scissor.set(0, band.y0, t.width, band.y1 - band.y0);
        t.scissorTest = true;
      }
    }
    atmos.band = band;
    scenePass.render(renderer, write, read, 0, false);
    if (atmos.enabled) {
      atmos.render(renderer, write, read);
      [read, write] = [write, read];
    }
    if (lasers.enabled) {
      lasers.render(renderer, write, read);
      [read, write] = [write, read];
    }
    bufA.scissorTest = bufB.scissorTest = false;
    atmos.band = null;
    if (k < n - 1) return;
    if (bloom.enabled) bloom.render(renderer, write, read, 0, false);
    if (motion.enabled) {
      motion.render(renderer, write, read, 0, false);
      [read, write] = [write, read];
    }
    // the finished frame is the one shown from now on: its target and the last one shown change places
    if (read === bufA) [bufA, bufP] = [bufP, bufA];
    else [bufB, bufP] = [bufP, bufB];
    // and where its camera was, and what its pixels lie on (see present)
    frameShown.vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frameShown.floorY = U.uFloorY.value;
    const v = lit.shown;
    // (no letters drawn: the wall behind them is what's there)
    if (travel.from || opts.neon === false) frameShown.sign.set(0, 0, 0, 0);
    else frameShown.sign.set(v.logoX, v.logoY, v.logoW * 0.5, v.logoH * 0.5);
    frameShown.face = v.face;
    frameShown.eye.copy(camera.position);
    finished = true;
    completed++;
  }

  /**
   * The screen is shown the last finished frame through the last pass (grade), turned to the camera's place now
   * when it has moved since that frame was drawn (`turn`; see GRADE_FRAG): so the camera moves on every frame of the
   * screen however often the room itself is drawn.
   */
  const nowVP = new THREE.Matrix4();
  let presented = 0;
  function present(turn: boolean) {
    if (!finished) return;
    const g = grade.uniforms;
    g.uTime.value = time;
    let warp = 0;
    if (turn) {
      nowVP.multiplyMatrices(viewCam.projectionMatrix, viewCam.matrixWorldInverse);
      if (!nowVP.equals(frameShown.vp)) {
        warp = 1;
        (g.uNowInv.value as THREE.Matrix4).copy(nowVP).invert();
        (g.uThen.value as THREE.Matrix4).copy(frameShown.vp);
        (g.uEyeNow.value as THREE.Vector3).copy(viewCam.position);
        g.uWarpFloor.value = frameShown.floorY;
        (g.uWarpSign.value as THREE.Vector4).copy(frameShown.sign);
        g.uWarpFace.value = frameShown.face;
      }
    }
    g.uWarp.value = warp;
    grade.render(renderer, bufP, bufP, 0, false);
    presented++;
  }

  // ------------------------------------------------------------------ layers
  function applyLayers() {
    for (const b of bays) b.mesh.visible = b.aura.visible = layers.sign && opts.neon !== false;
    wall.visible = floor.visible = layers.room;
    atmos.uniforms.uSmoke.value = layers.smoke ? SMOKE : 0;
    lasers.enabled = layers.lasers;
    lasers.uniforms.uReflect.value = layers.reflect ? 1 : 0;
    floorU.uReflect.value = layers.reflect ? 2.2 : 0;
    dust.visible = layers.dust;
    bloom.enabled = layers.bloom;
    for (const [k, v] of Object.entries(gradeDefaults)) grade.uniforms[k].value = layers.grade ? v : 0;
    beamU.uBeamCount.value = layers.lasers ? beamCount : 0;
  }
  applyLayers();

  // ------------------------------------------------------------------ mount, visibility
  let visible = true;
  let destroyed = false;
  let frozenAt: number | undefined;
  let raf = 0;
  let resizeTimer = 0;
  const resizer = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      layout();
      if (still || frozenAt !== undefined) render();
    }, 120);
  });
  const watcher = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  });
  const onContextLost = (e: Event) => {
    e.preventDefault();
    onFail();
  };
  container.append(canvas);
  layout();
  resizer.observe(container);
  canvas.addEventListener("webglcontextlost", onContextLost);
  if (!still) {
    watcher.observe(container);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }

  // ------------------------------------------------------------------ loop
  let last = 0;
  let lastTick = 0;
  let frames = 0;
  let fps = 0;
  let fpsFrames = 0;
  let fpsT0 = 0;
  let ms = 0;
  let draws = 0;
  let lateDraws = 0;
  // the screen's own frame (ms): the shortest gap between two of its frames lately. Long gaps are believed slowly,
  // so a busy stretch doesn't pass for a slower screen; a shorter one only when the one before was as short (one
  // on its own is a frame catching up after a late one, not a faster screen).
  let screenFrame = 1000 / 60;
  let lastGap = 0;
  // how often the room is drawn (see govern): every frame of the screen, or every second, third... one, whichever
  // comes nearest the rate. The page's own frames carry on in between.
  let rate = 60;
  // A room drawn less often than the screen's frames (a GPU that keeps 30 on a 60 Hz screen) is drawn a part at a
  // time, a band of the screen's rows on each of the frames between (see drawWorld), and every frame of the screen
  // shows the last finished frame turned to where the camera is now (present). So the GPU's work comes in even
  // pieces, which the screen never waits long for (a whole frame at once held up every other frame of the page as
  // well, measured 25 Nov), and the camera moves with every frame of the screen. A part has to fit in a frame of the
  // screen, with the rest of the page's drawing: with less room than that (a 120 Hz screen and a room at 60), the
  // room is drawn whole on its turn, as before.
  const MAX_PARTS = 4;
  let parts = 0;
  // The GPU's progress: a fence after each frame's work, looked at two frames of the screen later (never waited
  // for). Still not done by then, the GPU is a whole frame behind: it has more to do than the screen gives it time
  // for. (One frame later is too soon to say: it may only be finishing.)
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const fences: WebGLSync[] = [];
  function fenced() {
    const f = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (f) fences.push(f);
  }
  function gpuBehind() {
    if (fences.length < 2) return false;
    const f = fences.shift()!;
    const done = gl.getSyncParameter(f, gl.SYNC_STATUS) === gl.SIGNALED;
    gl.deleteSync(f);
    return !done;
  }
  function dropFences() {
    for (const f of fences) gl.deleteSync(f);
    fences.length = 0;
  }
  let lastView = 0;
  let completed = 0;
  // While the GPU can't keep up with a part on every frame of the screen (see fences), the room is drawn whole on its
  // turn for a while, as it always was, rather than given less to draw: the picture comes first.
  let wholeUntil = 0;
  let behindCount = 0;
  let behindOf = 0;
  let behindAll = 0;
  let badStretches = 0;
  let partFrames = 0;
  // testing: keep drawing in parts whatever the fences say
  let keepParts = false;
  // A move between pages loads the GPU for a moment (two bays, the next page's first paint, its sign going up to
  // the GPU): from the moment one is being made ready until a while after it has arrived, neither late frames nor
  // the fences count. Read as the GPU's own pace, that moment halved the room's rate or sent it back to whole frames
  // for a while after a few moves (the user saw it, 25 Nov).
  const SETTLE_MS = 1500;
  let settledAt = 0;
  function settling() {
    settledAt = performance.now() + SETTLE_MS;
    behindCount = behindOf = badStretches = 0;
    frames = late = 0;
  }
  function partsFor(per: number) {
    if (per < 2 || still || performance.now() < wholeUntil) return 0;
    const n = Math.min(per, MAX_PARTS);
    // what a part costs, from the frame timed at the start of the visit, against the screen's frame
    const cost = litCost > 0 ? (litCost * LADDER[level] ** 2 * (level > 0 ? TRIMMED : 1)) / n : 0;
    return cost <= screenFrame * PART_FITS ? n : 0;
  }
  function tick(now: number) {
    if (destroyed) return;
    raf = requestAnimationFrame(tick);
    const gap = now - lastTick;
    lastTick = now;
    if (!visible || document.hidden || frozenAt !== undefined) {
      last = lastView = now;
      part = 0;
      // a travel that ran its time while nothing was drawn has arrived all the same
      if (travel.from && travelHold === undefined && now - travel.t0 > travel.ms) arrive();
      return;
    }
    if (gap > 3 && gap < 50) {
      if (gap >= screenFrame) screenFrame += (gap - screenFrame) * 0.005;
      else if (Math.abs(gap - lastGap) < 1.5) screenFrame = Math.max(gap, lastGap);
    }
    lastGap = gap;
    // (a travel between bays draws two bays: where that leaves a room kept at 30 the time for 60, it moves at 60)
    const aim = travel.from && quickMoves ? Math.max(rate, 60) : rate;
    const per = Math.max(1, Math.round(1000 / aim / screenFrame));
    const due = per * screenFrame;
    const elapsed = now - last;
    const n = timing ? 0 : partsFor(per);
    if (n !== parts) {
      parts = n;
      part = 0;
    }
    if (!parts) {
      // ------------------------------------------------ a whole frame on its turn
      if (fences.length) dropFences();
      // not this frame's turn (half a frame of slack: frames don't arrive to the microsecond)
      if (elapsed < due - screenFrame * 0.5) return;
      last = lastView = now;
      frameNow = now;
      step(Math.min(elapsed / 1000, 1 / 10));
      render();
      draws++;
      if (timing && draws >= 2) {
        // (the first two frames of a visit upload what the room needs: no measure of anything)
        timeFrames();
        timedNow = false;
        // (the frames after this one start from here; the gap to the next says nothing about the screen)
        last = lastView = performance.now();
        lastTick = lastGap = 0;
        return;
      }
      // a travel between bays draws two of everything for a moment: not a measure of what the room needs
      // late: a frame of the screen after its turn (or, should the screen's frame be misjudged, of a 60 Hz one)
      if (!travel.from && now > settledAt) govern(elapsed, Math.min(due + screenFrame * 0.45, (1000 / aim) * 1.45));
    } else {
      // ------------------------------------------------ a part on every frame of the screen
      frameNow = now;
      viewStep(Math.min((now - lastView) / 1000, 1 / 10));
      lastView = now;
      if (part === 0) {
        // a travel arrives between frames, never in the middle of one (its other parts have two bays to draw)
        if (travel.from && travel.to && travel.u >= 1) arrive();
        if (!finished) {
          // nothing to show (the drawing buffers were just made again): a whole frame now, not an empty screen
          last = now;
          worldStep();
          render();
          draws++;
        } else if (elapsed >= due - screenFrame * 0.5) {
          last = now;
          // (shown from the frame after the last part is drawn until the next frame is finished)
          worldStep(((3 * parts - 3) / 2) * screenFrame);
          drawWorld(0, parts);
          part = 1;
          draws++;
        }
      } else {
        drawWorld(part, parts);
        part = (part + 1) % parts;
      }
      const behind = gpuBehind();
      present(true);
      fenced();
      // late: a frame of the screen that came after its turn
      if (!travel.from && now > settledAt) govern(gap, screenFrame * 1.45);
      // The page's frames can be on time while the GPU falls behind, and the screen waits for it. Behind on more
      // than one frame in six for two stretches running, the parts don't fit: whole frames again, for a while.
      // (Not in the first seconds of drawing in parts, when the page and the room are still loading things.)
      if (++partFrames > 240 && !travel.from && now > settledAt) {
        behindOf++;
        if (behind) {
          behindCount++;
          behindAll++;
        }
        if (behindOf >= 36) {
          badStretches = behindCount > 6 ? badStretches + 1 : 0;
          if (badStretches >= 2 && !keepParts) {
            wholeUntil = now + 15000;
            badStretches = partFrames = 0;
            dropFences();
          }
          behindCount = behindOf = 0;
        }
      }
    }
    if (timedNow) {
      // (frames were timed: the ones after start from here, and the gap to the next says nothing about the screen)
      timedNow = false;
      last = lastView = performance.now();
      lastTick = lastGap = 0;
      part = 0;
    }
    fpsFrames++;
    if (now - fpsT0 > 500) {
      fps = (fpsFrames * 1000) / (now - fpsT0);
      ms = (now - fpsT0) / fpsFrames;
      fpsFrames = 0;
      fpsT0 = now;
    }
  }

  // The governor keeps the room on time. A steady rate matters more than a high one, and the picture more than
  // either: the room is drawn 60 times a second where the GPU can do that with everything in it, and 30 times a
  // second, every frame on time, where it can't; only a GPU that can't keep 30 is given less to draw (see PACE).
  //
  // It acts on what a frame costs, and a frame's cost can't be read off the clock as the room runs (the page never
  // waits for the GPU), so it times frames when it has a reason to (see timed):
  //  - once before anything shows, in the dark before the sign strikes: the room starts at the stage that leaves
  //    room to spare, instead of finding its place through slow seconds, and the pace is locked there;
  //  - when frames come late (a handful in a short while): late frames alone prove nothing, since a tab kept from
  //    its frames or a page busy with something else is late with an idle GPU. If the frames timed fit, the room
  //    stays as it is. If they don't, it steps down, at once and as far as they say, so a dip is one dip and not a
  //    staircase of them;
  //  - after a long calm spell below the stage it started at (something else had the GPU for a while): if the
  //    frames timed fit further up, it goes back, never past where it started.
  // It doesn't hunt for something better than it started with. Where it settles is kept for the visit, so the
  // next page starts there.
  const WINDOW = 36;
  const TOO_MANY = Math.ceil(WINDOW * 0.12); // more than one frame in eight late shows as a stutter
  const paceKey = `fs-room-pace-v2-${quality}`;
  let stage = 0;
  let level = 0;
  // the best stage this visit's GPU is asked for: where the timing put it
  let best = 0;
  // calm windows before the room asks whether it can go back up (about half a minute at 30 a second), twice as
  // long after every time the answer was no
  let wait = 24;
  let calm = 0;
  let warm = 20; // the first frames compile and upload: no measure of anything
  let late = 0;
  let pinned = false;
  let gaveUp = false;
  // what a lit frame costs at full size (ms), as timed at the start of the visit: 0 while that isn't known
  let litCost = 0;
  // whether a travel between bays can be drawn at 60 from this stage (see tick)
  let quickMoves = false;
  const remember = () => {
    try {
      sessionStorage.setItem(paceKey, [stage, best, wait, Math.round(litCost * 10) / 10].join(":"));
    } catch {
      // private browsing: it is timed again on the next page
    }
  };
  function setStage(next: number, keep = true) {
    stage = Math.max(0, Math.min(PACE.length - 1, next));
    [rate, level] = PACE[stage];
    atmos.setDetail(level > 0 ? SOFT_DETAIL : 1);
    if (resolution !== LADDER[level]) {
      resolution = LADDER[level];
      if (container.clientWidth && container.clientHeight) applyResolution(container.clientWidth, container.clientHeight);
    }
    frames = late = 0;
    // a travel draws two bays at MOVE_SCALE of this stage's size, each with half its beams: about this much of a frame
    const moving = litCost * LADDER[level] ** 2 * (level > 0 ? TRIMMED : 1) * MOVE_SCALE ** 2 * 1.15;
    quickMoves = rate >= 60 || (litCost > 0 && stage <= best && moving <= (1000 / 60) * ROOM_AT_60_UNTRIMMED);
    if (keep) remember();
  }
  /** what a frame that costs `ms` at this stage would cost at that one: its pixels' worth, and the soft layers' */
  const costAt = (ms: number, at: number) => {
    const to = PACE[at][1];
    return ms * (LADDER[to] / LADDER[level]) ** 2 * ((to > 0 ? TRIMMED : 1) / (level > 0 ? TRIMMED : 1));
  };
  /** the first stage from `from` on where a frame that costs `ms` at this stage fits, with `spare` of the room it needs */
  const fitting = (ms: number, from: number, spare = 1) => {
    let s = from;
    while (s < PACE.length - 1 && costAt(ms, s) > (1000 / PACE[s][0]) * (PACE[s][0] >= 60 ? ROOM_LIT_AT_60 : ROOM_LIT_AT_30) * spare) s++;
    return s;
  };

  // Timing frames: a few drawn back to back, each waited for (a pixel is read back). Back to back because a GPU
  // with time to spare slows its own clock, and a frame timed on its own reads long. It holds the page up for a
  // moment (`budget` ms at the very most), so it is only done in the dark at the start, when frames are late
  // already, and at long intervals while the room is below where it started.
  let timedCost = 0;
  let timedNow = false;
  const onePixel = new Uint8Array(4);
  function timed(most: number, budget: number) {
    const gl = renderer.getContext();
    const took: number[] = [];
    const begin = performance.now();
    while (took.length < most && performance.now() - begin < budget) {
      const t0 = performance.now();
      render();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, onePixel);
      took.push(performance.now() - t0);
    }
    timedNow = true;
    // the quickest of the later ones: the first carry the clock coming up
    return (timedCost = Math.min(...took.slice(took.length >> 1)));
  }
  let timing = false;
  function timeFrames() {
    timing = false;
    const ms = timed(7, 200);
    if (pinned || gaveUp) return;
    // what the home page's room would cost here, the heaviest of them: a visit that begins on another page (its
    // room up already, and a calmer one, with half the beams) is paced for the page it may travel to
    const cost = ms * (beamCount > 0 ? (bays[0]?.calm ? CALM_TO_HOME : 1) : LIT);
    litCost = cost;
    let s = cost > (1000 / 60) * ROOM_AT_60_UNTRIMMED ? 1 : 0;
    if (cost > (1000 / 60) * ROOM_AT_60) {
      // 30 a second, at the first stage that leaves room to spare (level 1's trim doesn't show: start there)
      s = FIRST_AT_30 + 1;
      while (s < PACE.length - 1 && PACE[s][0] === 30 && costAt(cost, s) > (1000 / 30) * ROOM_AT_30) s++;
    }
    best = s;
    setStage(s);
    warm = 6;
  }

  function govern(elapsed: number, lateAfter: number) {
    if (elapsed > 250) return; // a pause or a background tab's throttled timer: not the GPU's doing
    if (warm > 0) {
      warm--;
      return;
    }
    frames++;
    if (elapsed > lateAfter) {
      late++;
      lateDraws++;
    }
    // a stutter is acted on as soon as it is one, not at the end of a window of it
    const tooMany = late >= TOO_MANY;
    if (frames < WINDOW && !tooMany) return;
    const share = late / frames;
    frames = late = 0;
    if (pinned || gaveUp) return;
    if (tooMany) {
      calm = 0;
      // late, but is it the room? What a frame costs right now says
      const cost = timed(5, 120);
      const next = fitting(cost, stage);
      if (next === stage) {
        if (stage === PACE.length - 1 && cost > HOPELESS_FRAME) {
          gaveUp = true;
          onFail();
        }
        // the GPU has the time (or there is nothing left to give up): the page's doing, or the tab's. Leave it a while
        warm = 10 * rate;
        return;
      }
      wait = 24;
      setStage(next);
      warm = 4; // the step itself takes a frame or two
      return;
    }
    calm = share < 0.04 ? calm + 1 : 0;
    if (calm >= wait && stage > best) {
      calm = 0;
      // back up, as far as a frame fits with a little more room than it takes to stay
      const up = fitting(timed(5, 120), best, 0.9);
      // (part of the way: asked again soon, since a frame's cost doesn't quite go with its pixels; no further:
      // asked less and less often)
      if (up < stage) {
        wait = 8;
        setStage(up);
      } else wait = Math.min(Math.max(wait, 24) * 2, 96);
      warm = 4;
    }
  }
  let remembered = false;
  try {
    const [st, b, w, lit] = (sessionStorage.getItem(paceKey) ?? "").split(":").map(Number);
    if (st >= 0 && st < PACE.length && b >= 0 && b <= st && w >= 8 && lit >= 0) {
      best = b;
      litCost = lit;
      wait = Math.min(w, 96);
      setStage(st, false);
      remembered = true;
    }
  } catch {
    // no storage: it is timed again
  }
  // a first page of the visit: time a few frames before anything shows
  timing = !remembered && !still;

  /** run the clock from the start to `t` (the intro's flicker is random, so a replay differs a little) */
  function seek(t: number) {
    if (t < time) {
      time = 0;
      worldAt = 0;
      ignited = false;
      for (const b of bays) b.power = new Power(INTRO.strike, INTRO.ignite, b.power.restless);
      flares = new Flare();
      camBase.set(0, 0);
      landAt = launch ? INTRO.land : -1;
      launchEnded = !launch;
    }
    const dt = 1 / 60;
    while (time < t) step(Math.min(dt, t - time + 1e-6));
    render();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    dropFences();
    clearTimeout(resizeTimer);
    resizer.disconnect();
    watcher.disconnect();
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
    bays.forEach(dropBay);
    bays.length = 0;
    const done = travel.done;
    travel.done = null;
    done?.();
    atmos.dispose();
    lasers.dispose();
    bloom.dispose();
    grade.dispose();
    composer.dispose();
    for (const held of signs.values()) held.sign.then((sg) => sg.dispose(), () => {});
    signs.clear();
    noise.dispose();
    textures.forEach((t) => t.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  // Every program the room draws with is compiled before its first frame, side by side (on the GPU process's own
  // threads, where the browser has them): the scene's, and the passes' (the smoke, rays, lasers, bloom, shutter and
  // the last pass), which used to compile in the frame that first drew them, holding the page up meanwhile (the
  // shutter's, at the start of the first move between pages: 36 ms, measured 25 Nov). Each is compiled for where it
  // draws (a program differs between drawing to the screen and into a target): all into targets, but the last pass.
  const quad = new THREE.PlaneGeometry(2, 2);
  const passes = new THREE.Scene();
  for (const m of [...atmos.materials(), ...lasers.materials(), motion.material, bloom.materialHighPassFilter, ...bloom.separableBlurMaterials, bloom.compositeMaterial, bloom.blendMaterial]) {
    passes.add(new THREE.Mesh(quad, m));
  }
  const lastPass = new THREE.Scene().add(new THREE.Mesh(quad, grade.material));
  renderer.setRenderTarget(bufA);
  const compiling = [renderer.compileAsync(scene, camera), renderer.compileAsync(occScene, camera), renderer.compileAsync(passes, camera)];
  renderer.setRenderTarget(null);
  compiling.push(renderer.compileAsync(lastPass, camera));
  await Promise.all(compiling);
  quad.dispose();
  if (aborted()) {
    destroy();
    return null;
  }
  signal?.addEventListener("abort", destroy, { once: true });

  const handle: LaserRoom = {
    canvas,
    destroy,
    pulse: (amp = 1) => flares.fire(time, amp),
    skipIntro,
    setLayer(layer, on) {
      layers[layer] = on;
      applyLayers();
      if (frozenAt !== undefined) {
        // re-step one tiny moment so per-frame values (light, rays) take the new switches
        step(1e-6);
        render();
      }
    },
    lock(look) {
      locked = look;
      if (frozenAt !== undefined) seek(frozenAt);
    },
    freeze(t) {
      frozenAt = t;
      if (t !== undefined) seek(t);
    },
    relayout() {
      layout();
    },
    tint(next) {
      // the page's own bay: the one the camera is at, or on its way to
      const b = bays[bays.length - 1];
      if (!b) return;
      if (next.lasers) b.palette = [next.lasers[0], next.lasers[1]];
      if (next.tube) {
        b.tube[0].set(next.tube[0]);
        b.tube[1].set(next.tube[1]);
        b.core.forEach((c, i) => c.copy(b.tube[i]).lerp(WHITE, 0.45));
        (b.auraU.uPink.value as THREE.Color).copy(b.tube[0]).lerp(b.tube[1], 0.5);
        (b.auraU.uViolet.value as THREE.Color).copy(b.auraU.uPink.value).lerp(VIOLET, 0.35);
      }
      if (next.light) {
        b.ownLight = true;
        b.lightColor.setRGB(...next.light);
        b.own.uLightCol.value.copy(b.lightColor).multiplyScalar(b.lightScale);
      }
    },
    preload(key, makeLayout) {
      return signFor(key, makeLayout)
        .then(async (sg) => {
          if (destroyed) return;
          // up to the GPU now, not in the first frame of the travel (each in a task of its own)
          await yieldToPage();
          renderer.initTexture(sg.texture);
          await yieldToPage();
          renderer.initTexture(sg.glow);
        })
        .catch(() => {});
    },
    async prepare(next, toward) {
      // a travel still under way arrives first
      handle.settle();
      settling();
      // a bay made ready before and never travelled to goes
      while (bays.length > 1) dropBay(bays.pop()!);
      const from = bays[0];
      // the page being left holds its place from now (the page about to replace it has its own scroll): the camera
      // stays where that page's scroll had it until it sets off
      from.page = undefined;
      from.cards = undefined;
      const sg = await signFor(next.key, next.layout);
      if (destroyed) return [1, 1];
      renderer.initTexture(sg.texture);
      renderer.initTexture(sg.glow);
      while (bays.length > 1) dropBay(bays.pop()!);
      const b = makeBay(next.key, sg, next.look ?? {}, from.col + toward, next, true);
      b.at = Math.max(0, next.page?.().at ?? 0);
      b.end = next.page?.().end ?? 0;
      bays.push(b);
      placeBay(b);
      rescale(MOVE_SCALE);
      // its materials are the first bay's programs (compiled for drawing into a target, as they do): this only
      // links them
      const was = renderer.getRenderTarget();
      renderer.setRenderTarget(bufA);
      const linking = renderer.compileAsync(scene, camera);
      renderer.setRenderTarget(was);
      await linking;
      // one screen of camera travel moves a neon on its face plane a little further across the screen than the wall
      return [CAM_Z / (CAM_Z - from.view.face), CAM_Z / (CAM_Z - b.view.face)];
    },
    travel(t0, ms) {
      if (bays.length < 2 || destroyed) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = travel.done;
        travel.from = bays[0];
        travel.to = bays[1];
        travel.t0 = t0;
        travel.ms = Math.max(1, ms);
        // two bays at once, through the blur: the haze's soft layers are drawn with fewer steps meanwhile
        atmos.setDetail(SOFT_DETAIL);
        travel.u = travel.e = 0;
        travel.done = () => {
          done?.();
          resolve();
        };
      });
    },
    settle() {
      travelHold = undefined;
      if (travel.from && travel.to) arrive();
    },
    holdTravel(u) {
      travelHold = u;
    },
    stats: () => ({ fps: Math.round(fps), ms: Math.round(ms * 10) / 10, resolution, level, dpr: Math.round(dpr * 100) / 100, time, beams: beamCount, rate, stage, draws, late: lateDraws, timed: Math.round(timedCost * 10) / 10, parts, completed, presented, behind: behindAll, whole: Math.max(0, Math.round(wholeUntil - performance.now())) }),
  };

  if (opts.debug) {
    (window as unknown as { __laserRoom: unknown }).__laserRoom = {
      ...handle,
      U, wallU, floorU, dustU, beamU, atmos, lasers, bloom, grade, motion, renderer, camera, viewCam, scene, composer, THREE, bays, travel,
      bins: () => ({ x: binsX, y: binsY, data: binData }),
      present,
      frameShown,
      drawWorld,
      viewStep,
      worldStep,
      keepParts(on = true) {
        keepParts = on;
        wholeUntil = 0;
      },
      drive: () => ({ speed, slosh, whip, rush }),
      seek,
      render,
      /** hold the resolution at `r`, whatever the frame rate (for judging frames); auto() hands it back */
      sharp(r = 1) {
        pinned = true;
        atmos.setDetail(1);
        resolution = r;
        applyResolution(container.clientWidth, container.clientHeight);
        render();
      },
      auto(from = 0) {
        pinned = false;
        calm = 0;
        wait = 24;
        best = from;
        setStage(from, false);
      },
      /** hold the pace at one stage (see PACE), whatever the frame rate; auto() hands it back */
      pace(at: number) {
        pinned = true;
        setStage(at, false);
      },
      /** time a few frames now, as at the start of a visit (auto() first: a pinned room keeps its stage) */
      timeFrames,
      measure(n = 20) {
        // GPU time for n frames, forced with a readPixels each frame
        const px = new Uint8Array(4);
        const gl = renderer.getContext();
        const t0 = performance.now();
        for (let i = 0; i < n; i++) {
          render();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        }
        return (performance.now() - t0) / n;
      },
    };
  }

  if (still) {
    seek(INTRO.lasers + 12);
    onStart();
  } else {
    raf = requestAnimationFrame((t) => {
      last = fpsT0 = t;
      onStart();
      tick(t);
    });
  }

  return handle;
}

export type { LookName, Vec3 };
