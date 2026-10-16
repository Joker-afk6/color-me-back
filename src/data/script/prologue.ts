/**
 * PROLOGUE — THE DAY THE COLORS DISAPPEARED.
 * Lines are verbatim from docs/design/00_Prologue_Script.md. Ids are voice-ready.
 */
import type { Line } from '../speakers';

const L = (id: string, speaker: Line['speaker'], text: string): Line => ({ id, speaker, text });

export const PROLOGUE = {
  // P0 — opening cinematic
  opening: [
    L('p0.narrator.morning', 'narrator', 'On a morning that should have been ordinary, something extraordinary had vanished.'),
    L('p0.explorer.drawing', 'explorer', 'My drawing! Where did all the colors go?'),
  ],
  // P1 — inspect three details (any order)
  inspect: {
    teddy: [L('p1.explorer.teddy', 'explorer', 'Even Teddy looks different.')],
    crayons: [L('p1.explorer.crayons', 'explorer', 'They are all the same gray!')],
    window: [L('p1.explorer.window', 'explorer', 'The whole village looks like a pencil drawing.')],
  },
  pipEntrance: [
    L('p1.pip.entrance', 'pip', "Pssst! Over here! I'm Pip! And yes, I normally look a little more colorful."),
    L('p1.explorer.fix', 'explorer', 'Can we fix it?'),
    L('p1.pip.brave', 'pip', 'We can try. The colors are waiting for somebody brave enough to find them.'),
  ],
  // P2 — the Wonderbrush
  wonderbrush: [L('p2.pip.wonderbrush', 'pip', 'This is the Wonderbrush! It can wake up sleeping magic. Go on - give that sleepy star a tap!')],
  starAwake: [L('p2.pip.waiting', 'pip', "See? The magic hasn't disappeared. It's just waiting!")],
  // P3 — Hush Hollow tutorial walk
  village: [L('p3.pip.remembers', 'pip', "The village remembers the colors... even if we can't see them yet.")],
  firstStar: [L('p3.pip.first', 'pip', "One star awake! I wonder who's behind that berry-shaped arch?")],
  secondStar: [L('p3.pip.second', 'pip', 'Two stars! Look - a path to the Ruby Orchard!')],
  // P4 — transition
  arch: [
    L('p4.explorer.brave', 'explorer', "What if I'm not brave enough?"),
    L('p4.pip.together', 'pip', "Then we'll be brave together. Besides, the best adventures begin with a tiny first step."),
  ],
};

/**
 * Short spoken/printed tutorial prompts ("Tutorial interactions use icons, plain labels and short
 * spoken instructions"). These are UI helpers, not script dialogue.
 */
export const PROLOGUE_PROMPTS = {
  look: 'Look around your room. Walk with W A S D or the arrow keys.',
  inspect: 'Find things that look different. Walk close and press E.',
  takeBrush: 'Take the Wonderbrush. Press E.',
  tapStar: 'Tap the sleepy star with your Wonderbrush. Press E.',
  door: 'Go outside to Hush Hollow. Walk to the door and press E.',
  stars: 'Wake the two Wonderbrush stars in Hush Hollow.',
  jump: 'Press Space to jump up the step!',
  arch: 'Walk through the berry arch to the Ruby Orchard.',
};
