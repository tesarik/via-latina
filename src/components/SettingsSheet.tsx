import { useEffect, useState } from "react";
import { LESSONS, WORDS } from "../lessons";
import { poolFor } from "../quiz/engine";
import { toggleLesson } from "../quiz/settings";
import { isKnown, type Progress } from "../quiz/progress";
import type { Settings } from "../quiz/types";

interface Props {
  settings: Settings;
  progress: Progress;
  onChange: (s: Settings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export default function SettingsSheet({ settings, progress, onChange, onResetProgress, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = settings.lessons;
  const all = selected.length === 0;
  const pool = poolFor(WORDS, selected);
  const count = pool.length;
  const known = pool.filter((w) => isKnown(progress, w)).length;
  const hasProgress = Object.keys(progress).length > 0;
  // Two taps to wipe progress: the first arms the button, the second confirms.
  const [confirmReset, setConfirmReset] = useState(false);

  const toggle = (id: string) => {
    const next = toggleLesson(selected, id, LESSONS.map((l) => l.id));
    if (next) onChange({ ...settings, lessons: next });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <h2 id="sheet-title">Nastavení</h2>

        <fieldset>
          <legend>Lekce</legend>
          <div className="lessons">
            {LESSONS.length > 1 && (
              <label className="lesson">
                <input type="checkbox" checked={all} onChange={() => !all && onChange({ ...settings, lessons: [] })} />
                <span>Všechny lekce</span>
              </label>
            )}
            {LESSONS.map((l) => (
              <label key={l.id} className="lesson">
                <input type="checkbox" checked={all || selected.includes(l.id)} onChange={() => toggle(l.id)} />
                <span>{l.title}</span>
                <small>
                  {l.words.filter((w) => isKnown(progress, w)).length} / {l.words.length}
                </small>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="note-line">
          Umíš {known} z {count} slovíček ve výběru (3× správně za sebou).{" "}
          {LESSONS.length > 1 ? "Změna výběru začne nové kolo." : "Zatím je k dispozici jen jedna lekce."}
        </p>
        {hasProgress && (
          <button
            type="button"
            className={`reset${confirmReset ? " armed" : ""}`}
            onClick={() => {
              if (!confirmReset) return setConfirmReset(true);
              setConfirmReset(false);
              onResetProgress();
            }}
          >
            {confirmReset ? "Opravdu vymazat celý postup?" : "Vymazat postup"}
          </button>
        )}
        <button type="button" className="done" onClick={onClose}>
          Hotovo
        </button>
      </div>
    </div>
  );
}
