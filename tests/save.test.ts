import { describe, expect, it } from 'vitest';
import { newSave } from '../src/state/SaveData';
import { LEGACY_V2_KEY, SaveStore, SAVE_KEY, type StorageLike } from '../src/state/SaveStore';
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
      expect(r.save.version).toBe(3);
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
    s.prologue = { phase: 'complete', inspected: ['teddy', 'window'], hasWonderbrush: true, villageStars: ['pathStar', 'terraceStar'], practiced: [] };
    s.ruby.phase = 'stage2';
    s.colors.red = true;
    const r = validateSave(s);
    expect(r.save.colors.red).toBe(false);
  });

  it('Red is implied once Stage 3 is complete', () => {
    const s = newSave('girl') as any;
    s.prologue = { phase: 'complete', inspected: ['teddy', 'window'], hasWonderbrush: true, villageStars: ['pathStar', 'terraceStar'], practiced: [] };
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
    s.prologue = { phase: 'complete', inspected: ['teddy', 'window'], hasWonderbrush: true, villageStars: ['pathStar'], practiced: [] };
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

  it('New Game also clears the v0.2 save', () => {
    const mem = new MemoryStorage();
    mem.setItem(LEGACY_V2_KEY, JSON.stringify(v2Save('village')));
    new SaveStore(mem).reset('boy');
    expect(mem.getItem(LEGACY_V2_KEY)).toBeNull();
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
    expect(new SaveStore(mem).load()?.save.version).toBe(3);
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

/** A save exactly as the v0.2 build (tag v0.2-chapter1-alpha) wrote it. */
function v2Save(phase: 'wonderbrush' | 'village' | 'complete', ruby = 'arrive'): Record<string, unknown> {
  return {
    version: 2,
    hero: 'boy',
    location: phase === 'wonderbrush' ? 'bedroom' : phase === 'village' ? 'hushHollow' : 'rubyOrchard',
    colors: { red: false, blue: false, yellow: false, purple: false, orange: false, green: false },
    prologue: {
      phase,
      inspected: ['teddy', 'crayons'],
      hasWonderbrush: true,
      bedroomStarAwake: false,
      villageStars: phase === 'complete' ? ['pathStar', 'terraceStar'] : ['pathStar'],
    },
    ruby: { phase: ruby, traversal: 'start', mirrors: [1, 1, 1], encounterIntroSeen: true },
    collectibles: ['berrySticker2'],
    playTimeSeconds: 321,
    updatedAt: 5,
  };
}

describe('save schema v3 and v0.2 migration (CC-04)', () => {
  it('keeps every bit of v0.2 progress, even an old save that never inspected the window', () => {
    const r = validateSave(v2Save('village'));
    expect(r.migratedFrom).toBe(2);
    expect(r.save.version).toBe(3);
    expect(r.save.hero).toBe('boy');
    expect(r.save.prologue.phase).toBe('village');
    expect(r.save.prologue.villageStars).toEqual(['pathStar']);
    expect(r.save.collectibles).toEqual(['berrySticker2']);
    expect(r.save.playTimeSeconds).toBe(321);
    expect('bedroomStarAwake' in r.save.prologue).toBe(false);
    expect(r.save.abilities.basicDash).toBe(true);
  });

  it('a v0.2 save stuck before the old bedroom star counts as prologue_bedroom_complete', () => {
    const r = validateSave(v2Save('wonderbrush'));
    expect(r.save.prologue.phase).toBe('wonderbrush');
    expect(r.save.prologue.hasWonderbrush).toBe(true);
    expect(r.save.checkpointId).toBe('prologue_bedroom_complete');
  });

  it('a v0.2 save mid-rescue keeps its phase and mirrors; Red-era saves get Flame Burst', () => {
    const mid = validateSave(v2Save('complete', 'stage2')).save;
    expect(mid.ruby.phase).toBe('stage2');
    expect(mid.ruby.mirrors).toEqual([1, 1, 1]);
    expect(mid.abilities.flameBurst).toBe(false);
    const after = validateSave(v2Save('complete', 'dashTutorial')).save;
    expect(after.colors.red).toBe(true);
    expect(after.abilities.flameBurst).toBe(true);
    expect(after.checkpointId).toBe('ruby_restored');
  });

  it('loads the v0.2 key when no v3 save exists, writes v3, and never touches the v0.2 copy', () => {
    const mem = new MemoryStorage();
    const original = JSON.stringify(v2Save('village'));
    mem.setItem(LEGACY_V2_KEY, original);
    const store = new SaveStore(mem);
    expect(store.hasSave()).toBe(true);
    const r = store.load()!;
    expect(r.migratedFrom).toBe(2);
    store.write(r.save);
    expect(mem.getItem(LEGACY_V2_KEY)).toBe(original);
    const stored = JSON.parse(mem.getItem(SAVE_KEY)!);
    expect(stored.version).toBe(3);
    expect(stored.checkpointId).toBe('prologue_bedroom_complete');
    // The v3 save now wins over the old key.
    expect(store.load()!.migratedFrom).toBeNull();
  });

  it('stored ability flags and checkpoint names are never trusted (no early Flame Burst)', () => {
    const s = newSave('girl') as any;
    s.abilities = { jump: true, basicDash: true, flameBurst: true };
    s.checkpointId = 'chapter_1_complete';
    const r = validateSave(s);
    expect(r.save.abilities.flameBurst).toBe(false);
    expect(r.save.checkpointId).toBe('prologue_start');
  });

  it('a v3 save past Pip without the window inspection is repaired back to the bedroom step', () => {
    const s = newSave('girl') as any;
    s.prologue.phase = 'wonderbrush';
    s.prologue.inspected = ['teddy', 'crayons'];
    const r = validateSave(s);
    expect(r.save.prologue.phase).toBe('inspect');
  });

  it('writes are idempotent: writing the same save twice stores the same progress', () => {
    const mem = new MemoryStorage();
    const store = new SaveStore(mem);
    const s = validateSave(v2Save('complete', 'stage3')).save;
    store.write(s);
    const a = JSON.parse(mem.getItem(SAVE_KEY)!);
    store.write(s);
    const b = JSON.parse(mem.getItem(SAVE_KEY)!);
    delete a.updatedAt;
    delete b.updatedAt;
    expect(b).toEqual(a);
  });
});
