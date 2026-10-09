# Via Latina

Klidný kvíz na latinská slovíčka, primárně pro mobil. Na obrazovce je vždy jedno slovíčko a čtyři významy. Po odpovědi se ukáže správný význam, příkladová věta a poznámka; na další slovíčko se přejde tlačítkem se šipkou dolů nebo posunutím, na předchozí šipkou nahoru. Chybně zodpovězené slovíčko se za pár kol vrátí. V nastavení se vybírá, ze kterých lekcí (sad slovíček) se procvičuje; klepnutím na skóre nebo sérii v záhlaví se ukáže, co znamenají.

Aplikace si v telefonu pamatuje postup u každého slovíčka: správná odpověď ho posune o úroveň výš, chyba zpět na začátek. Těžká slovíčka proto přicházejí v kole dřív, ta, která umíš (3× správně za sebou), později. V nastavení je u každé sady vidět „umím x / y“ a postup se dá vymazat. Hra se dá přidat na plochu a po první návštěvě funguje i offline.

## Vývoj

```bash
npm install
npm run dev        # vývojový server
npm test           # testy logiky kvízu (vitest)
npm run typecheck
npm run lint
npm run build      # statický build do dist/
```

## Nasazení

```bash
npm run build:web   # build pro podsložku /via-latina/ (BASE_PATH=/via-latina/)
```

Obsah složky `dist/` nahraj na web do `/via-latina/` (např. `jaroslavtesarik.cz/via-latina/`). Nic dalšího server nepotřebuje, jen musí soubory servírovat beze změny; `sw.js` musí ležet přímo ve `/via-latina/`. Web musí běžet přes HTTPS, jinak se service worker (offline, přidání na plochu) nezapne.

Každý build má vlastní verzi cache. Kdo má aplikaci otevřenou, uvidí po nasazení dole lištu „Je k dispozici nová verze“; po klepnutí na Aktualizovat se načte nová verze. Pro jinou podsložku nastav `BASE_PATH=/jina-cesta/ npm run build`.

## Slovní zásoba

- **Slovíčka 1** (`00-zakladni-slovicka.ts`) – běžná školní slovní zásoba, ke každému slovíčku latinská věta s překladem a poznámka.
- **Slovíčka 2 a 3** (`01-slovicka-2.ts`, `02-slovicka-3.ts`) – další základní slovní zásoba bez slov, která už jsou ve Slovíčkách 1. České významy jsou zkrácené; ke každému slovíčku věta s překladem.
- **Slovíčka 4** (`03-slovicka-4.ts`) – liturgická slova (mše, chorální zpěvy, litanie), která nejsou v sadách 1–3, seřazená od nejčastějších; ke každému slovíčku věta s překladem.
- **Slovíčka 5 a 6** (`04-slovicka-5.ts`, `05-slovicka-6.ts`) – slova z modliteb, hymnů, žalmů a katechismových výčtů, která nejsou v sadách 1–4. V sadě 5 jsou běžnější slova (např. *ipse, vel, nemo, mensa*), v sadě 6 vzácnější; ke každému slovíčku věta s překladem.

## Přidání lekce

Každá sada slovíček (v aplikaci „lekce“) je jeden soubor ve složce `src/lessons/`. Název souboru začíná číslem, které určuje pořadí v nastavení (`00-…`, `01-…`, `02-…`). Zbytek názvu je jen pro orientaci.

```ts
// src/lessons/03-slovicka-4.ts
import { lesson, n, v, a, o } from "./define";

export default lesson("Slovíčka 4", [
  n("aqua", "aquae f.", "voda", ["Aqua vitae est.", "Voda je život.", "Odtud akvárium."]),
  v("amo", "amāre, amāvī, amātum", "miluji"),
  a("bonus", "bona, bonum", "dobrý"),
  o("et", "spojka", "a"),
]);
```

- `n` podstatné jméno, `v` sloveso, `a` přídavné jméno, `o` ostatní (příslovce, spojky, předložky, zájmena, číslovky). Špatné možnosti se vybírají ze stejného slovního druhu.
- Parametry jsou: latinsky, gramatika (genitiv a rod, kmenové tvary…), česky. Slovesa česky v 1. osobě („miluji“), stejně jako v ostatních sadách.
- Poslední parametr je `[latinská věta, český překlad, poznámka]`, zobrazí se po odpovědi. Věta s překladem je povinná (hlídá ji test), poznámku můžeš vynechat.
- Stejné slovíčko může být ve více lekcích. Když se procvičuje víc lekcí najednou, zeptá se jen jednou.

Po přidání souboru spusť `npm test`. Test zkontroluje, že žádné pole není prázdné a že v lekci není slovíčko dvakrát.

## Struktura

- `src/lessons/` – lekce (jeden soubor = jedna lekce), `define.ts` pomocné funkce, `index.ts` je načte
- `src/quiz/engine.ts` – čistá logika: výběr slovíček z lekcí, míchání, opakování chyb, výběr možností (bez Reactu, s testy)
- `src/quiz/session.ts` – stav jednoho kola a vyhodnocení odpovědi
- `src/quiz/settings.ts` – uložený výběr lekcí (`localStorage`)
- `src/App.tsx` – scrollovací feed (drží posledních 20 karet), šipky nahoru/dolů, klávesnice
- `src/quiz/progress.ts` – postup u jednotlivých slovíček (`localStorage`) a váhy pro pořadí
- `src/useServiceWorkerUpdate.ts`, `public/sw.js` – offline a nabídka aktualizace
- `src/components/` – karta slovíčka, nastavení, vysvětlivky v záhlaví, lišta s aktualizací
