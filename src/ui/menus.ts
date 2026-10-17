/**
 * Menu screens: title, explorer select, pause, settings, help, paint palette (mixer), sticker
 * book, chapter cards, ability unlock card, confirmations. Every button is functional.
 */
import { ABILITIES } from '../data/abilities';
import { COLOR_INFO, MIX_RULES, PRIMARY_COLORS, type GameColor, type PrimaryColor, type SecondaryColor } from '../data/colors';
import type { Settings } from '../state/Settings';
import type { HeroId, StickerId } from '../state/SaveData';
import { STICKERS } from '../state/SaveData';
import { el, escapeHtml } from './dom';
import { ICON, SYMBOL_SVG, keycap } from './icons';
import type { Screens } from './Screens';

const assetUrl = (p: string) => `${import.meta.env.BASE_URL}${p}`;

function panel(...children: Array<Node | string>): HTMLElement {
  const p = el('div', { class: 'panel' });
  p.append(...children);
  return p;
}

function button(label: string, onClick: () => void, opts: { cls?: string; html?: string; autofocus?: boolean; aria?: string } = {}): HTMLButtonElement {
  const b = el('button', { class: opts.cls ?? '', 'data-autofocus': opts.autofocus ? 'true' : undefined, 'aria-label': opts.aria }) as HTMLButtonElement;
  if (opts.html) b.innerHTML = opts.html;
  else b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

// ───────────────────────────── Title ─────────────────────────────

export interface TitleCallbacks {
  hasSave: boolean;
  continueLabel: string;
  readAloud: boolean;
  soundOn: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onHowToPlay: () => void;
  onAbout: () => void;
  onToggleReadAloud: (on: boolean) => void;
  onToggleSound: (on: boolean) => void;
  onAnyClick: () => void;
}

export function openTitle(screens: Screens, cb: TitleCallbacks): void {
  const letters = 'COLOR ME BACK!'.split('');
  const palette = ['c-red', 'c-blue', 'c-yellow', 'c-purple', 'c-orange', 'c-green'];
  const logo = el('div', { class: 'logo', role: 'heading', 'aria-level': '1', 'aria-label': 'Color Me Back!' });
  let ci = 0;
  letters.forEach((ch, i) => {
    const s = el('span', { 'aria-hidden': 'true' }, ch === ' ' ? ' ' : ch);
    if (ch !== ' ') s.className = palette[ci++ % palette.length]!;
    s.style.animationDelay = `${i * 0.08}s`;
    logo.append(s);
  });
  const actions = el('div', { class: 'actions column' });
  // Director Script P00: START ADVENTURE, CONTINUE (if a save exists), SETTINGS, HOW TO PLAY.
  actions.append(button('Start Adventure', cb.onNewGame, { cls: cb.hasSave ? 'secondary' : '', autofocus: !cb.hasSave, html: `${ICON.brush} Start Adventure` }));
  if (cb.hasSave) actions.append(button(cb.continueLabel, cb.onContinue, { autofocus: true, html: `${ICON.star} ${escapeHtml(cb.continueLabel)}` }));
  actions.append(button('Settings', cb.onSettings, { cls: 'secondary' }));
  actions.append(button('How to Play', cb.onHowToPlay, { cls: 'secondary' }));
  actions.append(button('About this game', cb.onAbout, { cls: 'secondary' }));
  const read = button('', () => {
    const on = read.getAttribute('aria-pressed') !== 'true';
    read.setAttribute('aria-pressed', String(on));
    read.innerHTML = `${ICON.sound} Read aloud: ${on ? 'On' : 'Off'}`;
    cb.onToggleReadAloud(on);
  }, { cls: 'toggle-pill', html: `${ICON.sound} Read aloud: ${cb.readAloud ? 'On' : 'Off'}` });
  read.setAttribute('aria-pressed', String(cb.readAloud));
  const sound = button('', () => {
    const on = sound.getAttribute('aria-pressed') !== 'true';
    sound.setAttribute('aria-pressed', String(on));
    sound.textContent = `♪ Music & sounds: ${on ? 'On' : 'Off'}`;
    cb.onToggleSound(on);
  }, { cls: 'toggle-pill' });
  sound.textContent = `♪ Music & sounds: ${cb.soundOn ? 'On' : 'Off'}`;
  sound.setAttribute('aria-pressed', String(cb.soundOn));
  const footer = el('div', { class: 'title-footer' }, read, sound);
  const p = panel(
    el('p', { class: 'hint' }, 'A gentle 3D adventure'),
    logo,
    el('p', { class: 'tagline' }, 'The colors have vanished — even from your clothes. Can you bring them back?'),
    actions,
    footer,
  );
  p.classList.add('title-panel');
  const root = screens.open({ id: 'title', label: 'Title screen', className: 'title-screen', escapable: false }, p);
  root.addEventListener('pointerdown', cb.onAnyClick, { capture: true });
  root.addEventListener('keydown', cb.onAnyClick, { capture: true });
}

export function openAbout(screens: Screens): void {
  screens.open(
    { id: 'about', label: 'About this game' },
    panel(
      el('h2', {}, 'About COLOR ME BACK!'),
      el('p', {}, 'An original adventure for children ages 5–10. Explore, solve gentle puzzles and rescue the Color Guardians to bring Red, Blue and Yellow home — then mix them into new colors.'),
      el('p', { class: 'hint' }, 'All 3D characters, places, music and sounds are made in code for this game from the provided 2D reference art. Read-aloud uses your browser’s built-in voice.'),
      el('p', { class: 'hint' }, 'Privacy: no accounts, ads, chat or tracking. Your progress is saved only in this browser.'),
      el('p', { class: 'hint' }, 'This build contains the Prologue and Chapter 1 (The Ruby Orchard). Chapters 2–4 are in development.'),
      el('div', { class: 'actions' }, button('Back', () => screens.close('about'), { autofocus: true })),
    ),
  );
}

// ───────────────────────────── Explorer select ─────────────────────────────

export function openHeroSelect(screens: Screens, onPick: (h: HeroId) => void, onBack: () => void): void {
  const card = (hero: HeroId, name: string, img: string) => {
    const b = el('button', { class: 'hero-card', 'aria-label': `Play as the ${name}` }) as HTMLButtonElement;
    b.append(el('img', { src: assetUrl(img), alt: `${name} character art`, draggable: 'false' }), el('strong', {}, name), el('small', {}, 'Same powers, same story'));
    b.addEventListener('click', () => onPick(hero));
    return b;
  };
  const g = card('girl', 'Girl Explorer', 'assets/characters/girl.png');
  g.setAttribute('data-autofocus', 'true');
  screens.open(
    { id: 'hero', label: 'Choose your explorer', onClose: onBack },
    panel(
      el('h2', {}, 'Choose your Explorer'),
      el('p', {}, 'Both explorers have exactly the same adventure, moves and powers.'),
      el('div', { class: 'hero-cards' }, g, card('boy', 'Boy Explorer', 'assets/characters/boy.png')),
      el('div', { class: 'actions' }, button('Back', () => screens.close('hero'), { cls: 'secondary' })),
    ),
  );
}

// ───────────────────────────── Confirm ─────────────────────────────

export function openConfirm(screens: Screens, title: string, text: string, yes: string, onYes: () => void, no = 'Go back'): void {
  screens.open(
    { id: 'confirm', label: title },
    panel(
      el('h2', {}, title),
      el('p', {}, text),
      el('div', { class: 'actions' }, button(no, () => screens.close('confirm'), { autofocus: true, cls: 'secondary' }), button(yes, () => {
        screens.close('confirm', false);
        onYes();
      })),
    ),
  );
}

// ───────────────────────────── Pause ─────────────────────────────

export interface PauseCallbacks {
  onResume: () => void;
  onHelp: () => void;
  onSettings: () => void;
  onStickers: () => void;
  onSwitchHero: () => void;
  onRestartCheckpoint: () => void;
  onMainMenu: () => void;
  heroName: string;
  areaName: string;
}

export function openPause(screens: Screens, cb: PauseCallbacks): void {
  const otherHero = cb.heroName === 'Girl Explorer' ? 'Boy Explorer' : 'Girl Explorer';
  screens.open(
    { id: 'pause', label: 'Paused', onClose: cb.onResume, closeKeys: ['KeyP'] },
    panel(
      el('h2', {}, 'Paused'),
      el('p', { class: 'hint' }, `${cb.areaName} · playing as ${cb.heroName}`),
      el(
        'div',
        { class: 'actions column' },
        button('Resume', () => screens.close('pause'), { autofocus: true, html: `▶ Resume` }),
        button('Controls & help', cb.onHelp, { cls: 'secondary', html: `${ICON.help} Controls & help` }),
        button('Settings', cb.onSettings, { cls: 'secondary' }),
        button('Sticker book', cb.onStickers, { cls: 'secondary', html: `${ICON.sticker} Sticker book` }),
        button(`Switch to ${otherHero}`, cb.onSwitchHero, { cls: 'secondary' }),
        button('Restart from checkpoint', cb.onRestartCheckpoint, { cls: 'secondary' }),
        button('Main menu', cb.onMainMenu, { cls: 'secondary' }),
      ),
      el('p', { class: 'hint' }, 'Your progress saves automatically at every checkpoint.'),
    ),
  );
}

// ───────────────────────────── Settings ─────────────────────────────

export function openSettings(screens: Screens, get: () => Readonly<Settings>, set: <K extends keyof Settings>(k: K, v: Settings[K]) => void, onReset: () => void, readAloudAvailable: boolean): void {
  const grid = el('div', { class: 'settings-grid' });
  const section = (t: string) => grid.append(el('div', { class: 'settings-section' }, t));
  const row = (label: string, desc: string, control: HTMLElement, id: string) => {
    const l = el('label', { for: id });
    l.innerHTML = `${escapeHtml(label)}<span class="desc">${escapeHtml(desc)}</span>`;
    control.id = id;
    grid.append(l, control);
  };
  const toggle = <K extends keyof Settings>(key: K, label: string, desc: string) => {
    const b = el('button', { class: 'switch', role: 'switch', 'aria-checked': String(!!get()[key]), 'aria-label': label }) as HTMLButtonElement;
    b.addEventListener('click', () => {
      const v = !get()[key];
      set(key, v as Settings[K]);
      b.setAttribute('aria-checked', String(v));
    });
    row(label, desc, b, `set-${String(key)}`);
  };
  const slider = <K extends keyof Settings>(key: K, label: string, desc: string, min = 0, max = 1, step = 0.05) => {
    const r = el('input', { type: 'range', min, max, step, value: String(get()[key]), 'aria-label': label }) as HTMLInputElement;
    r.addEventListener('input', () => set(key, Number(r.value) as Settings[K]));
    row(label, desc, r, `set-${String(key)}`);
  };
  const select = <K extends keyof Settings>(key: K, label: string, desc: string, options: Array<[string, string]>) => {
    const s = el('select', { 'aria-label': label }) as HTMLSelectElement;
    for (const [v, t] of options) s.append(el('option', { value: v, selected: get()[key] === v }, t));
    s.addEventListener('change', () => set(key, s.value as Settings[K]));
    row(label, desc, s, `set-${String(key)}`);
  };

  section('Sound & voice');
  slider('masterVolume', 'Main volume', 'Everything you hear');
  slider('musicVolume', 'Music', 'Background songs');
  slider('sfxVolume', 'Sound effects', 'Footsteps, chimes and splashes');
  toggle('readAloud', 'Read aloud', readAloudAvailable ? 'Speak story lines and tips with your browser’s voice' : 'Not available in this browser');
  slider('voiceVolume', 'Read-aloud volume', 'How loud the reading voice is');
  toggle('soundCaptions', 'Sound captions', 'Show words for important sounds');
  section('Seeing & comfort');
  select('textSize', 'Text size', 'Make words bigger', [
    ['normal', 'Normal'],
    ['large', 'Large'],
    ['xlarge', 'Extra large'],
  ]);
  toggle('reducedMotion', 'Reduced motion', 'Softer effects, gentle crossfades, no sweeping waves');
  toggle('cameraShake', 'Camera shake', 'Little bumps when big things land');
  toggle('highContrast', 'High contrast', 'Darker panels and stronger outlines');
  select('quality', 'Graphics', 'Lower this if the game feels slow', [
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low (no shadows)'],
  ]);
  section('Playing');
  toggle('assistMode', 'Helper mode', 'Bigger reach, slower patterns, longer chances, auto-dash help');
  toggle('cameraAssist', 'Camera helper', 'Camera gently follows behind you');
  slider('cameraSensitivity', 'Camera speed', 'How fast the camera turns', 0.3, 2.5, 0.1);
  toggle('invertCameraY', 'Invert camera up/down', 'Flip vertical camera movement');

  screens.open(
    { id: 'settings', label: 'Settings' },
    panel(
      el('h2', {}, 'Settings'),
      grid,
      el('div', { class: 'actions' }, button('Reset to defaults', () => {
        onReset();
        screens.close('settings', false);
        openSettings(screens, get, set, onReset, readAloudAvailable);
      }, { cls: 'secondary' }), button('Done', () => screens.close('settings'), { autofocus: true })),
    ),
  );
}

// ───────────────────────────── Help ─────────────────────────────

export function openHelp(screens: Screens, owned: (c: GameColor) => boolean): void {
  const t = el('div', { class: 'controls-table' });
  const add = (keys: string, what: string, locked = false) => {
    const k = el('div', { class: `k ${locked ? 'locked' : ''}`, html: keys });
    const w = el('div', { class: locked ? 'locked' : '', html: what });
    t.append(k, w);
  };
  add(`${keycap('W')}${keycap('A')}${keycap('S')}${keycap('D')} or arrows`, 'Walk and run');
  add(keycap('Space'), 'Jump (hold for a higher jump)');
  add(`${keycap('E')} or ${keycap('Enter')}`, 'Use the Wonderbrush: look, tap-paint, push');
  add(`Hold ${keycap('E')}`, 'Sweep-paint (when you see a ring)');
  add(`Drag mouse · ${keycap('Q')} ${keycap('R')}`, 'Turn the camera · mouse wheel zooms');
  add(keycap('C'), 'Put the camera behind you');
  add(keycap('M'), 'Open the paint palette');
  add(keycap('H'), 'Ask Pip for a hint');
  add(keycap('Esc'), 'Pause, settings and help');
  const ab = (id: keyof typeof ABILITIES, guardian: string) => {
    const a = ABILITIES[id];
    const have = a.color === null || owned(a.color);
    add(keycap(a.keyLabel), `<b>${escapeHtml(a.name)}</b> — ${have ? escapeHtml(a.howTo) : `${ICON.lock} Rescue ${escapeHtml(guardian)} to unlock`}`, !have);
  };
  ab('basicDash', '');
  ab('flameBurst', 'Ruby');
  ab('bubbleGlide', 'Bloop (Chapter 2)');
  ab('sunbeam', 'Sol (Chapter 3)');
  screens.open(
    { id: 'help', label: 'Controls and help', closeKeys: ['KeyH'] },
    panel(
      el('h2', {}, 'How to play'),
      t,
      // Director Script §H / A-07: do not advertise controller or touch support before hardware testing.
      el('p', { class: 'hint' }, 'This beta is made for a keyboard and mouse. Gamepad and touch controls are planned but not tested yet.'),
      el('p', { class: 'hint' }, 'You can never lose. If you slip or get bounced, you pop right back to safe ground.'),
      el('div', { class: 'actions' }, button('Got it!', () => screens.close('help'), { autofocus: true })),
    ),
  );
}

// ───────────────────────────── Paint palette / mixer ─────────────────────────────

export interface PaletteCallbacks {
  owned: (c: GameColor) => boolean;
  guardianFor: (c: PrimaryColor) => string;
  /** Attempt the explicit mix; returns the outcome for display. */
  onMix: (a: PrimaryColor, b: PrimaryColor) => { result: SecondaryColor | null; discovered: boolean; reason: 'ok' | 'same-color' | 'missing-input' };
  onClose: () => void;
  sound: (name: 'ui' | 'success' | 'tryAgain' | 'click') => void;
  speak: (text: string) => void;
}

export function openPalette(screens: Screens, cb: PaletteCallbacks): void {
  const slots: Array<PrimaryColor | null> = [null, null];
  const ownedPrimaries = PRIMARY_COLORS.filter((c) => cb.owned(c));
  const bowl = el('div', { class: 'mixing-bowl', role: 'group', 'aria-label': 'Mixing bowl' });
  const slotEls = [el('div', { class: 'slot' }), el('div', { class: 'slot' })];
  bowl.append(slotEls[0]!, el('span', { 'aria-hidden': 'true' }, '+'), slotEls[1]!);
  const result = el('div', { class: 'mix-result', role: 'status', 'aria-live': 'polite' });
  const mixBtn = button('Mix!', () => doMix(), { html: `${ICON.palette} Mix!` });
  mixBtn.disabled = true;
  const clearBtn = button('Empty the bowl', () => {
    slots[0] = slots[1] = null;
    render();
    cb.sound('click');
  }, { cls: 'secondary' });

  const drops = el('div', { class: 'palette-row' });
  const dropEls = new Map<PrimaryColor, HTMLButtonElement>();
  for (const c of PRIMARY_COLORS) {
    const info = COLOR_INFO[c];
    const have = cb.owned(c);
    const b = el('button', { class: `paint-drop ${have ? '' : 'locked'}`, 'aria-label': have ? `${info.label} paint. Press to put it in the bowl.` : `${info.label} paint is still missing. Rescue ${cb.guardianFor(c)} to find it.`, 'aria-pressed': 'false' }) as HTMLButtonElement;
    b.innerHTML = `<div class="blob" style="background:${info.hex}">${SYMBOL_SVG[info.symbol]}</div><span class="name">${info.label.toUpperCase()}</span><span class="sub">${have ? escapeHtml(info.phrase) : `${ICON.lock} Rescue ${escapeHtml(cb.guardianFor(c))}`}</span>`;
    if (have) {
      b.addEventListener('click', () => addToBowl(c));
      enableDrag(b, bowl, () => addToBowl(c));
    } else b.disabled = true;
    dropEls.set(c, b);
    drops.append(b);
  }

  function addToBowl(c: PrimaryColor): void {
    const i = slots[0] === null ? 0 : slots[1] === null ? 1 : 1;
    slots[i] = c;
    cb.sound('ui');
    render();
  }

  function render(): void {
    slots.forEach((s, i) => {
      const n = slotEls[i]!;
      if (s) {
        n.style.background = COLOR_INFO[s].hex;
        n.style.borderStyle = 'solid';
        n.innerHTML = SYMBOL_SVG[COLOR_INFO[s].symbol];
        n.setAttribute('aria-label', `${COLOR_INFO[s].label} in the bowl`);
      } else {
        n.style.background = '';
        n.style.borderStyle = 'dashed';
        n.innerHTML = '';
        n.setAttribute('aria-label', 'Empty spot');
      }
    });
    for (const [c, b] of dropEls) b.setAttribute('aria-pressed', String(slots.includes(c)));
    mixBtn.disabled = !(slots[0] && slots[1]);
    bowl.querySelector('.swirl')?.remove();
  }

  function doMix(): void {
    const [a, b] = slots;
    if (!a || !b) return;
    const out = cb.onMix(a, b);
    if (out.reason === 'same-color') {
      result.innerHTML = `Two ${COLOR_INFO[a].label} paints just make more ${COLOR_INFO[a].label}! Try two <b>different</b> colors.`;
      cb.sound('tryAgain');
      cb.speak(`Two ${COLOR_INFO[a].label} paints just make more ${COLOR_INFO[a].label}. Try two different colors.`);
    } else if (out.result) {
      const r = COLOR_INFO[out.result];
      const ability = ABILITIES[r.ability];
      const swirl = el('div', { class: 'swirl', html: `${SYMBOL_SVG[r.symbol]} ${r.label.toUpperCase()}` });
      swirl.style.background = r.hex;
      bowl.append(swirl);
      result.innerHTML = `${COLOR_INFO[a].label} + ${COLOR_INFO[b].label} = <b style="color:${r.hex}">${r.label.toUpperCase()}</b>! ${out.discovered ? 'You made a whole new color!' : 'You already know this one.'}<br/>${escapeHtml(ability.name)} ${keycap(ability.keyLabel)} — ${escapeHtml(ability.howTo)}`;
      cb.sound('success');
      cb.speak(`${COLOR_INFO[a].label} and ${COLOR_INFO[b].label} make ${r.label}!`);
    }
  }

  const recipes = el('div', { class: 'recipes' });
  for (const rule of MIX_RULES) {
    const [a, b] = rule.inputs;
    const r = COLOR_INFO[rule.result];
    const chip = (c: GameColor) => `<span class="chip ${cb.owned(c) ? '' : 'locked'}" style="background:${COLOR_INFO[c].hex}" title="${COLOR_INFO[c].label}">${SYMBOL_SVG[COLOR_INFO[c].symbol]}</span>`;
    const card = el('div', { class: 'recipe' });
    card.innerHTML = `<div class="eq">${chip(a)} + ${chip(b)} = ${chip(rule.result)}</div><div>${COLOR_INFO[a].label} + ${COLOR_INFO[b].label} = <b>${r.label}</b></div><div class="hint">${escapeHtml(ABILITIES[r.ability].name)}${cb.owned(rule.result) ? ' ✓' : ''}</div>`;
    recipes.append(card);
  }

  const intro =
    ownedPrimaries.length >= 2
      ? 'Drag two different paints into the bowl (or press them), then press Mix!'
      : ownedPrimaries.length === 1
        ? `You have ${COLOR_INFO[ownedPrimaries[0]!].label}! Rescue another Color Guardian to unlock paint mixing.`
        : 'No paints yet. Rescue a Color Guardian to find your first color!';
  const content = panel(el('h2', {}, '🎨 The Wonderbrush Palette'), el('p', {}, intro), drops, bowl, el('div', { class: 'actions' }, mixBtn, clearBtn), result, el('h3', {}, 'Paint recipes'), recipes, el('div', { class: 'actions' }, button('Back to the adventure', () => screens.close('palette'), { autofocus: ownedPrimaries.length < 2 })));
  render();
  if (ownedPrimaries.length < 2) {
    mixBtn.disabled = true;
    result.textContent = 'Mixing needs two different paints.';
  }
  screens.open({ id: 'palette', label: 'Paint palette', onClose: cb.onClose, closeKeys: ['KeyM'] }, content);
}

/** Pointer-based drag (mouse + touch). Click/keyboard press is the accessible alternative. */
function enableDrag(src: HTMLElement, target: HTMLElement, onDrop: () => void): void {
  let ghost: HTMLElement | null = null;
  let start = { x: 0, y: 0 };
  let moved = false;
  src.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
    moved = false;
    src.setPointerCapture(e.pointerId);
  });
  src.addEventListener('pointermove', (e) => {
    if (!src.hasPointerCapture(e.pointerId)) return;
    if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10) return;
    if (!ghost) {
      moved = true;
      ghost = src.querySelector('.blob')!.cloneNode(true) as HTMLElement;
      Object.assign(ghost.style, { position: 'fixed', pointerEvents: 'none', zIndex: '99', transform: 'translate(-50%,-50%) scale(1.1)' });
      document.body.append(ghost);
    }
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    const r = target.getBoundingClientRect();
    target.classList.toggle('drag-over', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
  });
  const end = (e: PointerEvent) => {
    if (ghost) {
      const r = target.getBoundingClientRect();
      if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) onDrop();
      ghost.remove();
      ghost = null;
      target.classList.remove('drag-over');
    }
  };
  src.addEventListener('pointerup', end);
  src.addEventListener('pointercancel', end);
  // A drag must not also count as a click.
  src.addEventListener('click', (e) => {
    if (moved) {
      e.stopImmediatePropagation();
      e.preventDefault();
      moved = false;
    }
  }, true);
}

