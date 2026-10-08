import type { Category, Word } from "./types";

export type Rng = () => number;

export const OPTION_COUNT = 4;
/** How many words later a missed word comes back. */
export const RETRY_GAP = 4;

export interface DeckState {
  /** Remaining shuffled words of the current pass; drawn from the end. */
  deck: Word[];
  /** Missed words waiting to be asked again once `served` reaches `due`. */
  retry: { word: Word; due: number }[];
  served: number;
  last: Word | null;
}

export const emptyDeck = (): DeckState => ({ deck: [], retry: [], served: 0, last: null });

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function poolFor(words: readonly Word[], category: Category): Word[] {
  return category === "all" ? [...words] : words.filter((w) => w.pos === category);
}

/** Next word to ask: a due retry first, otherwise the next word of the shuffled pass. */
export function drawNext(
  state: DeckState,
  pool: readonly Word[],
  rng: Rng = Math.random,
): { state: DeckState; word: Word; again: boolean } {
  const served = state.served + 1;
  const ri = state.retry.findIndex((r) => r.due <= served);
  if (ri >= 0) {
    const word = state.retry[ri].word;
    const retry = state.retry.filter((_, i) => i !== ri);
    return { state: { ...state, retry, served, last: word }, word, again: true };
  }
  let deck = state.deck;
  if (deck.length === 0) {
    // New pass; never open it with the word that just closed the previous one.
    const fresh = pool.filter((w) => w !== state.last);
    deck = shuffle(fresh.length ? fresh : pool, rng);
  }
  const word = deck[deck.length - 1];
  return { state: { ...state, deck: deck.slice(0, -1), served, last: word }, word, again: false };
}

export function scheduleRetry(state: DeckState, word: Word, gap = RETRY_GAP): DeckState {
  return { ...state, retry: [...state.retry, { word, due: state.served + gap }] };
}

/**
 * The correct word plus distractors, shuffled. Distractors come from the same
 * word class where possible, and no two options share a Latin or Czech form,
 * so every question has exactly one right answer in either direction.
 */
export function pickOptions(
  word: Word,
  all: readonly Word[],
  count = OPTION_COUNT,
  rng: Rng = Math.random,
): Word[] {
  const picked: Word[] = [word];
  const add = (cands: readonly Word[]) => {
    for (const w of shuffle(cands, rng)) {
      if (picked.length === count) return;
      if (picked.every((p) => p.cz !== w.cz && p.la !== w.la)) picked.push(w);
    }
  };
  add(all.filter((w) => w.pos === word.pos));
  add(all);
  return shuffle(picked, rng);
}
