/**
 * Local-only persistence. Nothing is ever sent over the network (no accounts, no telemetry).
 * Every storage access is wrapped: private windows or blocked storage simply disable saving.
 */
import { newSave, type HeroId, type SaveData } from './SaveData';
import { LEGACY_V1_KEY, migrateV1, validateSave, type LoadReport } from './validate';

export const SAVE_KEY = 'color-me-back-save-v2';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveStore {
  private warned = false;

  constructor(private readonly storage: StorageLike | null = SaveStore.defaultStorage()) {}

  static defaultStorage(): StorageLike | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }

  get available(): boolean {
    return this.storage !== null;
  }

  hasSave(): boolean {
    return this.read(SAVE_KEY) !== null || this.read(LEGACY_V1_KEY) !== null;
  }

  load(): LoadReport | null {
    const current = this.read(SAVE_KEY);
    if (current !== null) {
      try {
        return validateSave(JSON.parse(current));
      } catch {
        return { save: newSave('girl'), repairs: ['Saved adventure was unreadable; started a new adventure.'], migratedFrom: null };
      }
    }
    const legacy = this.read(LEGACY_V1_KEY);
    if (legacy !== null) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(legacy);
      } catch {
        /* treat as empty */
      }
      return migrateV1(parsed);
    }
    return null;
  }

  write(save: SaveData): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify({ ...save, updatedAt: Date.now() }));
      return true;
    } catch (err) {
      if (!this.warned) console.warn('[ColorMeBack] Saving is unavailable in this browser.', err);
      this.warned = true;
      return false;
    }
  }

  /** New Game: remove every stored adventure (current and prototype). */
  reset(hero: HeroId): SaveData {
    try {
      this.storage?.removeItem(SAVE_KEY);
      this.storage?.removeItem(LEGACY_V1_KEY);
    } catch {
      /* ignore */
    }
    const fresh = newSave(hero);
    this.write(fresh);
    return fresh;
  }

  private read(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
}
