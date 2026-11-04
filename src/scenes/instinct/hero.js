import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { buildWordmarkSDF } from './wordmark.js';
import { buildStencil } from './stencil.js';
import { NFF, FS_VERT, BAKE_FRAG, GLOW_FRAG, WALL_VERT, WALL_FRAG, GRADE_FRAG, OCC_FRAG, HAZE_FRAG, FFMAP_VERT, FFMAP_FRAG } from './shaders.js';
import { Vines, LAYOUTS } from './vines.js';
import { Flicker, Fireflies, Dust, GodRaysPass } from './fx.js';

// The Instinct Groove wall from the INSTINCT 2 lab hero (lab/hero-3d), ported for the case study. Same wall, carved and
// backlit wordmark, spray-painted octopus, ivy, fireflies, haze, god rays and grade (the lab's Tier 2 pipeline). What
// changed: the wordmark can sit on a page element instead of the centre of the frame (`anchor`), the ivy layout is
// chosen per use (`layout`), the instance can be torn down (`destroy`), and frames can be baked for still plates (`bake`).
// The lab's page-scroll camera, fling pipeline, capture, profiling and A/B flags stayed in the lab.

// Intro timeline (seconds): black, the sign strikes and lights the room by itself (Flicker boot, ~0.7-3.4 s),
// then the room's own fill light, haze and fireflies come up and the camera settles back (dolly ends at `settled`).
// Every ramp ends with zero slope and zero acceleration (smootherstep / cubic), so nothing visibly lands.
export const INTRO = { strike: .7, caught: 2.8, roomStart: 2.9, roomEnd: 6.8, reveal: 5.4, settled: 6.4, calm: 7.6 };
const CAM_Z = 16, BAKE_W = 4096;
const MAX_PIXELS = 5.5e6;   // a taller wall gives up some sharpness rather than frames
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const smoother = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * t * (t * (t * 6 - 15) + 10); };
// idle frame-rate steps (ms between frames) after `calm`: the display's own rate, then 60, 40 and 30 fps, ~0.8 s apart,
// so the cadence eases down instead of halving at once
const IDLE_STEPS = [[1500, 0], [2300, 1000 / 60], [3100, 1000 / 40], [Infinity, 1000 / 30]];

/**
 * Mounts the wall into `container` (any positioned element; the canvas fills it).
 * assets: base URL of the scene's textures and SVGs.
 * layout: the ivy, 'poster' (the lab's centred composition) or 'case' (the wordmark on the left, the ivy taking the right).
 * frameHeight: () => px: how tall the composition is framed for, when the container is taller. The camera pulls back so the
 *   wall keeps its scale and the extra height shows more wall; the ivy, fireflies and dust spread across all of it.
 * anchor: () => ({ x, y, w, h }) in container px: where the wordmark should land once the camera has settled, so it
 *   lines up with the page around it. Without it the wordmark is centred, `focusY` down the frame.
 * onStart: called with the first frame, when the intro timeline starts. onSettled: called once the intro has settled.
 * pointerTarget: element whose pointer movement drives the camera parallax (defaults to the container).
 * bake: no loop; the returned `bakeFrame()` renders one frame on demand (for still plates).
 * carve: false leaves the letters out of the wall (everything else is still placed around them), for a still that the
 *   page letters itself.
 * signal: an AbortSignal; aborting before the assets arrive stops the build.
 */
