import type { Word } from "./types";

/**
 * What the learner has shown about one word, kept across visits. `box` is a
 * Leitner-style level: a right answer moves the word up one box, a wrong one
 * sends it back to 0.
 */
export interface WordStat {
  box: number;
  seen: number;
  wrong: number;
}

export type Progress = Readonly<Record<string, WordStat>>;

export const MAX_BOX = 4;
/** A word counts as known from this box up (three right answers since the last mistake). */
export const KNOWN_BOX = 3;

/** Same word in several lessons shares one record. */
export const wordKey = (w: Pick<Word, "pos" | "la" | "cz">) => `${w.pos}:${w.la}:${w.cz}`;

export function record(p: Progress, w: Word, ok: boolean): Progress {
  const k = wordKey(w);
  const s = p[k] ?? { box: 0, seen: 0, wrong: 0 };
  return {
    ...p,
    [k]: { box: ok ? Math.min(MAX_BOX, s.box + 1) : 0, seen: s.seen + 1, wrong: s.wrong + (ok ? 0 : 1) },
  };
}

export const isKnown = (p: Progress, w: Word) => (p[wordKey(w)]?.box ?? 0) >= KNOWN_BOX;

// Words in low boxes come early in a pass, well-known ones late. Unseen words sit in the middle.
const BOX_WEIGHT = [30, 12, 5, 2, 1];
const UNSEEN_WEIGHT = 6;

export function weightOf(p: Progress, w: Word): number {
  const s = p[wordKey(w)];
  return s ? BOX_WEIGHT[Math.min(s.box, MAX_BOX)] : UNSEEN_WEIGHT;
}

const KEY = "vialatina_progress";

export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Record<string, WordStat> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const s = v as Partial<WordStat> | null;
      if (s && Number.isFinite(s.box) && Number.isFinite(s.seen) && Number.isFinite(s.wrong)) {
        out[k] = { box: Math.max(0, Math.min(MAX_BOX, Math.trunc(s.box!))), seen: s.seen!, wrong: s.wrong! };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
