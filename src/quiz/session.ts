import { drawNext, emptyDeck, pickOptions, poolFor, scheduleRetry, type DeckState, type Rng } from "./engine";
import { isDue, isWeak, record, recordKey, today, weightOf, weightOfKey, wordKey, type Progress } from "./progress";
import { CHOICES, grammarKey, grammarQuestions, type GrammarKind } from "./grammar";
import type { Settings, Word } from "./types";

export interface Question {
  id: number;
  word: Word;
  options: Word[];
  /** A missed word coming back for another try. */
  again: boolean;
  /** Index into `options` the learner picked, or null while unanswered. */
  chosen: number | null;
  /** Where the round was when the word was drawn: pass number and the word's place in it. */
  pass: number;
  n: number;
  of: number;
  /** Set for a grammar question: `options` is empty and the learner picks one of `choices`. */
  grammar?: { kind: GrammarKind; choices: string[]; answer: number };
}

/**
 * "weak" practises only words missed earlier (see `isWeak`), "due" only words due
 * for review today (see `isDue`); once none are left the round goes on with everything.
 * "grammar" asks gender, genitive or conjugation instead of the meaning (see grammar.ts).
 */
export type Focus = "all" | "weak" | "due" | "grammar";

export interface Session {
  settings: Settings;
  focus: Focus;
  deck: DeckState;
  /**
   * The most recent answered questions (at most HISTORY_LIMIT - 1, older ones are
   * dropped to keep the feed light) followed by exactly one unanswered one.
   * Ids keep counting up within a visit.
   */
  questions: Question[];
  right: number;
  total: number;
  streak: number;
  /** Per-word results across visits; decides which words come up first. */
  progress: Progress;
}

/** How many cards the feed keeps, including the open one; older answered cards are dropped. */
export const HISTORY_LIMIT = 20;

/** Words the round asks from: the selection, narrowed by the focus while that still leaves something. */
function roundPool(settings: Settings, focus: Focus, progress: Progress, words: readonly Word[], day: number) {
  const all = poolFor(words, settings.lessons);
  const narrowed =
    focus === "weak"
      ? all.filter((w) => isWeak(progress, w, day))
      : focus === "due"
        ? all.filter((w) => isDue(progress, w, day))
        : focus === "grammar"
          ? all.filter((w) => grammarQuestions(w).length > 0)
          : [];
  return narrowed.length ? { all, pool: narrowed, focus } : { all, pool: all, focus: "all" as const };
}

function withNextQuestion(s: Omit<Session, "questions"> & { questions: Question[] }, words: readonly Word[], rng: Rng): Session {
  const day = today();
  const { all, pool, focus } = roundPool(s.settings, s.focus, s.progress, words, day);
  // Switching focus (the last weak or due word learnt) starts a fresh pass over the whole selection.
  const deck = focus === s.focus ? s.deck : { ...s.deck, deck: [] };
  const grammar = focus === "grammar";
  const weight = grammar ? (w: Word) => grammarWeight(s.progress, w, day) : (w: Word) => weightOf(s.progress, w, day);
  const { state, word, again } = drawNext(deck, pool, rng, weight);
  const id = (s.questions.at(-1)?.id ?? 0) + 1;
  const place = { again, chosen: null, pass: state.pass, n: state.size - state.deck.length, of: state.size };
  const q: Question = grammar
    ? { id, word, options: [], ...place, grammar: grammarQuestion(word, weakestKind(s.progress, word, day, rng)) }
    : { id, word, options: pickOptions(word, all, words, undefined, rng), ...place };
  return { ...s, focus, deck: state, questions: [...s.questions, q].slice(-HISTORY_LIMIT) };
}

export function newSession(
  settings: Settings,
  words: readonly Word[],
  progress: Progress = {},
  rng: Rng = Math.random,
  focus: Focus = "all",
): Session {
  return withNextQuestion({ settings, focus, deck: emptyDeck(), questions: [], right: 0, total: 0, streak: 0, progress }, words, rng);
}

/** The grammar question of this kind about the word. */
function grammarQuestion(w: Word, kind: GrammarKind): Question["grammar"] {
  const answer = grammarQuestions(w).find((g) => g.kind === kind)!.answer;
  return { kind, choices: CHOICES[kind], answer };
}

/** Of the grammar questions a noun has (gender, genitive), the one that most needs practice. */
function weakestKind(p: Progress, w: Word, day: number, rng: Rng): GrammarKind {
  const kinds = grammarQuestions(w).map((g) => ({ kind: g.kind, weight: weightOfKey(p, grammarKey(g.kind, w), day) + rng() }));
  return kinds.sort((a, b) => b.weight - a.weight)[0].kind;
}

