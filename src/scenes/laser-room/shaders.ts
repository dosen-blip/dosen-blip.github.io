// GLSL for the laser room hero. Adapted from the City Gridwrks OFF GRID hero (~/CITY:GRID/src/scenes/offgrid),
// which follows the Instinct wall: the sign is the room's only steady light, and everything else (the wall, the
// wet floor, the haze, the dust) is lit by it. The lasers are the second light: thin beams that only show where
// there is haze for them to scatter in.
//
// World: the wall is the plane z = 0, the floor is y = uFloorY (running towards the camera, +z), and the sign
// hangs a little off the wall at z = uLogoZ. One world unit is about a metre and a half.

/** Shared helpers: hashing, value noise, fbm. */
export const COMMON = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= .5; } return s; }
`

/**
 * The sign as a light. Far away it is a set of virtual point lights placed on the tubes (uVpl: xyz, share of the
 * power); close up, a blurred copy of the sign (uGlowTex, mipmapped) adds the letter-shaped halo on the wall.
 */
export const SIGN_LIGHT = /* glsl */ `
uniform vec4 uVpl[NVPL];
uniform float uLight;          // the sign's output right now (intro x flicker x flare)
uniform vec3 uLightCol;
uniform sampler2D uGlowTex;
uniform vec2 uGlowCenter, uGlowSize;   // the glow texture's rectangle on the wall plane
uniform vec2 uLogoC, uLogoHalf;
uniform float uLogoZ;

void signLight(vec3 p, vec3 n, vec3 V, float rough, out vec3 diff, out vec3 spec){
  float d = 0., s = 0.;
  float shin = mix(220., 8., rough);
  for (int i = 0; i < NVPL; i++){
    vec3 L = uVpl[i].xyz - p;
    float d2 = dot(L, L);
    vec3 l = L * inversesqrt(d2);
    float ndl = max(dot(n, l), 0.);
    float f = uVpl[i].w / (d2 + .28);          // softened inverse square: each light stands for a patch of tube
    d += ndl * f;
    vec3 h = normalize(l + V);
    s += pow(max(dot(n, h), 0.), shin) * ndl * f * (shin + 8.) * .04;
  }
  diff = uLightCol * d * uLight;
  spec = uLightCol * s * uLight;
}

vec2 glowUv(vec2 xy){ return (xy - uGlowCenter) / uGlowSize + .5; }
float glowAt(vec2 uv, float lod){
  if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) return 0.;
  // a blurred level still has light at the texture's border: ease it out, or the border shows as a straight edge
  vec2 edge = smoothstep(vec2(0.), vec2(.07), min(uv, 1. - uv));
  return textureLod(uGlowTex, uv, lod).r * edge.x * edge.y;
}
// sign-shaped light thrown back onto the wall: a few blur levels summed into a long, smooth falloff
float haloAt(vec2 xy){
  vec2 uv = glowUv(xy);
  return glowAt(uv, 2.5) * .35 + glowAt(uv, 4.) * .55 + glowAt(uv, 5.5) * .8 + glowAt(uv, 7.) * 1.1;
}
`

export const SURFACE_VERT = /* glsl */ `
varying vec3 vPos;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

/** Dark concrete, lit by the sign and by a faint room light that comes up after the intro. */
export const WALL_FRAG = /* glsl */ `
${COMMON}
${SIGN_LIGHT}
uniform sampler2D uAlbedo, uSurface;
uniform float uTile, uRoom, uHalo, uFloorY, uAlbedoScale;
uniform vec3 uEye, uAmb;
varying vec3 vPos;

void main(){
  vec2 uv = vPos.xy / uTile;
  vec3 A = texture(uAlbedo, uv).rgb * uAlbedoScale;
  vec3 S = texture(uSurface, uv).rgb;
  vec2 nxy = (S.rg * 2. - 1.) * 1.1;
  float rough = S.b;
  vec3 n = normalize(vec3(nxy, sqrt(max(.05, 1. - dot(nxy, nxy)))));
  vec3 V = normalize(uEye - vPos);

  vec3 diff, spec;
  signLight(vPos, n, V, rough, diff, spec);
  diff += uLightCol * haloAt(vPos.xy) * uHalo * uLight * (.55 + .45 * n.z);
  vec3 amb = uAmb * uRoom * (.35 + .65 * smoothstep(uFloorY, uFloorY + 7., vPos.y)) * (.6 + .4 * n.y);
  vec3 col = A * (diff + amb) + spec * (1. - rough) * .4;


  col *= mix(.35, 1., smoothstep(0., .9, vPos.y - uFloorY));             // contact shadow at the floor
  gl_FragColor = vec4(col, 1.);
}
`

/**
 * Worn concrete, wet in patches. It catches a stretched, blurred reflection of the sign and of the lit wall, and of
 * the page's photos, poster and panels, which stand on it as lightboxes (see cardLight).
 */
