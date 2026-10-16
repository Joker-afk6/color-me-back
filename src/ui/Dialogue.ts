/**
 * Story dialogue box (blocking conversations), non-blocking "barks" (short lines during play),
 * sound captions and toasts. Lines can be read aloud; text always stays on screen.
 */
import { SPEAKERS, type Line } from '../data/speakers';
import type { Narrator } from '../audio/Narrator';
import { $, el, escapeHtml } from './dom';
import { keycap } from './icons';

export interface DialogueHooks {
  /** Called when a line appears (for character talking animation). */
  onLine?: (line: Line) => void;
  onClose?: () => void;
}

export class DialogueBox {
  private readonly root = $('dialogue');
  private readonly portrait: HTMLElement;
  private readonly speaker: HTMLElement;
  private readonly text: HTMLElement;
  private readonly btn: HTMLButtonElement;
  private queue: Line[] = [];
  private resolve: (() => void) | null = null;
  private typing = 0;
  private full = '';
  private shown = 0;
  private current: Line | null = null;
  typewriter = true;
  hooks: DialogueHooks = {};
  /** Game-time age of the current line (guards against the opening key-press skipping it). */
  private age = 0;

  constructor(private readonly narrator: Narrator) {
    this.portrait = el('div', { class: 'portrait', 'aria-hidden': 'true' });
    this.speaker = el('div', { class: 'speaker' });
    this.text = el('p', { class: 'text' });
    this.btn = el('button', { class: 'continue small', 'aria-label': 'Continue' }) as HTMLButtonElement;
    this.btn.innerHTML = `Continue ${keycap('Space')}`;
    this.btn.addEventListener('click', () => this.advance());
    this.root.append(this.portrait, this.speaker, this.text, this.btn);
    this.root.addEventListener('click', (e) => {
      if (e.target !== this.btn) this.advance();
    });
  }

  get isOpen(): boolean {
    return this.resolve !== null;
  }

  get currentLine(): Line | null {
    return this.current;
  }

  /** Show lines one by one; resolves after the last one is dismissed. */
  say(lines: Line[]): Promise<void> {
    if (!lines.length) return Promise.resolve();
    // If a conversation is already showing, queue behind it.
    if (this.resolve) {
      const prev = this.resolve;
      return new Promise((res) => {
        this.queue.push(...lines);
        this.resolve = () => {
          prev();
          res();
        };
      });
    }
    this.queue = [...lines];
    this.root.classList.remove('hidden');
    this.age = 0;
    return new Promise((res) => {
      this.resolve = res;
      this.next();
    });
  }

  /** Player pressed continue. Completes the typewriter first, then moves on. */
  advance(): void {
    if (!this.resolve) return;
    // Ignore the same key-press that opened the box.
    if (this.age < 0.18) return;
    if (this.shown < this.full.length) {
      this.shown = this.full.length;
      this.text.textContent = this.full;
      return;
    }
    this.next();
  }

  /** Close immediately (skip cutscene / leave level). Pending promise resolves. */
  cancel(): void {
    this.queue = [];
    this.finish();
  }

  update(dt: number): void {
    this.age += dt;
    if (!this.resolve || this.shown >= this.full.length) return;
    this.typing += dt * 48;
    const n = Math.min(this.full.length, Math.floor(this.typing));
    if (n !== this.shown) {
      this.shown = n;
      this.text.textContent = this.full.slice(0, n);
    }
  }

  private next(): void {
    const line = this.queue.shift();
    if (!line) {
      this.finish();
      return;
    }
    this.current = line;
    this.age = 0;
    const s = SPEAKERS[line.speaker];
    this.portrait.textContent = s.portrait;
    this.portrait.style.borderColor = s.accent;
    this.speaker.textContent = s.name;
    this.speaker.style.color = s.accent;
    this.full = line.text;
    this.root.setAttribute('aria-label', `${s.name}: ${line.text}`);
    if (this.typewriter) {
      this.typing = 0;
      this.shown = 0;
      this.text.textContent = '';
    } else {
      this.shown = this.full.length;
      this.text.textContent = this.full;
    }
    this.narrator.speak(line.text, s.voice);
    this.hooks.onLine?.(line);
  }

  private finish(): void {
    this.root.classList.add('hidden');
    this.narrator.cancel();
    this.current = null;
    const r = this.resolve;
    this.resolve = null;
    this.hooks.onClose?.();
    r?.();
  }
}

export class Captions {
  private readonly root = $('captions');
  soundCaptions = true;

  constructor(private readonly narrator: Narrator) {}

  /** Non-blocking story line during gameplay (always shown; also read aloud). */
  bark(line: Line, seconds = 3.6): void {
    const s = SPEAKERS[line.speaker];
    const n = el('div', { class: 'caption bark', role: 'status' });
    n.innerHTML = `<b style="color:${s.accent}">${escapeHtml(s.name)}:</b> ${escapeHtml(line.text)}`;
    n.style.animationDuration = `${seconds}s`;
    this.root.append(n);
    while (this.root.children.length > 3) this.root.firstElementChild?.remove();
    setTimeout(() => n.remove(), seconds * 1000);
    this.narrator.speak(line.text, s.voice);
  }

  /** Caption for an important sound cue, e.g. "♪ chime: a berry will land in the circle". */
  sound(text: string, seconds = 2.6): void {
    if (!this.soundCaptions) return;
    const n = el('div', { class: 'caption' }, `♪ ${text}`);
    n.style.animationDuration = `${seconds}s`;
    this.root.append(n);
    while (this.root.children.length > 3) this.root.firstElementChild?.remove();
    setTimeout(() => n.remove(), seconds * 1000);
  }

  clear(): void {
    this.root.innerHTML = '';
  }
}

export class Toasts {
  private readonly root = $('toasts');

  show(html: string, seconds = 2.6, big = false): void {
    const n = el('div', { class: `toast ${big ? 'big' : ''}`, html });
    this.root.append(n);
    while (this.root.children.length > 3) this.root.firstElementChild?.remove();
    setTimeout(() => n.classList.add('out'), seconds * 1000);
    setTimeout(() => n.remove(), seconds * 1000 + 450);
  }

  clear(): void {
    this.root.innerHTML = '';
  }
}
