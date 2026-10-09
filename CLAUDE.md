# via-latina

Mobile-first vocabulary quiz for Latin. One Latin word per screen with four Czech meanings; after answering, the card shows the right meaning, the grammar info and (if present) an example sentence with translation and a remark. UI copy is Czech.

## Stack

- React 18 + Vite 6, TypeScript strict, ESLint flat config, Vitest for pure logic. Same setup as the sibling `latin-rosary` project (its `package-lock.json` was reused because a fresh `npm install` hit an npm arborist bug).
- Plain CSS in `src/index.css` with tokens on `:root` (`--bg`, `--fg`, `--font`); dark mode via `prefers-color-scheme` swaps black/white.
- Static site; `BASE_PATH` env var sets the Vite base. The user deploys the output of `npm run build:web` (base `/via-latina/`) to jaroslavtesarik.cz/via-latina/ on their own.
- PWA like `latin-rosary`: `public/manifest.webmanifest`, `public/icon.svg`, `public/sw.js` (cache name stamped per build by the `swVersion()` plugin in `vite.config.ts`; network-first for pages, cache-first for assets, lookups use `ignoreVary` because module scripts carry an Origin header). New builds wait for the user: `src/useServiceWorkerUpdate.ts` (copied from latin-rosary, plus it posts `CACHE_URLS` with everything the first visit loaded so the app is offline right away) + `src/components/UpdateToast.tsx`. The font is bundled via `@fontsource/atkinson-hyperlegible-next` (no Google Fonts) so it works offline.
- Repo: github.com/tesarik/via-latina (public), branch `main`.

## Commands

`npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run build:web` (for the website) · `npx vite preview --base /via-latina/` to try the production build incl. offline. Run typecheck, lint and test before committing.

## File map

- `src/lessons/` — vocabulary. Every file whose name starts with a digit is a lesson; `index.ts` loads them with `import.meta.glob` and the file name (without `.ts`) is the lesson id and sort order. `define.ts` has the `n`/`v`/`a`/`o` helpers (noun, verb, adjective, other) and `lesson(title, entries)`; an optional 4th argument `[ex, tr, remark?]` is the example shown after answering.
  - `00-zakladni-slovicka.ts` "Slovíčka 1" (311 words, all with examples and remarks).
  - `01-slovicka-2.ts`, `02-slovicka-3.ts` "Slovíčka 2/3" (~350 each, with examples and remarks). Transcribed from OCR, so grammar info (vowel lengths, principal parts) may contain errors; fix them when the user reports any.
  - `03-slovicka-4.ts` "Slovíčka 4" (274 liturgical words not in sets 1–3, most frequent first, with examples). Lemmatised from Latin text, same caveat about possible grammar errors.
  - `04-slovicka-5.ts` "Slovíčka 5" (300) and `05-slovicka-6.ts` "Slovíčka 6" (108): words from prayers, hymns, psalms and catechism lists not in sets 1–4; set 5 has the more common ones, set 6 the rarer. Lemmatised and written by AI (incl. examples), same caveat.
- `src/quiz/engine.ts` — pure logic: `poolFor` (words of selected lessons, deduped by la+cz), `drawNext` (shuffled passes, missed words return after `RETRY_GAP`), `pickOptions` (distractors of the same word class, preferring the selected lessons, never two options with the same Latin or Czech).
- `src/quiz/progress.ts` — per-word Leitner box across visits (`vialatina_progress` in `localStorage`, key `pos:la:cz`); right answer +1 box (max 4), wrong → 0; known = box ≥ 3. `weightOf` feeds `drawNext`, which orders each pass with `weightedOrder` so missed words come early and known ones late (every word is still asked once per pass).
- `src/quiz/session.ts` — round state (incl. `progress`) and `answer()`; keeps at most `HISTORY_LIMIT` (20) cards, ids keep counting and double as the word number.
- `src/quiz/settings.ts` — selected lesson ids in `localStorage` (`vialatina_settings`; empty = all) and `toggleLesson` (last lesson can't be unticked; ticking all collapses to "all").
- `src/quiz/types.ts` — `Word`, `Lesson`, `Note`, `Settings`.
- `src/App.tsx` — the snap-scrolling feed. Remembers which card is on screen and restores it when old cards are dropped (`overflow-anchor: none`, feed is `position: relative` so `offsetTop` is feed-relative). Keyboard: 1–4 answer the open card if it is on screen, Enter/↓ go to it.
- `src/components/QuestionCard.tsx` (card, ↑ previous / ↓ next buttons), `SettingsSheet.tsx` (bottom sheet with lesson checkboxes), `StatTip.tsx` (tap-to-explain bubble for the header figures).
- `src/quiz/engine.test.ts` — all tests, including lesson-data checks (no empty fields, no duplicate pos+headword within a lesson).

## Decisions from the user (keep them)

- Calm pace: **no automatic advance**; after every answer the learner moves on with the ↓ button or by swiping. ↑ goes back with the same smooth scroll.
- Czech meanings of **verbs are in the 1st person sg. in every set** ("miluji", "přijímám"), never the infinitive, so the form never gives the answer away.
- Direction is **Latin → Czech only** (Czech → Latin was removed on request).
- Look: **black and white only**, sans-serif (Atkinson Hyperlegible Next), large type. State is shown by fill/dashed border/strike-through, never colour.
- Lessons are **vocabulary sets of roughly 300 words**, not textbook grammar chapters; titles are just "Slovíčka N".
- **Do not mention the source** of Slovíčka 2/3 anywhere in the repo (README, comments, docs).
- Header: "správně x/y" and "série" explain themselves via tap tooltips; keep the streak tooltip short.
- Commit and push to `main` after each finished change; end commit messages with the Co-Authored-By line.
