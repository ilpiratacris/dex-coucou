// Morbido: the notch itself is a face. No head, cheeks, pupils or outfits.
// Shared by the animation engine and the dedicated greeting/upload canvases.
import type { BotStateName } from "../core/layout";
import type { EyeShape } from "./engine";

type Mouth = "smile" | "flat" | "oh" | "frown" | "grin" | "sleep";
export const MORBIDO_MOUTHS: Record<BotStateName, Mouth> = {
  idle: "smile", working: "flat", thinking: "flat", searching: "oh",
  approval: "oh", question: "oh", error: "frown", finished: "grin",
  ratelimit: "frown", sleeping: "sleep", dizzy: "oh",
};

export interface FacePose {
  eye?: EyeShape;
  state?: BotStateName;
  lookX?: number;
  lookY?: number;
  open?: number;
  scale?: number;
  /** Surface only for detached desktop/miniature faces, never inside the notch. */
  surface?: boolean;
  eyesOnly?: boolean;
  /** Spread the face across the expanded notch, without stretching its features. */
  wide?: boolean;
  /** Animation clock in seconds: reading and state companions stay in sync. */
  time?: number;
}

/** All eye overrides supported by BotEngine, drawn as solid shapes/lines. */
export function drawMorbidoEye(c: CanvasRenderingContext2D, eye: EyeShape, w: number, h: number, side: number) {
  c.lineCap = "round";
  c.lineJoin = "round";
  c.lineWidth = Math.max(1.2, w * 0.72);
  c.beginPath();
  switch (eye) {
    case "closed": case "line": case "flat": case "tired":
      c.moveTo(-w * 0.55, 0); c.lineTo(w * 0.55, eye === "flat" ? side * h * 0.1 : 0); c.stroke(); break;
    case "happy": case "cup":
      c.moveTo(-w * 0.65, h * 0.12);
      c.quadraticCurveTo(0, eye === "happy" ? -h * 0.6 : h * 0.6, w * 0.65, h * 0.12); c.stroke(); break;
    case "wink":
      if (side > 0) { c.moveTo(-w * 0.5, 0); c.lineTo(w * 0.5, 0); c.stroke(); }
      else { c.roundRect(-w / 2, -h / 2, w, h, w / 2); c.fill(); } break;
    case "heart":
      c.moveTo(0, h * 0.45);
      c.bezierCurveTo(-w * 1.3, -h * 0.05, -w * 0.65, -h * 0.85, 0, -h * 0.3);
      c.bezierCurveTo(w * 0.65, -h * 0.85, w * 1.3, -h * 0.05, 0, h * 0.45); c.fill(); break;
    case "star":
      // Rounded four-point whole eye, without an iris or highlight.
      c.moveTo(0, -h * 0.6);
      c.quadraticCurveTo(w * 0.16, -h * 0.12, w * 0.8, 0);
      c.quadraticCurveTo(w * 0.16, h * 0.12, 0, h * 0.6);
      c.quadraticCurveTo(-w * 0.16, h * 0.12, -w * 0.8, 0);
      c.quadraticCurveTo(-w * 0.16, -h * 0.12, 0, -h * 0.6); c.fill(); break;
    case "spiral":
      // Dizzy is an entire wavy eye, avoiding a spiral that looks like a pupil.
      c.moveTo(-w * 0.6, -h * 0.25);
      c.bezierCurveTo(w, -h * 0.65, -w, h * 0.65, w * 0.6, h * 0.25); c.stroke(); break;
    case "dot": case "wide": case "pill":
      c.roundRect(-w / 2, -h / 2, w, h, w / 2); c.fill(); break;
  }
}

