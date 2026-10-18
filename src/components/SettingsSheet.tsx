import { useEffect, useRef, useState } from "react";
import { LESSONS, WORDS } from "../lessons";
import { poolFor } from "../quiz/engine";
import { lessonsFor, toggleLesson } from "../quiz/settings";
import { exportProgress, importProgress, isKnown, type Progress } from "../quiz/progress";
import type { Settings } from "../quiz/types";

interface Props {
  settings: Settings;
  progress: Progress;
  onChange: (s: Settings) => void;
  onResetProgress: () => void;
  onRestoreProgress: (p: Progress) => void;
  onClose: () => void;
}

export default function SettingsSheet({ settings, progress, onChange, onResetProgress, onRestoreProgress, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allIds = LESSONS.map((l) => l.id);
  const selected = settings.lessons;
  // What is ticked in the sheet. It may be empty for a moment (untick all, then pick one);
  // the round only changes while at least one lesson is ticked.
  const [picked, setPicked] = useState<string[]>(selected.length ? selected : allIds);
  const all = picked.length === allIds.length;
  const pool = poolFor(WORDS, selected);
  const count = pool.length;
  const known = pool.filter((w) => isKnown(progress, w)).length;
  const hasProgress = Object.keys(progress).length > 0;
  // Two taps to wipe progress: the first arms the button, the second confirms.
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveBackup = async () => {
    const name = `via-latina-postup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([exportProgress(progress)], name, { type: "application/json" });
    // On phones the share sheet lets the file go to Files, Drive or a message; elsewhere it downloads.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Via Latina – záloha postupu" });
        setBackupMsg("Záloha uložena.");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setBackupMsg("Zálohu se nepodařilo uložit.");
      }
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMsg("Záloha stažena.");
  };

  const restoreBackup = async (file: File | undefined) => {
    if (!file) return;
    const restored = importProgress(await file.text());
    if (!restored) return setBackupMsg("Tento soubor není záloha Via Latina.");
    onRestoreProgress(restored);
    setBackupMsg(`Obnoveno: postup u ${Object.keys(restored).length} slovíček.`);
  };

  const pick = (next: string[]) => {
    setPicked(next);
    const lessons = lessonsFor(next, allIds);
    if (lessons) onChange({ ...settings, lessons });
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
                <input type="checkbox" checked={all} onChange={() => pick(all ? [] : allIds)} />
                <span>Všechny lekce</span>
              </label>
            )}
            {LESSONS.map((l) => (
              <label key={l.id} className="lesson">
                <input type="checkbox" checked={picked.includes(l.id)} onChange={() => pick(toggleLesson(picked, l.id, allIds))} />
                <span>
                  {l.title}
                  <small className="lesson-desc">{l.description}</small>
                </span>
                <small>
                  {l.words.filter((w) => isKnown(progress, w)).length} / {l.words.length}
                </small>
              </label>
            ))}
          </div>
        </fieldset>

        {picked.length === 0 && (
          <p className="note-line" role="status">
            <b>Vyber aspoň jednu lekci.</b>
          </p>
        )}
        <p className="note-line">
          Umíš {known} z {count} slovíček ve výběru (3× správně za sebou).{" "}
          {LESSONS.length > 1 ? "Změna výběru začne nové kolo." : "Zatím je k dispozici jen jedna lekce."}
        </p>
        <div className="backup">
          {hasProgress && (
            <button type="button" className="reset" onClick={saveBackup}>
              Uložit zálohu
            </button>
          )}
          <button type="button" className="reset" onClick={() => fileRef.current?.click()}>
            Obnovit ze zálohy
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void restoreBackup(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {backupMsg && (
          <p className="note-line" role="status">
            {backupMsg}
          </p>
        )}
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
