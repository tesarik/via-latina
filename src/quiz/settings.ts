import type { Category, Settings } from "./types";

const KEY = "vialatina_settings";
const CATEGORIES: Category[] = ["all", "n", "v", "a", "o"];

export const DEFAULT_SETTINGS: Settings = { category: "all" };

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Settings> | null;
    return {
      category: CATEGORIES.includes(raw?.category as Category) ? (raw!.category as Category) : DEFAULT_SETTINGS.category,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
