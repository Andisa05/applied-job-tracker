import { Preferences } from '@capacitor/preferences';

const KEY = 'applied.v1';

const empty = () => ({ applications: [], createdCount: 0, onboarded: false });

export async function loadState() {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return empty();
    const parsed = JSON.parse(value);
    return { ...empty(), ...parsed, applications: Array.isArray(parsed.applications) ? parsed.applications : [] };
  } catch {
    return empty();
  }
}

export async function saveState(state) {
  await Preferences.set({ key: KEY, value: JSON.stringify(state) });
}

export function exportBackup(state) {
  return JSON.stringify({ app: 'applied', version: 1, exportedAt: new Date().toISOString(), applications: state.applications }, null, 2);
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.applications)) throw new Error('This does not look like an Applied backup.');
  return data.applications
    .filter((a) => a && typeof a.company === 'string')
    .map((a) => ({ ...a, id: a.id || newId() }));
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
