/**
 * In-game HUD: area + objective, restored colors (with shape symbols), Guardian crystal tracker,
 * ability cooldown rings, interaction prompt with hold-progress ring, and the "Ask Pip" button.
 */
import { ABILITIES, ABILITY_ORDER } from '../data/abilities';
import { ALL_COLORS, COLOR_INFO, type GameColor } from '../data/colors';
import type { AbilityId } from '../data/colors';
import { $, el, escapeHtml } from './dom';
import { ICON, SYMBOL_SVG, keycap } from './icons';

/** White-gold accessibility glow for color-free effects (style guide token ui.symbol family). */
export const NEUTRAL_GLOW = '#FFF1C9';

export interface HudCallbacks {
  onPause: () => void;
  onPalette: () => void;
  onHint: () => void;
}

export class Hud {
  private readonly root = $('hud');
  private readonly prompt = $('prompt');
  private readonly area: HTMLElement;
  private readonly goal: HTMLElement;
  private readonly colors: HTMLElement;
  private readonly gems: HTMLElement;
  private readonly abilities: HTMLElement;
  private readonly hintBtn: HTMLButtonElement;
  private lastColors = '';
  private lastAbilities = '';
  private lastPrompt = '';
  private shownColors = new Set<GameColor>();

  constructor(cb: HudCallbacks) {
    const objective = el('div', { class: 'hud-panel hud-objective' });
    this.area = el('div', { class: 'area' });
    this.goal = el('div', { class: 'goal' });
    objective.append(this.area, this.goal);
    this.colors = el('div', { class: 'hud-panel hud-colors', role: 'group', 'aria-label': 'Colors you have found' });
    this.gems = el('div', { class: 'hud-panel hud-gems hidden', 'aria-live': 'polite' });
    this.abilities = el('div', { class: 'hud-panel hud-abilities hidden' });
    const hint = el('div', { class: 'hud-hint' });
    this.hintBtn = el('button', { class: 'small', 'aria-label': 'Ask Pip for a hint (H)', onclick: () => cb.onHint() }) as HTMLButtonElement;
    this.hintBtn.innerHTML = `${ICON.pip} Ask Pip ${keycap('H')}`;
    hint.append(this.hintBtn);
    this.root.append(objective, this.colors, this.gems, this.abilities, hint);
    this.colorsCb = cb;
  }

