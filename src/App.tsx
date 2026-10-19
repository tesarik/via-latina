import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { LESSONS, WORDS } from "./lessons";
import { answer, loadRound, newSession, restoreSession, storeRound, type Focus, type Session } from "./quiz/session";
import { loadSettings, saveSettings } from "./quiz/settings";
import { loadProgress, saveProgress, totals, type Progress } from "./quiz/progress";
import { useServiceWorkerUpdate } from "./useServiceWorkerUpdate";
import UpdateToast from "./components/UpdateToast";
import type { Settings } from "./quiz/types";
import QuestionCard from "./components/QuestionCard";
import SettingsSheet from "./components/SettingsSheet";
import StatTip from "./components/StatTip";
import StartScreen from "./components/StartScreen";
import WordList from "./components/WordList";
import { useLatinVoice } from "./speech";

type Action =
  | { type: "answer"; id: number; choice: number }
  | { type: "restart"; settings: Settings; focus?: Focus }
  | { type: "resetProgress" }
  | { type: "setProgress"; progress: Progress };

function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case "answer":
      return answer(s, a.id, a.choice, WORDS);
    case "restart":
      return newSession(a.settings, WORDS, s.progress, Math.random, a.focus);
    case "resetProgress":
      return newSession(s.settings, WORDS, {});
    case "setProgress":
      return newSession(s.settings, WORDS, a.progress);
  }
}

/** Picks up the round where the last visit left it, or starts a new one. */
function initialSession(): Session {
  const settings = loadSettings(LESSONS.map((l) => l.id));
  const progress = loadProgress();
  const saved = loadRound();
  return (saved && restoreSession(saved, settings, WORDS, progress)) ?? newSession(settings, WORDS, progress);
}

const MODE_LABEL: Record<Exclude<Focus, "all">, string> = { weak: "chybná", due: "dnešní" };

export default function App() {
  const [session, dispatch] = useReducer(reducer, undefined, initialSession);
  const { updateReady, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();
  const voice = useLatinVoice();

  useEffect(() => saveProgress(session.progress), [session.progress]);
  useEffect(() => storeRound(session), [session]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wordListOpen, setWordListOpen] = useState(false);
  // Every launch opens on the start screen; the feed stays mounted underneath so it keeps its place.
  const [onStart, setOnStart] = useState(true);
  const [tip, setTip] = useState<"score" | "streak" | null>(null);
  const closeTip = useCallback(() => setTip(null), []);
  const feedRef = useRef<HTMLElement>(null);
  const slides = useRef(new Map<number, HTMLElement>());

  const allTime = totals(session.progress);
  const current = session.questions[session.questions.length - 1];

  // Which card is on screen, kept up to date while scrolling.
  const visibleId = useRef<number | null>(null);
  const onScroll = () => {
    const feed = feedRef.current;
    if (!feed || !feed.clientHeight) return;
    const el = feed.children[Math.round(feed.scrollTop / feed.clientHeight)] as HTMLElement | undefined;
    visibleId.current = el ? Number(el.dataset.id) : null;
  };

  // When old cards are dropped from the top, put the card that was on screen
  // back in place. Setting the position (rather than shifting it) is right
  // whether or not the browser already re-snapped to that card by itself.
  const firstId = session.questions[0].id;
  const prevFirstId = useRef(firstId);
  useLayoutEffect(() => {
    const dropped = firstId > prevFirstId.current;
    prevFirstId.current = firstId;
    const feed = feedRef.current;
    if (!dropped || !feed) return;
    const el = visibleId.current !== null ? slides.current.get(visibleId.current) : undefined;
    feed.scrollTop = el ? el.offsetTop : 0;
  }, [firstId]);

  const scrollTo = useCallback((id: number) => {
    slides.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);


  const isCurrentInView = () => {
    const feed = feedRef.current;
    const el = slides.current.get(current.id);
    return !!feed && !!el && Math.abs(el.offsetTop - feed.scrollTop) < 8;
  };

  // Keyboard for desktop: 1–4 answer, Enter / ↓ moves to the open word.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen || wordListOpen || onStart) return;
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

  const startRound = (focus: Focus) => {
    if (focus !== session.focus || focus !== "all") {
      dispatch({ type: "restart", settings: session.settings, focus });
      feedRef.current?.scrollTo({ top: 0 });
    }
    setOnStart(false);
  };

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" aria-label="Úvodní obrazovka" onClick={() => setOnStart(true)}>
          Via Latina
        </button>
        {session.focus !== "all" && <span className="mode">{MODE_LABEL[session.focus]}</span>}
        <span className="stats" aria-live="polite">
          <StatTip
            open={tip === "score"}
            onToggle={() => setTip(tip === "score" ? null : "score")}
            onClose={closeTip}
            tip={`Správně ${allTime.right} z ${allTime.total} odpovědí celkem, od začátku a ve všech lekcích.`}
          >
            <b>{allTime.right}</b>/{allTime.total}
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

      <main className="feed" ref={feedRef} onScroll={onScroll}>
        {session.questions.map((q, i) => (
          <QuestionCard
            key={`${session.settings.lessons.join(",")}-${q.id}`}
            ref={(el) => {
              if (el) slides.current.set(q.id, el);
              else slides.current.delete(q.id);
            }}
            question={q}
            voice={voice}
            onAnswer={(choice) => dispatch({ type: "answer", id: q.id, choice })}
            onNext={() => scrollTo(current.id)}
            onPrev={i > 0 ? () => scrollTo(session.questions[i - 1].id) : undefined}
          />
        ))}
      </main>

      {onStart && (
        <StartScreen
          settings={session.settings}
          progress={session.progress}
          answeredNow={session.total}
          place={session.focus === "all" ? current : null}
          onContinue={() => startRound("all")}
          onWeak={() => startRound("weak")}
          onDue={() => startRound("due")}
          onLessons={() => setSettingsOpen(true)}
          onWordList={() => setWordListOpen(true)}
        />
      )}
      {settingsOpen && (
        <SettingsSheet
          settings={session.settings}
          progress={session.progress}
          onChange={changeSettings}
          onResetProgress={() => {
            dispatch({ type: "resetProgress" });
            feedRef.current?.scrollTo({ top: 0 });
          }}
          onRestoreProgress={(progress) => {
            dispatch({ type: "setProgress", progress });
            feedRef.current?.scrollTo({ top: 0 });
          }}
          onWordList={() => {
            setSettingsOpen(false);
            setWordListOpen(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {wordListOpen && <WordList settings={session.settings} progress={session.progress} onClose={() => setWordListOpen(false)} />}
      {updateReady && <UpdateToast onUpdate={applyUpdate} onDismiss={dismissUpdate} />}
    </div>
  );
}
