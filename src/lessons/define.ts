import type { Note, Pos } from "../quiz/types";

/** One word as written in a lesson file; the lesson id is added when lessons are loaded. */
export interface Entry {
  la: string;
  info: string;
  cz: string;
  pos: Pos;
  note?: Note;
}

export interface LessonSource {
  title: string;
  entries: Entry[];
}

/** [Latin example, Czech translation, optional remark] — shown after the word is answered. */
type NoteRow = [ex: string, tr: string, remark?: string];

const entry =
  (pos: Pos) =>
  (la: string, info: string, cz: string, note?: NoteRow): Entry => {
    const e: Entry = { la, info, cz, pos };
    if (note) e.note = note[2] ? { ex: note[0], tr: note[1], remark: note[2] } : { ex: note[0], tr: note[1] };
    return e;
  };

/** Podstatné jméno: n("aqua", "aquae f.", "voda", ["Aqua vitae est.", "Voda je život."]) */
export const n = entry("n");
/** Sloveso: v("amo", "amāre, amāvī, amātum", "miluji", […]) */
export const v = entry("v");
/** Přídavné jméno: a("bonus", "bona, bonum", "dobrý", […]) */
export const a = entry("a");
/** Ostatní (příslovce, spojky, předložky, zájmena, číslovky): o("et", "spojka", "a", […]) */
export const o = entry("o");

export const lesson = (title: string, entries: Entry[]): LessonSource => ({ title, entries });
