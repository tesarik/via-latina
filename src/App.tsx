import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { WORDS } from "./quiz/words";
import { answer, isCorrect, newSession, type Session } from "./quiz/session";
import { loadSettings, saveSettings } from "./quiz/settings";
import type { Settings } from "./quiz/types";
import QuestionCard from "./components/QuestionCard";
import SettingsSheet from "./components/SettingsSheet";
import StatTip from "./components/StatTip";

type Action = { type: "answer"; id: number; choice: number } | { type: "restart"; settings: Settings };

function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case "answer":
      return answer(s, a.id, a.choice, WORDS);
    case "restart":
      return newSession(a.settings, WORDS);
  }
}

/** Pause after a right answer before gliding to the next word. */
const ADVANCE_MS = 700;

export default function App() {
  const [session, dispatch] = useReducer(reducer, undefined, () => newSession(loadSettings(), WORDS));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tip, setTip] = useState<"score" | "streak" | null>(null);
  const closeTip = useCallback(() => setTip(null), []);
  const feedRef = useRef<HTMLElement>(null);
  const slides = useRef(new Map<number, HTMLElement>());

  const current = session.questions[session.questions.length - 1];
  const prev = session.questions.length > 1 ? session.questions[session.questions.length - 2] : null;

  const scrollTo = useCallback((id: number) => {
    slides.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // A right answer glides on by itself; a wrong one waits for "Další".
  useEffect(() => {
    if (!prev || !isCorrect(prev)) return;
    const t = window.setTimeout(() => scrollTo(current.id), ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [prev, current.id, scrollTo]);

  const isCurrentInView = () => {
    const feed = feedRef.current;
    const el = slides.current.get(current.id);
    return !!feed && !!el && Math.abs(el.offsetTop - feed.scrollTop) < 8;
  };

  // Keyboard for desktop: 1–4 answer, Enter / ↓ moves to the open word.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= current.options.length) {
        if (isCurrentInView()) dispatch({ type: "answer", id: current.id, choice: n - 1 });
        else scrollTo(current.id);
        e.preventDefault();
      } else if ((e.key === "Enter" || e.key === "ArrowDown") && !isCurrentInView()) {
        scrollTo(current.id);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const changeSettings = (s: Settings) => {
    saveSettings(s);
    dispatch({ type: "restart", settings: s });
    feedRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Via Latina</span>
        <span className="stats" aria-live="polite">
          <StatTip
            open={tip === "score"}
            onToggle={() => setTip(tip === "score" ? null : "score")}
            onClose={closeTip}
            tip={`Správně ${session.right} z ${session.total} zodpovězených slovíček.`}
          >
            <b>{session.right}</b>/{session.total}
          </StatTip>
          <StatTip
            open={tip === "streak"}
            onToggle={() => setTip(tip === "streak" ? null : "streak")}
            onClose={closeTip}
            tip="Správné odpovědi v řadě bez chyby."
          >
            série <b>{session.streak}</b>
          </StatTip>
        </span>
        <button type="button" className="icon-btn" aria-label="Nastavení" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="7" r="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="8" cy="17" r="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>
      </header>

      <main className="feed" ref={feedRef}>
        {session.questions.map((q, i) => (
          <QuestionCard
            key={`${session.settings.category}-${q.id}`}
            ref={(el) => {
              if (el) slides.current.set(q.id, el);
              else slides.current.delete(q.id);
            }}
            question={q}
            number={i + 1}
            onAnswer={(choice) => dispatch({ type: "answer", id: q.id, choice })}
            onNext={() => scrollTo(current.id)}
          />
        ))}
      </main>

      {settingsOpen && (
        <SettingsSheet settings={session.settings} onChange={changeSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
