# Via Latina

Klidný kvíz na latinská slovíčka, primárně pro mobil. Na obrazovce je vždy jedno slovíčko a čtyři významy. Po správné odpovědi se stránka sama posune na další slovíčko. Po chybě se ukáže správný význam a slovíčko se za pár kol vrátí.

## Vývoj

```bash
npm install
npm run dev        # vývojový server
npm test           # testy logiky kvízu (vitest)
npm run typecheck
npm run lint
npm run build      # statický build do dist/
```

Pro nasazení do podsložky (např. GitHub Pages) nastav `BASE_PATH=/via-latina/ npm run build`.

## Struktura

- `src/quiz/words.ts` – slovní zásoba (latinsky, gramatika, česky), rozdělená podle slovních druhů
- `src/quiz/engine.ts` – čistá logika: míchání, opakování chyb, výběr možností (bez Reactu, s testy)
- `src/quiz/session.ts` – stav jednoho kola a vyhodnocení odpovědi
- `src/quiz/settings.ts` – uložené nastavení (`localStorage`)
- `src/App.tsx` – scrollovací feed, automatický posun, klávesnice
- `src/components/` – karta slovíčka a spodní panel nastavení
