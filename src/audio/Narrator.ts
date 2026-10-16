/**
 * Optional read-aloud using the browser's built-in speech synthesis (no recordings, no network).
 * Each speaker gets a distinct pitch/rate. Voice-ready line ids allow recorded VO later.
 */
export class Narrator {
  enabled = true;
  volume = 0.9;
  private voice: SpeechSynthesisVoice | null = null;
  private readonly supported: boolean;

  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    if (this.supported) {
      const pick = () => {
        const voices = speechSynthesis.getVoices();
        const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
        const preferred = ['Samantha', 'Karen', 'Moira', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Daniel'];
        this.voice = preferred.map((n) => english.find((v) => v.name.includes(n))).find(Boolean) ?? english.find((v) => v.localService) ?? english[0] ?? null;
      };
      pick();
      speechSynthesis.addEventListener?.('voiceschanged', pick);
    }
  }

  get available(): boolean {
    return this.supported;
  }

  speak(text: string, voice: { pitch: number; rate: number } = { pitch: 1, rate: 1 }): void {
    if (!this.supported || !this.enabled || this.volume <= 0) return;
    try {
      speechSynthesis.cancel();
      // Speak plain words: strip ellipses/dashes that some voices read literally.
      const clean = text.replace(/\.\.\./g, ',').replace(/ - /g, ', ');
      const u = new SpeechSynthesisUtterance(clean);
      if (this.voice) u.voice = this.voice;
      u.pitch = Math.min(2, Math.max(0, voice.pitch));
      u.rate = Math.min(1.6, Math.max(0.6, voice.rate));
      u.volume = this.volume;
      speechSynthesis.speak(u);
    } catch {
      /* speech is optional */
    }
  }

  cancel(): void {
    if (!this.supported) return;
    try {
      speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}
