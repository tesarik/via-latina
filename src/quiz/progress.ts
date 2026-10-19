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
  /** Day (see `today`) from which the word is due for review; missing in old data, which counts as due. */
  due?: number;
}

export type Progress = Readonly<Record<string, WordStat>>;

export const MAX_BOX = 4;
/** A word counts as known from this box up (three right answers on different days since the last mistake). */
export const KNOWN_BOX = 3;

/** Days until the next review after a word reaches box 0, 1, 2, 3, 4. */
export const INTERVAL_DAYS = [0, 1, 3, 7, 21];

/** Local calendar day as a whole number, so a review due "tomorrow" is due from midnight, not 24 hours later. */
export function today(now = new Date()): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
}

/** Same word in several lessons shares one record. */
export const wordKey = (w: Pick<Word, "pos" | "la" | "cz">) => `${w.pos}:${w.la}:${w.cz}`;

/**
 * A wrong answer sends the word back to box 0, due again today. A right answer moves
 * it up one box only when it was due; answering it right again before then keeps
 * the box, so a word becomes known only over several days.
 */
export function record(p: Progress, w: Word, ok: boolean, day = today()): Progress {
  const k = wordKey(w);
  const s = p[k] ?? { box: 0, seen: 0, wrong: 0 };
  const seen = s.seen + 1;
  if (!ok) return { ...p, [k]: { box: 0, seen, wrong: s.wrong + 1, due: day } };
  if ((s.due ?? day) > day) return { ...p, [k]: { ...s, seen } };
  const box = Math.min(MAX_BOX, s.box + 1);
  return { ...p, [k]: { box, seen, wrong: s.wrong, due: day + INTERVAL_DAYS[box] } };
}

export const isSeen = (p: Progress, w: Word) => !!p[wordKey(w)];

/** Answered before and due for review today: what "Dnes k zopakování" practises. */
export function isDue(p: Progress, w: Word, day = today()): boolean {
  const s = p[wordKey(w)];
  return !!s && (s.due ?? day) <= day;
}

/** Answers given across all visits and lessons, from the stored per-word counts. */
export function totals(p: Progress): { right: number; total: number } {
  let right = 0;
  let total = 0;
  for (const s of Object.values(p)) {
    total += s.seen;
    right += s.seen - s.wrong;
  }
  return { right, total };
}

export const isKnown = (p: Progress, w: Word) => (p[wordKey(w)]?.box ?? 0) >= KNOWN_BOX;

/** Missed at least once and not yet known again. */
export function isMissed(p: Progress, w: Word): boolean {
  const s = p[wordKey(w)];
  return !!s && s.wrong > 0 && s.box < KNOWN_BOX;
}

/** Missed and due today: what "Opakovat chybná" practises. Once answered right it waits for its next review. */
export const isWeak = (p: Progress, w: Word, day = today()) => isMissed(p, w) && isDue(p, w, day);

// Due words in low boxes come early in a pass, well-known ones late, and words not due yet last.
// Unseen words sit in the middle.
const BOX_WEIGHT = [30, 12, 5, 2, 1];
const UNSEEN_WEIGHT = 6;
const NOT_DUE_WEIGHT = 0.5;

export function weightOf(p: Progress, w: Word, day = today()): number {
  const s = p[wordKey(w)];
  if (!s) return UNSEEN_WEIGHT;
  return (s.due ?? day) <= day ? BOX_WEIGHT[Math.min(s.box, MAX_BOX)] : NOT_DUE_WEIGHT;
}

const KEY = "vialatina_progress";

/** Checks stored or imported data and keeps only well-formed records; null when it isn't a progress map at all. */
export function parseProgress(raw: unknown): Progress | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, WordStat> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const s = v as Partial<WordStat> | null;
    if (s && Number.isFinite(s.box) && Number.isFinite(s.seen) && Number.isFinite(s.wrong)) {
      const stat: WordStat = { box: Math.max(0, Math.min(MAX_BOX, Math.trunc(s.box!))), seen: s.seen!, wrong: s.wrong! };
      if (Number.isFinite(s.due)) stat.due = Math.trunc(s.due!);
      out[k] = stat;
    }
  }
  return out;
}

export function loadProgress(): Progress {
  try {
    return parseProgress(JSON.parse(localStorage.getItem(KEY) ?? "null")) ?? {};
  } catch {
    return {};
  }
}

const BACKUP_APP = "via-latina";

/** Backup file contents. Safari on iPhone may wipe site storage after a week without a visit, so the learner can keep a copy. */
export function exportProgress(p: Progress, date = new Date()): string {
  return JSON.stringify({ app: BACKUP_APP, version: 1, date: date.toISOString(), progress: p });
}

/** Reads a backup file (or a bare progress map); null when the text isn't one. */
export function importProgress(text: string): Progress | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (raw && typeof raw === "object" && "progress" in raw) {
    if ((raw as { app?: unknown }).app !== BACKUP_APP) return null;
    raw = (raw as { progress: unknown }).progress;
  }
  const p = parseProgress(raw);
  return p && Object.keys(p).length > 0 ? p : null;
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
