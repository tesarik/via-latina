import { describe, expect, it } from "vitest";
import { drawNext, emptyDeck, pickOptions, poolFor, scheduleRetry, type DeckState } from "./engine";
import { answer, HISTORY_LIMIT, isCorrect, newSession } from "./session";
import { LESSONS, WORDS } from "../lessons";
import { toggleLesson } from "./settings";
import type { Word } from "./types";

// Deterministic PRNG so failures reproduce.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const ofPos = (pos: Word["pos"]) => WORDS.filter((w) => w.pos === pos);
const word = (la: string, cz: string, lesson: string, pos: Word["pos"] = "n"): Word => ({ la, info: "", cz, pos, lesson });

describe("lessons", () => {
  it("loads at least one lesson, each with a title and words", () => {
    expect(LESSONS.length).toBeGreaterThan(0);
    for (const l of LESSONS) {
      expect(l.title, l.id).toBeTruthy();
      expect(l.words.length, l.id).toBeGreaterThan(0);
      expect(l.words.every((w) => w.lesson === l.id)).toBe(true);
    }
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it("has no empty fields and no word twice within a lesson", () => {
    for (const l of LESSONS) {
      const keys = new Set<string>();
      for (const w of l.words) {
        expect(w.la && w.info && w.cz, `${l.id}: ${w.la}`).toBeTruthy();
        if (w.note) expect(w.note.ex && w.note.tr, `${l.id}: ${w.la}`).toBeTruthy();
        const k = `${w.pos}:${w.la}`;
        expect(keys.has(k), `${l.id}: ${k}`).toBe(false);
        keys.add(k);
      }
    }
  });
});

describe("poolFor", () => {
  const words = [word("aqua", "voda", "01"), word("via", "cesta", "02"), word("aqua", "voda", "02")];

  it("takes every lesson when none is selected, asking a shared word once", () => {
    expect(poolFor(words, []).map((w) => w.la)).toEqual(["aqua", "via"]);
  });

  it("limits to the selected lessons", () => {
    expect(poolFor(words, ["01"]).map((w) => w.la)).toEqual(["aqua"]);
    expect(poolFor(words, ["02"]).map((w) => w.la)).toEqual(["via", "aqua"]);
  });
});

describe("drawNext", () => {
  it("serves every word of the pool once per pass", () => {
    const pool = ofPos("v");
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
    const pool = ofPos("n");
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
    const pool = ofPos("o").slice(0, 3);
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
  it("returns distinct options containing the answer, all of the same class", () => {
    const rng = seeded(4);
    for (const w of WORDS) {
      const opts = pickOptions(w, WORDS, WORDS, 4, rng);
      expect(opts).toHaveLength(4);
      expect(opts).toContain(w);
      expect(new Set(opts.map((o) => o.cz)).size).toBe(4);
      expect(new Set(opts.map((o) => o.la)).size).toBe(4);
      expect(opts.every((o) => o.pos === w.pos)).toBe(true);
    }
  });

  it("prefers distractors from the lessons being practised", () => {
    const pool = [word("aqua", "voda", "01"), word("via", "cesta", "01"), word("vita", "život", "01"), word("rosa", "růže", "01")];
    const others = [word("rex", "král", "02"), word("lex", "zákon", "02"), word("pax", "mír", "02")];
    const opts = pickOptions(pool[0], pool, [...pool, ...others], 4, seeded(6));
    expect(opts.every((o) => o.lesson === "01")).toBe(true);
  });
});

describe("session", () => {
  it("answers the open question once and queues the next", () => {
    const rng = seeded(5);
    let s = newSession({ lessons: [] }, WORDS, rng);
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

  it("keeps only the latest cards while numbering keeps counting", () => {
    const rng = seeded(8);
    let s = newSession({ lessons: [] }, WORDS, rng);
    for (let i = 0; i < 50; i++) {
      const q = s.questions.at(-1)!;
      s = answer(s, q.id, 0, WORDS, rng);
    }
    expect(s.questions).toHaveLength(HISTORY_LIMIT);
    expect(s.questions.at(-1)!.id).toBe(51);
    expect(s.questions.at(-1)!.chosen).toBeNull();
    expect(s.total).toBe(50);
  });

  it("asks only words from the selected lesson", () => {
    const id = LESSONS[0].id;
    const rng = seeded(7);
    let s = newSession({ lessons: [id] }, WORDS, rng);
    for (let i = 0; i < 30; i++) {
      const q = s.questions.at(-1)!;
      expect(q.word.lesson).toBe(id);
      s = answer(s, q.id, 0, WORDS, rng);
    }
  });
});

describe("toggleLesson", () => {
  const ids = ["01", "02", "03"];

  it("unticking one lesson out of all keeps the others", () => {
    expect(toggleLesson([], "02", ids)).toEqual(["01", "03"]);
  });

  it("ticking the last missing lesson means all again", () => {
    expect(toggleLesson(["01", "03"], "02", ids)).toEqual([]);
  });

  it("keeps lesson order whatever the tapping order", () => {
    expect(toggleLesson(["03"], "01", ids)).toEqual(["01", "03"]);
  });

  it("refuses to untick the only selected lesson", () => {
    expect(toggleLesson(["02"], "02", ids)).toBeNull();
    expect(toggleLesson([], "01", ["01"])).toBeNull();
  });
});
