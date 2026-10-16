/** Who can speak, how their name card looks, and how the optional read-aloud voice sounds. */
export type SpeakerId = 'narrator' | 'explorer' | 'pip' | 'ruby';

export interface SpeakerInfo {
  id: SpeakerId;
  name: string;
  /** Name-card accent (always paired with the name text, never color alone). */
  accent: string;
  portrait: string;
  voice: { pitch: number; rate: number };
}

export const SPEAKERS: Readonly<Record<SpeakerId, SpeakerInfo>> = Object.freeze({
  narrator: { id: 'narrator', name: 'Narrator', accent: '#5b5f7a', portrait: '📖', voice: { pitch: 1.0, rate: 0.92 } },
  explorer: { id: 'explorer', name: 'Explorer', accent: '#3d6fb6', portrait: '🧒', voice: { pitch: 1.35, rate: 1.0 } },
  pip: { id: 'pip', name: 'Pip', accent: '#8a5cd6', portrait: '🖌️', voice: { pitch: 1.6, rate: 1.07 } },
  ruby: { id: 'ruby', name: 'Ruby', accent: '#c2410c', portrait: '🐉', voice: { pitch: 1.15, rate: 0.97 } },
});

export interface Line {
  /** Voice-ready id (for future recorded VO), e.g. "p1.pip.entrance". */
  id: string;
  speaker: SpeakerId;
  text: string;
}
