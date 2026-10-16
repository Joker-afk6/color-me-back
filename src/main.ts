/** Entry point: fonts, styles, the Game, and level registration. */
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/main.css';
import { Game } from './core/Game';
import { TitleStage } from './environments/TitleStage';
import { BedroomLevel } from './environments/BedroomLevel';
import { HushHollowLevel } from './environments/HushHollowLevel';
import { RubyOrchardLevel } from './chapters/ruby/RubyOrchardLevel';
import { installDebugApi } from './debug/DebugApi';

function showFatal(message: string): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.innerHTML = '';
  const p = document.createElement('div');
  p.className = 'error-panel';
  p.innerHTML = `<h2>Oh no!</h2><p>${message}</p><p class="hint">COLOR ME BACK! needs a browser with WebGL (for example a recent Chrome, Edge, Firefox or Safari).</p>`;
  boot.append(p);
}

function boot(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) return;
  let game: Game;
  try {
    game = new Game(canvas);
  } catch (err) {
    console.error(err);
    showFatal('We could not start the 3D painting canvas on this device.');
    return;
  }
  game.registerLevel('title', (g) => new TitleStage(g));
  game.registerLevel('bedroom', (g) => new BedroomLevel(g));
  game.registerLevel('hushHollow', (g) => new HushHollowLevel(g));
  game.registerLevel('rubyOrchard', (g) => new RubyOrchardLevel(g));
  game.start();
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) installDebugApi(game);
}

boot();
