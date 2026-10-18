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
 * Lessons ticked in the settings sheet after tapping one. Unlike `Settings.lessons`
 * this is the explicit list, and it may be empty while the learner is choosing.
 */
export function toggleLesson(picked: readonly string[], id: string, allIds: readonly string[]): string[] {
  const next = picked.includes(id) ? picked.filter((l) => l !== id) : [...picked, id];
  // Keep lesson order stable whatever the tapping order.
  return allIds.filter((l) => next.includes(l));
}

/** `Settings.lessons` for the ticked lessons: every lesson collapses to "all" ([]), none gives null (a round needs one). */
export function lessonsFor(picked: readonly string[], allIds: readonly string[]): string[] | null {
  if (picked.length === 0) return null;
  return picked.length === allIds.length ? [] : [...picked];
}