export const FLOOR_FRAG = /* glsl */ `
${COMMON}
${SIGN_LIGHT}
uniform sampler2D uAlbedo, uSurface;
uniform float uTile, uRoom, uHalo, uReflect;
uniform float uMirror;   // the sign's reflection: dipped while the camera travels from one sign to the next
uniform vec3 uEye, uAmb;
uniform int uCardCount;
uniform vec4 uCardA[MAXCARDS];   // a card standing on the floor: x from, x to, z, height
uniform vec4 uCardB[MAXCARDS];   // rgb its colour, w its light
varying vec3 vPos;

// The page's cards, as lightboxes standing on the floor just where they cover it on the screen (so each one stands
// on its own lower edge). Each throws a pool of its colour on the floor in front of it, and the wet floor reflects
// it: sharp in the puddles, smeared on the rough concrete.
vec3 cardLight(vec3 p, vec3 rd, float rough, float puddle, float fres){
  vec3 acc = vec3(0.);
  for (int i = 0; i < uCardCount; i++){
    vec4 A = uCardA[i];
    vec4 B = uCardB[i];
    float front = p.z - A.z;
    if (front <= 0.) continue;
    float dx = p.x - clamp(p.x, A.x, A.y);
    float reach = .3 + .45 * A.w;
    float pool = exp(-(dx * dx + front * front) / (reach * reach)) * smoothstep(0., .25, front);
    float refl = 0.;
    if (rd.z < -.01){
      float t = (A.z - p.z) / rd.z;
      vec3 h = p + rd * t;
      // smeared more the rougher the floor and the further the card, and fading away from its foot, as a wet
      // floor's reflections do (p is on the floor, so p.y is the floor's height)
      float soft = .05 + rough * t * .6;
      float up = h.y - p.y;
      float inX = smoothstep(A.x - soft, A.x + soft, h.x) * smoothstep(A.y + soft, A.y - soft, h.x);
      float inY = smoothstep(A.w + soft, A.w - soft, up) * step(0., up) * exp(-up / A.w * 1.4);
      refl = inX * inY * mix(.3, 1., fres) * mix(.6, 1.8, puddle);
    }
    acc += B.rgb * B.w * (pool * (.3 - .15 * puddle) + refl);
  }
  return acc;
}

// what the floor sees when it looks back at the wall: the sign itself, or the light it throws on the wall
vec3 lookBack(vec3 p, vec3 rd, float rough){
  if (rd.z > -.02) return vec3(0.);
  float spread = rough * 1.2;
  vec3 acc = vec3(0.);
  // wet floors stretch reflections vertically: several taps along the plane's y
  float tl = (uLogoZ - p.z) / rd.z;
  vec3 h = p + rd * tl;
  float tw = -p.z / rd.z;
  vec3 hw = p + rd * tw;
  // towards the viewer the streak loses its shape: it blurs and gathers under the middle of the sign
  float far = smoothstep(4.5, 6.5, p.z);
  float lod = 1. + rough * 4.5 + tl * .08 + far * 3.;
  float across = (h.x - uLogoC.x) / uLogoHalf.x;
  float pool = mix(1., exp(-across * across * 1.8), far);
  for (int i = -2; i <= 2; i++){
    float o = float(i) / 2.;
    float letters = glowAt(glowUv(h.xy + vec2(0., o * spread * tl * .35)), lod) * 2.2;
    float halo = glowAt(glowUv(hw.xy + vec2(0., o * spread * tw * .35)), 6.) * uHalo * .35;
    acc += uLightCol * (letters + halo) * pool * (1. - abs(o) * .5);
  }
  return acc / 3.5;
}

void main(){
  vec2 uv = vec2(vPos.x, -vPos.z) / uTile;
  vec3 A = texture(uAlbedo, uv).rgb;
  vec3 S = texture(uSurface, uv).rgb;
  float roughTex = S.b;
  float puddle = smoothstep(.62, .42, roughTex + (fbm(vPos.xz * .45) - .5) * .5);
  float rough = mix(roughTex, .04, puddle * .9);
  vec2 nxy = (S.rg * 2. - 1.) * mix(.8, .15, puddle);
  vec3 n = normalize(vec3(nxy.x, 1., -nxy.y));
  vec3 V = normalize(uEye - vPos);

  vec3 diff, spec;
  signLight(vPos, n, V, rough, diff, spec);
  vec3 col = A * mix(1., .35, puddle) * (diff + uAmb * uRoom * .5) + spec * .4;

  float fres = .04 + .96 * pow(1. - max(dot(n, V), 0.), 5.);
  vec3 rd = reflect(-V, n);
  col += lookBack(vPos, rd, rough) * fres * mix(.25, 1., puddle) * uLight * uReflect * uMirror;

  col *= mix(.45, 1., smoothstep(0., .8, vPos.z));       // contact shadow at the foot of the wall
  col *= exp(-max(vPos.z - 4., 0.) * .18);               // falls away into the dark towards the viewer
  // the cards' own light doesn't fall away: they stand right there
  col += cardLight(vPos, rd, rough, puddle, fres) * mix(.6, 1., clamp(A.r * 3., 0., 1.));
  gl_FragColor = vec4(col, 1.);
}
`

/**
 * The monogram's wave lines breathe: a slow wave runs round the ring and pushes its lines in and out, each line a
 * little out of step with the next (the radius is in the phase), so they warp against each other. A displacement
 * in the sign's box, used by both the face (as a shifted look-up) and the letters' sides (as moved vertices), so
 * the two stay together. Nothing moves outside the ring: the FS and the wordmark are still.
 */
export const SIGN_WAVE = /* glsl */ `
uniform vec3 uIcon;        // the monogram's centre (in the sign's box) and radius (in box heights)
uniform float uBoxAspect, uWave, uTime;
float waveMask(vec2 p){
  vec2 q = (p - uIcon.xy) * vec2(uBoxAspect, 1.);
  float r = length(q) / uIcon.z;
  return smoothstep(.5, .64, r) * (1. - smoothstep(1.03, 1.14, r));
}
vec2 waveAt(vec2 p){
  vec2 q = (p - uIcon.xy) * vec2(uBoxAspect, 1.);
  float r = length(q) / uIcon.z;
  float m = smoothstep(.5, .64, r) * (1. - smoothstep(1.03, 1.14, r));
  if (m <= 0.) return vec2(0.);
  float th = atan(q.y, q.x);
  // liquid metal: long, slow swells that fold into each other (one wave carried along by another), never a
  // ripple; the lines move nearly together, so they flow rather than warp against each other
  float carry = sin(uTime * .19 + r * 3.) * .9;
  float w = sin(2. * th - uTime * .33 + carry) * .62
          + sin(3. * th + uTime * .23 + r * 4. - carry * .5) * .38;
  vec2 d = q / max(length(q), 1e-5) * w * uWave * uIcon.z * m;
  return d / vec2(uBoxAspect, 1.);
}
`

export const SIGN_VERT = /* glsl */ `
${SIGN_WAVE}
uniform vec3 uScale;     // the mesh's scale: the letters are stretched to the sign's box, so normals are unstretched by it
varying vec2 vBox;
varying vec3 vPos, vN;
varying float vDepth;
void main(){
  vBox = position.xy;
  vec3 p = position;
  p.xy += waveAt(position.xy);                        // the sides move with the face's lines
  vDepth = -position.z;                               // 0 at the face, 1 at the back
  vN = normalize(normal / uScale);
  vec4 w = modelMatrix * vec4(p, 1.);
  vPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

/**
 * The sign as channel letters. The face is the neon: the brand artwork's alpha, with how deep inside a stroke a
 * point is (a blurred copy of the shape) deciding how hot it runs, so the middle of a stroke is pale and hot and
 * its edge stays saturated pink. On the monogram's moving lines the three colours are looked up a little apart,
 * further the more the line is moving, so they fringe as they wave. The returns (the letters' sides) are dark
 * lacquered metal: they carry the face's own light a little way back from the edge, and catch the rest of the
 * sign's light, so the depth reads as the camera moves. uPass 1 draws emission only, into the god-ray source.
 */
export const SIGN_FRAG = /* glsl */ `
${COMMON}
${SIGN_LIGHT}
${SIGN_WAVE}
uniform sampler2D uMark;
uniform vec4 uMarkST;    // the shape texture's repeat (xy) and offset (zw), from the sign's box to the padded texture
uniform float uEmit, uFlash, uRoom, uPass, uCoreLod, uSwell, uFringe;
uniform vec3 uTubeCol, uCoreCol, uEye, uAmb;
uniform vec3 uTubeColB, uCoreColB;   // the tubes' colour at the sign's right end (the left end is uTubeCol): a piece
                                     // of neon can run from one colour to another along its length
