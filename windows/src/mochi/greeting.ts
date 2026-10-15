// Morbido's own greeting: a gentle reveal, a smile and a soft return to the notch.
import { Sound } from "../core/sound";
import { COMPACT_W, NOTCH_H, NOTCH_W } from "../core/layout";
import { closeCurve } from "../core/anim";
import { drawMorbidoFace } from "./morbido";
export const GREETING_W = 640;
export const GREETING_H = 150;
export const GREETING_END = 4.6;
export const ASP = 1.34;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const k = clamp(v); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export interface Pose {
  hb: number; x: number; y: number; sx: number; sy: number; tilt: number;
  eye: "dot" | "happy" | "content"; open: number; eyeRoll: number; lookX: number; lookY: number;
  handL: number; handR: number; wave: number; badge: number; tint: number; halo: number; haloBlue: number;
  minis: number; fx: number; header: number; card: number; iw: number; ih: number;
}
function revealed(t: number): Pose {
  const k = smooth(t / 0.5); const pulse = t < 1.1 ? Math.sin(clamp((t - 0.3) / 0.8) * Math.PI) * 0.025 : 0;
  return { hb: lerp(17, 58, k), x: 320, y: lerp(NOTCH_H / 2, 90, k), sx: 1 + pulse, sy: 1 - pulse,
    tilt: 0, eye: t > 0.8 ? "happy" : "dot", open: 1, eyeRoll: 0, lookX: Math.sin(t * 0.9) * 0.08, lookY: 0,
    handL: 0, handR: 0, wave: -1, badge: 0, tint: 0, halo: 0, haloBlue: 0, minis: 0, fx: 0,
    header: smooth((t - 0.35) / 0.25), card: k, iw: lerp(NOTCH_W, GREETING_W, k), ih: lerp(NOTCH_H, GREETING_H, k) };
}
export function greetingPose(t: number, tc = Infinity): Pose {
  const p = revealed(Math.min(t, GREETING_END));
  if (t < tc) return p;
  const a = revealed(tc); const k = clamp((t - tc) / 0.34); const e = k === 1 ? 1 : closeCurve(k);
  return { ...a, hb: lerp(a.hb, 17, e), y: lerp(a.y, NOTCH_H / 2, e), sx: lerp(a.sx, 1, e), sy: lerp(a.sy, 1, e),
    eye: "dot", lookX: a.lookX * (1 - e), header: a.header * (1 - smooth((t - tc) / 0.1)),
    card: a.card * (1 - smooth((t - tc) / 0.18)), iw: lerp(a.iw, COMPACT_W, e), ih: lerp(a.ih, NOTCH_H, e) };
}
/** Legacy API name retained for geometry callers; the bounds now describe Morbido. */
export function mochiBounds(p: Pose) {
  if (p.hb <= 0.4) return null;
  return { left: p.x - p.hb * ASP / 2 * p.sx, right: p.x + p.hb * ASP / 2 * p.sx,
    top: p.y - p.hb / 2 * p.sy, bottom: p.y + p.hb / 2 * p.sy };
}
export class Greeting {
  private startMs = 0; private tc = Infinity; private fired = false;
  private timer: number | null = null;
  onComplete: (() => void) | null = null;
  start() { this.leave(); this.startMs = performance.now(); this.tc = Infinity; this.fired = false;
    Sound.play("greeting"); this.timer = window.setTimeout(() => this.fire(), (GREETING_END + 0.05) * 1000); }
  hover() { if (this.tc >= 4.9) this.tc = Infinity; }
  interrupt() { this.tc = Math.min(this.tc, this.elapsed); this.cancelTimer(); Sound.fadeOut("greeting", 0.25); }
  leave() { this.cancelTimer(); Sound.fadeOut("greeting", 0.2); }
  get elapsed() { return (performance.now() - this.startMs) / 1000; }
  get done() { return this.fired; }
  private fire() { if (this.fired) return; this.fired = true; this.cancelTimer(); this.onComplete?.(); }
  private cancelTimer() { if (this.timer !== null) window.clearTimeout(this.timer); this.timer = null; }
  draw(ctx: CanvasRenderingContext2D) {
    const t = this.elapsed;
    if (!this.fired && (t >= GREETING_END && this.tc === Infinity || t >= this.tc + 0.34)) this.fire();
    const p = greetingPose(t, this.tc); ctx.clearRect(0, 0, GREETING_W, GREETING_H);
    if (p.card > 0) { ctx.save(); ctx.globalAlpha = p.card; ctx.fillStyle = "#141816";
      ctx.beginPath(); ctx.roundRect(10, 36, 620, 104, 20); ctx.fill(); ctx.restore(); }
    const compact = clamp((34 - p.hb) / 17);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.sx, p.sy);
    drawMorbidoFace(ctx, lerp(p.hb * ASP, COMPACT_W, compact), lerp(p.hb, NOTCH_H, compact),
      { eye: p.eye === "happy" ? "happy" : "pill", open: p.open, lookX: p.lookX, time: t, eyesOnly: p.hb < 28 });
    ctx.restore();
  }
}
