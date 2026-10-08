# Via Latina

Klidný kvíz na latinská slovíčka, primárně pro mobil. Na obrazovce je vždy jedno slovíčko a čtyři významy. Po odpovědi se ukáže správný význam, příkladová věta a poznámka; na další slovíčko se přejde tlačítkem se šipkou dolů nebo posunutím. Chybně zodpovězené slovíčko se za pár kol vrátí.

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

## Přidání lekce

Každá lekce je jeden soubor ve složce `src/lessons/`. Název souboru začíná číslem, které určuje pořadí v nastavení (`00-…`, `01-…`, `02-…`). Zbytek názvu je jen pro orientaci.

```ts
// src/lessons/01-prvni-deklinace.ts
import { lesson, n, v, a, o } from "./define";

export default lesson("Lekce 1 – První deklinace", [
  n("aqua", "aquae f.", "voda", ["Aqua vitae est.", "Voda je život.", "Odtud akvárium."]),
  v("amo", "amāre, amāvī, amātum", "milovat"),
  a("bonus", "bona, bonum", "dobrý"),
  o("et", "spojka", "a"),
]);
```

- `n` podstatné jméno, `v` sloveso, `a` přídavné jméno, `o` ostatní (příslovce, spojky, předložky, zájmena, číslovky). Špatné možnosti se vybírají ze stejného slovního druhu.
- Parametry jsou: latinsky, gramatika (genitiv a rod, kmenové tvary…), česky.
- Poslední parametr je nepovinný: `[latinská věta, český překlad, poznámka]`. Zobrazí se po odpovědi. Poznámku můžeš vynechat.
- Stejné slovíčko může být ve více lekcích. Když se procvičuje víc lekcí najednou, zeptá se jen jednou.

Po přidání souboru spusť `npm test`. Test zkontroluje, že žádné pole není prázdné a že v lekci není slovíčko dvakrát.

## Struktura

- `src/lessons/` – lekce (jeden soubor = jedna lekce), `define.ts` pomocné funkce, `index.ts` je načte
- `src/quiz/engine.ts` – čistá logika: výběr slovíček z lekcí, míchání, opakování chyb, výběr možností (bez Reactu, s testy)
- `src/quiz/session.ts` – stav jednoho kola a vyhodnocení odpovědi
- `src/quiz/settings.ts` – uložený výběr lekcí (`localStorage`)
- `src/App.tsx` – scrollovací feed, automatický posun, klávesnice
- `src/components/` – karta slovíčka, nastavení, vysvětlivky v záhlaví
