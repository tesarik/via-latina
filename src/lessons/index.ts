import type { Lesson, Word } from "../quiz/types";
import type { LessonSource } from "./define";

// Every file in this folder whose name starts with a digit is a lesson. The file
// name (without .ts) is the lesson id and sets the order: 00-…, 01-…, 02-…
const modules = import.meta.glob<{ default: LessonSource }>("./[0-9]*.ts", { eager: true });

export const LESSONS: Lesson[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => {
    const id = path.replace(/^\.\//, "").replace(/\.ts$/, "");
    return { id, title: mod.default.title, words: mod.default.entries.map((e) => ({ ...e, lesson: id })) };
  });

export const WORDS: Word[] = LESSONS.flatMap((l) => l.words);
