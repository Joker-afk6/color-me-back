/**
 * PROLOGUE — Director Script P00–P02 (docs/design/chapter1-beta/06_COMBINED_CHAPTER_1_CLAUDE_REFERENCE.pdf,
 * pages 3–5). Story lines are verbatim from that script. Ids are voice-ready.
 *
 * The earlier prologue (P0–P4, docs/design/00_Prologue_Script.md) is preserved unchanged in that file
 * and at git tag v0.2-chapter1-alpha; see docs/CANON_CHANGES.md CC-02.
 */
import type { Line } from '../speakers';

const L = (id: string, speaker: Line['speaker'], text: string): Line => ({ id, speaker, text });

export const PROLOGUE = {
  // P01 — The morning the colors disappeared (cutscene)
  opening: [
    L('p01.narrator.shine', 'narrator', 'One morning, Hush Hollow forgot how to shine. Not how to laugh. Not how to dream. Just how to be colorful.'),
    L('p01.explorer.crayon', 'explorer', 'Wait... where did my red crayon go?'),
  ],
  // P01 — interactions 1 and 2 (optional, any order)
  inspect: {
    teddy: [L('p01.explorer.teddy', 'explorer', 'You look a little sleepy, too.')],
    crayons: [L('p01.explorer.crayons', 'explorer', "The pictures are still here, but their colors aren't!")],
    // Interaction 3: a tiny levitating brush taps the glass.
    window: [
      L('p01.pip.psst', 'pip', "Psst! If you're looking for colors, I'm very good at looking!"),
      L('p01.explorer.who', 'explorer', 'Who said that?'),
    ],
  },
  // P01 — Pip drops into the room, lands bristle-first, spins upright.
  pipEntrance: [
    L('p01.pip.intro', 'pip', 'Pip! Paintbrush, guide, professional finder of almost everything.'),
    L('p01.explorer.find', 'explorer', 'Then can you find my color?'),
    L('p01.pip.wonderbrush', 'pip', "I think we can find everybody's. But first... would you help me wake this old Wonderbrush?"),
  ],
  // P02 — Hush Hollow: the two sleeping stars
  village: [L('p02.pip.step', 'pip', 'Take a little step. Now a hop! Your feet already remember how to be brave.')],
  firstStar: [
    L('p02.explorer.easy', 'explorer', "That wasn't so hard!"),
    L('p02.pip.brushstroke', 'pip', 'Excellent! A real artist always tries more than one brushstroke.'),
  ],
  secondStar: [L('p02.pip.stamps', 'pip', 'See those berry stamps on the road? They lead to someone who needs our help.')],
};

/**
 * Short spoken/printed tutorial prompts. These are UI helpers written in the game's voice,
 * NOT script dialogue.
 */
export const PROLOGUE_PROMPTS = {
  inspect: 'Look around your room. Walk with W A S D or the arrow keys, and press E to look.',
  window: 'Something is tapping on the window!',
  takeBrush: 'Take the Wonderbrush from its cradle. Press E.',
  door: 'Go outside to Hush Hollow. Walk to the door and press E.',
  move: 'Walk with W A S D. Drag the mouse to look around.',
  jump: 'Press Space to hop over the little brook!',
  dash: 'Run along the sparkly stripe and tap Shift to dash!',
  stars: 'Wake the two Wonderbrush stars in Hush Hollow.',
  terrace: 'Press Space to jump up the step!',
  arch: 'Walk through the berry arch to the Ruby Orchard.',
};
