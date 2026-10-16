import { describe, expect, it } from 'vitest';
import { newSave } from '../src/state/SaveData';
import { SaveStore, SAVE_KEY, type StorageLike } from '../src/state/SaveStore';
import { LEGACY_V1_KEY, validateSave } from '../src/state/validate';
import { sanitizeSettings, SettingsStore } from '../src/state/Settings';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

describe('save validation and repair', () => {
  it('a fresh save validates unchanged', () => {
    const s = newSave('boy');
    const r = validateSave(JSON.parse(JSON.stringify(s)));
    expect(r.repairs).toEqual([]);
    expect(r.save).toEqual(s);
  });

  it('garbage input yields a new adventure, not a crash', () => {
    for (const raw of [null, 42, 'x', [], { version: 9 }, { version: 2, ruby: 'nope' }]) {
      const r = validateSave(raw);
      expect(r.save.version).toBe(2);
    }
  });

  it('never skips locked chapters: Chapter 1 progress before the prologue is reset', () => {
    const s = newSave('girl') as any;
    s.ruby.phase = 'stage3';
    s.location = 'rubyOrchard';
    const r = validateSave(s);
    expect(r.save.ruby.phase).toBe('arrive');
    expect(r.save.location).toBe('bedroom');
    expect(r.repairs.length).toBeGreaterThan(0);
  });

  it('Red cannot be owned without completing Ruby Stage 3', () => {
    const s = newSave('girl') as any;
    s.prologue = { phase: 'complete', inspected: ['teddy', 'window'], hasWonderbrush: true, bedroomStarAwake: true, villageStars: ['pathStar', 'terraceStar'] };
    s.ruby.phase = 'stage2';
    s.colors.red = true;
    const r = validateSave(s);
    expect(r.save.colors.red).toBe(false);
  });

  it('Red is implied once Stage 3 is complete', () => {
    const s = newSave('girl') as any;
    s.prologue = { phase: 'complete', inspected: ['teddy', 'window'], hasWonderbrush: true, bedroomStarAwake: true, villageStars: ['pathStar', 'terraceStar'] };
    s.ruby.phase = 'dashTutorial';
    const r = validateSave(s);
    expect(r.save.colors.red).toBe(true);
    expect(r.save.ruby.traversal).toBe('bridgeDown');
  });

  it('secondaries without both primaries are removed; blue/yellow cannot exist before their chapters', () => {
    const s = newSave('girl') as any;
    s.colors = { red: false, blue: true, yellow: true, purple: true, orange: true, green: true };
    const r = validateSave(s);
    expect(Object.values(r.save.colors).some(Boolean)).toBe(false);
  });

  it('invalid mirror states reset to the valid initial orientation', () => {
    const s = newSave('girl') as any;
    s.ruby.mirrors = [7, -1, 'x'];
    expect(validateSave(s).save.ruby.mirrors).toEqual([2, 3, 0]);
  });

  it('a prologue marked complete without both village stars returns to Hush Hollow', () => {
    const s = newSave('girl') as any;
    s.prologue = { phase: 'complete', inspected: ['teddy', 'window'], hasWonderbrush: true, bedroomStarAwake: true, villageStars: ['pathStar'] };
    const r = validateSave(s);
    expect(r.save.prologue.phase).toBe('village');
    expect(r.save.location).toBe('hushHollow');
  });
});

describe('SaveStore', () => {
  it('round-trips through storage', () => {
    const mem = new MemoryStorage();
    const store = new SaveStore(mem);
    const s = newSave('boy');
    expect(store.write(s)).toBe(true);
    const loaded = store.load();
    expect(loaded?.save.hero).toBe('boy');
    expect(loaded?.save.prologue.phase).toBe('opening');
  });

  it('New Game resets ALL progress, including the old prototype save', () => {
    const mem = new MemoryStorage();
    mem.setItem(LEGACY_V1_KEY, JSON.stringify({ levelId: 'red', gender: 'boy', restored: ['red'], sigils: [] }));
    const store = new SaveStore(mem);
    const s = newSave('girl');
    s.collectibles = ['berrySticker1'];
    store.write(s);
    const fresh = store.reset('girl');
    expect(fresh.collectibles).toEqual([]);
    expect(mem.getItem(LEGACY_V1_KEY)).toBeNull();
    expect(JSON.parse(mem.getItem(SAVE_KEY)!).prologue.phase).toBe('opening');
  });

  it('migrates a prototype v1 save by keeping only the explorer choice', () => {
    const mem = new MemoryStorage();
    mem.setItem(LEGACY_V1_KEY, JSON.stringify({ levelId: 'blue', gender: 'boy', restored: ['red', 'blue'], sigils: ['red-0'] }));
    const r = new SaveStore(mem).load()!;
    expect(r.migratedFrom).toBe(1);
    expect(r.save.hero).toBe('boy');
    expect(r.save.colors.red).toBe(false);
  });

  it('corrupt JSON does not throw', () => {
    const mem = new MemoryStorage();
    mem.setItem(SAVE_KEY, '{not json');
    expect(new SaveStore(mem).load()?.save.version).toBe(2);
  });

  it('works with no storage at all (private mode)', () => {
    const store = new SaveStore(null);
    expect(store.write(newSave('girl'))).toBe(false);
    expect(store.load()).toBeNull();
  });
});

describe('settings', () => {
  it('sanitizes out-of-range and wrong-typed values', () => {
    const s = sanitizeSettings({ masterVolume: 9, musicVolume: 'loud', textSize: 'huge', cameraSensitivity: -4, assistMode: 'yes' });
    expect(s.masterVolume).toBe(1);
    expect(s.musicVolume).toBeGreaterThanOrEqual(0);
    expect(s.textSize).toBe('normal');
    expect(s.cameraSensitivity).toBe(0.3);
    expect(s.assistMode).toBe(false);
  });

  it('persists changes and notifies listeners', () => {
    const mem = new MemoryStorage();
    const store = new SettingsStore(mem);
    let seen: string | null = null;
    store.onChange((_s, k) => (seen = k));
    store.set('reducedMotion', true);
    expect(seen).toBe('reducedMotion');
    expect(new SettingsStore(mem).get().reducedMotion).toBe(true);
  });
});
