import test from "node:test";
import assert from "node:assert/strict";
import { setCompanion, getCompanion, parseCompanion } from "../src/mochi/companion.ts";
import { BotEngine, BOT_STATES } from "../src/mochi/engine.ts";
import { MORBIDO_MOUTHS, drawMorbidoFace } from "../src/mochi/morbido.ts";
import { State } from "../src/core/state.ts";

function canvas() {
  const calls = [], colours = [];
  const gradient = { addColorStop(_, colour) { colours.push(colour); } };
  const ctx = new Proxy({ globalAlpha: 1 }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "createLinearGradient") return () => gradient;
      return (...args) => {
        for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), `${key}: ${arg}`);
        calls.push([key, ...args]);
      };
    },
    set(target, key, value) { target[key] = value; if ((key === "fillStyle" || key === "strokeStyle") && typeof value === "string") colours.push(value); return true; },
  });
  return { ctx, calls, colours };
}
test("old, absent and unknown preferences select Morbido; notifications propagate Morbido", () => {
  assert.equal(parseCompanion(undefined), "morbido"); assert.equal(parseCompanion("future"), "morbido");
  const saved = State.settings.companion;
  State.settings.companion = "morbido"; State.notify(); assert.equal(getCompanion(), "morbido");
  State.settings.companion = saved; State.notify();
});
test("every software state and eye override renders finite geometry at miniature and full sizes", () => {
  assert.deepEqual(Object.keys(MORBIDO_MOUTHS).sort(), Object.keys(BOT_STATES).sort());
  for (const state of Object.keys(BOT_STATES)) for (const eye of ["pill","wide","dot","line","flat","happy","closed","spiral","heart","star","tired","wink","cup"]) {
    for (const [w,h] of [[14,10],[288,32],[68,58],[120,120]]) {
      const { ctx, calls, colours } = canvas();
      drawMorbidoFace(ctx,w,h,{state,eye,lookX:1,lookY:-1,open:0.1,surface:true});
      assert.equal(calls.filter(c => c[0] === "save").length, calls.filter(c => c[0] === "restore").length);
      assert.ok(colours.every(c => ["#202522","#181c1a","#f0f2e9","#cddfd3"].includes(c)), colours.join(","));
    }
  }
});
test("compact and miniature omit the mouth; the main face has one", () => {
  for (const [eyesOnly, curves] of [[true,0],[false,1]]) {
    const {ctx,calls}=canvas(); drawMorbidoFace(ctx,100,80,{eyesOnly});
    assert.equal(calls.filter(c => c[0] === "quadraticCurveTo").length,curves);
  }
});
test("alternate engine handles all states and reactions without Mochi colours or outfit drawing", () => {
  setCompanion("morbido");
  try {
    for (const state of Object.keys(BOT_STATES)) {
      const e = new BotEngine(); e.setState(state,true); e.setOutfit("witchHat",false);
      e.update(.02); const c=canvas(); e.draw(c.ctx,100,140);
      assert.ok(c.colours.every(v => ["#202522","#181c1a","#f0f2e9","#cddfd3"].includes(v)));
    }
    for (const emote of ["love","surprised","proud","wink","yawn","happy","annoyed"]) {
      const e=new BotEngine(); e.setPermanentEmote(emote); e.update(.02); e.draw(canvas().ctx,100,140);
    }
  } finally { setCompanion("mochi"); }
});