varying vec2 vBox;
varying vec3 vPos, vN;
varying float vDepth;

vec2 markUv(vec2 p){ return (p + .5) * uMarkST.xy + uMarkST.zw; }

void main(){
  vec3 n = normalize(vN);
  bool face = n.z > .5;
  if (face){
    // the face is a plane over the whole sign: the artwork's coverage cuts the letters out of it, with a soft
    // edge that meets the traced sides at half coverage
    vec2 d = waveAt(vBox);
    vec2 uv = markUv(vBox - d);
    vec3 cov;
    if (dot(d, d) > 0.){
      // chromatic aberration on the moving lines: red leads the wave, blue trails it, plus a hair of constant
      // radial split so the fringe never quite closes
      vec2 q = (vBox - uIcon.xy) * vec2(uBoxAspect, 1.);
      vec2 rad = q / max(length(q), 1e-5) / vec2(uBoxAspect, 1.) * uIcon.z * .0035 * waveMask(vBox);
      vec2 split = d * uFringe + rad;
      cov = vec3(texture(uMark, markUv(vBox - d - split), -.75).a, texture(uMark, uv, -.75).a, texture(uMark, markUv(vBox - d + split), -.75).a);
    } else {
      // read a little sharper than the screen asks for: the letters are the one fine detail that has to stay crisp
      cov = vec3(texture(uMark, uv, -.75).a);
    }
    float a = max(cov.r, max(cov.g, cov.b));
    if (a < .02) discard;
    vec3 chan = smoothstep(.38, .62, cov);   // a tight edge: crisp, still not stair-stepped
    float alpha = max(chan.r, max(chan.g, chan.b));
    float core = smoothstep(.42, .95, textureLod(uMark, uv, uCoreLod).a);
    // the gas never sits quite still: a slow, broad swell of brightness moving along the strokes
    float drift = fbm(uv * vec2(3., 1.2) + vec2(uTime * .05, -uTime * .03));
    // the brand pink all through the stroke, only the very middle of the thickest strokes running a little paler
    float along = clamp(vBox.x + .5, 0., 1.);
    vec3 tubeCol = mix(uTubeCol, uTubeColB, along);
    vec3 coreCol = mix(uCoreCol, uCoreColB, along);
    vec3 emit = mix(tubeCol, coreCol, core * core * .7) * (.88 + .24 * drift) * uLight * uEmit * (1. + uSwell)
      + coreCol * uFlash;
    // each colour shows where its own look-up found the line; a fringe of one colour reads a little brighter
    emit *= chan / max(alpha, 1e-3) * mix(1., 1.6, 1. - min(chan.r, min(chan.g, chan.b)) / max(alpha, 1e-3));
    // and a glint that slides slowly round the ring, like light running over liquid metal
    float wm = waveMask(vBox);
    if (wm > 0.){
      vec2 q = (vBox - uIcon.xy) * vec2(uBoxAspect, 1.);
      float th = atan(q.y, q.x);
      float glint = pow(.5 + .5 * sin(th - uTime * .45), 14.) + .6 * pow(.5 + .5 * sin(th * 2. + uTime * .31 + 1.7), 18.);
      emit = mix(emit, coreCol * uLight * uEmit * 1.15, glint * wm * .45);
    }
    if (uPass > .5){ gl_FragColor = vec4(emit, alpha); return; }
    vec3 glass = vec3(.05, .035, .045) * uRoom * (1. - min(uLight, 1.));   // the unlit face, seen by room light
    gl_FragColor = vec4(emit + glass, alpha);
    return;
  }
  if (uPass > .5){ gl_FragColor = vec4(0., 0., 0., 1.); return; }
  // the returns: the face's light bleeding back along them, the sign's light from its neighbours, a dark sheen
  vec3 V = normalize(uEye - vPos);
  vec3 diff, spec;
  signLight(vPos, n, V, .35, diff, spec);
  float spill = exp(-vDepth * 5.) * .22 + exp(-vDepth * 22.) * .5;
  vec3 sideCol = mix(uTubeCol, uTubeColB, clamp(vBox.x + .5, 0., 1.));
  vec3 col = sideCol * uLight * uEmit * spill
    + vec3(.03, .025, .035) * (diff + uAmb * uRoom)
    + spec * .25;
  float fres = pow(1. - max(dot(n, V), 0.), 4.);
  col += sideCol * fres * .04 * uLight;
  gl_FragColor = vec4(col, 1.);
}
`

/**
 * The sign's own glow, the way the flat neon sign on the page has it: a tight pink halo hugging the strokes, a
 * wider violet one, and a faint soft bloom of the whole shape. Drawn additively under the letters (it is light in
 * the air in front of the wall, not on it), from the same blurred copy of the sign the wall's halo uses.
 */
export const AURA_VERT = /* glsl */ `
varying vec2 vXY;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vXY = w.xy;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

export const AURA_FRAG = /* glsl */ `
${SIGN_LIGHT}
uniform vec3 uPink, uViolet;
uniform float uAura;
varying vec2 vXY;
void main(){
  vec2 uv = glowUv(vXY);
  vec3 c = uPink * glowAt(uv, 2.4) * .22 + uViolet * glowAt(uv, 3.8) * .5 + uPink * glowAt(uv, 5.2) * .28;
  gl_FragColor = vec4(c * uLight * uAura, 1.);
}
`

/**
 * Dust hanging in the air. It catches the sign's light near the sign, and sparkles where it drifts through a
 * laser beam, in the beam's colour.
 */