/** Bounds in CSS pixels, centered in the caller's local coordinates. */
export function drawMorbidoFace(c: CanvasRenderingContext2D, width: number, height: number, p: FacePose = {}) {
  if (width <= 0 || height <= 0) return;
  const state = p.state ?? "idle";
  const eye = p.eye ?? "pill";
  const only = p.eyesOnly ?? height <= 24;
  c.save();
  if (p.surface) {
    const g = c.createLinearGradient(0, -height / 2, 0, height / 2);
    g.addColorStop(0, "#202522"); g.addColorStop(1, "#181c1a");
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-width / 2, -height / 2, width, height, Math.min(height * 0.38, width / 2)); c.fill();
  }
  const s = Math.min(height, width * 0.76);
  const ew = s * (eye === "wide" || eye === "dot" ? 0.19 : 0.16) * (p.scale ?? 1);
  const eh = s * (eye === "wide" ? 0.35 : eye === "dot" ? 0.29 : 0.29);
  const spread = Math.min(width * 0.24, s * (only ? 1.1 : p.wide ? 0.95 : 0.39));
  const time = p.time ?? 0;
  // Slow left-to-right reading, with a soft return to the next line. Whole
  // eyes move behind the glasses; there is no pupil or iris.
  const reading = state === "working" ? Math.sin(time * 2.1) * 0.65 : 0;
  const lx = Math.max(-1, Math.min(1, (p.lookX ?? 0) * (state === "working" ? 0.35 : 1) + reading)) * s * 0.085;
  const ly = Math.max(-1, Math.min(1, (p.lookY ?? 0) + (state === "working" ? 0.2 + Math.sin(time * 1.05) * 0.12 : 0))) * s * 0.065;
  const ink = c.createLinearGradient(0, -s / 2, 0, s / 2);
  ink.addColorStop(0, "#f0f2e9"); ink.addColorStop(1, "#cddfd3");
  c.fillStyle = ink; c.strokeStyle = ink;
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * spread + lx, (only ? 0 : -s * 0.12) + ly);
    c.scale(1, Math.max(0.12, Math.min(1, p.open ?? 1)));
    drawMorbidoEye(c, eye, ew, eh, side);
    c.restore();
  }
  if (state === "working") {
    const gw = Math.max(ew * 1.85, s * 0.23), gh = eh * 0.83;
    const gy = (only ? 0 : -s * 0.12) + s * 0.025;
    c.lineWidth = Math.max(1.2, s * 0.031); c.lineCap = "round";
    for (const side of [-1, 1]) {
      c.beginPath(); c.roundRect(side * spread - gw / 2, gy - gh / 2, gw, gh, gh * 0.35); c.stroke();
      c.beginPath(); c.moveTo(side * (spread + gw / 2), gy - gh * 0.15);
      c.lineTo(side * (spread + gw / 2 + s * 0.045), gy - gh * 0.25); c.stroke();
    }
    c.beginPath(); c.moveTo(-spread + gw / 2, gy - gh * 0.18);
    c.quadraticCurveTo(0, gy - gh * 0.43, spread - gw / 2, gy - gh * 0.18); c.stroke();
  }
  if (!only) {
    let mouth = MORBIDO_MOUTHS[state];
    if (eye === "happy" || eye === "heart" || eye === "star" || eye === "wink") mouth = state === "finished" ? "grin" : "smile";
    if (eye === "closed") mouth = "sleep";
    if (eye === "line" || eye === "flat") mouth = "frown";
    if (eye === "tired" && state !== "ratelimit") mouth = "oh";
    const y = s * 0.21 + ly * 0.3;
    const mw = s * (mouth === "grin" ? 0.19 : 0.14);
    c.lineWidth = Math.max(2, s * 0.067);
    c.lineCap = "round";
    c.beginPath();
    if (mouth === "oh") {
      c.ellipse(lx * 0.3, y, s * 0.043, s * 0.066, 0, 0, Math.PI * 2); c.stroke();
    } else {
      c.moveTo(-mw + lx * 0.3, y);
      c.quadraticCurveTo(lx * 0.3, y + s * (mouth === "smile" || mouth === "grin" ? 0.16 : mouth === "frown" ? -0.10 : 0.015), mw + lx * 0.3, y);
      c.stroke();
    }
    drawStateCompanion(c, state, s, time);
    if (state === "error" || eye === "flat" || eye === "line") {
      c.lineWidth = Math.max(1.5, s * 0.046);
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * (spread + ew * 0.62), -s * 0.36);
        c.lineTo(side * (spread - ew * 0.55), -s * 0.30); c.stroke();
      }
    }
  }
  c.restore();
}