// ───────────────────────────── Sticker book ─────────────────────────────

const STICKER_INFO: Record<StickerId, { name: string; art: string; where: string }> = {
  berrySticker1: { name: 'Berry Buddy', art: '🍓', where: 'Ruby Orchard — behind a big berry bush' },
  berrySticker2: { name: 'Jam Jar Jubilee', art: '🫙', where: 'Ruby Orchard — high on the jam-jar platforms' },
  berrySticker3: { name: 'Dashing Cherry', art: '🍒', where: 'Ruby Orchard — at the end of the dash lane' },
};

export function openStickers(screens: Screens, have: readonly StickerId[]): void {
  const grid = el('div', { class: 'sticker-grid' });
  for (const id of STICKERS) {
    const info = STICKER_INFO[id];
    const got = have.includes(id);
    const s = el('div', { class: `sticker ${got ? '' : 'missing'}`, role: 'img', 'aria-label': got ? `${info.name} sticker` : `Missing sticker. Hint: ${info.where}` });
    s.innerHTML = `<div class="art">${info.art}</div><b>${got ? escapeHtml(info.name) : '???'}</b><div class="hint">${got ? 'Found!' : escapeHtml(info.where)}</div>`;
    grid.append(s);
  }
  screens.open(
    { id: 'stickers', label: 'Sticker book' },
    panel(el('h2', {}, `${ICON.sticker} Sticker book`), el('p', {}, `${have.length} of ${STICKERS.length} stickers found. Stickers are just for fun!`), grid, el('div', { class: 'actions' }, button('Close', () => screens.close('stickers'), { autofocus: true }))),
  );
}

