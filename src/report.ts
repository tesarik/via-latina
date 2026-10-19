import { LESSONS } from "./lessons";
import type { Word } from "./quiz/types";

/** Everything needed to find and fix the word: lesson, headword, grammar, meaning, example. */
export function reportText(w: Word): string {
  const lesson = LESSONS.find((l) => l.id === w.lesson);
  return [
    `Via Latina – chyba ve slovíčku (${lesson?.title ?? w.lesson}, ${w.lesson}.ts)`,
    `${w.la}, ${w.info} = ${w.cz}`,
    w.note && `${w.note.ex} – ${w.note.tr}`,
    w.note?.remark,
    "",
    "Co je špatně: ",
  ]
    .filter((x): x is string => typeof x === "string")
    .join("\n");
}

/**
 * Hands the report to the share sheet (mail, messages, notes) on phones, or copies
 * it elsewhere. Returns a message for the learner, or null when they cancelled.
 */
export async function reportWord(w: Word): Promise<string | null> {
  const text = reportText(w);
  if (navigator.share) {
    try {
      await navigator.share({ title: `Chyba: ${w.la}`, text });
      return null;
    } catch (e) {
      if ((e as Error).name === "AbortError") return null;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "Zkopírováno, vlož to do zprávy.";
  } catch {
    return "Nepodařilo se zkopírovat.";
  }
}