export async function createHero(container, { assets = '/assets/instinct/scene/', layout: ivyLayout = 'poster', anchor = null, frameHeight = null,
  focusY = () => .485, onStart = () => {}, onSettled = () => {}, pointerTarget = null, bake = false, carve = true, signal = null } = {}) {
  const assetUrl = (name) => `${assets}${name}`;
  const aborted = () => !!signal?.aborted;

  // ------------------------------------------------------------------ assets
  const loader = new THREE.TextureLoader();
  const tex = (url, setup) => loader.loadAsync(url).then((t) => { setup(t); return t; });
  const [sdf, tDark, tLight, atlas, atlasMeta, octopus] = await Promise.all([
    buildWordmarkSDF(assetUrl('wordmark.svg')),
    tex(assetUrl('concrete-dark.webp'), (t) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8; }),
    tex(assetUrl('concrete-light.webp'), (t) => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8; }),
    tex(assetUrl('leaf-atlas.webp'), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }),
    fetch(assetUrl('leaf-atlas.json'), { signal }).then((r) => r.json()),
    buildStencil(assetUrl('octopus.svg')),
  ]);
  const textures = [sdf.texture, tDark, tLight, atlas, octopus.texture];
  if (aborted()) { textures.forEach((t) => t.dispose()); return null; }

  const canvas = document.createElement('canvas');
  canvas.className = 'instinct-scene-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: bake });
  const baseDpr = bake ? 1 : Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(baseDpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, 0, CAM_Z);

  // ------------------------------------------------------------------ shared uniforms
  // full-screen bakes and maps: nothing depth-tests into them, so no depth buffer
  const mipRT = (type) => new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const bakeRT = mipRT(THREE.HalfFloatType), glowRT = mipRT(THREE.HalfFloatType), shadowRT = mipRT(THREE.UnsignedByteType);
  const v2 = () => ({ value: new THREE.Vector2() }), v3 = (x = 0, y = 0, z = 0) => ({ value: new THREE.Vector3(x, y, z) });
  // the room's own light, scaled by the intro; the sign's glow is separate and lights the room from the start
  const ROOM = { amb: new THREE.Color(.008, .014, .01), key: new THREE.Color(.06, .08, .055), top: new THREE.Color(.34, .45, .3), haze: new THREE.Color(.0022, .0042, .0028) };
  // the lab's moodier room: fill and haze turned well down, the overhead fixture and the sign left as they are
  const MOOD = { fill: .3, haze: .3, lift: .35 };
  const U = {
    uTime: { value: 0 }, uPass: { value: 0 }, uPx: { value: 1 },
    uSdf: { value: sdf.texture }, uSdfMin: { value: new THREE.Vector2(...sdf.min) }, uSdfSize: { value: new THREE.Vector2(...sdf.size) },
    uWmCenter: v2(), uWmScale: { value: 1 }, uChipAmp: { value: 0 },
    uGlow: { value: 0 }, uBulb: v3(0, 0, 2), uGlowColor: { value: new THREE.Color(1, .94, .86) },
    uFF: { value: Array.from({ length: NFF }, () => new THREE.Vector4()) },
    uFFCol: { value: Array.from({ length: NFF }, () => new THREE.Color()) },
    uKeyDir: { value: new THREE.Vector3(-.55, .7, .45).normalize() }, uKeyCol: { value: ROOM.key.clone() },
    uTopPos: v3(), uTopCol: { value: ROOM.top.clone() }, uAmb: { value: ROOM.amb.clone() },
    uShadowShift: { value: new THREE.Vector2(.28, -.55) },
    tDark: { value: tDark }, tLight: { value: tLight }, uChipTex: { value: tLight },
    uDomMin: v2(), uDomSize: v2(),
    // the octopus spray-painted on the wall
    uOctTex: { value: octopus.texture }, uOctCenter: v2(), uOctSize: v2(), uOctColor: { value: new THREE.Color(.42, .62, .38) }, uOctOpacity: { value: .72 },
    // shared environment: letter glow as an area light, leaf shadow map, haze
    uGlowTex: { value: glowRT.texture }, uGlowRes: v2(), uGlowGain: { value: 1.25 },
    uShadow: { value: shadowRT.texture }, uHaze: { value: .075 }, uHazeCol: { value: ROOM.haze.clone() }, uFFHaze: { value: .0022 },
    uHazeInline: { value: 0 },
  };
  const screenRT = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const hazeRT = screenRT(), ffLightRT = screenRT(), ffDirRT = screenRT();

  // ------------------------------------------------------------------ wall
  const growthCanvas = document.createElement('canvas');
  const growthTex = new THREE.CanvasTexture(growthCanvas);
  const bakeQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { ...U, tGrowth: { value: growthTex } }, vertexShader: FS_VERT, fragmentShader: BAKE_FRAG }));

  const wallUniforms = {
    ...U, uBake: { value: bakeRT.texture }, uBakeTexel: v2(),
    uDepth: { value: .2 }, uFaceGain: { value: 1.4 }, uSideGain: { value: 1.4 },
    uBumpBig: { value: 9 }, uBumpFine: { value: .9 },
    uFFMap: { value: ffLightRT.texture }, uFFDir: { value: ffDirRT.texture }, uFFMapOn: { value: 1 },
  };
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: wallUniforms, vertexShader: WALL_VERT, fragmentShader: WALL_FRAG }));
  scene.add(wall);
  const glowQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { ...U, uFaceGain: wallUniforms.uFaceGain }, vertexShader: FS_VERT, fragmentShader: GLOW_FRAG }));

  const vines = new Vines(U, atlas, atlasMeta);
  scene.add(vines.group);
  const fireflies = new Fireflies(U);
  scene.add(fireflies.points);
  const dust = new Dust(U);
  scene.add(dust.points);
  const shadowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50);
  shadowCam.position.z = 10;
  shadowCam.layers.set(1);

  // firefly light map: every firefly splats its light onto the wall plane once per frame (rgb light / xyz direction)
  const ffMapMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uTexelWorld: { value: .04 }, uMode: { value: 0 } }, vertexShader: FFMAP_VERT, fragmentShader: FFMAP_FRAG,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    depthTest: false, depthWrite: false, transparent: true,
  });
  const ffMapPoints = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(NFF * 3), 3)), ffMapMat);
  ffMapPoints.frustumCulled = false;
  ffMapPoints.layers.set(1);
  const ffMapScene = new THREE.Scene().add(ffMapPoints);

  // reduced-res atmosphere: god-ray source from the glow map (+ leaves as occluders) and the haze integral
  const viewUniforms = { uInvViewProj: { value: new THREE.Matrix4() }, uEye: { value: new THREE.Vector3() } };
  const occQuad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { ...viewUniforms, uGlowTex: U.uGlowTex, uDomMin: U.uDomMin, uDomSize: U.uDomSize, uOccGain: { value: 1.35 } },
    vertexShader: FS_VERT, fragmentShader: OCC_FRAG,
  }));
  const hazeQuad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { ...U, ...viewUniforms, tOcc: { value: null } }, vertexShader: FS_VERT, fragmentShader: HAZE_FRAG }));

  // ------------------------------------------------------------------ post
  // Only the scene render benefits from MSAA (leaf edges); the ping-pong buffer just takes full-screen passes,
  // so it gets neither MSAA nor depth. sceneTarget is kept as the composer's read buffer at the start of every frame.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }));
  composer.renderTarget2.dispose();
  composer.renderTarget2 = composer.readBuffer = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const sceneTarget = composer.renderTarget2;
  composer.addPass(new RenderPass(scene, camera));
  const godrays = new GodRaysPass(false, () => {}, { shift: 2, taps: 64 });   // its source is drawn in renderAtmosphere()
  Object.assign(godrays.uniforms, { uDecay: { value: .952 }, uWeight: { value: .03 } });   // same ray length with fewer taps
  // the god-ray pass also composites the haze; uFF/uFFCol/uFFHaze are the shared live uniforms
  Object.assign(godrays.uniforms, { tHaze: { value: hazeRT.texture }, uHazeOn: { value: 1 }, uFF: U.uFF, uFFCol: U.uFFCol, uFFHaze: U.uFFHaze, ...viewUniforms });
  function renderAtmosphere() {
    viewUniforms.uInvViewProj.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
    viewUniforms.uEye.value.copy(camera.position);
    renderer.setRenderTarget(godrays.occ);
    occQuad.render(renderer);
    vines.useOcclusionMaterials(true); camera.layers.set(1);
    const autoClear = renderer.autoClear; renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = autoClear;
    camera.layers.set(0); vines.useOcclusionMaterials(false);
    hazeQuad.material.uniforms.tOcc.value = godrays.occ.texture;
    renderer.setRenderTarget(hazeRT);
    hazeQuad.render(renderer);
  }
  function renderFireflyMap() {
    const m = ffMapMat.uniforms.uMode;
    renderer.setClearColor(0x000000, 0);
    m.value = 0; renderer.setRenderTarget(ffLightRT); renderer.render(ffMapScene, shadowCam);
    m.value = 1; renderer.setRenderTarget(ffDirRT); renderer.render(ffMapScene, shadowCam);
    renderer.setClearColor(0x000000, 1);
  }
  composer.addPass(godrays);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .46, .65, .9);   // threshold high enough to leave the letter faces readable
  for (const rt of [...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical, bloom.renderTargetBright]) rt.depthBuffer = false;
  composer.addPass(bloom);
  const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uCA: { value: 1 }, uVignette: { value: 1 }, uGrain: { value: .03 }, uLift: { value: 0 }, uLiftCol: v3(.0025 * MOOD.lift, .008 * MOOD.lift, .004 * MOOD.lift), uRes: v2() }, vertexShader: FS_VERT, fragmentShader: GRADE_FRAG });
  composer.addPass(grade);   // last pass: also does ACES tone mapping + sRGB (what OutputPass did), saving a full-screen pass

  // ------------------------------------------------------------------ layout
  const view = { halfW: 1, halfH: 1, wpp: 1, wm: { x: 0, y: 0, w: 1, h: 1 } };
  let camZ = CAM_Z;
  // Where a point of the container lands on the wall (z = 0) for the settled camera looking at `lookY`.
  const settledCam = camera.clone(), ray = new THREE.Vector3();
  const onWall = (sx, sy, w, h, lookY) => {
    settledCam.copy(camera); settledCam.position.set(0, 0, camZ); settledCam.lookAt(0, lookY, 0); settledCam.updateMatrixWorld();
    ray.set(sx / w * 2 - 1, 1 - sy / h * 2, .5).unproject(settledCam).sub(settledCam.position).normalize();
    const t = -settledCam.position.z / ray.z;
    return { x: settledCam.position.x + ray.x * t, y: settledCam.position.y + ray.y * t };
  };
  function layout() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    const dpr = bake ? baseDpr : Math.min(baseDpr, Math.sqrt(MAX_PIXELS / (w * h)));
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = 30;
    camera.updateProjectionMatrix();
    const frameH = frameHeight?.() || h, stretch = Math.max(1, h / frameH);
    camZ = CAM_Z * stretch;
    const halfH = camZ * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), halfW = halfH * camera.aspect;
    const frameHalfH = halfH / stretch;   // what the composition is proportioned to, however far the wall carries on
    let wm;
    const slot = anchor?.();
    if (slot?.w > 0) {
      // the camera looks at half the wordmark's height, so its height and the settled view depend on each other:
      // a few rounds settle it to well under a pixel
      let c = { x: 0, y: 0 };
      for (let i = 0; i < 4; i++) c = onWall(slot.x + slot.w / 2, slot.y + slot.h / 2, w, h, c.y * .5);
      const l = onWall(slot.x, slot.y + slot.h / 2, w, h, c.y * .5), r = onWall(slot.x + slot.w, slot.y + slot.h / 2, w, h, c.y * .5);
      wm = { x: c.x, y: c.y, w: r.x - l.x };
    } else {
      wm = { x: 0, y: halfH * (1 - 2 * focusY()), w: Math.min(halfW * 2 * .62, halfH * 2 * 1.35) };
    }
    const wmScale = wm.w / sdf.aspect;
    Object.assign(view, { halfW, halfH, w, h, wpp: 2 * halfH / h, wm: { ...wm, h: wmScale } });
    U.uPx.value = h * dpr / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    U.uWmScale.value = wmScale;
    U.uWmCenter.value.set(wm.x, carve ? wm.y : 1e4);
    U.uChipAmp.value = .028 * wmScale;
    // the octopus: a mural above and behind the sign. Its eyes (39% down the artwork) sit just above the letters,
    // the raised arms reach toward the top of the wall and the lower tentacles pass behind the sign. A sign low in the
    // frame (the case layout) would stretch it past the frame, so it keeps the poster's proportion (~.85 of the frame)
    // and its arms stop short of the top instead.
    const octEyes = wm.y + wmScale * 1.15, octH = Math.min(frameHalfH * 1.7, Math.max(2.5, (halfH * .97 - octEyes) / .39));
    U.uOctCenter.value.set(wm.x, octEyes + octH * .39 - octH / 2);
    U.uOctSize.value.set(octH * octopus.padScale[0], octH * octopus.padScale[1]);
    wallUniforms.uDepth.value = .2 * wmScale;
    // the overhead fixture hangs just right of the sign (as in the lab); on the case layout it moves in a little further,
    // so it also reaches the ivy on the right
    U.uTopPos.value.set(wm.x + halfW * (ivyLayout === 'case' ? .3 : .12), halfH + frameHalfH * .35, 4.5);
    grade.uniforms.uRes.value.set(w * dpr, h * dpr);

    // static wall maps cover the view plus parallax margin
    const dom = { x: halfW * 2.5, y: halfH * 2.5 };
    const ground = { y0: -dom.y / 2, y1: -dom.y / 2 + dom.y * .3 };   // damp band at the foot of the wall, fixed in world space
    U.uDomMin.value.set(-dom.x / 2, -dom.y / 2);
    U.uDomSize.value.set(dom.x, dom.y);
    wall.scale.set(dom.x, dom.y, 1);
    wall.position.y = 0;
    const bw = BAKE_W, bh = Math.round(bw * dom.y / dom.x);
    bakeRT.setSize(bw, bh);
    wallUniforms.uBakeTexel.value.set(1 / bw, 1 / bh);
    shadowRT.setSize(2048, Math.round(2048 * dom.y / dom.x));
    glowRT.setSize(1024, Math.round(1024 * dom.y / dom.x));
    ffLightRT.setSize(512, Math.round(512 * dom.y / dom.x)); ffDirRT.setSize(512, Math.round(512 * dom.y / dom.x));
    ffMapMat.uniforms.uTexelWorld.value = dom.x / 512;
    hazeRT.setSize(Math.max(1, (w * dpr) >> 2), Math.max(1, (h * dpr) >> 2));
    U.uGlowRes.value.set(glowRT.width, glowRT.height);
    Object.assign(shadowCam, { left: -dom.x / 2, right: dom.x / 2, top: dom.y / 2, bottom: -dom.y / 2 });
    shadowCam.updateProjectionMatrix();

    vines.build(halfW, halfH, view.wm, { strands: LAYOUTS[ivyLayout] });
    growthCanvas.width = 1024; growthCanvas.height = Math.round(1024 * dom.y / dom.x);
    vines.drawGrowth(growthCanvas, U.uDomMin.value, U.uDomSize.value, ground);
    growthTex.needsUpdate = true;
    renderer.setRenderTarget(bakeRT);
    bakeQuad.render(renderer);
    renderer.setRenderTarget(null);

    fireflies.layout(halfW, halfH, view.wm);
    dust.layout(halfW, halfH);
  }

  // ------------------------------------------------------------------ input (camera parallax only)
  const pointer = { active: false, nx: 0, ny: 0 };
  const idlePointer = { active: false };
  let lastMove = -1e9, livelyAt = 0;
  const onMove = (e) => {
    lastMove = performance.now();
    const r = container.getBoundingClientRect();
    pointer.nx = (e.clientX - r.left) / r.width * 2 - 1;
    pointer.ny = -((e.clientY - r.top) / r.height * 2 - 1);
    pointer.active = true;
  };
  const onLeave = () => { pointer.active = false; };

  // ------------------------------------------------------------------ mounting, visibility
  let visible = true, resizeTimer = 0, raf = 0, destroyed = false;
  const resizer = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  const watcher = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; });
  const pointerEl = pointerTarget || container;
  container.append(canvas);
  if (!bake) {
    resizer.observe(container); watcher.observe(container);
    pointerEl.addEventListener('pointermove', onMove); pointerEl.addEventListener('pointerleave', onLeave);
  }
  layout();

  // ------------------------------------------------------------------ loop
  const flicker = new Flicker();
  let time = 0, last = performance.now(), settled = false, steadyGlow = null;
  const camTarget = new THREE.Vector2(), camBase = new THREE.Vector2(), bulbScreen = new THREE.Vector3();

  function step(dt) {
    time += dt;
    U.uTime.value = time;

    // the sign: a lamp behind the wall that flickers and swings slowly on its cord
    const glow = steadyGlow ?? flicker.update(dt, time);
    U.uGlow.value = glow;
    const wm = view.wm;
    U.uBulb.value.set(wm.x + Math.sin(time * .31) * wm.w * .3 + Math.sin(time * .83) * .12, wm.y + .12 * Math.sin(time * .47), wm.w * .3);

    // the room's own light comes up once the sign has caught
    const room = smoother(INTRO.roomStart, INTRO.roomEnd, time);
    U.uAmb.value.copy(ROOM.amb).multiplyScalar(room * MOOD.fill);
    U.uKeyCol.value.copy(ROOM.key).multiplyScalar(room * MOOD.fill);
    U.uTopCol.value.copy(ROOM.top).multiplyScalar(room);
    U.uHazeCol.value.copy(ROOM.haze).multiplyScalar(room * MOOD.haze);
    grade.uniforms.uLift.value = smooth(.6, 3.5, time);
    if (!settled && time >= INTRO.reveal) { settled = true; onSettled(); }

    // camera: slow settle-in, idle drift, pointer parallax
    const dolly = 1 - Math.pow(1 - Math.min(1, time / INTRO.settled), 3);
    camTarget.set(pointer.active ? pointer.nx * .7 : 0, pointer.active ? pointer.ny * .4 : 0);
    const ease = 1 - Math.exp(-dt * 2.14);   // time-based, so the camera feels the same at 30 and 60 fps
    camBase.x += (camTarget.x + Math.sin(time * .13) * .15 - camBase.x) * ease;
    camBase.y += (camTarget.y + Math.sin(time * .17) * .08 - camBase.y) * ease;
    camera.position.set(camBase.x, camBase.y, camZ - 1.4 * (1 - dolly));
    camera.lookAt(0, wm.y * .5, 0);
    camera.updateMatrixWorld();

    // pointer pushing vines/fireflies is switched off, as in the lab; the cursor only moves the camera
    vines.update(dt, time, idlePointer);
    fireflies.update(time, idlePointer, room, 0, dt);
    return glow;
  }

  function render(dt, glow) {
    // emission of the letter openings, mipmapped: the light every surface and the haze read from
    renderer.setRenderTarget(glowRT);
    glowQuad.render(renderer);

    // leaf shadows projected onto the wall
    vines.useShadowMaterials(true);
    renderer.setRenderTarget(shadowRT);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, shadowCam);
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(null);
    vines.useShadowMaterials(false);
    renderFireflyMap();
    renderAtmosphere();

    bulbScreen.set(U.uBulb.value.x, U.uBulb.value.y, -wallUniforms.uDepth.value - U.uBulb.value.z).project(camera);
    godrays.uniforms.uLightUV.value.set(bulbScreen.x * .5 + .5, bulbScreen.y * .5 + .5);
    godrays.uniforms.uTime.value = time;
    godrays.uniforms.uExposure.value = .1 * glow;
    grade.uniforms.uTime.value = time;
    composer.render(dt);
    if (composer.readBuffer !== sceneTarget) composer.swapBuffers();
  }

  function tick(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) { last = now; return; }
    // full rate through the intro and while the cursor moves the camera; once that has been quiet a while the rate
    // steps down to ~30 fps (the motion is slow), a step at a time
    if (time < INTRO.calm || now - lastMove < 1200) livelyAt = now;
    const cap = IDLE_STEPS.find(([until]) => now - livelyAt < until)[1];
    if (cap && now - last < cap - 3) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    render(dt, step(dt));
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    resizer.disconnect(); watcher.disconnect();
    pointerEl.removeEventListener('pointermove', onMove); pointerEl.removeEventListener('pointerleave', onLeave);
    vines.dispose();
    scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    for (const q of [bakeQuad, glowQuad, occQuad, hazeQuad]) { q.material.dispose(); q.dispose(); }
    for (const m of [vines.leafMat, vines.leafShadowMat, vines.stemMat, vines.stemShadowMat, vines.leafOccMat, vines.stemOccMat, ffMapMat]) m.dispose();
    for (const rt of [bakeRT, glowRT, shadowRT, hazeRT, ffLightRT, ffDirRT, godrays.occ]) rt.dispose();
    godrays.quad.material.dispose(); godrays.quad.dispose();
    bloom.dispose(); grade.dispose(); composer.dispose();
    [...textures, growthTex].forEach((t) => t.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  // compile the scene's shaders off the main thread (KHR_parallel_shader_compile) while the frame is still black
  await renderer.compileAsync(scene, camera);
  if (aborted()) { destroy(); return null; }
  signal?.addEventListener('abort', destroy, { once: true });
  if (!bake) raf = requestAnimationFrame((t) => { last = t; onStart(); tick(t); });

  return {
    canvas, destroy, view,
    get time() { return time; },
    // re-measure and rebuild, e.g. once the page's fonts have moved the anchor
    relayout: layout,
    // jump past the intro (e.g. the visitor arrives with the page already scrolled)
    skipIntro() { if (time < INTRO.roomEnd) time = INTRO.roomEnd; },
    // bake mode: run the scene forward to `at` seconds in fixed steps (so the ivy has settled), hold the sign at `glow`
    // (0 = off, 1 = fully lit) and draw one frame into the canvas
    bakeFrame({ at = 14, glow = 1, fps = 60 } = {}) {
      const dt = 1 / fps;
      steadyGlow = glow;
      while (time < at - dt / 2) step(dt);
      U.uGlow.value = glow;   // a second plate of the same moment only changes the sign
      render(dt, glow);
      return canvas;
    },
  };
}
