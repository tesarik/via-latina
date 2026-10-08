import { describe, expect, it } from "vitest";
import { drawNext, emptyDeck, pickOptions, poolFor, scheduleRetry, type DeckState } from "./engine";
import { WORDS } from "./words";
import type { Word } from "./types";

// Deterministic PRNG so failures reproduce.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("words", () => {
  it("has no duplicate Latin+class pairs and no empty fields", () => {
    const keys = new Set<string>();
    for (const w of WORDS) {
      expect(w.la && w.info && w.cz).toBeTruthy();
      const k = `${w.pos}:${w.la}`;
      expect(keys.has(k), k).toBe(false);
      keys.add(k);
    }
  });
});

describe("drawNext", () => {
  it("serves every word of the pool once per pass", () => {
    const pool = poolFor(WORDS, "v");
    let s: DeckState = emptyDeck();
    const seen = new Set<Word>();
    const rng = seeded(1);
    for (let i = 0; i < pool.length; i++) {
      const r = drawNext(s, pool, rng);
      s = r.state;
      seen.add(r.word);
    }
    expect(seen.size).toBe(pool.length);
  });

  it("brings a missed word back after the retry gap", () => {
    const pool = poolFor(WORDS, "n");
    const rng = seeded(2);
    let r = drawNext(emptyDeck(), pool, rng);
    const missed = r.word;
    let s = scheduleRetry(r.state, missed, 3);
    const order: Word[] = [];
    for (let i = 0; i < 3; i++) {
      r = drawNext(s, pool, rng);
      s = r.state;
      order.push(r.word);
    }
    expect(order[2]).toBe(missed);
    expect(r.again).toBe(true);
  });

  it("does not repeat a word across the pass boundary", () => {
    const pool = poolFor(WORDS, "o").slice(0, 3);
    const rng = seeded(3);
    let s = emptyDeck();
    let prev: Word | null = null;
    for (let i = 0; i < 60; i++) {
      const r = drawNext(s, pool, rng);
      expect(r.word).not.toBe(prev);
      prev = r.word;
      s = r.state;
    }
  });
});

describe("pickOptions", () => {
  it("returns distinct options containing the answer, same class first", () => {
    const rng = seeded(4);
    for (const w of WORDS) {
      const opts = pickOptions(w, WORDS, 4, rng);
      expect(opts).toHaveLength(4);
      expect(opts).toContain(w);
      expect(new Set(opts.map((o) => o.cz)).size).toBe(4);
      expect(new Set(opts.map((o) => o.la)).size).toBe(4);
      expect(opts.every((o) => o.pos === w.pos)).toBe(true);
    }
  });
});

describe("session", () => {
  it("answers the open question once and queues the next", async () => {
    const { newSession, answer, isCorrect } = await import("./session");
    const rng = seeded(5);
    let s = newSession({ category: "all", direction: "la" }, WORDS, rng);
    const q = s.questions[0];
    const right = q.options.indexOf(q.word);
    s = answer(s, q.id, right, WORDS, rng);
    expect(s.questions).toHaveLength(2);
    expect(isCorrect(s.questions[0])).toBe(true);
    expect(s.right).toBe(1);
    expect(s.streak).toBe(1);
    // A second answer to the same question is ignored.
    expect(answer(s, q.id, 0, WORDS, rng)).toBe(s);

    const q2 = s.questions[1];
    const wrong = q2.options.findIndex((o) => o !== q2.word);
    s = answer(s, q2.id, wrong, WORDS, rng);
    expect(s.streak).toBe(0);
    expect(s.total).toBe(2);
    expect(s.deck.retry.map((r) => r.word)).toContain(q2.word);
  });
});