  private colorsCb: HudCallbacks;

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.setPrompt(null);
  }

  setObjective(area: string, goal: string): void {
    this.area.textContent = area;
    this.goal.innerHTML = `${ICON.star}<span>${escapeHtml(goal)}</span>`;
  }

  setColors(colors: Readonly<Record<GameColor, boolean>>, shown: (c: GameColor) => boolean): void {
    const key = ALL_COLORS.map((c) => (colors[c] && shown(c) ? '1' : '0')).join('');
    if (key === this.lastColors) return;
    this.lastColors = key;
    this.colors.innerHTML = '';
    for (const c of ALL_COLORS) {
      const owned = colors[c] && shown(c);
      const info = COLOR_INFO[c];
      const s = el('span', { class: `swatch ${owned ? '' : 'locked'} ${owned && !this.shownColors.has(c) ? 'new' : ''}`, title: owned ? `${info.label} found` : `${info.label} not found yet`, role: 'img', 'aria-label': owned ? `${info.label} found` : `${info.label} not found yet` });
      if (owned) s.style.background = info.hex;
      s.innerHTML = SYMBOL_SVG[info.symbol];
      this.colors.append(s);
      if (owned) this.shownColors.add(c);
    }
    const pal = el('button', { class: 'secondary', 'aria-label': 'Open the paint palette (M)', title: 'Paint palette (M)', onclick: () => this.colorsCb.onPalette() });
    pal.innerHTML = ICON.palette;
    const pause = el('button', { class: 'secondary', 'aria-label': 'Pause menu (Esc)', title: 'Pause (Esc)', onclick: () => this.colorsCb.onPause() });
    pause.innerHTML = ICON.pause;
    this.colors.append(pal, pause);
  }

  /** Guardian crystal tracker, e.g. Ruby's three spell crystals. null hides it. */
  setGems(label: string | null, freed = 0, total = 3): void {
    if (label === null) {
      this.gems.classList.add('hidden');
      return;
    }
    this.gems.classList.remove('hidden');
    this.gems.innerHTML = `<span>${escapeHtml(label)}</span>` + Array.from({ length: total }, (_, i) => `<span class="gem ${i < freed ? 'freed' : ''}" title="${i < freed ? 'Freed' : 'Still under the spell'}">${i < freed ? ICON.gemFilled : ICON.gem}</span>`).join('');
    this.gems.setAttribute('aria-label', `${label}: ${freed} of ${total} crystals freed`);
  }

  /** Shows only abilities that are owned AND actually built in this version (never a dead button). */
  setAbilities(owned: (a: AbilityId) => boolean, cooldown: Partial<Record<AbilityId, number>>): void {
    const list = ABILITY_ORDER.filter((a) => ABILITIES[a].built && owned(a));
    const key = list.join(',') + '|' + list.map((a) => Math.round((cooldown[a] ?? 0) * 20)).join(',');
    if (key === this.lastAbilities) return;
    this.lastAbilities = key;
    if (!list.length) {
      this.abilities.classList.add('hidden');
      return;
    }
    this.abilities.classList.remove('hidden');
    this.abilities.innerHTML = '';
    for (const a of list) {
      const info = ABILITIES[a];
      const cd = Math.max(0, Math.min(1, cooldown[a] ?? 0));
      // Color-free abilities (Basic Dash) use the accessible white-gold glow: red stays locked.
      const color = info.color ? COLOR_INFO[info.color].hex : NEUTRAL_GLOW;
      const circ = 2 * Math.PI * 20;
      const node = el('div', { class: `ability ${cd > 0 ? 'cooling' : ''}`, title: info.howTo });
      node.innerHTML = `<div class="ring"><svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="20" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="4"/><circle cx="23" cy="23" r="20" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * cd}"/></svg><div class="glyph" style="color:${color}">${a === 'basicDash' || !info.color ? ICON.dash : SYMBOL_SVG[COLOR_INFO[info.color].symbol]}</div></div><span>${escapeHtml(info.name)} ${keycap(info.keyLabel)}</span>`;
      this.abilities.append(node);
    }
  }

  /** Interaction prompt. `hold` 0..1 shows a progress ring for sweep-paint. */
  setPrompt(p: { key: string; text: string; hold?: number; blocked?: boolean } | null): void {
    if (!p) {
      if (this.lastPrompt !== '') {
        this.prompt.classList.add('hidden');
        this.lastPrompt = '';
      }
      return;
    }
    const holdKey = p.hold !== undefined ? Math.round(p.hold * 24) : -1;
    const key = `${p.key}|${p.text}|${holdKey}|${p.blocked}`;
    if (key === this.lastPrompt) return;
    this.lastPrompt = key;
    this.prompt.classList.remove('hidden');
    this.prompt.classList.toggle('blocked', !!p.blocked);
    let ring = '';
    if (p.hold !== undefined) {
      const c = 2 * Math.PI * 10;
      ring = `<svg class="hold-ring" viewBox="0 0 26 26"><circle cx="13" cy="13" r="10" fill="none" stroke="#e3e0f4" stroke-width="4"/><circle cx="13" cy="13" r="10" fill="none" stroke="#7b55e0" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p.hold)}" transform="rotate(-90 13 13)"/></svg>`;
    }
    this.prompt.innerHTML = `${p.blocked ? ICON.help : keycap(p.key)}${ring}<span>${escapeHtml(p.text)}</span>`;
  }

  flashCheckpoint(text = 'Checkpoint saved'): void {
    const n = el('div', { class: 'hud-panel hud-checkpoint', role: 'status' });
    n.innerHTML = `${ICON.check} ${escapeHtml(text)}`;
    this.root.append(n);
    setTimeout(() => n.remove(), 2700);
  }

  setHintEnabled(on: boolean): void {
    this.hintBtn.disabled = !on;
  }
}
