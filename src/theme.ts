export const C = {
  bg: '#0E0B1F',
  bg2: '#17132E',
  card: '#1F1A3D',
  cardHi: '#2A2352',
  line: '#352C66',
  text: '#F4F1FF',
  dim: '#A69FCC',
  mute: '#6E6699',
  accent: '#7C5CFF',
  accent2: '#FF5CA8',
  gold: '#FFC94D',
  green: '#3DDC97',
  cyan: '#4DD8FF',
};

export const STATUS = {
  backlog: { label: 'Backlog', color: C.cyan },
  playing: { label: 'Playing', color: C.accent2 },
  done: { label: 'Completed', color: C.green },
} as const;

export type Status = keyof typeof STATUS;

export const PLATFORMS = ['Switch', 'PlayStation', 'Xbox', 'PC', 'Mobile', 'Retro'];
export const VIBES = ['Cozy', 'Epic', 'Quick', 'Co-op', 'Story', 'Chill'];

// deterministic cover gradient per title
const PALETTE = [
  ['#7C5CFF', '#FF5CA8'],
  ['#4DD8FF', '#7C5CFF'],
  ['#FF8A4D', '#FF5CA8'],
  ['#3DDC97', '#4DD8FF'],
  ['#FFC94D', '#FF8A4D'],
  ['#B45CFF', '#4DD8FF'],
];
export function coverFor(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