export const DUST_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime, uPx, uLight, uRoom, uLaserDust;
uniform vec3 uBoxMin, uBoxSize, uLightCol;
uniform vec2 uLogoC, uLogoHalf;
uniform float uLogoZ;
uniform int uBeamCount;
uniform vec4 uBeamO[MAXB];
uniform vec4 uBeamD[MAXB];
uniform vec4 uBeamC[MAXB];
varying vec3 vC;
void main(){
  vec3 drift = vec3(sin(uTime * .05 + aSeed.w * 6.3) * .08, .035 + aSeed.z * .03, sin(uTime * .07 + aSeed.x * 9.) * .05) * uTime;
  vec3 p = uBoxMin + mod(aSeed.xyz * uBoxSize + drift, uBoxSize);
  vec2 q = (p.xy - uLogoC) / (uLogoHalf * 1.4);
  float dz = (p.z - uLogoZ) * .7;
  float d2 = dot(q, q) + dz * dz;
  float twinkle = .55 + .45 * sin(uTime * (1. + aSeed.w * 2.) + aSeed.x * 40.);
  vec3 c = normalize(uLightCol + 1e-4) * (uLight * 1.6 / (d2 + .35) + uRoom * .04) * twinkle * .35;
  // a mote inside a beam lights up in the beam's colour
  for (int i = 0; i < uBeamCount; i++){
    vec4 O = uBeamO[i];
    vec3 w = p - O.xyz;
    float s = clamp(dot(w, uBeamD[i].xyz), 0., abs(uBeamD[i].w));
    vec3 off = w - uBeamD[i].xyz * s;
    c += uBeamC[i].rgb * O.w * exp(-dot(off, off) / .0016) * uLaserDust * (.4 + .6 * twinkle);
  }
  vC = c;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (.004 + aSeed.y * .006) / -mv.z;
}
`

export const DUST_FRAG = /* glsl */ `
varying vec3 vC;
void main(){
  float r = 1. - smoothstep(.0, .5, length(gl_PointCoord - .5));
  gl_FragColor = vec4(vC * r, 1.);
}
`

/**
 * Motion blur while the camera travels from one page's bay of the wall to the next: the frame smeared along the
 * way the wall moves across the screen (uDir, the whole shutter's travel in uv), with a tent of taps so the smear
 * fades at its ends instead of stopping in a hard edge.
 */
export const MOTION_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uDir;
varying vec2 vUv;
void main(){
  vec3 acc = vec3(0.);
  float total = 0.;
  for (int i = -8; i <= 8; i++){
    float o = float(i) / 8.;
    float w = 1. - abs(o) * .85;
    acc += texture(tDiffuse, vUv + uDir * o * .5).rgb * w;
    total += w;
  }
  gl_FragColor = vec4(acc / total, 1.);
}
`

export const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`

/**
 * The ground fog, shared by the smoke (which draws its body) and the lasers (whose beams and sheets light it up),
 * so the slices they cut line up with it. A bank lying on the floor about uFogH deep: its top swells and sinks
 * slowly across the room and frays into wisps, and inside it billows, folded by a second noise, roll slowly across
 * the floor. uFogCover is how much of the floor it covers (0 only the thickest billows, .3 most of it). Needs uNoise,
 * uTime and uFloorY declared before it.
 */
export const FOG_BANK = /* glsl */ `
uniform float uFog, uFogH, uFogCover;
float fogBank(vec3 p){
  float y = p.y - uFloorY;
  if (uFog <= 0. || y > uFogH * 2.6 || y < 0.) return 0.;
  float t = uTime;
  // the surface's swell: a slow, wide map over the floor; where it sinks the fog lies thin
  float swell = texture(uNoise, p * vec3(.075, 0., .075) + vec3(t * .014, .31, -t * .01)).r;
  float top = uFogH * (.35 + 1.6 * swell);
  // the body: billows carried along by a second noise (the fold), drifting across the room
  vec3 r = p * vec3(.2, .48, .2) + vec3(t * .03, t * .012, -t * .019);
  vec3 w = vec3(texture(uNoise, r * .55 + vec3(.13, .57, .31)).r, texture(uNoise, r * .55 + vec3(.71, .29, .83) - t * .004).r, .5) - .5;
  r += w * .85;
  float n = texture(uNoise, r).r * .62 + texture(uNoise, r * 2.7 + vec3(.2, -t * .028, .5)).r * .38;
  // patchy all the way down, the wet floor showing between the billows; higher up only their crests survive,
  // fraying into wisps
  float low = 1. - smoothstep(0., top, y);
  return smoothstep(.5 - uFogCover, .76 - uFogCover, n + .14 * low) * low * (.5 + swell) * uFog;
}
`

/**
 * Smoke, raymarched small and softly scaled up. The density is a tiling noise volume folded by itself (domain
 * warping); it pools along the floor and gathers against the wall. Every sample is lit by the sign (a few points
 * on its tubes) and shadowed by the smoke between it and the sign.
 * Output: rgb = light scattered towards the camera, a = how much of what's behind still shows through.
 */
export const SMOKE_FRAG = /* glsl */ `
precision highp sampler3D;
uniform sampler3D uNoise;
uniform float uTime, uSmoke, uSmokeLight, uSigma, uFloorY, uLight;
uniform vec3 uEye, uLightCol;
uniform mat4 uInvViewProj;
uniform vec4 uHazeL[NHAZE];
// the ground fog's light (the show's, from above), and how thick it is
uniform vec3 uFogAmb;
uniform float uFogSigma;
uniform int uSteps;   // how many steps the march takes: STEPS, or fewer when the frame rate asks (see scene.ts govern)
varying vec2 vUv;
${FOG_BANK}

float n3(vec3 p){ return texture(uNoise, p).r; }

float density(vec3 p){
  float t = uTime;
  vec3 q = p * vec3(.1, .125, .11) + vec3(t * .017, -t * .026, t * .011);   // rise and drift
  vec3 w = vec3(n3(q * .8 + vec3(.13, .57, .31) + t * .009),
                n3(q * .8 + vec3(.71, .29, .83) - t * .007),
                n3(q * .8 + vec3(.43, .91, .17) + t * .0055));
  q += (w - .5) * .62;                                          // the fold: noise carried along by noise
  float n = n3(q) * .52 + n3(q * 2.21 + (w - .5) * .25) * .3 + n3(q * 4.7 - t * .013) * .18;
  float pool = exp(-max(p.y - uFloorY, 0.) * .38);              // pools along the floor
  float wall = exp(-max(p.z, 0.) * .2);                         // gathers against the wall
  float body = pool * (.62 + .5 * wall);
  return smoothstep(.44, .72, n) * body * uSmoke;
}

vec3 lightAt(vec3 p){
  float s = 0.;
  for (int i = 0; i < NHAZE; i++){
    vec3 L = uHazeL[i].xyz - p;
    float d2 = dot(L, L);
    s += uHazeL[i].w / (d2 + 1.4) * exp(-sqrt(d2) * .4);
  }
  // smoke between this point and the sign's middle shades it, so banks have a lit side and a dark side
  vec3 toL = normalize(uHazeL[0].xyz - p);
  float occ = density(p + toL * .45) + density(p + toL * 1.1) * .7;
  return uLightCol * s * uLight * exp(-occ * 2.6);
}

