# via-latina

Mobile-first vocabulary quiz for Latin. One Latin word per screen with four Czech meanings; after answering, the card shows the right meaning, the grammar info and (if present) an example sentence with translation and a remark. UI copy is Czech.

## Stack

- React 18 + Vite 6, TypeScript strict, ESLint flat config, Vitest for pure logic. Same setup as the sibling `latin-rosary` project (its `package-lock.json` was reused because a fresh `npm install` hit an npm arborist bug).
- Plain CSS in `src/index.css` with tokens on `:root` (`--bg`, `--fg`, `--font`); dark mode via `prefers-color-scheme` swaps black/white.
- Static site; `BASE_PATH` env var sets the Vite base for sub-path hosting. Manifest + icon exist, no service worker (no offline yet).
- Repo: github.com/tesarik/via-latina (public), branch `main`.

## Commands

`npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`. Run typecheck, lint and test before committing.

## File map

- `src/lessons/` — vocabulary. Every file whose name starts with a digit is a lesson; `index.ts` loads them with `import.meta.glob` and the file name (without `.ts`) is the lesson id and sort order. `define.ts` has the `n`/`v`/`a`/`o` helpers (noun, verb, adjective, other) and `lesson(title, entries)`; an optional 4th argument `[ex, tr, remark?]` is the example shown after answering.
  - `00-zakladni-slovicka.ts` "Slovíčka 1" (311 words, all with examples and remarks; verbs in the infinitive).
  - `01-slovicka-2.ts`, `02-slovicka-3.ts` "Slovíčka 2/3" (~350 each, no examples yet; verbs in the 1st person sg., e.g. "přijímám"). Transcribed from OCR, so grammar info (vowel lengths, principal parts) may contain errors; fix them when the user reports any.
- `src/quiz/engine.ts` — pure logic: `poolFor` (words of selected lessons, deduped by la+cz), `drawNext` (shuffled passes, missed words return after `RETRY_GAP`), `pickOptions` (distractors of the same word class, preferring the selected lessons, never two options with the same Latin or Czech).
- `src/quiz/session.ts` — round state and `answer()`; keeps at most `HISTORY_LIMIT` (20) cards, ids keep counting and double as the word number.
- `src/quiz/settings.ts` — selected lesson ids in `localStorage` (`vialatina_settings`; empty = all) and `toggleLesson` (last lesson can't be unticked; ticking all collapses to "all").
- `src/quiz/types.ts` — `Word`, `Lesson`, `Note`, `Settings`.
- `src/App.tsx` — the snap-scrolling feed. Remembers which card is on screen and restores it when old cards are dropped (`overflow-anchor: none`, feed is `position: relative` so `offsetTop` is feed-relative). Keyboard: 1–4 answer the open card if it is on screen, Enter/↓ go to it.
- `src/components/QuestionCard.tsx` (card, ↑ previous / ↓ next buttons), `SettingsSheet.tsx` (bottom sheet with lesson checkboxes), `StatTip.tsx` (tap-to-explain bubble for the header figures).
- `src/quiz/engine.test.ts` — all tests, including lesson-data checks (no empty fields, no duplicate pos+headword within a lesson).

## Decisions from the user (keep them)

- Calm pace: **no automatic advance**; after every answer the learner moves on with the ↓ button or by swiping. ↑ goes back with the same smooth scroll.
- Direction is **Latin → Czech only** (Czech → Latin was removed on request).
- Look: **black and white only**, sans-serif (Atkinson Hyperlegible Next), large type. State is shown by fill/dashed border/strike-through, never colour.
- Lessons are **vocabulary sets of roughly 300 words**, not textbook grammar chapters; titles are just "Slovíčka N".
- **Do not mention the source** of Slovíčka 2/3 anywhere in the repo (README, comments, docs).
- Header: "správně x/y" and "série" explain themselves via tap tooltips; keep the streak tooltip short.
- Commit and push to `main` after each finished change; end commit messages with the Co-Authored-By line.
