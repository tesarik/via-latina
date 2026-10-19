import { useState } from "react";
import { LESSONS, WORDS } from "../lessons";
import { poolFor } from "../quiz/engine";
import { isDue, isKnown, isSeen, isWeak, today, type Progress } from "../quiz/progress";
import type { Question } from "../quiz/session";
import type { Settings } from "../quiz/types";
import { grammarQuestions } from "../quiz/grammar";
import { BACKUP_REMIND_DAYS, lastBackupDay, saveBackup } from "../backup";

interface Props {
  settings: Settings;
  progress: Progress;
  /** Answers given since the app was opened; "Pokračovat" then returns to the same card. */
  answeredNow: number;
  /** The open card of the round "Pokračovat" goes back to, for "kolo 2, slovíčko 145 z 311"; null if it starts a new one. */
  place: Question | null;
  onContinue: () => void;
  onWeak: () => void;
  onDue: () => void;
  onGrammar: () => void;
  onLessons: () => void;
  onWordList: () => void;
}

export default function StartScreen({ settings, progress, answeredNow, place, onContinue, onWeak, onDue, onGrammar, onLessons, onWordList }: Props) {
  const day = today();
  const pool = poolFor(WORDS, settings.lessons);
  const known = pool.filter((w) => isKnown(progress, w)).length;
  const seen = pool.filter((w) => isSeen(progress, w)).length;
  const weak = pool.filter((w) => isWeak(progress, w, day)).length;
  const due = pool.filter((w) => isDue(progress, w, day)).length;
  const grammar = pool.some((w) => grammarQuestions(w).length > 0);
  const hasProgress = Object.keys(progress).length > 0;
  const fresh = !hasProgress && answeredNow === 0;
  const selection = settings.lessons.length
    ? LESSONS.filter((l) => settings.lessons.includes(l.id))
        .map((l) => l.title)
        .join(", ")
    : "všechny lekce";
  const pct = (n: number) => `${pool.length ? Math.round((n / pool.length) * 1000) / 10 : 0}%`;

  // Safari on iPhone may wipe the site's data after a week away, so remind about a backup.
  const [backupDay, setBackupDay] = useState(lastBackupDay);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const backupAge = backupDay === null ? null : day - backupDay;
  const remindBackup = hasProgress && (backupAge === null || backupAge >= BACKUP_REMIND_DAYS);
  const backup = async () => {
    const msg = await saveBackup(progress);
    if (msg) setBackupMsg(msg);
    setBackupDay(lastBackupDay());
  };

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
        <p className="start-small">
          Prošel jsi <b>{seen}</b> z {pool.length}
        </p>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={pool.length} aria-valuenow={known} aria-label="Naučená slovíčka">
          <div className="bar-seen" style={{ width: pct(seen) }} />
          <div className="bar-known" style={{ width: pct(known) }} />
        </div>
        <p className="start-small">Procvičuješ: {selection}</p>
        {!fresh && place && (place.pass > 1 || place.n > 1) && (
          <p className="start-small">
            Jsi v {place.pass}. kole, u slovíčka {place.n} z {place.of}.
          </p>
        )}
        {hasProgress && (
          <p className="start-small">
            Dnes k zopakování: <b>{due}</b>
          </p>
        )}
      </div>

      {(remindBackup || backupMsg) && (
        <div className="start-backup">
          <p>
            {backupMsg ??
              (backupAge === null ? "Postup ještě nemáš zálohovaný." : `Poslední záloha postupu je ${backupAge} dní stará.`)}
          </p>
          {remindBackup && (
            <button type="button" className="reset" onClick={backup}>
              Uložit zálohu
            </button>
          )}
        </div>
      )}

      <div className="start-actions">
        <button type="button" className="done" onClick={onContinue} autoFocus>
          {fresh ? "Začít" : "Pokračovat"}
        </button>
        {due > 0 && (
          <button type="button" className="reset" onClick={onDue}>
            Zopakovat dnešní ({due})
          </button>
        )}
        {weak > 0 && (
          <button type="button" className="reset" onClick={onWeak}>
            Opakovat chybná slovíčka ({weak})
          </button>
        )}
        {grammar && (
          <button type="button" className="reset" onClick={onGrammar}>
            Gramatika: rod, 2. pád, konjugace
          </button>
        )}
        <div className="backup">
          <button type="button" className="reset" onClick={onLessons}>
            Vybrat lekce
          </button>
          <button type="button" className="reset" onClick={onWordList}>
            Seznam slovíček
          </button>
        </div>
      </div>
    </section>
  );
}
