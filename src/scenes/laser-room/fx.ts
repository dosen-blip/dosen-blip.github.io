import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/addons/postprocessing/Pass.js";
import { ATMOS_FRAG, FS_VERT, LASER_FRAG, RAYS_FRAG, SMOKE_FRAG } from "./shaders";

const hash = (x: number) => {
  const s = Math.sin(x * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * The sign's power. Boot: dead, a run of failed strikes, then it catches (at `ignite`). After that a steady hum
 * with the odd dip. Adapted from the OFF GRID hero, without its blackouts: here the lasers carry the movement.
 */
export class Power {
  value = 0;
  private dip: { start: number; dur: number } | null = null;
  private next = 14 + Math.random() * 6;

  /** `restless`: a tube that never quite settles, dipping every couple of seconds (the page that isn't there) */
  constructor(
    private readonly strike: number,
    private readonly ignite: number,
    readonly restless = false,
  ) {
    if (restless) this.next = 1.5 + Math.random() * 2;
  }

  update(dt: number, t: number) {
    let v =
      0.95 + 0.03 * Math.sin(t * 2.1) * Math.sin(t * 0.67) + 0.02 * (hash(Math.floor(t * 24)) - 0.5);
    if (t < this.ignite) {
      if (t < this.strike) v = 0;
      else {
        const slot = Math.floor(t * 11);
        const on = hash(slot) > (t < this.ignite - 0.6 ? 0.74 : 0.45);
        v = on ? 0.3 + 0.6 * hash(slot * 3.1) : 0.015;
      }
    } else {
      v *= Math.min(1, (t - this.ignite) / 0.18 + 0.55);
      if (!this.dip && t > this.next) this.dip = { start: t, dur: 0.3 + Math.random() * 0.4 };
      if (this.dip) {
        const p = (t - this.dip.start) / this.dip.dur;
        if (p >= 1) {
          this.dip = null;
          this.next = t + (this.restless ? 1.2 + Math.random() * 2.4 : 9 + Math.random() * 9);
        } else v *= 1 - (this.restless ? 0.6 : 0.35) * Math.sin(Math.PI * p);
      }
    }
    this.value += (v - this.value) * Math.min(1, dt * 50);
    return this.value;
  }
}

/** The sign flaring: on ignition, and when clicked. */
export class Flare {
  private lastAt = -100;
  private lastAmp = 0;

  fire(t: number, amp = 1) {
    this.lastAt = t;
    this.lastAmp = amp;
  }

  flare(t: number) {
    const age = t - this.lastAt;
    return age < 0 ? 0 : Math.exp(-age * 3.5) * this.lastAmp;
  }
}

/**
 * Smoke and god rays. Both are soft and dear by the pixel (a raymarch, a many-tap blur), so each is drawn into a
 * small target of its own, and one full-screen pass lays them over the scene.
 */
export class AtmospherePass extends Pass {
  readonly occ: THREE.WebGLRenderTarget;
  readonly smoke: THREE.WebGLRenderTarget;
  readonly rays: THREE.WebGLRenderTarget;
  /** shared by the materials, so a uniform relinked here reaches all of them */
  readonly uniforms: Record<string, THREE.IUniform>;
  private readonly quad: FullScreenQuad;
  private readonly smokeQuad: FullScreenQuad;
  private readonly raysQuad: FullScreenQuad;
  /** smoke resolution: 0 = full, 1 = half, 2 = a quarter (each way); the rays are at least halved */
  private readonly smokeShift: number;
  /** whether any of the sign is on the screen: with none of it there, there are no rays to draw (set by the scene) */
  signInView = true;
  private readonly full: { steps: number; taps: number };

  constructor({
    taps,
    hazeCount,
    steps,
    noise,
    smokeShift = 0,
  }: {
    taps: number;
    hazeCount: number;
    steps: number;
    noise: THREE.Data3DTexture;
    smokeShift?: number;
  }) {
    super();
    this.smokeShift = smokeShift;
    this.full = { steps, taps };
    const target = () =>
      new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.occ = target();
    this.smoke = target();
    this.rays = target();
    this.uniforms = {
      tDiffuse: { value: null },
      tOcc: { value: this.occ.texture },
      tSmoke: { value: this.smoke.texture },
      tRays: { value: this.rays.texture },
      uSmokeTexel: { value: new THREE.Vector2() },
      uLightA: { value: new THREE.Vector2(0.4, 0.5) },
      uLightB: { value: new THREE.Vector2(0.6, 0.5) },
      uDensity: { value: 0.5 },
      uWeight: { value: 0.005 },
      uDecay: { value: 0.968 },
      uRays: { value: 0 },
      uRayCol: { value: new THREE.Color(1, 0.3, 0.7) },
      uTime: { value: 0 },
      uNoise: { value: noise },
      uSmoke: { value: 1 },
      uSmokeLight: { value: 3.2 },
      uSigma: { value: 0.42 },
      uLight: { value: 0 },
      uLightCol: { value: new THREE.Color() },
      uHazeL: { value: Array.from({ length: hazeCount }, () => new THREE.Vector4()) },
      uEye: { value: new THREE.Vector3() },
      uInvViewProj: { value: new THREE.Matrix4() },
      uFloorY: { value: -2 },
      uFog: { value: 0 },
      uFogH: { value: 0.45 },
      uFogCover: { value: 0.06 },
      uFogAmb: { value: new THREE.Color() },
      uFogSigma: { value: 1.6 },
      uSteps: { value: steps },
      uTaps: { value: taps },
    };
    this.quad = new FullScreenQuad(
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: FS_VERT, fragmentShader: ATMOS_FRAG }),
    );
    this.raysQuad = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: FS_VERT,
        fragmentShader: RAYS_FRAG,
        defines: { TAPS: taps },
      }),
    );
    this.smokeQuad = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: FS_VERT,
        fragmentShader: SMOKE_FRAG,
        defines: { NHAZE: hazeCount, STEPS: steps, VOL_Z: "7.0" },
      }),
    );
  }

  setSize(w: number, h: number) {
    this.occ.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
    const sw = Math.max(1, w >> this.smokeShift);
    const sh = Math.max(1, h >> this.smokeShift);
    this.smoke.setSize(sw, sh);
    const raysShift = Math.max(1, this.smokeShift);
    this.rays.setSize(Math.max(1, w >> raysShift), Math.max(1, h >> raysShift));
    // the soft upsample only matters when the smoke is drawn smaller than the screen
    (this.uniforms.uSmokeTexel.value as THREE.Vector2).set(
      this.smokeShift ? 1 / sw : 0,
      this.smokeShift ? 1 / sh : 0,
    );
  }

  /**
   * How finely the soft layers are sampled, 0..1 of the tier's own: the smoke's steps and the rays' taps. Both are
   * drawn small and blurred, so they are the first thing to give when the frame rate asks.
   */
  setDetail(share: number) {
    this.uniforms.uSteps.value = Math.max(8, Math.round(this.full.steps * share));
    this.uniforms.uTaps.value = Math.max(8, Math.round(this.full.taps * share));
  }

  /**
   * The rows of the screen this draws (full-size pixels from the bottom, as the GPU counts them), or the whole of it.
   * A frame of the room can be drawn a band at a time over a few of the screen's frames (see scene.ts drawWorld):
   * the smoke is drawn for the band and a couple of its own pixels either side (the composite blurs it by one), the
   * rays only with the first band (they are a blur across the whole screen, drawn small), the composite for the band.
   */
  band: { y0: number; y1: number; first: boolean } | null = null;

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    const band = this.band;
    if (band) {
      const k = 1 << this.smokeShift;
      const y0 = Math.max(0, Math.floor(band.y0 / k) - 2);
      const y1 = Math.min(this.smoke.height, Math.ceil(band.y1 / k) + 2);
      this.smoke.scissor.set(0, y0, this.smoke.width, y1 - y0);
      this.smoke.scissorTest = true;
    }
    renderer.setRenderTarget(this.smoke);
    this.smokeQuad.render(renderer);
    this.smoke.scissorTest = false;
    // the rays are a blur of the sign's own light on the screen: with the sign off it (down the page, looking at
    // the floor) or dark, there is nothing to blur, and what the target still holds is left out of the composite
    const rays = this.uniforms.uRays.value as number;
    if (this.signInView && rays > 0) {
      if (!band || band.first) {
        renderer.setRenderTarget(this.rays);
        this.raysQuad.render(renderer);
      }
    } else this.uniforms.uRays.value = 0;
    this.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
    this.uniforms.uRays.value = rays;
  }

  /** every program this pass draws with, to be compiled ahead of the first frame */
  materials(): THREE.Material[] {
    return [this.quad, this.smokeQuad, this.raysQuad].map((q) => q.material as THREE.Material);
  }

  dispose() {
    this.occ.dispose();
    this.smoke.dispose();
    this.rays.dispose();
    for (const q of [this.quad, this.smokeQuad, this.raysQuad]) {
      (q.material as THREE.Material).dispose();
      q.dispose();
    }
  }
}

