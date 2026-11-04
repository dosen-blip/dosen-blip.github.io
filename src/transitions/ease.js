export const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const lerp = (a, b, t) => a + (b - a) * t
export const easeInOutCubic = (x) => (x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
export const easeOutCubic = (x) => 1 - (1 - x) ** 3
