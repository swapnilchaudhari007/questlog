import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { Status } from './theme';

export type Game = {
  id: string;
  title: string;
  platform: string;
  vibe: string;
  status: Status;
  rating: number; // 0-5
  note: string;
  addedAt: number;
  doneAt?: number;
};

const KEY = 'questlog.games.v1';
export const FREE_LIMIT = 12;

const SAMPLE: Omit<Game, 'id' | 'addedAt'>[] = [
  { title: 'Starfall Odyssey', platform: 'PC', vibe: 'Epic', status: 'playing', rating: 0, note: 'Chapter 4 — find the sky forge' },
  { title: 'Moss & Mortar', platform: 'Switch', vibe: 'Cozy', status: 'backlog', rating: 0, note: 'Friend says perfect for Sundays' },
  { title: 'Neon Drift 2088', platform: 'PlayStation', vibe: 'Quick', status: 'backlog', rating: 0, note: '' },
  { title: 'Hollow Lantern', platform: 'PC', vibe: 'Story', status: 'done', rating: 5, note: 'Best ending in years' },
  { title: 'Tidebreaker', platform: 'Xbox', vibe: 'Co-op', status: 'backlog', rating: 0, note: 'Play with Riya' },
  { title: 'Paper Planets', platform: 'Mobile', vibe: 'Chill', status: 'done', rating: 4, note: '' },
  { title: 'Cinder Knights', platform: 'Switch', vibe: 'Epic', status: 'backlog', rating: 0, note: '' },
];

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useGames() {
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) return setGames(JSON.parse(raw));
      } catch {}
      const now = Date.now();
      setGames(SAMPLE.map((g, i) => ({ ...g, id: uid(), addedAt: now - i * 86400000, doneAt: g.status === 'done' ? now - i * 3600000 : undefined })));
    })();
  }, []);

  useEffect(() => {
    if (games) AsyncStorage.setItem(KEY, JSON.stringify(games)).catch(() => {});
  }, [games]);

  const add = useCallback((g: Omit<Game, 'id' | 'addedAt' | 'rating' | 'note' | 'status'>) => {
    setGames((gs) => [{ ...g, id: uid(), addedAt: Date.now(), status: 'backlog', rating: 0, note: '' }, ...(gs ?? [])]);
  }, []);

  const update = useCallback((id: string, patch: Partial<Game>) => {
    setGames((gs) =>
      (gs ?? []).map((g) =>
        g.id === id ? { ...g, ...patch, doneAt: patch.status === 'done' ? Date.now() : patch.status ? undefined : g.doneAt } : g,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => setGames((gs) => (gs ?? []).filter((g) => g.id !== id)), []);

  return { games, add, update, remove };
}

// XP: 10 per added, 25 per started, 100 per completion, 10 per rating star
export function xpFor(games: Game[]) {
  let xp = 0;
  for (const g of games) {
    xp += 10;
    if (g.status !== 'backlog') xp += 25;
    if (g.status === 'done') xp += 100;
    xp += g.rating * 10;
  }
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const cur = 50 * (level - 1) ** 2;
  const next = 50 * level ** 2;
  return { xp, level, progress: (xp - cur) / (next - cur), toNext: next - xp };
}

export const TITLES = ['Couch Rookie', 'Save-File Scout', 'Backlog Ranger', 'Quest Hunter', 'Completionist', 'Legend of the Shelf'];
export const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))];