void main(){
  vec4 pp = uInvViewProj * vec4(vUv * 2. - 1., 1., 1.);
  vec3 rd = normalize(pp.xyz / pp.w - uEye);
  float T = rd.z < 0. ? -uEye.z / rd.z : 60.;
  if (rd.y < 0.) T = min(T, (uFloorY - uEye.y) / rd.y);
  // the smoke lies against the wall (nearer than VOL_Z); the fog bank along the whole floor, below its top
  float t0 = rd.z < 0. ? max(0., (VOL_Z - uEye.z) / rd.z) : 0.;
  float top = uFloorY + uFogH * 2.6;
  float tb = uFog <= 0. ? 1e9 : (uEye.y <= top ? 0. : (rd.y < 0. ? (top - uEye.y) / rd.y : 1e9));
  float ts = min(t0, tb);
  if (ts >= T){ gl_FragColor = vec4(0., 0., 0., 1.); return; }

  float stepLen = (T - ts) / float(uSteps);
  // a fixed dither per pixel (interleaved gradient noise) instead of per-frame noise: no crawling grain
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  vec3 acc = vec3(0.);
  float trans = 1.;
  for (int i = 0; i < uSteps; i++){
    vec3 p = uEye + rd * (ts + (float(i) + jitter) * stepLen);
    float ds = p.z < VOL_Z ? density(p) * smoothstep(VOL_Z, VOL_Z - 1., p.z) : 0.;
    float db = fogBank(p);
    if (ds + db > .002){
      float ks = ds * uSigma;
      float kb = db * uFogSigma;
      float a = 1. - exp(-(ks + kb) * stepLen);
      // the smoke lit by the sign, shadowed by itself; the fog by the show from above, its top brightest, and by
      // the sign near the wall
      vec3 L = ks > .0004 ? ks * (lightAt(p) * uSmokeLight + vec3(.0012, .0006, .0014)) : vec3(0.);
      if (kb > 0.){
        vec3 toSign = uHazeL[0].xyz - p;
        float up = (p.y - uFloorY) / uFogH;
        L += kb * (uFogAmb * (.45 + .55 * smoothstep(0., 1.8, up)) + uLightCol * uLight * .8 / (dot(toSign, toSign) + 6.));
      }
      acc += trans * a * L / (ks + kb);
      trans *= 1. - a;
      if (trans < .01) break;
    }
  }
  gl_FragColor = vec4(acc, trans);
}
`

/** God rays: a radial blur of the sign's emission, away from it. Drawn small and scaled up in the composite. */
export const RAYS_FRAG = /* glsl */ `
${COMMON}
uniform sampler2D tOcc;
uniform vec2 uLightA, uLightB;   // ends of the sign's centre line, in screen uv
uniform float uDensity, uDecay, uTime;
uniform int uTaps;   // how many taps the blur takes: TAPS, or fewer when the frame rate asks (see scene.ts govern)
varying vec2 vUv;

void main(){
  // the sign is wide: rays leave it from the nearest point on its centre line, not from one point in the middle
  vec2 ab = uLightB - uLightA;
  vec2 src0 = uLightA + ab * clamp(dot(vUv - uLightA, ab) / dot(ab, ab), 0., 1.);
  // fewer taps reach as far and gather as much: each is further on, fades more and counts for more
  float coarse = float(TAPS) / float(uTaps);
  float decay = pow(uDecay, coarse);
  vec2 delta = (vUv - src0) * uDensity / float(uTaps);
  vec2 uv = vUv - delta * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  float illum = 1.;
  vec3 rays = vec3(0.);
  for (int i = 0; i < uTaps; i++){
    uv -= delta;
    rays += texture(tOcc, uv).rgb * illum;
    illum *= decay;
  }
  rays *= coarse;
  // the shafts come and go slowly, each direction on its own
  vec2 rdir = normalize(vUv - src0 + 1e-5);
  float flick = .3 + 1.5 * fbm(rdir * 3.5 + vec2(uTime * .09, -uTime * .07));
  gl_FragColor = vec4(rays * flick, 1.);
}
`

/**
 * Laser beams, computed analytically per pixel at the screen's own resolution so the cores stay sharp.
 *
 * Each beam is a ray (origin, direction, length). For a pixel, the closest point between its view ray and the
 * beam gives how far the beam passes from it. A thin beam seen through haze scatters light in proportion to how
 * much haze it passes through, and seen at a grazing angle (end-on) it looks brighter, as the view ray runs along
 * more of it. Its width is never less than a pixel's footprint, with the brightness scaled down to match, so a
 * distant beam thins to a clean, unaliased line instead of breaking up.
 *
 * The haze is patchy (a slow noise volume), so beams brighten and fade along their length. On the wet floor the
 * same beams show again in a reflected, slightly blurred view, and a beam that reaches the floor leaves a dot.
 */
export const LASER_FRAG = /* glsl */ `
precision highp sampler3D;
precision highp usampler2D;
${COMMON}
uniform sampler2D tDiffuse;
uniform sampler3D uNoise;
uniform sampler2D uSurface;
uniform mat4 uInvViewProj;
uniform vec3 uEye;
uniform float uFloorY, uTime, uPixAngle, uGain, uHaze, uReflect, uWidth, uHalo, uTile, uSpot, uRipple, uPhase;
// Only the lit beams, packed (each one costs every pixel, lit or not): first the ones the floor reflects, the ones
// that land on the floor first among them (uSpotA of them), then the rest, again those that land first (uSpotB).
uniform int uBeamCount, uReflectCount, uSpotA, uSpotB;
uniform vec4 uBeamO[MAXB];   // xyz origin, w power
uniform vec4 uBeamD[MAXB];   // xyz direction (unit), w length; negative when the beam points at the eye (its head
                             // flares into a star, so it is looked for much further round the head)
uniform vec4 uBeamC[MAXB];   // rgb colour, w how much the floor's reflection takes of it (standing in for the beams
                             // it doesn't reflect)
