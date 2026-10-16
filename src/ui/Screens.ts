/**
 * Modal screen stack with accessible focus management: the top screen traps Tab focus, restores
 * focus when closed, and closes on Escape when it allows it. Arrow keys move between buttons.
 */
import { el, focusables } from './dom';
import { markHandled } from '../systems/Input';

export interface ScreenOptions {
  id: string;
  /** Accessible name. */
  label: string;
  className?: string;
  /** Close when Escape is pressed (default true). */
  escapable?: boolean;
  onClose?: () => void;
  /** Keep the 3D view visible (no dim). */
  clear?: boolean;
  /** Extra keys (event.code) that close this screen, e.g. M toggles the palette. */
  closeKeys?: string[];
}

interface Entry {
  opts: ScreenOptions;
  root: HTMLElement;
  restoreFocus: Element | null;
}

export class Screens {
  private stack: Entry[] = [];
  private readonly container: HTMLElement;
  onAnyOpenChange: (open: boolean) => void = () => {};

  constructor(container: HTMLElement) {
    this.container = container;
    window.addEventListener('keydown', this.onKey, true);
  }

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  get topId(): string | null {
    return this.stack.at(-1)?.opts.id ?? null;
  }

  has(id: string): boolean {
    return this.stack.some((e) => e.opts.id === id);
  }

  /** Open a screen whose content is `content` (an element). Returns the screen root. */
  open(opts: ScreenOptions, content: HTMLElement): HTMLElement {
    if (this.has(opts.id)) this.close(opts.id, false);
    const root = el('div', { class: `screen ${opts.clear ? 'clear' : ''} ${opts.className ?? ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label });
    root.append(content);
    this.container.append(root);
    const entry: Entry = { opts, root, restoreFocus: document.activeElement };
    this.stack.push(entry);
    this.onAnyOpenChange(true);
    requestAnimationFrame(() => {
      const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(root)[0];
      first?.focus({ preventScroll: true });
    });
    return root;
  }

  /** Close the top screen, or a specific one by id. */
  close(id?: string, runOnClose = true): void {
    const idx = id ? this.stack.findIndex((e) => e.opts.id === id) : this.stack.length - 1;
    if (idx < 0) return;
    const [entry] = this.stack.splice(idx, 1);
    if (!entry) return;
    entry.root.remove();
    if (runOnClose) entry.opts.onClose?.();
    const restore = entry.restoreFocus as HTMLElement | null;
    if (restore && document.contains(restore) && typeof restore.focus === 'function') restore.focus({ preventScroll: true });
    else (document.getElementById('game') as HTMLElement | null)?.focus({ preventScroll: true });
    if (!this.stack.length) this.onAnyOpenChange(false);
  }

  closeAll(): void {
    while (this.stack.length) this.close(undefined, false);
  }

  private onKey = (e: KeyboardEvent): void => {
    const top = this.stack.at(-1);
    if (!top) return;
    // Anything typed while a menu is open belongs to the menu, never to gameplay.
    markHandled(e);
    if (e.key === 'Escape') {
      // A menu's Escape must never also reach gameplay input (it would reopen Pause).
      e.preventDefault();
      e.stopImmediatePropagation();
      if (top.opts.escapable !== false) this.close();
      return;
    }
    if (top.opts.closeKeys?.includes(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.close();
      return;
    }
    const items = focusables(top.root);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Tab') {
      e.preventDefault();
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1;
      items[next]!.focus();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') && !(document.activeElement instanceof HTMLInputElement) && !(document.activeElement instanceof HTMLSelectElement)) {
      e.preventDefault();
      const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
      const next = i < 0 ? 0 : fwd ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next]!.focus();
    }
  };
}