/** The lasers, added over the scene at full resolution (see LASER_FRAG). */
export class LaserPass extends Pass {
  readonly uniforms: Record<string, THREE.IUniform>;
  private readonly quad: FullScreenQuad;

  constructor({ maxBeams, maxSheets, maxCards, noise, surface }: { maxBeams: number; maxSheets: number; maxCards: number; noise: THREE.Data3DTexture; surface: THREE.Texture }) {
    super();
    this.uniforms = {
      tDiffuse: { value: null },
      uNoise: { value: noise },
      uSurface: { value: surface },
      uTile: { value: 5.5 },
      uInvViewProj: { value: new THREE.Matrix4() },
      uEye: { value: new THREE.Vector3() },
      uFloorY: { value: -2 },
      uTime: { value: 0 },
      uPixAngle: { value: 0.001 },
      uGain: { value: 1 },
      uHaze: { value: 0.8 },
      uReflect: { value: 1 },
      uWidth: { value: 0.012 },
      uHalo: { value: 0.012 },
      uSpot: { value: 1 },
      uBeamCount: { value: 0 },
      uReflectCount: { value: 0 },
      uSpotA: { value: 0 },
      uSpotB: { value: 0 },
      uBeamO: { value: Array.from({ length: maxBeams }, () => new THREE.Vector4()) },
      uBeamD: { value: Array.from({ length: maxBeams }, () => new THREE.Vector4()) },
      uBeamC: { value: Array.from({ length: maxBeams }, () => new THREE.Vector4()) },
      uFog: { value: 0 },
      uFogH: { value: 0.45 },
      uFogBeam: { value: 1.6 },
      uSheetGain: { value: 0.9 },
      tSmoke: { value: null },
      uSheetCount: { value: 0 },
      uSheetO: { value: Array.from({ length: maxSheets }, () => new THREE.Vector4()) },
      uSheetN: { value: Array.from({ length: maxSheets }, () => new THREE.Vector4()) },
      uSheetU: { value: Array.from({ length: maxSheets }, () => new THREE.Vector4()) },
      uSheetC: { value: Array.from({ length: maxSheets }, () => new THREE.Vector3()) },
      uCardCount: { value: 0 },
      uCardA: { value: Array.from({ length: maxCards }, () => new THREE.Vector4()) },
      uCardB: { value: Array.from({ length: maxCards }, () => new THREE.Vector4()) },
      uCardFog: { value: 0.35 },
      uBins: { value: null },
      uBinShift: { value: 6 },
    };
    this.quad = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: FS_VERT,
        fragmentShader: LASER_FRAG,
        defines: { MAXB: maxBeams, MAXSHEETS: maxSheets, MAXCARDS: maxCards },
      }),
    );
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  materials(): THREE.Material[] {
    return [this.quad.material as THREE.Material];
  }

  dispose() {
    (this.quad.material as THREE.Material).dispose();
    this.quad.dispose();
  }
}