// Which beams reach each tile of the screen (1 << uBinShift pixels square), worked out on the CPU each frame from
// where each beam and its glow can be (see scene.ts binBeams): bit i of the four words is beam i. A pixel looks at
// those beams alone, not at every beam to find most of them too far away. Only the view straight from the eye: the
// floor's reflection looks at every beam it reflects (a rough floor's reflection can reach anywhere).
uniform usampler2D uBins;
uniform int uBinShift;
// how much more a beam shows inside the fog bank, and how bright the sheets are
uniform float uFogBeam, uSheetGain;
// the smoke's light and how much of what's behind still shows through it (see SMOKE_FRAG): the floor's reflections
// lie under the fog
uniform sampler2D tSmoke;
// the sheets of light (see show.ts Sheet)
uniform int uSheetCount;
uniform vec4 uSheetO[MAXSHEETS];   // xyz head, w power
uniform vec4 uSheetN[MAXSHEETS];   // xyz the plane's normal, w the fan's half angle
uniform vec4 uSheetU[MAXSHEETS];   // xyz the fan's middle direction, w its reach
uniform vec3 uSheetC[MAXSHEETS];
// the page's cards standing on the floor (see FLOOR_FRAG cardLight): they light the fog round their feet
uniform int uCardCount;
uniform vec4 uCardA[MAXCARDS];
uniform vec4 uCardB[MAXCARDS];
uniform float uCardFog;
varying vec2 vUv;
${FOG_BANK}

float hazeAt(vec3 p){
  vec3 q = p * vec3(.16, .2, .14) + vec3(uTime * .011, -uTime * .017, uTime * .007);
  float n = texture(uNoise, q).r * .6 + texture(uNoise, q * 2.6 + vec3(.31, .17, .53)).r * .4;
  return mix(1. - uHaze, 1., smoothstep(.32, .72, n));
}

// the cards' light in the fog at p: from the nearest point of each one's face
vec3 cardGlow(vec3 p){
  vec3 acc = vec3(0.);
  for (int i = 0; i < uCardCount; i++){
    vec4 A = uCardA[i];
    vec3 d = p - vec3(clamp(p.x, A.x, A.y), clamp(p.y, uFloorY, uFloorY + A.w), A.z);
    float r = .45 + .3 * A.w;
    acc += uCardB[i].rgb * uCardB[i].w * exp(-dot(d, d) / (r * r));
  }
  return acc;
}

// the cards' colour in the fog round their feet: through the stretch of the view ray inside the bank, at its
// density at two points along that stretch
vec3 cardFog(vec3 E, vec3 rd, float T){
  if (uCardCount == 0) return vec3(0.);
  float top = uFloorY + uFogH * 2.6;
  float ta = rd.y < 0. ? max(0., (top - E.y) / rd.y) : 0.;
  float tb = rd.y < 0. ? T : (E.y < top ? min(T, (top - E.y) / max(rd.y, 1e-4)) : 0.);
  float len = min(tb, ta + 8.) - ta;
  if (len <= 0.) return vec3(0.);
  float f = fogBank(E + rd * (ta + len * .3)) + fogBank(E + rd * (ta + len * .75));
  vec3 glow = cardGlow(E + rd * (ta + len * .5)) * uCardFog * f * .5 * len;
  // a card right by the camera lights a lot of fog: it glows, but doesn't blow out to white
  return glow / (1. + max(max(glow.r, glow.g), glow.b) * 1.2);
}

// Sheets of light: where the view ray crosses a sheet's plane, inside its fan and before anything stops the ray,
// the fog (and the faint haze above it) there lights up. Seen edge on the ray runs through more of the sheet, so it
// brightens.
vec3 sheets(vec3 E, vec3 rd, float T){
  vec3 acc = vec3(0.);
  for (int i = 0; i < uSheetCount; i++){
    vec4 O4 = uSheetO[i];
    vec3 N = uSheetN[i].xyz;
    float dn = dot(rd, N);
    float t = dot(O4.xyz - E, N) / (abs(dn) < 1e-4 ? 1e-4 : dn);
    if (t < .6 || t > T) continue;
    vec3 p = E + rd * t;
    vec3 l = p - O4.xyz;
    float r = length(l);
    if (r > uSheetU[i].w || r < .05) continue;
    vec3 U = uSheetU[i].xyz;
    float edge = uSheetN[i].w - abs(atan(dot(l, cross(N, U)), dot(l, U)));
    if (edge <= 0.) continue;
    float dens = fogBank(p) + hazeAt(p) * .035;
    // the fan fades out over its last 20 degrees, so its edges never cut a line across the fog
    acc += uSheetC[i] * O4.w * dens * uSheetGain / max(abs(dn), .15) * smoothstep(0., .35, edge) * exp(-r * .025);
  }
  // where the fog is thickest it glows, but doesn't blow out to white
  return acc / (1. + max(max(acc.r, acc.g), acc.b) * .9);
}

// light scattered toward a view ray (from E along rd, up to T) by beam i, or (mirrored: the floor's blurred
// reflection) by a beam it reflects. blur widens the beams with distance (a rough reflection).
void beamAt(int i, vec3 E, vec3 rd, float T, float blur, float tMin, bool mirrored, inout vec3 acc){
    vec4 O4 = uBeamO[i];
    float weight = mirrored ? uBeamC[i].w : 1.;
    vec3 O = O4.xyz;
    vec3 D = uBeamD[i].xyz;
    float L = abs(uBeamD[i].w);

    // the head the beam leaves: a small hot point, so no beam starts out of nothing. Looking down the beam, the
    // head flares into a wide soft star that grows the straighter it points at the eye. Most pixels are nowhere
    // near a head: a cheap distance test skips the rest. Only a beam pointing at the eye has a star to look for
    // far out; another's hot point is gone a few of its widths away.
    float tO = clamp(dot(O - E, rd), 0., T);
    vec3 dO = E + rd * tO - O;
    float dO2 = dot(dO, dO);
    float ra = max(.035, tO * uPixAngle * 1.5);
    if (dO2 < ra * ra * (mirrored || uBeamD[i].w < 0. ? 8100. : 36.)){
      float into = max(dot(-D, normalize(O - E)), 0.);
      float stare = into > .97 ? pow(into, 400.) : 0.;
      float flare = stare > 0. ? exp(-sqrt(dO2) / (ra * (2. + 9. * stare))) * stare * 1.2 : 0.;
      acc += mix(uBeamC[i].rgb, vec3(1.), .35) * O4.w * (exp(-dO2 / (ra * ra)) * (.035 / ra) * .7 + flare) * weight;
    }

    vec3 w0 = E - O;
    float b = dot(rd, D), d = dot(rd, w0), e = dot(D, w0);
    float den = max(1. - b * b, 1e-5);
    float t = clamp((b * e - d) / den, tMin, T);
    float s = clamp(dot(E + rd * t - O, D), 0., L);
    t = clamp(dot(O + D * s - E, rd), tMin, T);
    vec3 off = E + rd * t - (O + D * s);
    float dist2 = dot(off, off);
    float r = max(uWidth, t * (uPixAngle * .85 + blur));
    float hw = .05 + .012 * t + blur * t * 3.;
    // nothing of this beam reaches this pixel: neither its core (three widths) nor its haze glow (six: past that
    // the glow is under a level of the darkest grey, and a page full of beams spends most of its time out there)
    if (dist2 > max(9. * r * r, 36. * hw * hw)) return;
    float core = exp(-dist2 / (r * r)) * (uWidth / r);
    // the haze glow round a beam, faded out in the last few metres before the lens: a beam passing right by the
    // camera would otherwise fill the screen
    float halo = exp(-sqrt(dist2) / hw) * uHalo * smoothstep(tMin, tMin + 3., t);
    float f = core + halo;
    if (f < 1e-4) return;
    float endOn = min(inversesqrt(den), 7.);
    float along = exp(-s * .03) * smoothstep(0., .12, s);
    // resonance: a faint wave of brightness travelling out along the beam on the beat, each beam a little out of step
    // (by where it is and points: its place in the list changes)
    along *= 1. + uRipple * sin(s * 4.2 - uPhase + dot(O + D * 3., vec3(.9, .7, .8)));
    vec3 X = O + D * s;
    // a beam shows in the haze, and much more where it runs through the fog bank
    acc += uBeamC[i].rgb * O4.w * f * endOn * along * (hazeAt(X) + uFogBeam * fogBank(X)) * weight;
}

