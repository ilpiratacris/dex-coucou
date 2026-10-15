// Original wardrobe artwork is excluded. This route now presents our companion.
import { h } from "./dom";
import { drawMorbidoFace } from "../mochi/morbido";
import { tl } from "../i18n/i18n";
import type { ViewActions, ViewHost } from "./views";
export function buildWardrobe(_actions: ViewActions): ViewHost {
  const canvas = h("canvas");
  const el = h("div", { class: "view wardrobe" }, h("div", { class: "card" },
    h("div", { class: "stack wardrobe-stack" }, h("span", { class: "wardrobe-title", text: "Morbido" }), canvas,
      h("span", { class: "hint", text: tl("Morbido changes expression with your activity. Reading glasses appear while working.") }))));
  return { el, sync() {
    const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = 100 * dpr; canvas.height = 70 * dpr;
    canvas.style.width = "100px"; canvas.style.height = "70px";
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 50 * dpr, 35 * dpr);
    drawMorbidoFace(ctx, 90, 60, { eye: "happy", surface: true });
  } };
}
