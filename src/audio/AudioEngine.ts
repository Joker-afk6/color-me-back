/**
 * Procedural audio (no audio files are needed or shipped): a tiny WebAudio synthesizer with
 * marimba, bell, music-box, pad, brass, hand-drum and noise voices, a scheduled music sequencer
 * and a set of named sound effects. Created only after a user gesture (browser autoplay rules).
 */
import { Rng } from '../utils/rng';

type Voice = 'marimba' | 'bell' | 'musicBox' | 'pad' | 'brass' | 'pluck';

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private volumes = { master: 0.8, music: 0.55, sfx: 0.8 };
  private muted = false;
  readonly music = new MusicSequencer(this);

  /** Must be called from a user gesture (click/keypress). Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 3;
        this.master = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(comp).connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.5, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        const rng = new Rng(99);
        for (let i = 0; i < d.length; i++) d[i] = rng.next() * 2 - 1;
        this.applyVolumes();
        document.addEventListener('visibilitychange', () => {
          if (!this.ctx) return;
          if (document.hidden) void this.ctx.suspend();
          else void this.ctx.resume();
        });
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch (err) {
      console.warn('[ColorMeBack] Audio unavailable', err);
      this.ctx = null;
    }
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state !== 'closed';
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    this.applyVolumes();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.5, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * 0.7, t, 0.05);
  }

  get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Low-level note. `bus` = 'music' | 'sfx'. */
  note(voice: Voice, midi: number, when: number, dur: number, vel = 0.6, bus: 'music' | 'sfx' = 'music', pan = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = bus === 'music' ? this.musicBus : this.sfxBus;
    const f = midiToHz(midi);
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(out);
    const t = Math.max(when, ctx.currentTime);
    const osc = (type: OscillatorType, freq: number, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      return o;
    };
    switch (voice) {
      case 'marimba':
      case 'pluck': {
        const o1 = osc('sine', f);
        const o2 = osc('sine', f * 4);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(vel * 0.35, t);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o2.connect(g2).connect(g);
        o1.connect(g);
        const decay = voice === 'pluck' ? 0.35 : Math.min(1.2, 0.35 + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o1.start(t);
        o2.start(t);
        o1.stop(t + decay + 0.05);
        o2.stop(t + 0.1);
        break;
      }
      case 'bell':
      case 'musicBox': {
        const carrier = osc('sine', f);
        const mod = osc('sine', f * (voice === 'bell' ? 3.5 : 5));
        const mg = ctx.createGain();
        const idx = voice === 'bell' ? f * 1.6 : f * 0.6;
        mg.gain.setValueAtTime(idx, t);
        mg.gain.exponentialRampToValueAtTime(1, t + (voice === 'bell' ? 1.2 : 0.3));
        mod.connect(mg).connect(carrier.frequency);
        carrier.connect(g);
        const decay = voice === 'bell' ? 2.4 : 1.1;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vel * (voice === 'bell' ? 0.32 : 0.28), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        carrier.start(t);
        mod.start(t);
        carrier.stop(t + decay + 0.05);
        mod.stop(t + decay + 0.05);
        break;
      }
      case 'pad': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        lp.Q.value = 0.4;
        lp.connect(g);
        const os = [osc('sawtooth', f, -7), osc('sawtooth', f, 7), osc('triangle', f / 2)];
        for (const o of os) {
          o.connect(lp);
          o.start(t);
          o.stop(t + dur + 1.2);
        }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vel * 0.09, t + Math.min(0.8, dur * 0.4));
        g.gain.setValueAtTime(vel * 0.09, t + dur);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.1);
        break;
      }
      case 'brass': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 2;
        lp.frequency.setValueAtTime(400, t);
        lp.frequency.exponentialRampToValueAtTime(2600, t + 0.09);
        lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
        lp.connect(g);
        const os = [osc('sawtooth', f, -4), osc('sawtooth', f, 5)];
        for (const o of os) {
          o.connect(lp);
          o.start(t);
          o.stop(t + dur + 0.4);
        }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vel * 0.16, t + 0.05);
        g.gain.setValueAtTime(vel * 0.14, t + dur);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
        break;
      }
    }
  }

  /** Hand drum / thump. */
  drum(when: number, pitch = 180, vel = 0.6, bus: 'music' | 'sfx' = 'music'): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = bus === 'music' ? this.musicBus : this.sfxBus;
    const t = Math.max(when, ctx.currentTime);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.exponentialRampToValueAtTime(pitch * 0.42, t + 0.16);
    g.gain.setValueAtTime(vel * 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.32);
    this.noiseBurst(t, 0.05, 1400, vel * 0.25, 'bandpass', bus);
  }

  noiseBurst(when: number, dur: number, freq: number, vel: number, type: BiquadFilterType = 'highpass', bus: 'music' | 'sfx' = 'sfx', sweepTo?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = bus === 'music' ? this.musicBus : this.sfxBus;
    const t = Math.max(when, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = type === 'bandpass' ? 1.2 : 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /** Pitch-sweeping sine (boings, whoops). */
  sweep(when: number, from: number, to: number, dur: number, vel: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = Math.max(when, ctx.currentTime);
    const o = ctx.createOscillator();
    o.type = type;
    const g = ctx.createGain();
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  // ───────────────────────── Named sound effects ─────────────────────────

  sfx(name: SfxName, intensity = 1): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    const v = intensity;
    switch (name) {
      case 'step':
        this.noiseBurst(t, 0.05, 900 + Math.random() * 500, 0.06 * v, 'bandpass');
        break;
      case 'jump':
        this.sweep(t, 300, 620, 0.16, 0.12 * v, 'triangle');
        break;
      case 'land':
        this.drum(t, 120, 0.35 * v, 'sfx');
        break;
      case 'interact':
        this.note('bell', 84, t, 0.3, 0.5 * v, 'sfx');
        this.note('bell', 91, t + 0.06, 0.3, 0.35 * v, 'sfx');
        break;
      case 'tryAgain':
        this.note('marimba', 72, t, 0.25, 0.5, 'sfx');
        this.note('marimba', 67, t + 0.16, 0.35, 0.5, 'sfx');
        break;
      case 'starWake':
        [79, 84, 88, 91].forEach((m, i) => this.note('bell', m, t + i * 0.07, 0.4, 0.45, 'sfx'));
        this.noiseBurst(t, 0.6, 5000, 0.05, 'highpass');
        break;
      case 'pickup':
        [72, 76, 79, 84].forEach((m, i) => this.note('musicBox', m, t + i * 0.06, 0.3, 0.6, 'sfx'));
        break;
      case 'telegraph':
        this.note('bell', 93, t, 0.2, 0.42, 'sfx', 0.2);
        break;
      case 'berryLand':
        this.drum(t, 95, 0.6, 'sfx');
        this.sweep(t + 0.02, 520, 180, 0.22, 0.12, 'sine');
        break;
      case 'boing':
        this.sweep(t, 180, 420, 0.12, 0.16, 'sine');
        this.sweep(t + 0.12, 420, 260, 0.18, 0.12, 'sine');
        break;
      case 'crystal':
        [96, 100, 103, 108].forEach((m, i) => this.note('bell', m, t + i * 0.035, 0.3, 0.35, 'sfx', (i - 1.5) * 0.3));
        this.noiseBurst(t, 0.35, 6000, 0.08, 'highpass');
        break;
      case 'dash':
        this.noiseBurst(t, 0.28, 600, 0.22, 'bandpass', 'sfx', 3200);
        this.sweep(t, 220, 660, 0.18, 0.06, 'sawtooth');
        break;
      case 'click':
        this.noiseBurst(t, 0.03, 2500, 0.18, 'bandpass');
        this.note('pluck', 79, t, 0.1, 0.35, 'sfx');
        break;
      case 'mirror':
        this.noiseBurst(t, 0.06, 1800, 0.2, 'bandpass');
        this.note('marimba', 76, t + 0.02, 0.2, 0.45, 'sfx');
        break;
      case 'stomp':
        this.drum(t, 70, 0.9 * v, 'sfx');
        this.noiseBurst(t, 0.4, 260, 0.2 * v, 'lowpass');
        break;
      case 'success':
        [72, 76, 79, 84].forEach((m, i) => this.note('marimba', m, t + i * 0.09, 0.4, 0.6, 'sfx'));
        this.note('bell', 96, t + 0.36, 0.6, 0.3, 'sfx');
        break;
      case 'checkpoint':
        this.note('musicBox', 79, t, 0.3, 0.5, 'sfx');
        this.note('musicBox', 86, t + 0.12, 0.4, 0.5, 'sfx');
        break;
      case 'sticker':
        [84, 88, 91, 96, 100].forEach((m, i) => this.note('musicBox', m, t + i * 0.05, 0.25, 0.5, 'sfx'));
        break;
      case 'splash':
        this.noiseBurst(t, 0.45, 1200, 0.25, 'lowpass', 'sfx', 300);
        this.sweep(t, 600, 200, 0.2, 0.07);
        break;
      case 'switch':
        this.drum(t, 160, 0.4, 'sfx');
        this.note('marimba', 67, t + 0.05, 0.2, 0.5, 'sfx');
        break;
      case 'bridge':
        this.noiseBurst(t, 0.9, 300, 0.12, 'bandpass', 'sfx', 900);
        this.drum(t + 0.9, 90, 0.6, 'sfx');
        break;
      case 'whoosh':
        this.noiseBurst(t, 0.5, 400, 0.14, 'bandpass', 'sfx', 2400);
        break;
      case 'ui':
        this.note('pluck', 84, t, 0.08, 0.3, 'sfx');
        break;
      case 'page':
        this.noiseBurst(t, 0.25, 3000, 0.08, 'bandpass', 'sfx', 1200);
        break;
      case 'ripple':
        this.sweep(t, 140, 90, 0.5, 0.1 * v);
        break;
      case 'sweep':
        this.noiseBurst(t, 0.18, 2000, 0.05, 'bandpass', 'sfx', 4000);
        break;
      case 'colorSwell':
        [50, 57, 62, 66, 69].forEach((m) => this.note('pad', m, t, 4, 0.9, 'sfx'));
        [86, 90, 93, 98].forEach((m, i) => this.note('bell', m, t + 0.6 + i * 0.25, 0.8, 0.35, 'sfx', (i - 1.5) * 0.4));
        break;
      case 'chime':
        [76, 79, 84].forEach((m, i) => this.note('musicBox', m, t + i * 0.09, 0.5, 0.45, 'sfx'));
        break;
      case 'mystery':
        // The music-box melody "detunes" into a soft, mysterious chord (Prologue P0).
        [69, 72, 76].forEach((m, i) => this.note('musicBox', m - 0.35 * i, t + i * 0.3, 0.8, 0.45, 'sfx'));
        [57, 60, 63].forEach((m) => this.note('pad', m, t + 1, 2.5, 0.9, 'sfx'));
        break;
    }
  }

  /** The red motif: warm brass and bells (Scene 1.3). */
  redMotif(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    const notes = [62, 66, 69, 74];
    notes.forEach((m, i) => this.note('brass', m, t + i * 0.22, 0.32, 0.8, 'sfx'));
    [62, 66, 69, 74, 78].forEach((m) => this.note('brass', m, t + 0.95, 1.6, 0.55, 'sfx'));
    [86, 90, 93, 98, 102].forEach((m, i) => this.note('bell', m, t + 0.95 + i * 0.12, 1, 0.3, 'sfx', (i - 2) * 0.35));
  }
}

export type SfxName =
  | 'step'
  | 'jump'
  | 'land'
  | 'interact'
  | 'tryAgain'
  | 'starWake'
  | 'pickup'
  | 'telegraph'
  | 'berryLand'
  | 'boing'
  | 'crystal'
  | 'dash'
  | 'click'
  | 'mirror'
  | 'stomp'
  | 'success'
  | 'checkpoint'
  | 'sticker'
  | 'splash'
  | 'switch'
  | 'bridge'
  | 'whoosh'
  | 'ui'
  | 'page'
  | 'ripple'
  | 'sweep'
  | 'colorSwell'
  | 'chime'
  | 'mystery';

// ───────────────────────── Music ─────────────────────────

export interface Song {
  bpm: number;
  /** Chords per bar (MIDI notes). */
  chords: number[][];
  /** Melody: [step in a 16-step bar, midi, lengthInSteps] per bar index (cycled). */
  melody: Array<Array<[number, number, number]>>;
  melodyVoice: Voice;
  arpVoice?: Voice;
  /** Arpeggio pattern over chord tones, per 16 steps (-1 = rest). */
  arp?: number[];
  drums?: Array<[number, number]>; // [step, pitch]
  padOn?: boolean;
  /** Extra bell counter-melody layer (enabled when the area's color returns). */
  bells?: Array<Array<[number, number, number]>>;
  swing?: number;
}

export const SONGS: Record<string, Song> = {
  title: {
    bpm: 84,
    chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
    melody: [
      [[0, 76, 2], [4, 79, 2], [8, 81, 3], [12, 79, 2]],
      [[0, 76, 2], [4, 72, 2], [8, 74, 4]],
      [[0, 72, 2], [4, 74, 2], [8, 76, 2], [12, 79, 2]],
      [[0, 77, 3], [6, 76, 2], [8, 74, 6]],
    ],
    melodyVoice: 'musicBox',
    padOn: true,
  },
  bedroom: {
    bpm: 70,
    chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
    melody: [
      [[0, 76, 4], [8, 72, 4]],
      [[0, 74, 3], [6, 72, 2], [8, 69, 6]],
      [[0, 72, 4], [8, 74, 4]],
      [[0, 71, 6], [10, 68, 4]],
    ],
    melodyVoice: 'musicBox',
    padOn: true,
  },
  village: {
    bpm: 76,
    chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]],
    melody: [[[0, 69, 2], [6, 72, 2], [12, 76, 2]], [[2, 74, 2], [8, 71, 4]], [[0, 72, 2], [4, 69, 2], [10, 67, 4]], [[0, 71, 6], [12, 74, 2]]],
    melodyVoice: 'pluck',
    arpVoice: 'marimba',
    arp: [0, -1, -1, 1, -1, -1, 2, -1, 0, -1, -1, 1, -1, 2, -1, -1],
    padOn: true,
  },
  orchard: {
    bpm: 100,
    chords: [[62, 66, 69], [55, 59, 62], [52, 55, 59], [57, 61, 64]],
    melody: [
      [[0, 78, 2], [3, 76, 1], [4, 74, 2], [8, 81, 3], [12, 78, 2]],
      [[0, 79, 2], [4, 78, 2], [6, 76, 2], [8, 74, 4]],
      [[0, 76, 2], [4, 79, 2], [8, 83, 3], [12, 81, 2]],
      [[0, 81, 3], [4, 79, 1], [6, 76, 2], [8, 73, 6]],
    ],
    melodyVoice: 'marimba',
    arpVoice: 'pluck',
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2],
    drums: [[0, 170], [6, 230], [8, 170], [11, 230], [14, 230]],
    padOn: true,
    bells: [[[0, 90, 4], [8, 93, 4]], [[0, 91, 6]], [[0, 88, 4], [8, 95, 4]], [[0, 93, 6]]],
    swing: 0.12,
  },
  encounter: {
    bpm: 112,
    chords: [[62, 66, 69], [60, 64, 67], [55, 59, 62], [57, 61, 64]],
    melody: [
      [[0, 74, 1], [2, 78, 1], [4, 81, 2], [8, 78, 1], [10, 74, 1], [12, 76, 2]],
      [[0, 72, 1], [2, 76, 1], [4, 79, 2], [8, 76, 2], [12, 72, 2]],
      [[0, 71, 1], [2, 74, 1], [4, 79, 2], [8, 78, 2], [12, 74, 2]],
      [[0, 73, 2], [4, 76, 2], [8, 81, 4], [12, 79, 2]],
    ],
    melodyVoice: 'marimba',
    arpVoice: 'pluck',
    arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2],
    drums: [[0, 160], [4, 220], [6, 160], [8, 160], [10, 220], [12, 160], [14, 220], [15, 220]],
    padOn: true,
    bells: [[[0, 86, 8]], [[0, 88, 8]], [[0, 83, 8]], [[0, 85, 8]]],
  },
};