// the floor's reflection: every beam it reflects
vec3 beams(vec3 E, vec3 rd, float T, float blur, float tMin, bool mirrored){
  vec3 acc = vec3(0.);
  int n = mirrored ? uReflectCount : uBeamCount;
  for (int i = 0; i < n; i++) beamAt(i, E, rd, T, blur, tMin, mirrored, acc);
  return acc;
}

// the view from the eye: the beams that reach this pixel's tile, in the order of the list (so the light adds up
// exactly as it does looking at every one), each set bit of the tile's words in turn
void beamWord(uint m, int base, vec3 E, vec3 rd, float T, inout vec3 acc){
  while (m != 0u){
    uint low = m & (~m + 1u);
    m ^= low;
    beamAt(base + int(log2(float(low)) + .5), E, rd, T, 0., .6, false, acc);
  }
}
vec3 directBeams(vec3 E, vec3 rd, float T){
  vec3 acc = vec3(0.);
  if (uBeamCount == 0) return acc;
  uvec4 bins = texelFetch(uBins, ivec2(gl_FragCoord.xy) >> uBinShift, 0);
  beamWord(bins.x, 0, E, rd, T, acc);
  beamWord(bins.y, 32, E, rd, T, acc);
  beamWord(bins.z, 64, E, rd, T, acc);
  beamWord(bins.w, 96, E, rd, T, acc);
  return acc;
}

// a beam that ends on the floor leaves a dot where it lands
vec3 spot(int i, vec3 P){
  vec4 O4 = uBeamO[i];
  vec3 dd = P - (O4.xyz + uBeamD[i].xyz * abs(uBeamD[i].w));
  float d2 = dot(dd, dd);
  return uBeamC[i].rgb * O4.w * (exp(-d2 / .0009) * 2. + exp(-d2 / .03) * .15);
}
vec3 spots(vec3 P){
  vec3 acc = vec3(0.);
  for (int i = 0; i < uSpotA; i++) acc += spot(i, P);
  for (int i = uReflectCount; i < uReflectCount + uSpotB; i++) acc += spot(i, P);
  return acc;
}

void main(){
  vec3 col = texture(tDiffuse, vUv).rgb;
  vec4 pp = uInvViewProj * vec4(vUv * 2. - 1., 1., 1.);
  vec3 rd = normalize(pp.xyz / pp.w - uEye);
  float Tw = rd.z < 0. ? -uEye.z / rd.z : 60.;
  float Tf = rd.y < 0. ? (uFloorY - uEye.y) / rd.y : 1e9;
  float T = min(Tw, Tf);

  vec3 light = directBeams(uEye, rd, T);
  if (uFog > 0.) light += cardFog(uEye, rd, T) + sheets(uEye, rd, T);

  if (Tf < Tw && uReflect > 0.){
    vec3 P = uEye + rd * Tf;
    vec2 uv = vec2(P.x, -P.z) / uTile;
    vec3 S = texture(uSurface, uv).rgb;
    float puddle = smoothstep(.62, .42, S.b + (fbm(P.xz * .45) - .5) * .5);
    float rough = mix(S.b, .04, puddle * .9);
    vec2 nxy = (S.rg * 2. - 1.) * mix(.5, .08, puddle);
    vec3 n = normalize(vec3(nxy.x, 1., -nxy.y));
    vec3 rr = reflect(rd, n);
    float fres = .04 + .96 * pow(1. - max(dot(n, -rd), 0.), 5.);
    float T2 = rr.z < 0. ? -P.z / rr.z : 60.;
    float fade = exp(-max(P.z - 4., 0.) * .18);
    // under the fog, as much of the reflection and the spots shows as the smoke and fog let through
    fade *= texture(tSmoke, vUv).a;
    light += beams(P + n * .002, rr, T2, rough * .02, 0., true) * fres * mix(.2, 1., puddle) * uReflect * fade;
    light += spots(P) * uSpot * (1. - .6 * puddle) * fade;
  }
  gl_FragColor = vec4(col + light * uGain, 1.);
}
`

/**
 * Composite over the scene: the smoke (drawn small, scaled up softly) absorbs what's behind it and adds its own
 * light, then the god rays stream out of the sign, strongest where there is smoke for them to show in.
 */
export const ATMOS_FRAG = /* glsl */ `
${COMMON}
uniform sampler2D tDiffuse, tOcc, tSmoke, tRays;
uniform vec2 uSmokeTexel;
uniform float uWeight, uRays;
uniform vec3 uRayCol;
varying vec2 vUv;

