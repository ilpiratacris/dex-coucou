// Morbido: independent motion and face renderer for this fork.
// Public field names remain compatible with the island and desktop controllers.
import { Ease, type EaseFn } from "../core/anim";
import { Sound } from "../core/sound";
import type { BotEmoteName, BotStateName } from "../core/layout";
import type { Outfit } from "./wardrobe";
import { drawMorbidoFace } from "./morbido";
export type EyeShape = "pill" | "wide" | "dot" | "line" | "flat" | "happy" | "closed" | "spiral" | "heart" | "star" | "tired" | "wink" | "cup";
export type RGB = readonly [number, number, number];
export type BadgeKind = "dots" | "bang" | "question" | "dot";
export interface Badge { kind: BadgeKind; color: RGB }
export type TweenKey = readonly [number, number, EaseFn];
type PropKey = "yaw" | "pitch" | "roll" | "tilt" | "open" | "sx" | "sy" | "oy" | "ox" | "tint" | "morph" | "hands" | "blush" | "es" | "badgeS" | "outfitPresence";
interface BotStateCfg { color: RGB; tint: number; eye: EyeShape; badge: Badge | null; bounces: boolean; scans: boolean; breathes: boolean; zz: boolean; sweat: boolean; look: readonly [number, number] | null; tilt: number }
const INK: RGB = [0.80, 0.87, 0.83];
const cfg = (eye: EyeShape, rest: Partial<BotStateCfg> = {}): BotStateCfg => ({ color: INK, tint: 0, eye, badge: null, bounces: false, scans: false, breathes: false, zz: false, sweat: false, look: null, tilt: 0, ...rest });
export const BOT_STATES: Record<BotStateName, BotStateCfg> = {
  idle: cfg("pill"), working: cfg("pill"), thinking: cfg("pill", { look: [0.22, -0.28] }),
  searching: cfg("wide", { scans: true }), approval: cfg("wide"), question: cfg("wide", { tilt: 0.065 }),
  error: cfg("flat"), finished: cfg("happy"), ratelimit: cfg("tired"), sleeping: cfg("closed", { breathes: true }), dizzy: cfg("spiral"),
};
export const STATE_SOUND: Partial<Record<BotStateName, string>> = { working: "work", thinking: "think", searching: "search", approval: "approval", question: "question", error: "error", finished: "finish", ratelimit: "rate", sleeping: "sleep", dizzy: "dizzy" };
const EMOTE_EYE: Record<BotEmoteName, EyeShape> = { love: "heart", surprised: "wide", proud: "star", wink: "wink", yawn: "tired", happy: "happy", annoyed: "line" };
const now = () => performance.now() / 1000;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function hexToRGB(hex: string): RGB { const v = parseInt(hex.replace("#", ""), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; }
export function stepDanceLevel(level: number, dancing: boolean, dt: number) { return clamp(level + dt * (dancing ? 3.1 : -2.1), 0, 1); }
/** Small elastic sway: no character somersaults, hands or original particles. */
export function danceTransform(seconds: number, level: number, R: number) {
  const a = seconds * Math.PI * 3;
  return { dx: Math.sin(a) * R * 0.035 * level, dy: Math.cos(a * 2) * R * 0.018 * level,
    rotate: Math.sin(a) * 0.035 * level, sx: 1 + Math.sin(a * 2) * 0.012 * level, sy: 1 - Math.sin(a * 2) * 0.012 * level };
}
interface Motion { prop: PropKey; keys: TweenKey[]; index: number; from: number; start: number; done?: () => void }
export class BotEngine {
  isMini = false; bodyColor: RGB | null = null;
  facePresentation: "embedded" | "detached" | "compact" | "stage" = "detached";
  yaw = 0; pitch = 0; roll = 0; tilt = 0; open = 1; sx = 1; sy = 1; oy = 0; ox = 0;
  tint = 0; morph = 0; hands = 0; blush = 0; es = 1; badgeS = 0;
  // Retained only as profile/protocol compatibility; no original outfit is drawn.
  outfit: Outfit = "none"; outfitPresence = 0;
  tgYaw = 0; tgPitch = 0; tgTilt = 0; tgSy = 1; tgSx = 1; tgEs = 1;
  particleOverhang = 0; isDancing = false; dancingLevel = 0;
  slotH = 0; slotHTarget = 0; slotHVel = 0; isChewing = false;
  col: RGB = INK; colT: RGB = INK;
  state: BotStateName = "idle"; cfg = BOT_STATES.idle; badge: Badge | null = null;
  eyeOverride: EyeShape | null = null; eyeOverrideUntil = 0;
  permanentEye: EyeShape | null = null; permanentEmote: BotEmoteName | null = null;
  miniNextBehavior = 0; lookX = 0; lookY = 0; lastTime = now(); waveUntil = 0; waveStart = 0;
  onDizzy: (() => void) | null = null;
  private motions = new Map<PropKey, Motion>();
  private blinkAt = now() + 3.6;
  private taps: number[] = [];
  private faceEye: EyeShape = "pill"; private facePrevious: EyeShape = "pill"; private faceBlend = 1;
  setState(next: BotStateName, force = false) {
    if (next === this.state && !force) return;
    this.state = next; this.cfg = BOT_STATES[next]; this.colT = this.cfg.color;
    this.setBadge(this.cfg.badge);
    if (next === "finished") this.squash();
    if (next === "error") this.anim("ox", [[0.025, 120, Ease.inOut], [-0.025, 160, Ease.inOut], [0, 220, Ease.out]]);
    if (next === "approval" || next === "question") this.blink();
  }
  setBadge(badge: Badge | null) { this.badge = badge; this.badgeS = badge ? 1 : 0; }
  blink() { if (!this.motions.has("open")) this.anim("open", [[0.04, 105, Ease.inOut], [1, 175, Ease.inOut]]); }
  squash() { this.anim("sx", [[1.035, 145, Ease.out], [1, 310, Ease.inOut]]); this.anim("sy", [[0.965, 145, Ease.out], [1, 310, Ease.inOut]]); }
  gulp() { this.triggerEmote("happy", 0.8); this.squash(); }
  slap() {
    this.interruptGreet(); const t = now();
    this.taps = this.taps.filter(v => t - v < 1.7); this.taps.push(t);
    Sound.play("slap"); this.squash();
    if (this.taps.length >= 3) { this.taps = []; this.onDizzy?.(); }
    else this.triggerEmote("annoyed", 0.7);
  }
  doRoll(_durationMs: number, _turns: number) { this.squash(); }
  greet() { this.waveStart = now(); this.waveUntil = now() + 1.1; this.triggerEmote("happy", 1.1); this.squash(); Sound.play("greet"); }
  interruptGreet() { this.waveUntil = 0; this.waveStart = 0; }
  setPermanentEmote(emote: BotEmoteName | null) { this.permanentEmote = emote; this.permanentEye = emote ? EMOTE_EYE[emote] : null; this.eyeOverride = this.permanentEye; this.eyeOverrideUntil = emote ? Infinity : 0; }
  triggerEmote(emote: BotEmoteName, duration = 1.8) { this.eyeOverride = EMOTE_EYE[emote]; this.eyeOverrideUntil = now() + duration; this.squash(); }
  animateMorph(target: number, durationMs = 420) { this.anim("morph", [[target, durationMs, Ease.inOut]]); }
  resetMorph() { this.motions.delete("morph"); this.morph = 0; }
  setOutfit(_next: Outfit, _animated = true) { this.outfit = "none"; this.outfitPresence = 0; }
  get busy() {
    return this.motions.size > 0 || this.faceBlend < 1 || this.isMini || this.isDancing || this.dancingLevel > 0.001 ||
      ["working", "thinking", "searching", "sleeping", "dizzy"].includes(this.state) ||
      Math.abs(this.yaw - this.tgYaw) > 0.002 || Math.abs(this.pitch - this.tgPitch) > 0.002 ||
      Math.abs(this.es - this.tgEs) > 0.002 || Math.abs(this.tilt - this.tgTilt) > 0.002;
  }
  anim(prop: PropKey, keys: TweenKey[], done?: () => void) {
    if (!keys.length) { done?.(); return; }
    this.motions.set(prop, { prop, keys, index: 0, from: this[prop], start: performance.now(), done });
  }
  update(dt: number) {
    const n = now(); const ms = n * 1000; const d = clamp(dt, 0, 0.06);
    for (const m of [...this.motions.values()]) {
      const [value, duration, ease] = m.keys[m.index]; const k = clamp((ms - m.start) / Math.max(duration, 1), 0, 1);
      this[m.prop] = m.from + (value - m.from) * ease(k);
      if (k === 1) { m.from = value; m.index++; m.start = ms; if (m.index === m.keys.length) { this.motions.delete(m.prop); m.done?.(); } }
    }
    this.tgYaw = this.cfg.scans ? Math.sin(n * 1.4) * 0.65 : this.lookX * 0.65;
    this.tgPitch = this.lookY * 0.5;
    if (this.cfg.look) { this.tgYaw += this.cfg.look[0]; this.tgPitch += this.cfg.look[1]; }
    if (this.isMini) { this.tgYaw = Math.sin(n * 0.7) * 0.35; this.tgPitch = Math.sin(n * 0.43) * 0.15; }
    if (this.state === "sleeping") { this.tgYaw = 0; this.tgPitch = 0; }
    this.tgTilt = this.cfg.tilt;
    const k = 1 - Math.exp(-9 * d);
    for (const [prop, target] of [["yaw", this.tgYaw], ["pitch", this.tgPitch], ["tilt", this.tgTilt], ["es", this.tgEs]] as const)
      if (!this.motions.has(prop)) this[prop] += (target - this[prop]) * k;
    const breath = this.state === "sleeping" ? Math.sin(n * 1.1) * 0.012 : 0;
    if (!this.motions.has("sx")) this.sx += (1 - breath - this.sx) * k;
    if (!this.motions.has("sy")) this.sy += (1 + breath - this.sy) * k;
    if (n >= this.blinkAt) { if (this.state !== "sleeping" && this.state !== "dizzy") this.blink(); this.blinkAt = n + 3.4 + Math.random() * 2.3; }
    if (this.eyeOverride && n > this.eyeOverrideUntil) { this.eyeOverride = this.permanentEye; this.eyeOverrideUntil = this.permanentEye ? Infinity : 0; }
    const eye = this.eyeOverride ?? this.cfg.eye;
    if (eye !== this.faceEye) { this.facePrevious = this.faceEye; this.faceEye = eye; this.faceBlend = 0; }
    this.faceBlend = Math.min(1, this.faceBlend + d / 0.22);
    this.dancingLevel = stepDanceLevel(this.dancingLevel, this.isDancing, d); this.lastTime = n;
  }
  setDancing(value: boolean) { this.isDancing = value; }
  applyDance(ctx: CanvasRenderingContext2D, W: number, H: number) {
    if (this.dancingLevel < 0.001) return;
    const p = danceTransform(now(), this.dancingLevel, W * 0.3);
    ctx.translate(W / 2 + p.dx, H / 2 + p.dy); ctx.rotate(p.rotate); ctx.scale(p.sx, p.sy); ctx.translate(-W / 2, -H / 2);
  }
  draw(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const compact = this.facePresentation === "compact"; const R = W * 0.3;
    const stage = this.facePresentation === "stage";
    const width = compact || stage ? W : R * 2.28; const height = compact || stage ? H : R * 1.76;
    ctx.save(); ctx.translate(W / 2 + this.ox * (compact ? 6 : stage ? H * 0.3 : R), compact ? H / 2 : stage ? H / 2 + this.oy * H * 0.3 : H / 2 + this.particleOverhang / 2 + this.oy * R + R * 0.06);
    ctx.rotate(this.tilt); ctx.scale(this.sx, this.sy);
    const pose = { state: this.state, lookX: this.yaw, lookY: this.pitch, open: this.open, time: now(), scale: this.es,
      surface: this.facePresentation === "detached", eyesOnly: compact || this.isMini, wide: stage };
    if (this.faceBlend < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - this.faceBlend; drawMorbidoFace(ctx, width, height, { ...pose, eye: this.facePrevious }); ctx.restore();
      ctx.save(); ctx.globalAlpha *= this.faceBlend; drawMorbidoFace(ctx, width, height, { ...pose, eye: this.faceEye }); ctx.restore();
    } else drawMorbidoFace(ctx, width, height, { ...pose, eye: this.faceEye });
    ctx.restore();
  }
}