const grammarWeight = (p: Progress, w: Word, day: number) =>
  Math.max(...grammarQuestions(w).map((g) => weightOfKey(p, grammarKey(g.kind, w), day)));

/** How many answers the question offers (keys 1…n). */
export const choiceCount = (q: Question) => q.grammar?.choices.length ?? q.options.length;

export function isCorrect(q: Question): boolean {
  if (q.chosen === null) return false;
  return q.grammar ? q.chosen === q.grammar.answer : q.options[q.chosen] === q.word;
}

/** Records an answer to the open question and queues the next one. No-op for anything already answered. */
export function answer(s: Session, id: number, choice: number, words: readonly Word[], rng: Rng = Math.random): Session {
  const q = s.questions.at(-1);
  if (!q || q.id !== id || q.chosen !== null) return s;
  const answered = { ...q, chosen: choice };
  const ok = isCorrect(answered);
  const next = {
    ...s,
    deck: ok ? s.deck : scheduleRetry(s.deck, q.word),
    questions: [...s.questions.slice(0, -1), answered],
    right: s.right + (ok ? 1 : 0),
    total: s.total + 1,
    streak: ok ? s.streak + 1 : 0,
    progress: q.grammar ? recordKey(s.progress, grammarKey(q.grammar.kind, q.word), ok) : record(s.progress, q.word, ok),
  };
  return withNextQuestion(next, words, rng);
}

/** The round as stored between visits: words by key, plus the open question. */
export interface SavedRound {
  lessons: string[];
  focus: Focus;
  deck: string[];
  retry: { key: string; due: number }[];
  served: number;
  pass: number;
  size: number;
  open: { key: string; again: boolean; pass: number; n: number; of: number; kind?: GrammarKind };
}

export function saveRound(s: Session): SavedRound {
  const q = s.questions.at(-1)!;
  const d = s.deck;
  return {
    lessons: s.settings.lessons,
    focus: s.focus,
    deck: d.deck.map(wordKey),
    retry: d.retry.map((r) => ({ key: wordKey(r.word), due: r.due })),
    served: d.served,
    pass: d.pass,
    size: d.size,
    open: { key: wordKey(q.word), again: q.again, pass: q.pass, n: q.n, of: q.of, kind: q.grammar?.kind },
  };
}

/**
 * Picks the round up where the last visit left it: same open word, same place in
 * the pass. Null when the saved round is for another selection or its word is gone.
 */
export function restoreSession(
  saved: SavedRound,
  settings: Settings,
  words: readonly Word[],
  progress: Progress,
  rng: Rng = Math.random,
): Session | null {
  if (saved.lessons.join(",") !== settings.lessons.join(",")) return null;
  const byKey = new Map<string, Word>();
  for (const w of poolFor(words, settings.lessons)) if (!byKey.has(wordKey(w))) byKey.set(wordKey(w), w);
  const word = byKey.get(saved.open.key);
  if (!word) return null;
  const deck = saved.deck.flatMap((k) => byKey.get(k) ?? []);
  const retry = saved.retry.flatMap((r) => {
    const w = byKey.get(r.key);
    return w ? [{ word: w, due: r.due }] : [];
  });
  const { all } = roundPool(settings, saved.focus, progress, words, today());
  const { again, pass, n, of, kind } = saved.open;
  const place = { id: 1, word, again, chosen: null, pass, n, of };
  let q: Question;
  if (kind) {
    if (!grammarQuestions(word).some((g) => g.kind === kind)) return null;
    q = { ...place, options: [], grammar: grammarQuestion(word, kind) };
  } else {
    q = { ...place, options: pickOptions(word, all, words, undefined, rng) };
  }
  return {
    settings,
    focus: saved.focus,
    deck: { deck, retry, served: saved.served, last: word, pass: saved.pass, size: saved.size },
    questions: [q],
    right: 0,
    total: 0,
    streak: 0,
    progress,
  };
}

const KEY = "vialatina_round";

export function loadRound(): SavedRound | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as SavedRound | null;
    return raw && Array.isArray(raw.deck) && Array.isArray(raw.retry) && Array.isArray(raw.lessons) && raw.open ? raw : null;
  } catch {
    return null;
  }
}

export function storeRound(s: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saveRound(s)));
  } catch {}
}