void main(){
  vec3 col = texture(tDiffuse, vUv).rgb;

  vec4 sm = texture(tSmoke, vUv) * .4;
  sm += texture(tSmoke, vUv + vec2(uSmokeTexel.x, 0.)) * .15;
  sm += texture(tSmoke, vUv - vec2(uSmokeTexel.x, 0.)) * .15;
  sm += texture(tSmoke, vUv + vec2(0., uSmokeTexel.y)) * .15;
  sm += texture(tSmoke, vUv - vec2(0., uSmokeTexel.y)) * .15;
  // the smoke thins over the lit tubes, so they read clearly through it without being cut out of it
  vec3 src = texture(tOcc, vUv).rgb;
  float tubes = clamp(dot(src, vec3(.4, .3, .3)) * 2.5, 0., 1.);
  sm.a = mix(sm.a, 1., tubes * .92);
  sm.rgb *= 1. - tubes * .85;
  col = col * sm.a + sm.rgb;

  vec3 rays = texture(tRays, vUv).rgb;
  float inside = clamp(dot(src, vec3(.4, .3, .3)) * 2., 0., 1.);
  float inSmoke = .3 + 1.6 * (1. - sm.a);
  col += rays * uWeight * uRays * uRayCol * inSmoke * (1. - .9 * inside);
  gl_FragColor = vec4(col, 1.);
}
`

/**
 * Last pass, drawn on every frame of the screen: chromatic aberration, vignette, grain, a violet lift in the
 * blacks, then tone mapping and sRGB. It shows the last finished frame of the room; when the camera has moved since
 * that frame was drawn (the room is drawn less often than the screen's frames, see scene.ts), it is turned to where
 * the camera is now first. Every pixel of the room lies on the wall, the floor or the sign's face, all flat and
 * known: a pixel's ray from where the camera is now meets one of them, and that point is looked up where the
 * frame's own camera saw it. Exact for any turn of the camera and for the room's surfaces as it moves; the beams in
 * the air are taken as lying on what is behind them, a difference a frame's worth of camera movement can't show.
 */
export const GRADE_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime, uVignette, uGrain, uLift, uCA, uExposure, uFlash;
uniform vec2 uRes;
uniform vec3 uLiftCol, uFlashCol;
// turning the frame to the camera's place now (uWarp 1), or showing it as drawn (0)
uniform int uWarp;
uniform mat4 uNowInv;      // the camera now: from the screen to the world
uniform mat4 uThen;        // the frame's camera: from the world to the screen
uniform vec3 uEyeNow;
uniform float uWarpFloor;  // the floor's height in the frame
uniform vec4 uWarpSign;    // the sign's middle (xy) and half its size (zw) on its face, z = uWarpFace; z 0: no sign
uniform float uWarpFace;
uniform vec2 uTexel;       // one pixel of the frame
varying vec2 vUv;
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

// where the frame saw what is at this pixel now
vec2 warped(vec2 uv){
  vec4 pp = uNowInv * vec4(uv * 2. - 1., 1., 1.);
  vec3 rd = normalize(pp.xyz / pp.w - uEyeNow);
  float t = 60.;
  if (rd.z < -1e-4){
    t = -uEyeNow.z / rd.z;
    if (uWarpSign.z > 0.){
      float tf = (uWarpFace - uEyeNow.z) / rd.z;
      vec2 pf = uEyeNow.xy + rd.xy * tf;
      if (all(lessThan(abs(pf - uWarpSign.xy), uWarpSign.zw))) t = tf;
    }
  }
  if (rd.y < -1e-4) t = min(t, (uWarpFloor - uEyeNow.y) / rd.y);
  vec4 c = uThen * vec4(uEyeNow + rd * t, 1.);
  return c.xy / max(c.w, 1e-4) * .5 + .5;
}
// a sharp resampling between the frame's pixels (Catmull-Rom, in five bilinear taps): a frame turned by a fraction
// of a pixel stays as crisp as one shown as drawn
vec3 crisp(vec2 uv){
  vec2 p = uv / uTexel;
  vec2 t1 = floor(p - .5) + .5;
  vec2 f = p - t1;
  vec2 w0 = f * (-.5 + f * (1. - .5 * f));
  vec2 w1 = 1. + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (.5 + f * (2. - 1.5 * f));
  vec2 w3 = f * f * (-.5 + .5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (t1 - 1.) * uTexel;
  vec2 t3 = (t1 + 2.) * uTexel;
  vec2 t12 = (t1 + w2 / w12) * uTexel;
  vec3 s = texture(tDiffuse, vec2(t12.x, t0.y)).rgb * w12.x * w0.y
         + texture(tDiffuse, vec2(t0.x, t12.y)).rgb * w0.x * w12.y
         + texture(tDiffuse, t12).rgb * w12.x * w12.y
         + texture(tDiffuse, vec2(t3.x, t12.y)).rgb * w3.x * w12.y
         + texture(tDiffuse, vec2(t12.x, t3.y)).rgb * w12.x * w3.y;
  return max(s / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y), 0.);
}

void main(){
  vec2 c = vUv - .5;
  float r2 = dot(c, c);
  vec2 off = c * r2 * .022 * uCA;            // none in the middle, where the sign is
  vec3 col;
  if (uWarp == 0){
    col = vec3(texture(tDiffuse, vUv - off).r, texture(tDiffuse, vUv).g, texture(tDiffuse, vUv + off).b) * uExposure;
  } else {
    vec2 at = warped(vUv);
    col = vec3(crisp(at - off).r, crisp(at).g, crisp(at + off).b) * uExposure;
    // A strip the frame never saw (the camera has turned past its edge since it was drawn, a sliver at the edge of
    // the screen, for a frame, in a fast scroll or a move between pages): the frame's nearest edge, blurred the
    // more the further out (as the motion itself blurs it) and a little darker, rather than its last row of pixels
    // smeared across it in streaks.
    vec2 past = max(-at, at - 1.);
    float outside = max(past.x, past.y);
    if (outside > 0.){
      vec2 edge = clamp(at, uTexel, 1. - uTexel);
      vec2 reach = (.006 + .5 * outside) * vec2(uRes.y / uRes.x, 1.);
      vec3 soft = vec3(0.);
      for (int i = 0; i < 8; i++){
        float a = float(i) * .7854;
        soft += texture(tDiffuse, clamp(edge + vec2(cos(a), sin(a)) * reach, 0., 1.)).rgb;
      }
      col = mix(col, soft * (uExposure / 8.), smoothstep(0., .006, outside)) * (1. - .45 * smoothstep(0., .08, outside));
    }
  }
  float l = dot(col, vec3(.2126, .7152, .0722));
  col += uLiftCol * (1. - smoothstep(0., .1, l)) * uLift;
  float v = smoothstep(1.05, .2, length(c * vec2(1., 1.25) + vec2(0., .06)));   // a little heavier at the bottom
  col *= mix(1., v, uVignette);
  col += uFlashCol * uFlash * (.55 + .45 * v);   // the lasers' flash as they look into the lens
  col += (h(vUv * uRes + fract(uTime * 13.) * 517.) - .5) * uGrain * (.2 * uLift + sqrt(l));
  gl_FragColor = vec4(max(col, 0.), 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // a last dither against banding in the long, dark gradients
  gl_FragColor.rgb += (h(gl_FragCoord.xy + 3.7) - .5) / 255.;
}
`