/** Small matte companions give states a meaning without relying on colour. */
function drawStateCompanion(c: CanvasRenderingContext2D, state: BotStateName, s: number, time: number) {
  if (state === "idle" || state === "working") return;
  c.save(); c.translate(s * 0.53, -s * 0.34);
  c.lineWidth = Math.max(1, s * 0.025); c.lineCap = "round"; c.lineJoin = "round";
  const r = s * 0.055;
  const line = (x: number, y: number, x1: number, y1: number) => { c.beginPath(); c.moveTo(x,y); c.lineTo(x1,y1); c.stroke(); };
  switch (state) {
    case "thinking":
      for (let i = 0; i < 3; i++) { c.save(); c.globalAlpha *= 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(time * 3 - i * 0.8)); c.beginPath(); c.arc(0, (i-1) * r * 1.4, r * 0.35, 0, Math.PI * 2); c.fill(); c.restore(); } break;
    case "searching":
      c.translate(Math.sin(time * 1.8) * r * 0.2, 0);
      c.beginPath(); c.arc(-r * 0.25, -r * 0.2, r * 0.7, 0, Math.PI * 2); c.stroke();
      line(r * 0.2, r * 0.3, r * 0.85, r * 0.95); break;
    case "approval":
      c.beginPath(); c.arc(0,0,r * 1.2,0,Math.PI * 2); c.stroke();
      line(-r * 0.35,-r * 0.48,-r * 0.35,r * 0.48); line(r * 0.35,-r * 0.48,r * 0.35,r * 0.48); break;
    case "question":
      c.beginPath(); c.moveTo(-r * 0.65,-r * 0.35);
      c.bezierCurveTo(-r * 0.65,-r * 1.2,r * 0.95,-r * 1.2,r * 0.65,-r * 0.3);
      c.quadraticCurveTo(0,r * 0.05,0,r * 0.4); c.stroke();
      c.beginPath(); c.arc(0,r * 1.1,r * 0.18,0,Math.PI * 2); c.fill(); break;
    case "error":
      line(0,-r,0,r * 0.25); c.beginPath(); c.arc(0,r,r * 0.18,0,Math.PI * 2); c.fill(); break;
    case "finished":
      for (const [x,y,k] of [[0,0,1],[-r * 1.3,-r * 1.4,0.5]]) {
        c.save(); c.translate(x,y); c.scale(k,k);
        c.beginPath(); c.moveTo(0,-r); c.quadraticCurveTo(r * 0.18,-r * 0.18,r,0);
        c.quadraticCurveTo(r * 0.18,r * 0.18,0,r); c.quadraticCurveTo(-r * 0.18,r * 0.18,-r,0);
        c.quadraticCurveTo(-r * 0.18,-r * 0.18,0,-r); c.fill(); c.restore();
      } break;
    case "ratelimit":
      line(-r * 0.75,-r,r * 0.75,-r); line(-r * 0.75,r,r * 0.75,r);
      c.beginPath(); c.moveTo(-r * 0.65,-r); c.bezierCurveTo(-r * 0.65,-r * 0.2,r * 0.65,r * 0.2,r * 0.65,r);
      c.moveTo(r * 0.65,-r); c.bezierCurveTo(r * 0.65,-r * 0.2,-r * 0.65,r * 0.2,-r * 0.65,r); c.stroke(); break;
    case "sleeping":
      c.translate(0,-Math.sin(time * 1.2) * r * 0.3);
      c.beginPath(); c.moveTo(-r * 0.7,-r * 0.8); c.lineTo(r * 0.7,-r * 0.8);
      c.lineTo(-r * 0.7,r * 0.8); c.lineTo(r * 0.7,r * 0.8); c.stroke(); break;
    case "dizzy":
      c.rotate(Math.sin(time * 1.5) * 0.35); c.beginPath(); c.ellipse(0,0,r * 1.1,r * 0.45,-0.3,0,Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(r * Math.cos(time * 2),r * 0.45 * Math.sin(time * 2),r * 0.23,0,Math.PI * 2); c.fill(); break;
  }
  c.restore();
}
