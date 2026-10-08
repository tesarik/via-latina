/** Word class: noun, verb, adjective, everything else. Distractors are picked from the same class. */
export type Pos = "n" | "v" | "a" | "o";

/** Shown once the word has been answered. */
export interface Note {
  /** Latin example sentence or phrase. */
  ex: string;
  /** Czech translation of the example. */
  tr: string;
  /** Derived words, a false friend, a bit of history… */
  remark?: string;
}

export interface Word {
  la: string;
  /** Grammar note shown under the headword (genitive + gender, principal parts, …). */
  info: string;
  cz: string;
  pos: Pos;
  note?: Note;
  /** Id of the lesson the word comes from. */
  lesson: string;
}

export interface Lesson {
  id: string;
  title: string;
  words: Word[];
}

export interface Settings {
  /** Selected lesson ids; empty means all lessons. */
  lessons: string[];
}
