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

/**
 * Lesson selection after tapping one lesson. `selected` empty means all lessons.
 * Returns null when nothing changes: the last selected lesson can't be unticked,
 * since a round needs at least one lesson.
 */
export function toggleLesson(selected: readonly string[], id: string, allIds: readonly string[]): string[] | null {
  const current = selected.length ? selected : allIds;
  const next = current.includes(id) ? current.filter((l) => l !== id) : [...current, id];
  if (next.length === 0) return null;
  // Keep lesson order stable; ticking every lesson is the same as "all".
  const ordered = allIds.filter((l) => next.includes(l));
  return ordered.length === allIds.length ? [] : ordered;
}
