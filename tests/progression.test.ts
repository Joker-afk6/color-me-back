import { describe, expect, it } from 'vitest';
import { checkpointIdOf, newSave, type SaveData } from '../src/state/SaveData';
import * as P from '../src/state/progression';

/** Walk a save through the prologue exactly as the game does. */
function finishPrologue(hero: 'girl' | 'boy' = 'girl'): SaveData {
  let s = newSave(hero);
  s = P.finishOpening(s);
  s = P.inspectBedroomObject(s, 'teddy').save;
  s = P.inspectBedroomObject(s, 'window').save;
  s = P.takeWonderbrush(s);
  s = P.leaveBedroom(s);
  s = P.markPracticed(s, 'jump');
  s = P.markPracticed(s, 'dash');
  s = P.wakeVillageStar(s, 'terraceStar');
  s = P.wakeVillageStar(s, 'pathStar');
  return P.completePrologue(s);
}

function toRubyStage1(hero: 'girl' | 'boy' = 'girl'): SaveData {
  let s = finishPrologue(hero);
  s = P.rubyArrived(s);
  s = P.reachTraversalCheckpoint(s, 'pastGaps');
  s = P.reachTraversalCheckpoint(s, 'bridgeDown');
  return P.startRubyEncounter(s);
}

describe('prologue (Director Script P01–P02)', () => {
  it('Pip arrives when the window is inspected; teddy and crayons are optional and never bring Pip', () => {
    let s = P.finishOpening(newSave('boy'));
    const a = P.inspectBedroomObject(s, 'crayons');
    expect(a.pipArrives).toBe(false);
    s = a.save;
    expect(P.inspectBedroomObject(s, 'crayons').save).toBe(s); // inspecting twice does not count
    const t = P.inspectBedroomObject(s, 'teddy');
    expect(t.pipArrives).toBe(false);
    expect(t.save.prologue.phase).toBe('inspect');
    const w = P.inspectBedroomObject(t.save, 'window');
    expect(w.pipArrives).toBe(true);
    expect(w.save.prologue.phase).toBe('wonderbrush');
    // The window alone (first thing inspected) is enough, too.
    const direct = P.inspectBedroomObject(P.finishOpening(newSave('girl')), 'window');
    expect(direct.pipArrives).toBe(true);
  });

  it('nothing can be inspected during the opening cutscene', () => {
    const s = newSave('girl');
    expect(P.inspectBedroomObject(s, 'window').save).toBe(s);
  });

  it('picking up the Wonderbrush is checkpoint prologue_bedroom_complete and opens the door', () => {
    let s = P.finishOpening(newSave('girl'));
    expect(P.takeWonderbrush(s)).toBe(s); // Pip has not asked yet
    s = P.inspectBedroomObject(s, 'window').save;
    expect(checkpointIdOf(s)).toBe('prologue_pip_met');
    expect(P.canLeaveBedroom(s)).toBe(false);
    s = P.takeWonderbrush(s);
    expect(checkpointIdOf(s)).toBe('prologue_bedroom_complete');
    expect(P.canLeaveBedroom(s)).toBe(true);
    expect(P.leaveBedroom(s).location).toBe('hushHollow');
    expect(Object.values(s.colors).some(Boolean)).toBe(false); // waking the brush restores no pigment
  });

  it('Tutorial A practice is remembered once, and only in Hush Hollow', () => {
    let s = P.finishOpening(newSave('girl'));
    expect(P.markPracticed(s, 'jump')).toBe(s); // not in the bedroom
    s = P.leaveBedroom(P.takeWonderbrush(P.inspectBedroomObject(s, 'window').save));
    const j = P.markPracticed(s, 'jump');
    expect(j.prologue.practiced).toEqual(['jump']);
    expect(P.markPracticed(j, 'jump')).toBe(j);
  });

  it('village stars work in either order, the arch needs both, and leaving is checkpoint ruby_entry', () => {
    const s = finishPrologue('girl');
    expect(s.prologue.phase).toBe('complete');
    expect(s.location).toBe('rubyOrchard');
    expect(checkpointIdOf(s)).toBe('ruby_entry');
    let t = P.finishOpening(newSave('girl'));
    t = P.leaveBedroom(P.takeWonderbrush(P.inspectBedroomObject(t, 'window').save));
    t = P.wakeVillageStar(t, 'pathStar');
    expect(P.completePrologue(t)).toBe(t);
  });
});

