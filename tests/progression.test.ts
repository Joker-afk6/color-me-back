import { describe, expect, it } from 'vitest';
import { newSave, type SaveData } from '../src/state/SaveData';
import * as P from '../src/state/progression';

/** Walk a save through the prologue exactly as the game does. */
function finishPrologue(hero: 'girl' | 'boy' = 'girl'): SaveData {
  let s = newSave(hero);
  s = P.finishOpening(s);
  s = P.inspectBedroomObject(s, 'teddy').save;
  s = P.inspectBedroomObject(s, 'window').save;
  s = P.takeWonderbrush(s);
  s = P.wakeBedroomStar(s);
  s = P.leaveBedroom(s);
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

describe('prologue', () => {
  it('Pip arrives after exactly two inspections, in any order; the third is optional', () => {
    let s = P.finishOpening(newSave('boy'));
    const a = P.inspectBedroomObject(s, 'crayons');
    expect(a.pipArrives).toBe(false);
    s = a.save;
    const repeat = P.inspectBedroomObject(s, 'crayons');
    expect(repeat.save).toBe(s); // inspecting the same object twice does not count
    const b = P.inspectBedroomObject(s, 'window');
    expect(b.pipArrives).toBe(true);
    expect(b.save.prologue.phase).toBe('wonderbrush');
    const c = P.inspectBedroomObject(b.save, 'teddy');
    expect(c.pipArrives).toBe(false);
    expect(c.save.prologue.inspected).toHaveLength(3);
  });

  it('cannot leave the bedroom without the Wonderbrush and the woken star', () => {
    let s = P.finishOpening(newSave('girl'));
    s = P.inspectBedroomObject(s, 'teddy').save;
    s = P.inspectBedroomObject(s, 'window').save;
    expect(P.canLeaveBedroom(s)).toBe(false);
    expect(P.wakeBedroomStar(s)).toBe(s); // needs the brush first
    s = P.takeWonderbrush(s);
    expect(P.canLeaveBedroom(s)).toBe(false);
    s = P.wakeBedroomStar(s);
    expect(P.canLeaveBedroom(s)).toBe(true);
    expect(P.leaveBedroom(s).location).toBe('hushHollow');
  });

  it('the bedroom star never restores a color', () => {
    let s = P.finishOpening(newSave('girl'));
    s = P.inspectBedroomObject(s, 'teddy').save;
    s = P.inspectBedroomObject(s, 'window').save;
    s = P.wakeBedroomStar(P.takeWonderbrush(s));
    expect(Object.values(s.colors).some(Boolean)).toBe(false);
  });

  it('village stars work in either order and the arch needs both', () => {
    let s = finishPrologue('girl');
    expect(s.prologue.phase).toBe('complete');
    expect(s.location).toBe('rubyOrchard');
    // only one star → prologue cannot complete
    let t = P.finishOpening(newSave('girl'));
    t = P.inspectBedroomObject(t, 'teddy').save;
    t = P.inspectBedroomObject(t, 'crayons').save;
    t = P.leaveBedroom(P.wakeBedroomStar(P.takeWonderbrush(t)));
    t = P.wakeVillageStar(t, 'pathStar');
    expect(P.completePrologue(t)).toBe(t);
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
    expect(P.hasAbility(two.save, 'crimsonDash')).toBe(false);
  });

  it('Stage 3 awards Red exactly once and unlocks Crimson Dash; Blue and Yellow stay locked', () => {
    let s = toRubyStage1();
    s = P.completeRubyStage(s, 1).save;
    s = P.completeRubyStage(s, 2).save;
    const three = P.completeRubyStage(s, 3);
    expect(three.awarded).toBe('red');
    expect(three.save.colors.red).toBe(true);
    expect(three.save.colors.blue).toBe(false);
    expect(three.save.colors.yellow).toBe(false);
    expect(P.hasAbility(three.save, 'crimsonDash')).toBe(true);
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