export class MusicSequencer {
  private song: Song | null = null;
  private songName = '';
  private step = 0;
  private bar = 0;
  private nextTime = 0;
  private timer: number | null = null;
  bellsLayer = false;
  private volume = 1;

  constructor(private readonly audio: AudioEngine) {}

  get current(): string {
    return this.songName;
  }

  play(name: string): void {
    if (name === this.songName) return;
    this.songName = name;
    this.song = SONGS[name] ?? null;
    this.step = 0;
    this.bar = 0;
    this.nextTime = this.audio.now + 0.15;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 30);
  }

  stop(): void {
    this.song = null;
    this.songName = '';
  }

  /** Temporarily duck music under big moments. */
  setLevel(v: number): void {
    this.volume = v;
  }

  private schedule(): void {
    const a = this.audio;
    if (!a.ready || !this.song) return;
    const s = this.song;
    const stepDur = 60 / s.bpm / 4;
    while (this.nextTime < a.now + 0.15) {
      const t = this.nextTime + (this.step % 2 === 1 ? (s.swing ?? 0) * stepDur : 0);
      const chord = s.chords[this.bar % s.chords.length]!;
      const vel = this.volume;
      if (this.step === 0 && s.padOn) chord.forEach((m) => a.note('pad', m - 12, t, stepDur * 15, 0.8 * vel));
      if (this.step === 0 || this.step === 8) a.note('pluck', chord[0]! - 24, t, stepDur * 6, 0.45 * vel);
      if (s.arp && s.arpVoice) {
        const idx = s.arp[this.step]!;
        if (idx >= 0) a.note(s.arpVoice, chord[idx % chord.length]!, t, stepDur, 0.22 * vel, 'music', (idx - 1) * 0.35);
      }
      const mel = s.melody[this.bar % s.melody.length]!;
      for (const [st, m, len] of mel) if (st === this.step) a.note(s.melodyVoice, m, t, stepDur * len, 0.55 * vel, 'music', 0.1);
      if (this.bellsLayer && s.bells) {
        const b = s.bells[this.bar % s.bells.length]!;
        for (const [st, m, len] of b) if (st === this.step) a.note('bell', m, t, stepDur * len, 0.28 * vel, 'music', -0.25);
      }
      if (s.drums) for (const [st, pitch] of s.drums) if (st === this.step) a.drum(t, pitch, 0.35 * vel);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }
}