describe('abilities (canon CC-01, provisional): Basic Dash free from the prologue, Flame Burst after Ruby', () => {
  it('a new game has ZERO restored pigments but already has Basic Dash, for both heroes', () => {
    for (const hero of ['girl', 'boy'] as const) {
      const s = newSave(hero);
      expect(Object.values(s.colors).some(Boolean)).toBe(false);
      expect(P.hasAbility(s, 'basicDash')).toBe(true);
      expect(P.hasAbility(s, 'flameBurst')).toBe(false);
      expect(s.abilities).toEqual({ jump: true, basicDash: true, flameBurst: false });
    }
  });

  it('Basic Dash is owned before the boss; Flame Burst only after the rescue', () => {
    const atBoss = toRubyStage1();
    expect(P.hasAbility(atBoss, 'basicDash')).toBe(true);
    expect(P.hasAbility(atBoss, 'flameBurst')).toBe(false);
  });
});

describe('Chapter 1: Ruby rescue', () => {
  it('Ruby Orchard is locked until the prologue is complete', () => {
    const s = newSave('girl');
    expect(P.canEnterRubyOrchard(s)).toBe(false);
    expect(P.rubyArrived(s)).toBe(s);
  });

  it('the encounter cannot start before the bridge is lowered', () => {
    let s = P.rubyArrived(finishPrologue());
    expect(P.startRubyEncounter(s)).toBe(s);
    s = P.reachTraversalCheckpoint(s, 'bridgeDown');
    expect(P.startRubyEncounter(s).ruby.phase).toBe('stage1');
  });

  it('traversal checkpoints never move backwards', () => {
    let s = P.rubyArrived(finishPrologue());
    s = P.reachTraversalCheckpoint(s, 'bridgeDown');
    expect(P.reachTraversalCheckpoint(s, 'pastGaps').ruby.traversal).toBe('bridgeDown');
  });

  it('stages must be completed in order; out-of-order completions are rejected', () => {
    const s = toRubyStage1();
    expect(P.completeRubyStage(s, 2).accepted).toBe(false);
    expect(P.completeRubyStage(s, 3).accepted).toBe(false);
    const one = P.completeRubyStage(s, 1);
    expect(one.accepted).toBe(true);
    expect(one.save.ruby.phase).toBe('stage2');
    expect(P.completeRubyStage(one.save, 1).accepted).toBe(false); // no double-completion
  });

  it('completing two of three stages does NOT award Red', () => {
    let s = toRubyStage1();
    s = P.completeRubyStage(s, 1).save;
    const two = P.completeRubyStage(s, 2);
    expect(two.awarded).toBeNull();
    expect(two.save.colors.red).toBe(false);
    expect(P.hasAbility(two.save, 'flameBurst')).toBe(false);
  });

  it('Stage 3 awards Red exactly once and grants Flame Burst; Blue and Yellow stay locked', () => {
    let s = toRubyStage1();
    s = P.completeRubyStage(s, 1).save;
    s = P.completeRubyStage(s, 2).save;
    const three = P.completeRubyStage(s, 3);
    expect(three.awarded).toBe('red');
    expect(three.save.colors.red).toBe(true);
    expect(three.save.colors.blue).toBe(false);
    expect(three.save.colors.yellow).toBe(false);
    expect(P.hasAbility(three.save, 'flameBurst')).toBe(true);
    expect(P.hasAbility(three.save, 'basicDash')).toBe(true);
    expect(P.hasAbility(three.save, 'bubbleGlide')).toBe(false);
    const again = P.completeRubyStage(three.save, 3);
    expect(again.accepted).toBe(false);
    expect(again.awarded).toBeNull();
  });

  it('red reveal → dash tutorial → complete, strictly in order', () => {
    let s = toRubyStage1();
    expect(P.finishRedReveal(s)).toBe(s);
    s = P.completeRubyStage(P.completeRubyStage(P.completeRubyStage(s, 1).save, 2).save, 3).save;
    expect(P.finishDashTutorial(s)).toBe(s);
    s = P.finishRedReveal(s);
    expect(s.ruby.phase).toBe('dashTutorial');
    s = P.finishDashTutorial(s);
    expect(s.ruby.phase).toBe('complete');
  });

  it('girl and boy explorers follow identical progression', () => {
    const run = (hero: 'girl' | 'boy') => {
      let s = toRubyStage1(hero);
      s = P.completeRubyStage(P.completeRubyStage(P.completeRubyStage(s, 1).save, 2).save, 3).save;
      s = P.finishDashTutorial(P.finishRedReveal(s));
      const { hero: _h, updatedAt: _u, ...rest } = s;
      return rest;
    };
    expect(run('girl')).toEqual(run('boy'));
  });

  it('mirror orientations are only saved during Stage 2', () => {
    const s = toRubyStage1();
    expect(P.saveRubyMirrors(s, [0, 0, 0])).toBe(s);
    const s2 = P.completeRubyStage(s, 1).save;
    expect(P.saveRubyMirrors(s2, [1, 2, 3]).ruby.mirrors).toEqual([1, 2, 3]);
  });
});