// ───────────────────────────── Chapter card & unlock card ─────────────────────────────

export interface CardButton {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

export function openChapterCard(screens: Screens, kicker: string, title: string, sub: string, theme: 'prologue' | 'ruby' | 'redFound', buttons: CardButton[], onShown?: () => void): void {
  const art = el('div', { class: 'card-art' });
  const c = el('canvas', { width: 820, height: 462 }) as HTMLCanvasElement;
  paintCardArt(c, theme);
  const text = el('div', { class: 'card-text' });
  text.innerHTML = `<div class="card-kicker">${escapeHtml(kicker)}</div><div class="card-title">${escapeHtml(title)}</div><div class="card-sub">${escapeHtml(sub)}</div>`;
  art.append(c, text);
  if (buttons.length) {
    const actions = el('div', { class: 'card-actions' });
    buttons.forEach((b, i) => actions.append(button(b.label, b.onClick, { cls: b.primary ? '' : 'secondary', autofocus: i === 0 })));
    art.append(actions);
  }
  screens.open({ id: 'card', label: `${kicker} ${title}`, className: 'chapter-card', escapable: false }, art);
  onShown?.();
}

function paintCardArt(c: HTMLCanvasElement, theme: 'prologue' | 'ruby' | 'redFound'): void {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const w = c.width;
  const h = c.height;
  const g = ctx.createLinearGradient(0, 0, w, h);
  if (theme === 'prologue') {
    g.addColorStop(0, '#e6e9ee');
    g.addColorStop(1, '#a9b0ba');
  } else if (theme === 'ruby') {
    g.addColorStop(0, '#e9e5e5');
    g.addColorStop(1, '#a8a2a4');
  } else {
    g.addColorStop(0, '#ffe2dc');
    g.addColorStop(1, '#f39a8f');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const hill = (y: number, amp: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, y + Math.sin(x / 120 + y) * amp);
    ctx.lineTo(w, h);
    ctx.fill();
  };
  const red = theme === 'redFound';
  hill(h * 0.62, 26, red ? '#e7837b' : '#bfc4cb');
  hill(h * 0.74, 20, red ? '#c95b5b' : '#9ea5ae');
  // berries / houses
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 90 + (i % 2) * 20;
    const y = h * 0.66 + (i % 3) * 18;
    if (theme === 'prologue') {
      ctx.fillStyle = '#f2f3f5';
      ctx.fillRect(x - 22, y - 30, 44, 34);
      ctx.fillStyle = '#8d96a1';
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 30);
      ctx.lineTo(x, y - 62);
      ctx.lineTo(x + 30, y - 30);
      ctx.fill();
    } else {
      ctx.fillStyle = red ? '#ef4444' : '#8f8a8c';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(x - 6, y - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // sparkles
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 26; i++) {
    const x = (i * 137) % w;
    const y = (i * 71) % (h * 0.55);
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function openUnlockCard(screens: Screens, color: GameColor, onDone: () => void): void {
  const info = COLOR_INFO[color];
  const ability = ABILITIES[info.ability];
  const badge = el('div', { class: 'badge', html: SYMBOL_SVG[info.symbol] });
  badge.style.background = info.hex;
  const p = panel(
    el('h2', {}, `${info.label.toUpperCase()} restored!`),
    badge,
    el('p', { html: `New power: <b>${escapeHtml(ability.name)}</b> ${keycap(ability.keyLabel)}` }),
    el('p', {}, ability.howTo),
    // Never invite the child to try a power that is not built yet (Flame Burst is R09).
    el('div', { class: 'actions' }, button(ability.built ? 'Let’s try it!' : 'Hooray!', () => screens.close('unlock'), { autofocus: true })),
  );
  p.classList.add('unlock-card');
  screens.open({ id: 'unlock', label: `${info.label} restored. New power ${ability.name}`, onClose: onDone }, p);
}
