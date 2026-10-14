import { LESSONS, WORDS } from "../lessons";
import { poolFor } from "../quiz/engine";
import { isKnown, isWeak, type Progress } from "../quiz/progress";
import type { Settings } from "../quiz/types";

interface Props {
  settings: Settings;
  progress: Progress;
  /** Answers given since the app was opened; "Pokračovat" then returns to the same card. */
  answeredNow: number;
  onContinue: () => void;
  onWeak: () => void;
  onLessons: () => void;
}

export default function StartScreen({ settings, progress, answeredNow, onContinue, onWeak, onLessons }: Props) {
  const pool = poolFor(WORDS, settings.lessons);
  const known = pool.filter((w) => isKnown(progress, w)).length;
  const weak = pool.filter((w) => isWeak(progress, w)).length;
  const fresh = Object.keys(progress).length === 0 && answeredNow === 0;
  const selection = settings.lessons.length
    ? LESSONS.filter((l) => settings.lessons.includes(l.id))
        .map((l) => l.title)
        .join(", ")
    : "všechny lekce";
  const share = pool.length ? known / pool.length : 0;

  return (
    <section className="start" aria-labelledby="start-title">
      <div className="start-head">
        <h1 id="start-title">Via Latina</h1>
        <p className="start-sub">Latinská slovíčka, jedno po druhém.</p>
      </div>

      <div className="start-progress">
        <p>
          Umíš <b>{known}</b> z {pool.length} slovíček
        </p>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={pool.length} aria-valuenow={known} aria-label="Naučená slovíčka">
          <div style={{ width: `${Math.round(share * 1000) / 10}%` }} />
        </div>
        <p className="start-sel">Procvičuješ: {selection}</p>
      </div>

      <div className="start-actions">
        <button type="button" className="done" onClick={onContinue} autoFocus>
          {fresh ? "Začít" : "Pokračovat"}
        </button>
        {weak > 0 && (
          <button type="button" className="reset" onClick={onWeak}>
            Opakovat chybná slovíčka ({weak})
          </button>
        )}
        <button type="button" className="reset" onClick={onLessons}>
          Vybrat lekce
        </button>
      </div>
    </section>
  );
}
