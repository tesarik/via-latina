import { exportProgress, today, type Progress } from "./quiz/progress";

const KEY = "vialatina_backup";
/** After this many days without a backup the start screen suggests one. */
export const BACKUP_REMIND_DAYS = 7;

/** Day (see `today`) of the last saved backup, or null if there has been none. */
export function lastBackupDay(): number | null {
  try {
    const d = Number(localStorage.getItem(KEY));
    return d > 0 ? d : null;
  } catch {
    return null;
  }
}

/**
 * Saves the progress as a file: the share sheet on phones (Files, Drive, a message),
 * a download elsewhere. Returns a message for the learner, or null when they cancelled.
 */
export async function saveBackup(progress: Progress): Promise<string | null> {
  const name = `via-latina-postup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([exportProgress(progress)], name, { type: "application/json" });
  let msg: string;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Via Latina – záloha postupu" });
      msg = "Záloha uložena.";
    } catch (e) {
      return (e as Error).name === "AbortError" ? null : "Zálohu se nepodařilo uložit.";
    }
  } else {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    msg = "Záloha stažena.";
  }
  try {
    localStorage.setItem(KEY, String(today()));
  } catch {}
  return msg;
}
