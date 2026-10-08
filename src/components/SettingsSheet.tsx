import { useEffect } from "react";
import { WORDS } from "../quiz/words";
import { poolFor } from "../quiz/engine";
import { CATEGORY_LABELS, DIRECTION_LABELS, type Category, type Direction, type Settings } from "../quiz/types";

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

  const count = poolFor(WORDS, settings.category).length;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <h2 id="sheet-title">Nastavení</h2>

        <fieldset>
          <legend>Slovíčka</legend>
          <div className="chips">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <label key={c} className="chip">
                <input
                  type="radio"
                  name="category"
                  checked={settings.category === c}
                  onChange={() => onChange({ ...settings, category: c })}
                />
                <span>{CATEGORY_LABELS[c]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Směr</legend>
          <div className="chips">
            {(Object.keys(DIRECTION_LABELS) as Direction[]).map((d) => (
              <label key={d} className="chip">
                <input
                  type="radio"
                  name="direction"
                  checked={settings.direction === d}
                  onChange={() => onChange({ ...settings, direction: d })}
                />
                <span>{DIRECTION_LABELS[d]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="note">
          {count} slovíček ve výběru. Změna nastavení začne nové kolo.
        </p>
        <button type="button" className="done" onClick={onClose}>
          Hotovo
        </button>
      </div>
    </div>
  );
}
