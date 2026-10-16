/**
 * On-screen touch controls (shown only on touch devices): virtual stick, Jump / Brush / Dash /
 * Palette buttons and a drag area for the camera. Not yet tested on physical tablets (see docs).
 */
import type { Input, Action } from '../systems/Input';
import { $, el } from './dom';

export class TouchControls {
  private readonly root = $('touch');
  private readonly nub: HTMLElement;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  readonly enabled: boolean;

  constructor(private readonly input: Input) {
    this.enabled = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    const look = el('div', { class: 'look' });
    const stick = el('div', { class: 'stick' });
    this.nub = el('div', { class: 'nub' });
    stick.append(this.nub);
    const buttons = el('div', { class: 'buttons' });
    const mk = (label: string, action: Action) => {
      const b = el('button', { 'aria-label': label }, label) as HTMLButtonElement;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.virtualDown(action);
      });
      const up = (e: Event) => {
        e.preventDefault();
        this.input.virtualUp(action);
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
      return b;
    };
    buttons.append(mk('Dash', 'dash'), mk('Brush', 'interact'), mk('Mix', 'palette'), mk('Jump', 'jump'));
    this.root.append(look, stick, buttons);

    stick.addEventListener('pointerdown', (e) => {
      this.stickId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      this.moveStick(stick, e);
    });
    stick.addEventListener('pointermove', (e) => e.pointerId === this.stickId && this.moveStick(stick, e));
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      this.input.setVirtualMove(0, 0);
      this.nub.style.transform = '';
    };
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);

    look.addEventListener('pointerdown', (e) => {
      this.lookId = e.pointerId;
      look.setPointerCapture(e.pointerId);
      this.lookLast = { x: e.clientX, y: e.clientY };
    });
    look.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.input.look.x += (e.clientX - this.lookLast.x) * 0.008;
      this.input.look.y += (e.clientY - this.lookLast.y) * 0.005;
      this.input.manualCamera = true;
      this.lookLast = { x: e.clientX, y: e.clientY };
    });
    look.addEventListener('pointerup', () => (this.lookId = null));
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !(v && this.enabled));
  }

  private moveStick(stick: HTMLElement, e: PointerEvent): void {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    this.nub.style.transform = `translate(${dx * 42}px, ${dy * 42}px)`;
    this.input.setVirtualMove(dx, -dy);
  }
}
