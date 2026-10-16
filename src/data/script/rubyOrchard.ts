/**
 * CHAPTER 1 — THE RUBY ORCHARD.
 * Lines are verbatim from docs/design/01_Chapter_One_Ruby_Orchard_FULL_SCRIPT.md. Ids are voice-ready.
 */
import type { Line } from '../speakers';

const L = (id: string, speaker: Line['speaker'], text: string): Line => ({ id, speaker, text });

export const RUBY = {
  // Scene 1.1 — Into the orchard
  arrival: [
    L('1.1.pip.berries', 'pip', "Oh wow! Look at all these berries! Well... I think they're berries. It's hard to tell without red."),
    L('1.1.explorer.dragon', 'explorer', 'Is that a dragon?'),
    L('1.1.ruby.friendly', 'ruby', "A friendly dragon! Mostly! Three silly spell crystals won't let my wings flap."),
    L('1.1.explorer.help', 'explorer', 'We can help you.'),
    L('1.1.ruby.thanks', 'ruby', 'Oh, thank goodness! Please watch out for the bouncing fruit. It has a mind of its own!'),
  ],
  // Traversal section A hint ladder (step 2 is the script's Pip line)
  berryHint: L('1.1.pip.hint', 'pip', 'That round berry might fit on the round picture!'),

  // Scene 1.2 Stage 1 — The Bouncing Berry Parade
  stage1Intro: [
    L('1.2.s1.ruby.bother', 'ruby', 'Oh, bother! My berries are bouncing again!'),
    L('1.2.s1.pip.circle', 'pip', "Watch for the circle. A berry's about to land there!"),
  ],
  stage1Bother: L('1.2.s1.ruby.bother.bark', 'ruby', 'Oh, bother! My berries are bouncing again!'),
  stage1Circle: L('1.2.s1.pip.circle.bark', 'pip', "Watch for the circle. A berry's about to land there!"),
  stage1Free: [
    L('1.2.s1.explorer.free', 'explorer', 'One crystal is free!'),
    L('1.2.s1.ruby.tail', 'ruby', 'My tail can wiggle! What a marvelous start!'),
  ],

  // Stage 2 — The Mirror Berry Puzzles
  stage2Intro: [L('1.2.s2.pip.direction', 'pip', "The sparkle keeps missing its mark. Let's give it a new direction!")],
  stage2Twitch: L('1.2.s2.ruby.twitch', 'ruby', 'Is it working? My left wing just twitched!'),
  stage2Done: [L('1.2.s2.explorer.two', 'explorer', 'Two! Almost there!')],

  // Stage 3 — The Friendly Dragon Dance
  stage3Chant1: L('1.2.s3.ruby.one', 'ruby', 'One big wiggle!'),
  stage3Chant2: L('1.2.s3.ruby.two', 'ruby', 'Two big wiggles!'),
  stage3Chant3: L('1.2.s3.ruby.three', 'ruby', 'Here comes my biggest... WIGGLE!'),
  stage3Chance: L('1.2.s3.pip.chance', 'pip', "That's our chance - paint the sparkly crystal!"),
  stage3Done: [
    L('1.2.s3.explorer.free', 'explorer', "Ruby! You're free!"),
    L('1.2.s3.ruby.razzle', 'ruby', 'My wings! My color! My RAZZLE-DAZZLE!'),
  ],

  // Scene 1.3 — RED RETURNS
  redReturns: [
    L('1.3.pip.red', 'pip', 'Look! RED! Red is back in the world!'),
    L('1.3.explorer.scarf', 'explorer', 'The berries! The flowers! And my scarf!'),
    L('1.3.ruby.speed', 'ruby', 'You gave me the courage to try again. Let me share a little dragon speed!'),
  ],

  // Scene 1.4 — Test the new power
  dashIntro: [L('1.4.pip.whoosh', 'pip', 'Ready? A dash is a quick WHOOSH! Try it along the sparkly path!')],
  dashDone: [
    L('1.4.explorer.whoa', 'explorer', 'Whoa! I can move like Ruby!'),
    L('1.4.ruby.bloop', 'ruby', "There's something strange happening near Whisperwave Bay. I heard a very unhappy 'bloop'!"),
    L('1.4.pip.next', 'pip', "Then that's our next color!"),
  ],
};

/** Supportive gameplay barks and hint-ladder lines (not in the script; written in its voice). */
export const RUBY_HELP = {
  bounced: ["Boing! You're okay - try again!", 'Whoops! Soft berry! Let’s step out of the circle.', 'Bouncy! Look for the empty ground.'],
  slowMode: 'Let’s slow the parade down a little.',
  revealAssist: 'The crystal came down to say hello - paint it!',
  revealed: 'The crystal is free to reach - tap it with your Wonderbrush!',
  mirrorHint1: 'Try the mirror with the sparkle on it first!',
  mirrorHint2: 'Follow the dotted path - that’s where the light wants to go.',
  mirrorHint3: 'I can turn the next mirror for you. Press H again!',
  danceHint: 'Hop onto a berry platform before the biggest wiggle!',
  danceMissed: 'Ruby will dance again - we can try the next one!',
  dashHint: 'Run, then tap Shift to WHOOSH across!',
  gapFall: 'Splash! Soft berry juice. Let’s try that jump again!',
};