describe('color mixing', () => {
  const withColors = (colors: Partial<SaveData['colors']>): SaveData => {
    const s = newSave('girl');
    s.colors = { ...s.colors, ...colors };
    return s;
  };

  it('never unlocks a secondary unless both inputs are owned', () => {
    const r = P.mixColors(withColors({ red: true }), 'red', 'blue');
    expect(r.reason).toBe('missing-input');
    expect(r.missing).toEqual(['blue']);
    expect(r.save.colors.purple).toBe(false);
  });

  it('is order-independent and discovers each color only once', () => {
    const s = withColors({ red: true, blue: true });
    const a = P.mixColors(s, 'blue', 'red');
    expect(a.result).toBe('purple');
    expect(a.discovered).toBe(true);
    const b = P.mixColors(a.save, 'red', 'blue');
    expect(b.discovered).toBe(false);
    expect(b.save.colors.purple).toBe(true);
  });

  it('mixing purple does not unlock orange or green', () => {
    const r = P.mixColors(withColors({ red: true, blue: true }), 'red', 'blue');
    expect(r.save.colors.orange).toBe(false);
    expect(r.save.colors.green).toBe(false);
  });

  it('owning all three primaries does not auto-unlock secondaries (explicit mix required)', () => {
    const s = withColors({ red: true, blue: true, yellow: true });
    expect(s.colors.purple || s.colors.orange || s.colors.green).toBe(false);
    const o = P.mixColors(s, 'yellow', 'red');
    expect(o.result).toBe('orange');
    const g = P.mixColors(o.save, 'yellow', 'blue');
    expect(g.result).toBe('green');
    expect(g.save.colors.purple).toBe(false);
  });

  it('same color twice is not a mix', () => {
    expect(P.mixColors(withColors({ red: true }), 'red', 'red').reason).toBe('same-color');
  });
});

describe('collectibles', () => {
  it('stickers are cosmetic and collected once', () => {
    const s = newSave('girl');
    const a = P.collectSticker(s, 'berrySticker2');
    expect(a.isNew).toBe(true);
    const b = P.collectSticker(a.save, 'berrySticker2');
    expect(b.isNew).toBe(false);
    expect(b.save.collectibles).toEqual(['berrySticker2']);
    expect(b.save.colors).toEqual(s.colors);
  });
});
