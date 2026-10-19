import { wordKey } from "./progress";
import type { Word } from "./types";

/**
 * Grammar questions read from a word's `info`: the gender and declension of a
 * noun ("corporis n." → neuter, 3rd) and the conjugation of a verb ("amāre, …" → 1st).
 * Words whose info doesn't say it clearly (plurals only, irregular verbs, missing
 * macrons) get no grammar question rather than a wrong one.
 */
export type GrammarKind = "gender" | "declension" | "conjugation";

export interface GrammarFacts {
  /** Index into GENDERS. */
  gender?: number;
  /** 0–4 for declensions 1–5. */
  declension?: number;
  /** 0–3 for conjugations 1–4. */
  conjugation?: number;
}

export const QUESTION: Record<GrammarKind, string> = {
  gender: "Jaký je rod?",
  declension: "Jaký je 2. pád?",
  conjugation: "Do které konjugace patří?",
};

export const CHOICES: Record<GrammarKind, string[]> = {
  gender: ["mužský (m.)", "ženský (f.)", "střední (n.)"],
  declension: ["1. deklinace (-ae)", "2. deklinace (-ī)", "3. deklinace (-is)", "4. deklinace (-ūs)", "5. deklinace (-eī)"],
  conjugation: ["1. konjugace (-āre)", "2. konjugace (-ēre)", "3. konjugace (-ere)", "4. konjugace (-īre)"],
};

const MACRON = /[āēīōūȳ]/;

function nounFacts(la: string, info: string): GrammarFacts {
  // "corporis n." or "honōris m. (i honōs)"; plurals only ("-ārum f. pl.") and "m./f." are left out.
  const m = /^([^\s,]+) (m|f|n)\.(?:\s*\((?!pl)[^)]*\))?$/.exec(info.trim());
  if (!m) return {};
  const [, gen, g] = m;
  const facts: GrammarFacts = { gender: "mfn".indexOf(g) };
  if (/(ēs|es)$/.test(la) && /(ēī|eī|ei)$/.test(gen)) facts.declension = 4;
  else if (gen.endsWith("ae")) facts.declension = 0;
  else if (/[iī]$/.test(gen)) facts.declension = 1;
  else if (gen.endsWith("is")) facts.declension = 2;
  // A bare -us (no macron) is left out: it may be a typo.
  else if (gen.endsWith("ūs")) facts.declension = 3;
  return facts;
}

/** Irregular verbs and their compounds: esse, posse, ferre, velle/nolle/malle, īre (eo), fierī. */
function irregular(la: string, inf: string): boolean {
  return /(esse|ferre|velle|nolle|nōlle|malle|mālle|fierī|fieri)$/.test(inf) || (/eo$/.test(la) && /īre$/.test(inf));
}

function verbFacts(la: string, info: string): GrammarFacts {
  const inf = info.split(",")[0].trim();
  if (!inf || inf.includes(" ") || irregular(la, inf)) return {};
  const ends = (...xs: string[]) => xs.some((x) => inf.endsWith(x));
  if (ends("āre", "ārī", "are", "ari")) return { conjugation: 0 };
  if (ends("īre", "īrī", "ire", "iri")) return { conjugation: 3 };
  if (ends("ēre", "ērī")) return { conjugation: 1 };
  // A plain -ere is the 3rd only when the entry marks long vowels at all; otherwise it may be a 2nd without its macron.
  if (ends("ere") && MACRON.test(info)) return { conjugation: 2 };
  // 3rd conjugation deponents: loquor, loquī; patior, patī.
  if (la.endsWith("or") && inf.endsWith("ī")) return { conjugation: 2 };
  return {};
}

export function grammarFacts(w: Pick<Word, "pos" | "la" | "info">): GrammarFacts {
  if (w.pos === "n") return nounFacts(w.la, w.info);
  if (w.pos === "v") return verbFacts(w.la, w.info);
  return {};
}

/** The grammar questions a word can be asked, with the index of the right choice. */
export function grammarQuestions(w: Pick<Word, "pos" | "la" | "info">): { kind: GrammarKind; answer: number }[] {
  const f = grammarFacts(w);
  const out: { kind: GrammarKind; answer: number }[] = [];
  if (f.gender !== undefined) out.push({ kind: "gender", answer: f.gender });
  if (f.declension !== undefined) out.push({ kind: "declension", answer: f.declension });
  if (f.conjugation !== undefined) out.push({ kind: "conjugation", answer: f.conjugation });
  return out;
}

/** Progress key of a grammar question; kept apart from the word's meaning, so "umím" counts meanings only. */
export const grammarKey = (kind: GrammarKind, w: Word) => `${kind}|${wordKey(w)}`;
