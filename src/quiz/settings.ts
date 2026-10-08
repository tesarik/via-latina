import type { Settings } from "./types";

const KEY = "vialatina_settings";

export const DEFAULT_SETTINGS: Settings = { lessons: [] };

/** Saved settings, keeping only lessons that still exist. */
export function loadSettings(knownLessons: readonly string[]): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Settings> | null;
    const lessons = Array.isArray(raw?.lessons) ? raw.lessons.filter((id) => knownLessons.includes(id)) : [];
    return { lessons };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
