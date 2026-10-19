import { useEffect, useMemo, useState } from "react";
import { LESSONS, WORDS } from "../lessons";
import { poolFor } from "../quiz/engine";
import { isDue, isKnown, isMissed, isSeen, today, type Progress } from "../quiz/progress";
import type { Settings, Word } from "../quiz/types";

interface Props {
  settings: Settings;
  progress: Progress;
  onClose: () => void;
}

/** What the learner knows about a word, shown as a label on its row. */
type State = "new" | "seen" | "weak" | "known";
/** List filter: a state, or the words due for review today. */
type Filter = "all" | State | "due";

const STATE_LABEL: Record<State, string> = { new: "nové", seen: "prošel", weak: "chybné", known: "umím" };

const stateOf = (p: Progress, w: Word): State =>
  isKnown(p, w) ? "known" : isMissed(p, w) ? "weak" : isSeen(p, w) ? "seen" : "new";

/** Lowercase without accents or macrons, so "ama" finds "amō" and "zivot" finds "život". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Every word of a lesson (or the selection) with what the learner knows about it; searchable by Latin or Czech. */
export default function WordList({ settings, progress, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = settings.lessons;
  // "selection" = the ticked lessons, "all" = every lesson, otherwise one lesson id.
  const [lesson, setLesson] = useState(selected.length === 1 ? selected[0] : selected.length ? "selection" : "all");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const day = today();

  const words = useMemo(() => {
    const base = poolFor(WORDS, lesson === "selection" ? selected : lesson === "all" ? [] : [lesson]);
    const q = fold(query.trim());
    return base.filter((w) => {
      if (q && !fold(w.la).includes(q) && !fold(w.cz).includes(q)) return false;
      if (filter === "all") return true;
      if (filter === "due") return isDue(progress, w, day);
      return stateOf(progress, w) === filter;
    });
  }, [lesson, filter, query, progress, selected, day]);

  return (
    <section className="wordlist" role="dialog" aria-modal="true" aria-labelledby="wordlist-title">
      <div className="wordlist-head">
        <h2 id="wordlist-title">Slovíčka</h2>
        <button type="button" className="done wordlist-close" onClick={onClose}>
          Zavřít
        </button>
      </div>
      <div className="wordlist-filters">
        <input
          type="search"
          placeholder="Hledat latinsky nebo česky"
          aria-label="Hledat"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="wordlist-selects">
          <select aria-label="Lekce" value={lesson} onChange={(e) => setLesson(e.target.value)}>
            {selected.length > 1 && <option value="selection">Vybrané lekce</option>}
            <option value="all">Všechny lekce</option>
            {LESSONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <select aria-label="Stav" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">Vše</option>
            <option value="new">Nová</option>
            <option value="seen">Prošel</option>
            <option value="weak">Chybná</option>
            <option value="due">K zopakování dnes</option>
            <option value="known">Umím</option>
          </select>
        </div>
        <p className="wordlist-count">{words.length} slovíček</p>
      </div>
      <ul className="wordlist-items">
        {words.map((w) => {
          const st = stateOf(progress, w);
          return (
            <li key={`${w.lesson}:${w.pos}:${w.la}:${w.cz}`}>
              <details>
                <summary>
                  <span className="wl-main">
                    <b lang="la">{w.la}</b> <span className="wl-info">{w.info}</span>
                    <span className="wl-cz">{w.cz}</span>
                  </span>
                  <span className={`wl-status ${st}`}>{STATE_LABEL[st]}</span>
                </summary>
                {w.note && (
                  <div className="wl-note">
                    <p lang="la">
                      <i>{w.note.ex}</i>
                    </p>
                    <p>{w.note.tr}</p>
                    {w.note.remark && <p className="wl-remark">{w.note.remark}</p>}
                  </div>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
