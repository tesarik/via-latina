import { describe, expect, it } from "vitest";
import { drawNext, emptyDeck, pickOptions, poolFor, scheduleRetry, weightedOrder, type DeckState } from "./engine";
import {
  exportProgress,
  importProgress,
  INTERVAL_DAYS,
  isDue,
  isKnown,
  isWeak,
  KNOWN_BOX,
  parseProgress,
  record,
  today,
  totals,
  weightOf,
  wordKey,
  type Progress,
} from "./progress";
import { answer, HISTORY_LIMIT, isCorrect, newSession, restoreSession, saveRound } from "./session";
import { grammarFacts, grammarKey, grammarQuestions } from "./grammar";
import { LESSONS, WORDS } from "../lessons";
import { lessonsFor, toggleLesson } from "./settings";
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

describe("examples", () => {
  it("every word in every set has an example sentence with a translation", () => {
    const missing = WORDS.filter((w) => !w.note).map((w) => `${w.lesson}: ${w.la}`);
    expect(missing).toEqual([]);
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
    let s = newSession({ lessons: [] }, WORDS, {}, rng);
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

  it("numbers words within the pass and saves the round for the next visit", () => {
    const id = LESSONS[0].id;
    const size = poolFor(WORDS, [id]).length;
    const rng = seeded(4);
    let s = newSession({ lessons: [id] }, WORDS, {}, rng);
    for (let i = 0; i < 5; i++) {
      const q = s.questions.at(-1)!;
      expect({ pass: q.pass, n: q.n, of: q.of }).toEqual({ pass: 1, n: i + 1, of: size });
      s = answer(s, q.id, q.options.indexOf(q.word), WORDS, rng);
    }
    const saved = JSON.parse(JSON.stringify(saveRound(s)));
    const back = restoreSession(saved, { lessons: [id] }, WORDS, s.progress, rng)!;
    const open = back.questions[0];
    expect(open.word).toBe(s.questions.at(-1)!.word);
    expect(open.n).toBe(6);
    expect(back.deck.deck).toEqual(s.deck.deck);
    // The next word is the one the old round would have asked.
    const next = answer(back, open.id, open.options.indexOf(open.word), WORDS, rng).questions.at(-1)!;
    expect(next.word).toBe(s.deck.deck.at(-1));
    expect(next.n).toBe(7);
    // A saved round for another selection is not used.
    expect(restoreSession(saved, { lessons: [] }, WORDS, s.progress, rng)).toBeNull();
  });

  it("starts pass 2 once every word was asked", () => {
    const id = LESSONS.at(-1)!.id;
    const size = poolFor(WORDS, [id]).length;
    const rng = seeded(12);
    let s = newSession({ lessons: [id] }, WORDS, {}, rng);
    for (let i = 0; i < size; i++) {
      const q = s.questions.at(-1)!;
      s = answer(s, q.id, q.options.indexOf(q.word), WORDS, rng);
    }
    // Every word again, but not opening with the one that closed pass 1.
    expect(s.questions.at(-1)).toMatchObject({ pass: 2, n: 1, of: size });
    expect(s.questions.at(-1)!.word).not.toBe(s.questions.at(-2)!.word);
  });

  it("keeps only the latest cards while numbering keeps counting", () => {
    const rng = seeded(8);
    let s = newSession({ lessons: [] }, WORDS, {}, rng);
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
    let s = newSession({ lessons: [id] }, WORDS, {}, rng);
    for (let i = 0; i < 30; i++) {
      const q = s.questions.at(-1)!;
      expect(q.word.lesson).toBe(id);
      s = answer(s, q.id, 0, WORDS, rng);
    }
  });
});

describe("toggleLesson / lessonsFor", () => {
  const ids = ["01", "02", "03"];

  it("unticking one lesson out of all keeps the others", () => {
    expect(toggleLesson(ids, "02", ids)).toEqual(["01", "03"]);
  });

  it("ticking the last missing lesson means all again", () => {
    expect(lessonsFor(toggleLesson(["01", "03"], "02", ids), ids)).toEqual([]);
  });

  it("keeps lesson order whatever the tapping order", () => {
    expect(toggleLesson(["03"], "01", ids)).toEqual(["01", "03"]);
  });

  it("may untick everything, but an empty choice is not a selection", () => {
    expect(toggleLesson(["02"], "02", ids)).toEqual([]);
    expect(lessonsFor([], ids)).toBeNull();
    expect(lessonsFor(["02"], ids)).toEqual(["02"]);
  });
});

describe("progress", () => {
  const w = WORDS[0];

  it("moves a word up on a right answer when due and back to zero on a wrong one", () => {
    const day0 = 20_000;
    let p: Progress = {};
    let day = day0;
    for (let i = 0; i < KNOWN_BOX; i++) {
      p = record(p, w, true, day);
      day = p[wordKey(w)]!.due!;
    }
    expect(isKnown(p, w)).toBe(true);
    expect(p[wordKey(w)]!.due).toBe(day0 + INTERVAL_DAYS[1] + INTERVAL_DAYS[2] + INTERVAL_DAYS[3]);
    p = record(p, w, false, day0 + 30);
    expect(p[wordKey(w)]).toEqual({ box: 0, seen: KNOWN_BOX + 1, wrong: 1, due: day0 + 30 });
    expect(isKnown(p, w)).toBe(false);
  });

  it("a right answer before the word is due keeps its box", () => {
    let p = record({}, w, true, 100);
    expect(p[wordKey(w)]).toEqual({ box: 1, seen: 1, wrong: 0, due: 101 });
    expect(isDue(p, w, 100)).toBe(false);
    p = record(p, w, true, 100);
    expect(p[wordKey(w)]).toEqual({ box: 1, seen: 2, wrong: 0, due: 101 });
    expect(isDue(p, w, 101)).toBe(true);
    p = record(p, w, true, 101);
    expect(p[wordKey(w)]!.box).toBe(2);
  });

  it("treats old records without a due day as due, and the day turns at local midnight", () => {
    const p = parseProgress({ [wordKey(w)]: { box: 2, seen: 3, wrong: 0 } })!;
    expect(isDue(p, w, 5)).toBe(true);
    expect(record(p, w, true, 5)[wordKey(w)]).toEqual({ box: 3, seen: 4, wrong: 0, due: 5 + INTERVAL_DAYS[3] });
    expect(today(new Date(2026, 9, 19, 23, 59))).toBe(today(new Date(2026, 9, 19, 0, 1)));
    expect(today(new Date(2026, 9, 20, 0, 1))).toBe(today(new Date(2026, 9, 19, 12)) + 1);
  });

  it("weighs a missed word above an unseen one and a known one below both", () => {
    const missed = record({}, w, false);
    let known: Progress = {};
    for (let day = 0; day < 40; day += 10) known = record(known, w, true, day);
    expect(weightOf(missed, w)).toBeGreaterThan(weightOf({}, w));
    expect(weightOf(known, w, 60)).toBeLessThan(weightOf({}, w));
    // Not due yet: after everything that is.
    expect(weightOf(known, w, 31)).toBeLessThan(weightOf(known, w, 60));
  });

  it("puts heavy items first most of the time but keeps every item", () => {
    const items = ["light", "heavy", "mid"];
    const weight = (s: string) => ({ light: 1, mid: 3, heavy: 20 })[s]!;
    const rng = seeded(9);
    let heavyFirst = 0;
    for (let i = 0; i < 200; i++) {
      const order = weightedOrder(items, weight, rng);
      expect([...order].sort()).toEqual([...items].sort());
      if (order[0] === "heavy") heavyFirst++;
    }
    expect(heavyFirst).toBeGreaterThan(140);
  });

  it("a session records answers and asks hard words early in the next pass", () => {
    const lesson = LESSONS.at(-1)!;
    const pool = poolFor(WORDS, [lesson.id]);
    const hard = pool[5];
    let progress: Progress = {};
    for (const x of pool) progress = record(progress, x, x !== hard);
    for (const x of pool) if (x !== hard) progress = record(record(progress, x, true), x, true);
    let early = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = newSession({ lessons: [lesson.id] }, WORDS, progress, seeded(seed));
      let cur = s;
      const asked: Word[] = [cur.questions[0].word];
      for (let i = 0; i < 39; i++) {
        const q = cur.questions.at(-1)!;
        cur = answer(cur, q.id, q.options.indexOf(q.word), WORDS, seeded(seed + 100));
        asked.push(cur.questions.at(-1)!.word);
      }
      // ~270 words in the set; the missed one should show up among the first 40.
      if (asked.includes(hard)) early++;
      expect(cur.progress[wordKey(cur.questions[0].word)]!.seen).toBeGreaterThan(0);
    }
    expect(early).toBeGreaterThanOrEqual(17);
  });

  it("counts answers across visits", () => {
    const [a, b] = WORDS;
    const p = record(record(record({}, a!, true), a!, false), b!, true);
    expect(totals(p)).toEqual({ right: 2, total: 3 });
    expect(totals({})).toEqual({ right: 0, total: 0 });
  });

  it("restores progress from a backup and rejects anything else", () => {
    const p = record(record({}, w, true), WORDS[1], false);
    expect(importProgress(exportProgress(p))).toEqual(p);
    expect(importProgress(JSON.stringify(p))).toEqual(p);
    expect(importProgress("not json")).toBeNull();
    expect(importProgress("{}")).toBeNull();
    expect(importProgress(JSON.stringify({ app: "other", progress: p }))).toBeNull();
    expect(importProgress(JSON.stringify([1, 2]))).toBeNull();
  });

  it("the weak round asks only missed words, then carries on with everything", () => {
    const id = LESSONS[0].id;
    const pool = poolFor(WORDS, [id]);
    const missed = [pool[3], pool[10]];
    let p: Progress = {};
    for (const x of missed) p = record(p, x, false);
    p = record(p, pool[20], true);
    expect(missed.every((x) => isWeak(p, x))).toBe(true);
    expect(isWeak(p, pool[20])).toBe(false);

    const rng = seeded(11);
    let s = newSession({ lessons: [id] }, WORDS, p, rng, "weak");
    const asked: Word[] = [];
    for (let i = 0; i < 12; i++) {
      const q = s.questions.at(-1)!;
      asked.push(q.word);
      expect(q.options).toHaveLength(4);
      s = answer(s, q.id, q.options.indexOf(q.word), WORDS, rng);
    }
    // A right answer puts each off until tomorrow; after that the whole lesson is asked.
    expect(asked.slice(0, 2).every((w) => missed.includes(w))).toBe(true);
    expect(missed.some((x) => isWeak(s.progress, x))).toBe(false);
    expect(s.focus).toBe("all");
    expect(asked.some((w) => !missed.includes(w))).toBe(true);
  });
});

describe("grammar", () => {
  const g = (pos: "n" | "v", la: string, info: string) => grammarFacts({ pos, la, info });

  it("reads gender and declension from a noun's genitive", () => {
    expect(g("n", "aqua", "aquae f.")).toEqual({ gender: 1, declension: 0 });
    expect(g("n", "nauta", "nautae m.")).toEqual({ gender: 0, declension: 0 });
    expect(g("n", "locus", "locī m.")).toEqual({ gender: 0, declension: 1 });
    expect(g("n", "corpus", "corporis n.")).toEqual({ gender: 2, declension: 2 });
    expect(g("n", "honor", "honōris m. (i honōs)")).toEqual({ gender: 0, declension: 2 });
    expect(g("n", "manus", "manūs f.")).toEqual({ gender: 1, declension: 3 });
    expect(g("n", "res", "reī f.")).toEqual({ gender: 1, declension: 4 });
    expect(g("n", "dies", "diēī m.")).toEqual({ gender: 0, declension: 4 });
  });

  it("leaves out what it can't tell for sure", () => {
    expect(g("n", "arma", "armōrum n. pl.")).toEqual({});
    expect(g("n", "comes", "comitis m./f.")).toEqual({});
    expect(g("n", "fortunae", "fortūnārum f. (pl.)")).toEqual({});
    expect(g("v", "sum", "esse, fuī")).toEqual({});
    expect(g("v", "redeo", "redīre, rediī, reditum")).toEqual({});
    expect(g("v", "affero", "afferre, attulī, allātum")).toEqual({});
    // Without macrons a plain -ere could be a 2nd conjugation verb.
    expect(g("v", "extollo", "extollere")).toEqual({});
  });

  it("reads the conjugation from the infinitive", () => {
    expect(g("v", "amo", "amāre, amāvī, amātum")).toEqual({ conjugation: 0 });
    expect(g("v", "placeo", "placēre, placuī")).toEqual({ conjugation: 1 });
    expect(g("v", "tego", "tegere, tēxī, tēctum")).toEqual({ conjugation: 2 });
    expect(g("v", "eripio", "ēripere, ēripuī, ēreptum")).toEqual({ conjugation: 2 });
    expect(g("v", "audio", "audīre, audīvī, audītum")).toEqual({ conjugation: 3 });
    expect(g("v", "conor", "cōnārī, cōnātus sum")).toEqual({ conjugation: 0 });
    expect(g("v", "loquor", "loquī, locūtus sum")).toEqual({ conjugation: 2 });
  });

  it("most nouns and verbs get a grammar question", () => {
    const nv = WORDS.filter((w) => w.pos === "n" || w.pos === "v");
    const asked = nv.filter((w) => grammarQuestions(w).length > 0);
    expect(asked.length / nv.length).toBeGreaterThan(0.9);
  });

  it("a grammar round asks only nouns and verbs, scores the choice and keeps meanings apart", () => {
    const id = LESSONS[0].id;
    const rng = seeded(21);
    let s = newSession({ lessons: [id] }, WORDS, {}, rng, "grammar");
    for (let i = 0; i < 30; i++) {
      const q = s.questions.at(-1)!;
      expect(q.grammar).toBeDefined();
      expect(q.options).toHaveLength(0);
      const ok = i % 3 !== 0;
      const choice = ok ? q.grammar!.answer : (q.grammar!.answer + 1) % q.grammar!.choices.length;
      s = answer(s, q.id, choice, WORDS, rng);
      expect(isCorrect(s.questions.at(-2)!)).toBe(ok);
      const stat = s.progress[grammarKey(q.grammar!.kind, q.word)]!;
      expect(stat.seen).toBeGreaterThan(0);
      expect(s.progress[wordKey(q.word)]).toBeUndefined();
    }
    expect(s.focus).toBe("grammar");
    expect(s.right).toBe(20);
    // The open grammar question survives a save and restore.
    const back = restoreSession(JSON.parse(JSON.stringify(saveRound(s))), { lessons: [id] }, WORDS, s.progress, rng)!;
    expect(back.questions[0].grammar).toEqual(s.questions.at(-1)!.grammar);
  });
});
