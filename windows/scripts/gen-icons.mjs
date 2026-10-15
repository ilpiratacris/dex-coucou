// Original Morbido app mark. No upstream artwork or external dependencies.
// PNG/ICO encoding helpers derive from MIT-licensed code; see THIRD_PARTY_NOTICES.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src-tauri", "icons");
function rounded(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x-cx) - w/2 + r, dy = Math.abs(y-cy) - h/2 + r;
  return Math.hypot(Math.max(dx,0),Math.max(dy,0)) + Math.min(Math.max(dx,dy),0) <= r;
}
function renderFace(size, tray = false) {
  const pixels = new Uint8Array(size*size*4), SS = 4;
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
    let red=0,green=0,blue=0,alpha=0;
    for(let sy=0;sy<SS;sy++) for(let sx=0;sx<SS;sx++) {
      const u=(x+(sx+0.5)/SS)/size, v=(y+(sy+0.5)/SS)/size;
      const face=!tray && rounded(u,v,0.5,0.5,0.9,0.9,0.23);
      const eyeY=tray?0.5:0.43, eyeH=tray?0.44:0.23, eyeW=tray?0.20:0.12;
      const eyes=rounded(u,v,0.32,eyeY,eyeW,eyeH,eyeW/2)||rounded(u,v,0.68,eyeY,eyeW,eyeH,eyeW/2);
      const q=(u-0.5)/0.14;
      const mouthY=0.65+0.095*(1-q*q);
      const slope=-0.19*q/0.14;
      const mouth=!tray && Math.abs(q)<=1 && Math.abs(v-mouthY)/Math.sqrt(1+slope*slope)<0.022;
      if(!face&&!eyes&&!mouth) continue;
      const ink=eyes||mouth;
      const color=ink?[240-35*v,242-19*v,233-21*v]:[36-12*v,43-14*v,39-13*v];
      red+=color[0];green+=color[1];blue+=color[2];alpha++;
    }
    const i=(y*size+x)*4;
    if(alpha) { pixels[i]=red/alpha;pixels[i+1]=green/alpha;pixels[i+2]=blue/alpha;pixels[i+3]=255*alpha/(SS*SS); }
  }
  return pixels;
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── ICO (PNG-in-ICO, Vista and later) ─────────────────────────────────────────

function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

mkdirSync(OUT, { recursive: true });
const png = size => encodePNG(size, renderFace(size));
for (const [name,size] of [["32x32.png",32],["128x128.png",128],["128x128@2x.png",256],["icon.png",512]]) {
  writeFileSync(join(OUT,name),png(size)); console.log(`Created ${name}`);
}
writeFileSync(join(OUT,"icon.ico"), encodeICO([16,24,32,48,64,128,256].map(size=>({size,png:png(size)}))));
for (const size of [16,32]) writeFileSync(join(OUT,`tray-${size}.png`),encodePNG(size,renderFace(size,true)));
const art = join(ROOT,"assets","identity"); mkdirSync(art,{recursive:true});
writeFileSync(join(art,"app-icon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="screen" x2="0" y2="1"><stop stop-color="#242b27"/><stop offset="1" stop-color="#181d1a"/></linearGradient><linearGradient id="ink" x2="0" y2="1"><stop stop-color="#f0f2e9"/><stop offset="1" stop-color="#cddfd3"/></linearGradient></defs><rect x="26" y="26" width="460" height="460" rx="118" fill="url(#screen)"/><g fill="url(#ink)"><rect x="133" y="161" width="61" height="118" rx="30.5"/><rect x="318" y="161" width="61" height="118" rx="30.5"/></g><path d="M184 333 Q256 430 328 333" fill="none" stroke="url(#ink)" stroke-width="22" stroke-linecap="round"/></svg>
`);
