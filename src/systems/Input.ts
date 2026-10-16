/**
 * Unified input: keyboard (layout-independent `event.code`), mouse drag/wheel camera, gamepad
 * and on-screen touch controls. Gameplay reads actions; menus use normal DOM focus/keys.
 */

export type Action =
  | 'jump'
  | 'interact'
  | 'dash'
  | 'glide'
  | 'sunbeam'
  | 'sec1'
  | 'sec2'
  | 'sec3'
  | 'palette'
  | 'pause'
  | 'hint'
  | 'camLeft'
  | 'camRight'
  | 'recenter'
  | 'advance';

const KEYMAP: Record<string, Action[]> = {
  Space: ['jump', 'advance'],
  KeyE: ['interact', 'advance'],
  Enter: ['interact', 'advance'],
  NumpadEnter: ['interact', 'advance'],
  ShiftLeft: ['dash'],
  ShiftRight: ['dash'],
  KeyG: ['glide'],
  KeyF: ['sunbeam'],
  Digit1: ['sec1'],
  Digit2: ['sec2'],
  Digit3: ['sec3'],
  KeyM: ['palette'],
  Escape: ['pause'],
  KeyP: ['pause'],
  KeyH: ['hint'],
  KeyQ: ['camLeft'],
  KeyR: ['camRight'],
  KeyC: ['recenter'],
};

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/** Key events already handled by a menu (so gameplay ignores them, whatever the listener order). */
const handledEvents = new WeakSet<Event>();
export function markHandled(e: Event): void {
  handledEvents.add(e);
}

/** Gamepad standard mapping → actions. */
const PAD_BUTTONS: Array<[number, Action]> = [
  [0, 'jump'],
  [0, 'advance'],
  [2, 'interact'],
  [1, 'dash'],
  [3, 'palette'],
  [5, 'glide'],
  [4, 'sunbeam'],
  [8, 'hint'],
  [9, 'pause'],
  [10, 'recenter'],
];

export class Input {
  /** Movement intent: x = right, y = forward. Length ≤ 1. */
  readonly move = { x: 0, y: 0 };
  /** Camera look delta accumulated this frame (radians-ish units). */
  readonly look = { x: 0, y: 0 };
  zoom = 0;
  /** Set when the player touched the camera this frame (pauses auto-recenter). */
  manualCamera = false;
  usingGamepad = false;

  private keys = new Set<string>();
  private held = new Set<Action>();
  private pressedNow = new Set<Action>();
  private virtualMove = { x: 0, y: 0 };
  private virtualHeld = new Set<Action>();
  private padPrev = new Set<number>();
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  /** Key presses are applied on the next poll, after menus have had a chance to claim them. */
  private pending: KeyboardEvent[] = [];

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', () => document.hidden && this.clear());
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  pressed(a: Action): boolean {
    return this.pressedNow.has(a);
  }

  isHeld(a: Action): boolean {
    return this.held.has(a) || this.virtualHeld.has(a);
  }

  /** Consume a press so two systems never react to the same key. */
  consume(a: Action): boolean {
    if (!this.pressedNow.has(a)) return false;
    this.pressedNow.delete(a);
    return true;
  }

  /** Touch controls feed these. */
  setVirtualMove(x: number, y: number): void {
    this.virtualMove.x = x;
    this.virtualMove.y = y;
  }

  virtualDown(a: Action): void {
    if (!this.virtualHeld.has(a)) this.pressedNow.add(a);
    this.virtualHeld.add(a);
  }

  virtualUp(a: Action): void {
    this.virtualHeld.delete(a);
  }

  /** Call once per frame before gameplay reads input. */
  poll(sensitivity: number): void {
    for (const e of this.pending) {
      if (handledEvents.has(e)) continue;
      const actions = KEYMAP[e.code];
      if (!actions) continue;
      for (const a of actions) {
        if (!e.repeat) this.pressedNow.add(a);
        if (this.downCodes.has(e.code)) this.held.add(a);
      }
    }
    this.pending = [];
    let mx = 0;
    let my = 0;
    for (const code of this.keys) {
      const m = MOVE_KEYS[code];
      if (m) {
        mx += m[0];
        my += m[1];
      }
    }
    mx += this.virtualMove.x;
    my += this.virtualMove.y;
    // Keyboard camera turn.
    if (this.isHeld('camLeft')) {
      this.look.x -= 0.035 * sensitivity;
      this.manualCamera = true;
    }
    if (this.isHeld('camRight')) {
      this.look.x += 0.035 * sensitivity;
      this.manualCamera = true;
    }
    this.pollGamepad(sensitivity, (x, y) => {
      mx += x;
      my += y;
    });
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.move.x = mx;
    this.move.y = my;
  }

  /** Call at the end of each frame. */
  endFrame(): void {
    this.pressedNow.clear();
    this.look.x = 0;
    this.look.y = 0;
    this.zoom = 0;
    this.manualCamera = false;
  }

  clear = (): void => {
    this.keys.clear();
    this.downCodes.clear();
    this.pending = [];
    this.held.clear();
    this.virtualHeld.clear();
    this.virtualMove.x = this.virtualMove.y = 0;
    this.dragging = false;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    const inForm = target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA');
    if (inForm) return;
    const onButton = target && target.tagName === 'BUTTON';
    // Stop the page scrolling while playing; leave Space/Enter alone on focused buttons.
    if (!onButton && (e.code.startsWith('Arrow') || e.code === 'Space')) e.preventDefault();
    this.usingGamepad = false;
    if (MOVE_KEYS[e.code]) this.keys.add(e.code);
    const actions = KEYMAP[e.code];
    if (!actions) return;
    if (onButton && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) return;
    this.downCodes.add(e.code);
    this.pending.push(e);
  };

  private downCodes = new Set<string>();

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    this.downCodes.delete(e.code);
    const actions = KEYMAP[e.code];
    if (actions) for (const a of actions) this.held.delete(a);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return; // touch camera is handled by TouchControls
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.look.x += dx * 0.006;
    this.look.y += dy * 0.004;
    this.manualCamera = true;
  };

  private onPointerUp = (): void => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoom += Math.sign(e.deltaY) * 0.8;
  };

  private pollGamepad(sensitivity: number, addMove: (x: number, y: number) => void): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find((p) => p && p.connected);
    if (!pad) return;
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    const lx = dz(pad.axes[0] ?? 0);
    const ly = dz(pad.axes[1] ?? 0);
    const rx = dz(pad.axes[2] ?? 0);
    const ry = dz(pad.axes[3] ?? 0);
    if (lx || ly) {
      addMove(lx, -ly);
      this.usingGamepad = true;
    }
    if (rx || ry) {
      this.look.x += rx * 0.045 * sensitivity;
      this.look.y += ry * 0.03 * sensitivity;
      this.manualCamera = true;
      this.usingGamepad = true;
    }
    const now = new Set<number>();
    pad.buttons.forEach((b, i) => b.pressed && now.add(i));
    for (const [idx, action] of PAD_BUTTONS) {
      if (now.has(idx)) {
        if (!this.padPrev.has(idx)) {
          this.pressedNow.add(action);
          this.usingGamepad = true;
        }
        this.held.add(action);
      } else if (this.padPrev.has(idx)) {
        this.held.delete(action);
      }
    }
    // D-pad as movement too.
    if (now.has(12)) addMove(0, 1);
    if (now.has(13)) addMove(0, -1);
    if (now.has(14)) addMove(-1, 0);
    if (now.has(15)) addMove(1, 0);
    this.padPrev = now;
  }
}
