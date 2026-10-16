/** Player settings (accessibility, audio, camera). Stored separately from story progress. */
import type { StorageLike } from './SaveStore';

export type TextSize = 'normal' | 'large' | 'xlarge';
export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  /** Read dialogue and tutorial prompts aloud with the browser's speech voice. */
  readAloud: boolean;
  /** Show captions for important sound cues (e.g. "♪ chime — a berry will land here"). */
  soundCaptions: boolean;
  textSize: TextSize;
  reducedMotion: boolean;
  cameraShake: boolean;
  cameraSensitivity: number;
  invertCameraY: boolean;
  /** Gently swing the camera behind the explorer while moving. */
  cameraAssist: boolean;
  /** Larger interaction range, slower telegraphs, longer windows, auto-dash help. */
  assistMode: boolean;
  highContrast: boolean;
  quality: Quality;
}

export const SETTINGS_KEY = 'color-me-back-settings-v1';

export function defaultSettings(): Settings {
  let prefersReduced = false;
  try {
    prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    /* ignore */
  }
  return {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    voiceVolume: 0.9,
    readAloud: true,
    soundCaptions: true,
    textSize: 'normal',
    reducedMotion: prefersReduced,
    cameraShake: !prefersReduced,
    cameraSensitivity: 1,
    invertCameraY: false,
    cameraAssist: true,
    assistMode: false,
    highContrast: false,
    quality: 'high',
  };
}

const num = (v: unknown, lo: number, hi: number, fb: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb;
const bool = (v: unknown, fb: boolean): boolean => (typeof v === 'boolean' ? v : fb);

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  return {
    masterVolume: num(r.masterVolume, 0, 1, d.masterVolume),
    musicVolume: num(r.musicVolume, 0, 1, d.musicVolume),
    sfxVolume: num(r.sfxVolume, 0, 1, d.sfxVolume),
    voiceVolume: num(r.voiceVolume, 0, 1, d.voiceVolume),
    readAloud: bool(r.readAloud, d.readAloud),
    soundCaptions: bool(r.soundCaptions, d.soundCaptions),
    textSize: r.textSize === 'large' || r.textSize === 'xlarge' ? r.textSize : 'normal',
    reducedMotion: bool(r.reducedMotion, d.reducedMotion),
    cameraShake: bool(r.cameraShake, d.cameraShake),
    cameraSensitivity: num(r.cameraSensitivity, 0.3, 2.5, d.cameraSensitivity),
    invertCameraY: bool(r.invertCameraY, d.invertCameraY),
    cameraAssist: bool(r.cameraAssist, d.cameraAssist),
    assistMode: bool(r.assistMode, d.assistMode),
    highContrast: bool(r.highContrast, d.highContrast),
    quality: r.quality === 'low' || r.quality === 'medium' ? r.quality : 'high',
  };
}

type Listener = (s: Readonly<Settings>, changed: keyof Settings | null) => void;

export class SettingsStore {
  private value: Settings;
  private listeners = new Set<Listener>();

  constructor(private readonly storage: StorageLike | null) {
    let raw: unknown = null;
    try {
      const text = storage?.getItem(SETTINGS_KEY);
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = null;
    }
    this.value = sanitizeSettings(raw);
  }

  get(): Readonly<Settings> {
    return this.value;
  }

  set<K extends keyof Settings>(key: K, v: Settings[K]): void {
    this.value = sanitizeSettings({ ...this.value, [key]: v });
    this.persist();
    for (const l of this.listeners) l(this.value, key);
  }

  resetToDefaults(): void {
    this.value = defaultSettings();
    this.persist();
    for (const l of this.listeners) l(this.value, null);
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private persist(): void {
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.value));
    } catch {
      /* storage unavailable: settings stay for this session */
    }
  }
}
