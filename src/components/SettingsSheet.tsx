import { useEffect } from "react";
import { LESSONS, WORDS } from "../lessons";
import { poolFor } from "../quiz/engine";
import type { Settings } from "../quiz/types";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

export default function SettingsSheet({ settings, onChange, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = settings.lessons;
  const all = selected.length === 0;
  const count = poolFor(WORDS, selected).length;

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((l) => l !== id) : [...selected, id];
    // Keep lesson order stable; selecting every lesson is the same as "all".
    const ordered = LESSONS.map((l) => l.id).filter((l) => next.includes(l));
    onChange({ ...settings, lessons: ordered.length === LESSONS.length ? [] : ordered });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <h2 id="sheet-title">Nastavení</h2>

        <fieldset>
          <legend>Lekce</legend>
          <div className="lessons">
            <label className="lesson">
              <input type="checkbox" checked={all} onChange={() => !all && onChange({ ...settings, lessons: [] })} />
              <span>Všechny lekce</span>
            </label>
            {LESSONS.map((l) => (
              <label key={l.id} className="lesson">
                <input type="checkbox" checked={!all && selected.includes(l.id)} onChange={() => toggle(l.id)} />
                <span>{l.title}</span>
                <small>{l.words.length}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="note-line">
          {count} slovíček ve výběru. Změna nastavení začne nové kolo.
        </p>
        <button type="button" className="done" onClick={onClose}>
          Hotovo
        </button>
      </div>
    </div>
  );
}
