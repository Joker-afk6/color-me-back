/** Inline SVG icons. Color symbols guarantee nothing depends on hue alone. */
import type { ColorSymbol } from '../data/colors';

const svg = (body: string, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" aria-hidden="true" focusable="false" class="icon">${body}</svg>`;

export const SYMBOL_SVG: Record<ColorSymbol, string> = {
  apple: svg('<path d="M12 7c-1.5-1.6-5.5-1.8-6.6 1.9-1.1 3.6.9 8.9 3.7 10.4 1.1.6 2 .1 2.9-.3.9.4 1.8.9 2.9.3 2.8-1.5 4.8-6.8 3.7-10.4C17.5 5.2 13.5 5.4 12 7z" fill="currentColor"/><path d="M12 7c0-2 1-3.5 2.6-4.3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M13.2 4.6c1.6-.9 3.3-.6 4.1.2-1.2 1.1-2.8 1.3-4.1-.2z" fill="currentColor"/>'),
  wave: svg('<path d="M2 14c2.2-3.2 4.4-3.2 6.6 0s4.4 3.2 6.6 0 4.4-3.2 6.6 0" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M2 19c2.2-3.2 4.4-3.2 6.6 0s4.4 3.2 6.6 0 4.4-3.2 6.6 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/><circle cx="17" cy="6.5" r="1.6" fill="currentColor"/><circle cx="20.5" cy="9" r="1" fill="currentColor"/>'),
  sun: svg('<circle cx="12" cy="12" r="4.6" fill="currentColor"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5 5l1.8 1.8M17.2 17.2 19 19M5 19l1.8-1.8M17.2 6.8 19 5"/></g>'),
  spiral: svg('<path d="M12.3 12.1c-.4-.9.6-1.6 1.4-1.1 1.4.8.8 3-.7 3.4-2.2.6-4-1.6-3.3-3.7.9-2.8 4.6-3.5 6.6-1.5 2.6 2.6 1.3 7.3-2.2 8.1-4.1 1-7.8-2.4-7.2-6.5.6-4.5 5.4-7 9.5-5.3" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  spring: svg('<path d="M6 20h12M8 16.5c0-1.4 8-1.4 8 0s-8 1.4-8 2.8M8 13c0-1.4 8-1.4 8 0s-8 1.4-8 2.8M8 9.5c0-1.4 8-1.4 8 0s-8 1.4-8 2.8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M9 4h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 4v4" stroke="currentColor" stroke-width="2"/>'),
  leaf: svg('<path d="M4.5 19.5C4 11 9 4.5 20 4c.4 9.6-5.6 15.6-15.5 15.5z" fill="currentColor"/><path d="M4.5 19.5c3.2-4.3 6.6-7.2 11-9.6" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>'),
};

export const ICON = {
  star: svg('<path d="m12 2.6 2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.7z" fill="currentColor"/>'),
  gem: svg('<path d="M12 2.5 21 20H3z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m12 8 4.5 9h-9z" fill="currentColor" opacity=".55"/>'),
  gemFilled: svg('<path d="M12 2.5 21 20H3z" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m8.5 9.5 1.5-3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
  pause: svg('<rect x="6" y="5" width="4" height="14" rx="1.4" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.4" fill="currentColor"/>'),
  help: svg('<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.4 9.3a2.7 2.7 0 1 1 3.8 2.5c-.8.4-1.2 1-1.2 1.8v.6" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.3" fill="currentColor"/>'),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.3 0 1.8-1 1.4-2-.5-1.2.3-2.4 1.6-2.4H17a4 4 0 0 0 4-4C21 7 17 3 12 3z" fill="currentColor"/><circle cx="7.5" cy="11" r="1.6" fill="#fff"/><circle cx="10" cy="7" r="1.6" fill="#fff"/><circle cx="14.5" cy="7" r="1.6" fill="#fff"/><circle cx="17" cy="11" r="1.6" fill="#fff"/>'),
  brush: svg('<path d="M14.5 3.5 20.5 9.5 12 18l-6-6z" fill="currentColor" opacity=".9"/><path d="M6 12c-2.5.5-3.5 2.5-3.5 4.5 0 1.6-.8 2.6-1.5 3 3.5 1 7.5 0 8.5-3.5z" fill="currentColor"/>'),
  pip: svg('<path d="M12 2c2.4 2.6 3.8 4.8 3.8 7.4H8.2C8.2 6.8 9.6 4.6 12 2z" fill="currentColor"/><rect x="7.6" y="9.6" width="8.8" height="5.6" rx="2" fill="currentColor"/><circle cx="10.4" cy="12.3" r="1.1" fill="#fff"/><circle cx="13.6" cy="12.3" r="1.1" fill="#fff"/><path d="M10.6 15.5h2.8l-.6 6.5h-1.6z" fill="currentColor"/>'),
  sticker: svg('<path d="M5 3h10l4 4v10.5A3.5 3.5 0 0 1 15.5 21h-10A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5 3z" fill="currentColor"/><path d="M15 3v3.5A1.5 1.5 0 0 0 16.5 8H19" fill="none" stroke="#fff" stroke-width="1.6"/><path d="m11 9.5 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="#fff"/>'),
  dash: svg('<path d="M4 8h7M2 12h9M4 16h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M13 5l8 7-8 7z" fill="currentColor"/>'),
  check: svg('<path d="m4.5 12.5 4.5 4.5L19.5 6.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="2.2" fill="none"/>'),
  sound: svg('<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
};

export function keycap(label: string): string {
  return `<kbd class="keycap">${label}</kbd>`;
}
