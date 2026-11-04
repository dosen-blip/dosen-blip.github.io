/**
 * Artwork behind the glass, in the brand colours: beige, near-black and the blue. The folders on the home page and
 * the glass cards share these recipes.
 * Web and UX follow the theme; Motion is always smoked glass over black, because black is for anything that moves.
 */
export const glassLooks = {
  web: {
    tone: "auto",
    labelPlacement: "bottom-left",
    art: { style: "streak", colors: ["#f7f5ed", "#cfd9f5", "#386dff", "#171916", "#2b4fb8", "#9db6ff", "#f7f5ed"], scale: 0.7, warp: 1.5, angle: -0.6, gloss: 0.2, veins: 0 },
    seed: 7,
  },
  motion: {
    tone: "dark",
    labelPlacement: "bottom-left",
    art: { style: "marble", colors: ["#050507", "#0c0c0f", "#1d2a55", "#171916", "#386dff", "#7fa0ff", "#e6ecff"], scale: 0.62, warp: 3.2, angle: -0.5, gloss: 0.55, veins: 0.6 },
    seed: 11,
  },
  ux: {
    tone: "auto",
    labelPlacement: "bottom-left",
    art: { style: "streak", colors: ["#fbfaf6", "#e4e8f2", "#9db6ff", "#efece2", "#c7d4f7", "#ffffff"], scale: 0.7, warp: 1.6, angle: 0.35, gloss: 0.25, veins: 0 },
    seed: 3,
  },
}
