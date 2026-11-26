// The camera's move from one page's bay of the wall to the next (see travel.ts), shared by the room (which moves
// its camera by it each frame) and the page (whose words slide by the same curve on the compositor).
//
// A camera move, not a slide: it eases in from rest (a quarter-sine ramp of speed), cruises, then spends the longer
// part of the move settling, its speed falling away to nothing with no overshoot ((1 - w)^3 (1 + 3w): zero speed and
// zero acceleration at the end). The same curve drives the motion blur (by speed). After the Instinct site's pan
// (~/Documents/INSTINCT 2/world/transitions.js).

export const PAN_MS = 760;
const ACCEL = 0.24;
const CRUISE = 0.38;

const speedShape = (u: number) =>
  u < ACCEL ? Math.sin(((Math.PI / 2) * u) / ACCEL) ** 2 : u < CRUISE ? 1 : ((w: number) => (1 - w) ** 3 * (1 + 3 * w))((u - CRUISE) / (1 - CRUISE));

export const PAN_PROFILE = (() => {
  const N = 720;
  const E = [0];
  const V = [0];
  for (let i = 1; i <= N; i++) E.push(E[i - 1] + (speedShape((i - 1) / N) + speedShape(i / N)) / 2 / N);
  const area = E[N];
  for (let i = 0; i <= N; i++) {
    E[i] /= area;
    V[i] = speedShape(i / N) / area;
  }
  const at = (list: number[], u: number) => {
    const x = Math.min(N, Math.max(0, u * N));
    const i = Math.min(N - 1, Math.floor(x));
    return list[i] + (list[i + 1] - list[i]) * (x - i);
  };
  const vmax = Math.max(...V);
  return {
    /** how far along the move, 0..1, at `u` of its time */
    E: (u: number) => at(E, u),
    /** its speed at `u`, as a share of its fastest */
    speed: (u: number) => at(V, u) / vmax,
    /** its speed at `u`: how much of the way it covers per whole move's time */
    rate: (u: number) => at(V, u),
  };
})();

/** the same curve as a CSS easing, so the page's content moves on the compositor */
export const PAN_EASE = `linear(${Array.from({ length: 49 }, (_, i) => {
  const u = i / 48;
  return `${PAN_PROFILE.E(u).toFixed(4)} ${(u * 100).toFixed(2)}%`;
}).join(", ")})`;
