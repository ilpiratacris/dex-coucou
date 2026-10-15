import "../src/style.css";
import { setCompanion } from "../src/mochi/companion";
import { BotEngine, BOT_STATES } from "../src/mochi/engine";
import { State } from "../src/core/state";
import { Sound } from "../src/core/sound";
import { Island } from "../src/island/island";
import { Greeting } from "../src/mochi/greeting";
import { UploadCanvas } from "../src/upload/canvas";
import { UploadSeq, USC } from "../src/upload/sequence";
import { VIEW_LAYOUTS } from "../src/core/layout";
import { setLanguage } from "../src/i18n/i18n";

setCompanion("morbido"); setLanguage("it"); Sound.setEnabled(false);
State.settings = { ...State.settings, companion: "morbido", language: "it", soundEnabled: false, showPillsArea: false, activeIntegrations: [] };
State.tasks = [{ id: "agent_codex", name: "Codex", state: "idle", color: "#00b68f", steps: ["Preparazione anteprima"], stepIndex: 0, source: "agent", isIntegration: false }];
State.noteMessage = "Morbido è pronto.";
State.droppedFile = { name: "esempio.pdf", path: "" };
State.searchResult = { title: "Risultati di esempio", items: [{ label: "Documento", detail: "Contenuto di prova" }] };
const island = new Island(document.getElementById("root"));
function show(view, mode = "expanded", state = "idle") {
  State.stateOverride = state; State.paused = false; State.mochiOnDesktop = false;
  island.fsm.pinned = true; State.isPinned = true; island.setView(view); island.setMode(mode); State.notify();
}
for (const [view] of Object.entries(VIEW_LAYOUTS)) {
  const b = document.createElement("button"); b.textContent = view; b.onclick = () => show(view); document.getElementById("controls").append(b);
}
for (const mode of ["hidden", "compact"]) {
  const b = document.createElement("button"); b.textContent = mode; b.onclick = () => show("overview", mode); document.getElementById("controls").append(b);
}
show("overview");
const draws = [];
function figure(parent, label, w, h, draw, cls = "") {
  const f = document.createElement("figure"); f.className = cls;
  const c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2; c.style.width = `${w}px`;
  const cap = document.createElement("figcaption"); cap.textContent = label; f.append(c, cap); document.getElementById(parent).append(f);
  const ctx = c.getContext("2d"); draws.push(dt => { ctx.setTransform(2,0,0,2,0,0); ctx.clearRect(0,0,w,h); draw(ctx,dt,w,h); }); return c;
}
let mouse = { x: 0, y: 0 };
document.addEventListener("pointermove", e => { mouse = { x: (e.clientX / innerWidth - .5) * 2, y: (.5 - e.clientY / innerHeight) * 2 }; State.mouse = { x: e.clientX, y: e.clientY }; State.notify(); });
let frozen = false;
function engineDraw(e) { return (ctx,dt,w,h) => { e.lookX = frozen ? 0 : mouse.x; e.lookY = frozen ? 0 : mouse.y; e.update(dt); if(frozen) e.open = 1; e.draw(ctx,w,h); }; }
const stateLabels = { idle:"Sereno", working:"Al lavoro", thinking:"Ragiona", searching:"Cerca", approval:"Attende conferma", question:"Domanda", error:"Errore", finished:"Completato", ratelimit:"Limite raggiunto", sleeping:"Dorme", dizzy:"Stordito" };
for (const state of Object.keys(BOT_STATES)) { const e = new BotEngine(); e.facePresentation = "embedded"; e.setState(state,true); figure("states", `${stateLabels[state]} · ${state}`,200,140,engineDraw(e)); }
for (const [emote,label] of Object.entries({ love:"Affetto", surprised:"Sorpresa", proud:"Orgoglio", wink:"Occhiolino", yawn:"Sbadiglio", happy:"Felicità", annoyed:"Infastidito" })) {
  const e = new BotEngine(); e.facePresentation = "embedded"; e.setPermanentEmote(emote); if (emote === "wink") e.eyeOverride = "wink"; figure("emotes",`${label} · ${emote}`,200,140,engineDraw(e));
}
for (const [label,w,h,kind] of [["Notch compatto · 288 × 32",288,32,"compact"],["Desktop · 120 × 120",120,120,"detached"],["Miniatura · soli occhi",40,40,"mini"],["Recap · immagine condivisa",160,160,"detached"]]) {
  const e = new BotEngine(); e.facePresentation = kind === "mini" ? "detached" : kind; e.isMini = kind === "mini";
  figure("representations",label,w,h,engineDraw(e),"small");
}
for (const [label,time] of [["Saluto · ingresso",.8],["Saluto · sorriso",1.7],["Saluto · rilassato",2.7],["Saluto · ritorno compatto",4.5]]) {
  const greeting = new Greeting(); greeting.fired = true;
  figure("representations",label,640,150,(ctx) => { greeting.startMs = performance.now() - time * 1000; greeting.draw(ctx); },"wide");
}
for (const [label,time] of [["File · zona di rilascio",0],["File · bocca aperta",USC.T_DROP+.12],["File · caricamento",USC.T_PROG_START+1],["File · scelta successiva",USC.T_PROG_START+3.3]]) {
  const upload = new UploadCanvas({ ask() {}, cancel() {} });
  UploadSeq.enterZone(300,50);
  if (time > 0) UploadSeq.performDrop(2.4);
  UploadSeq.simulateTo(time);
  const f = UploadSeq.computeFrame(time);
  UploadSeq.deactivate();
  figure("representations",label,640,USC.ISL_H,(ctx) => {
    upload.draw(f,time); ctx.drawImage(upload.canvas,0,0,640,USC.ISL_H);
  },"wide");
}
let last = performance.now();
function frame(now) { const dt = Math.min(.033,(now-last)/1000); last=now; for (const draw of draws) draw(dt); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
window.morbidoPreview = { show, State, island, views: Object.keys(VIEW_LAYOUTS), freeze(value = true) { frozen = value; }, setCompanion(value) { State.settings.companion=value; State.notify(); } };

const style = document.createElement("style"); style.textContent = `body{background:#e7ece5!important;color:#252d27!important}figure{color:#252d27}figure canvas{background:#171b18!important}.small canvas{background:transparent!important}.small:first-child canvas{background:#171b18!important}`; document.head.append(style);
