import { drawNext, emptyDeck, pickOptions, poolFor, scheduleRetry, type DeckState, type Rng } from "./engine";
import type { Settings, Word } from "./types";

export interface Question {
  id: number;
  word: Word;
  options: Word[];
  /** A missed word coming back for another try. */
  again: boolean;
  /** Index into `options` the learner picked, or null while unanswered. */
  chosen: number | null;
}

export interface Session {
  settings: Settings;
  deck: DeckState;
  /**
   * The most recent answered questions (at most HISTORY_LIMIT - 1, older ones are
   * dropped to keep the feed light) followed by exactly one unanswered one.
   * Ids keep counting up, so `id` is also the word's number in the round.
   */
  questions: Question[];
  right: number;
  total: number;
  streak: number;
}

/** How many cards the feed keeps, including the open one; older answered cards are dropped. */
export const HISTORY_LIMIT = 20;

function withNextQuestion(s: Omit<Session, "questions"> & { questions: Question[] }, words: readonly Word[], rng: Rng): Session {
  const pool = poolFor(words, s.settings.lessons);
  const { state, word, again } = drawNext(s.deck, pool, rng);
  const id = (s.questions.at(-1)?.id ?? 0) + 1;
  const q: Question = { id, word, options: pickOptions(word, pool, words, undefined, rng), again, chosen: null };
  return { ...s, deck: state, questions: [...s.questions, q].slice(-HISTORY_LIMIT) };
}

export function newSession(settings: Settings, words: readonly Word[], rng: Rng = Math.random): Session {
  return withNextQuestion({ settings, deck: emptyDeck(), questions: [], right: 0, total: 0, streak: 0 }, words, rng);
}

export function isCorrect(q: Question): boolean {
  return q.chosen !== null && q.options[q.chosen] === q.word;
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
  };
  return withNextQuestion(next, words, rng);
}
