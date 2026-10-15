// Original Goo sound bank: procedural synthesis, no recordings or upstream samples.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../assets/sounds');
mkdirSync(OUT, { recursive: true });
const RATE = 48000;
// Each note: onset, frequency, duration, ending frequency (optional).
const patterns = {
  peek: [[0,520,.13,590]], open: [[0,370,.17],[.08,555,.20]],
  close: [[0,520,.15,350]], hover: [[0,620,.09]], blip: [[0,740,.08]],
  slap: [[0,190,.11,100]], annoyed: [[0,280,.15],[.12,245,.18]],
  dizzy: [[0,420,.25,220],[.20,310,.25,470]], greet: [[0,440,.17],[.12,660,.25]],
  work: [[0,330,.12],[.09,440,.15]], finish: [[0,392,.23],[.15,523.25,.25],[.30,659.25,.34]],
  error: [[0,220,.22],[.18,174.61,.30]], approval: [[0,493.88,.20],[.19,493.88,.20]],
  question: [[0,349.23,.18],[.14,523.25,.26]], approve: [[0,523.25,.15],[.12,783.99,.24]],
  gulp: [[0,260,.17,140]], tick: [[0,820,.045]], send: [[0,420,.18,840]],
  love: [[0,440,.22],[.13,554.37,.23],[.26,659.25,.28]], pop: [[0,320,.10,610]],
  proud: [[0,392,.20],[.14,587.33,.28]], wink: [[0,680,.11,520]],
  yawn: [[0,300,.42,170]], attach: [[0,466.16,.13],[.10,622.25,.17]],
  think: [[0,370,.14],[.16,392,.15]], search: [[0,440,.12],[.13,466.16,.13],[.26,493.88,.18]],
  rate: [[0,329.63,.24],[.22,293.66,.30]], sleep: [[0,293.66,.30],[.25,220,.44]],
  greeting: [[0,349.23,.32],[.22,440,.35],[.46,523.25,.54]],
};
function synth(notes) {
  const length = Math.ceil((Math.max(...notes.map(([at,,dur])=>at+dur))+.035)*RATE);
  const mix = new Float64Array(length);
  for (const [at, freq, dur, end=freq] of notes) {
    const start = Math.round(at*RATE), frames = Math.round(dur*RATE);
    let phase=0;
    for(let i=0;i<frames;i++) {
      const t=i/RATE, progress=t/dur;
      phase += 2*Math.PI*(freq+(end-freq)*progress)/RATE;
      const attack=.5-.5*Math.cos(Math.PI*Math.min(t/.012,1));
      const release=.5-.5*Math.cos(Math.PI*Math.min((dur-t)/.035,1));
      const envelope=attack*release*Math.exp(-3.4*progress);
      // Soft, slightly rounded tone, intentionally quieter than a system alert.
      mix[start+i]+=.42*envelope*(Math.sin(phase)+.12*Math.sin(phase*2));
    }
  }
  const wav=Buffer.alloc(44+length*2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(RATE,24); wav.writeUInt32LE(RATE*2,28); wav.writeUInt16LE(2,32);
  wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(length*2,40);
  for(let i=0;i<length;i++) wav.writeInt16LE(Math.round(Math.tanh(mix[i])*32767),44+i*2);
  return wav;
}
for(const [name,notes] of Object.entries(patterns)) writeFileSync(join(OUT,`${name}.wav`),synth(notes));
writeFileSync(join(OUT,'manifest.json'),JSON.stringify({product:'Goo',author:'Cristiano Costa',
  source:'windows/scripts/gen-sounds.mjs',sampleRate:RATE,format:'PCM mono 16-bit',
  provenance:'Original procedural tones. No third-party samples or upstream sound files.',patterns},null,2)+'\n');
console.log(`Generated ${Object.keys(patterns).length} original Goo sounds.`);
