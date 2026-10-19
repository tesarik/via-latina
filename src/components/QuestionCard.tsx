import { forwardRef, useEffect, useRef, useState } from "react";
import { isCorrect, type Question } from "../quiz/session";
import { QUESTION } from "../quiz/grammar";
import { reportWord } from "../report";

interface Props {
  question: Question;
  onAnswer: (choice: number) => void;
  onNext: () => void;
  /** Back to the previous card; absent on the oldest card in the feed. */
  onPrev?: () => void;
}

const QuestionCard = forwardRef<HTMLElement, Props>(function QuestionCard(
  { question: q, onAnswer, onNext, onPrev },
  ref,
) {
  const answered = q.chosen !== null;
  const ok = answered && isCorrect(q);
  const nextRef = useRef<HTMLButtonElement>(null);
  const note = answered ? q.word.note : undefined;
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  // The learner moves on when ready, so there's time to read the example.
  useEffect(() => {
    if (!answered) return;
    if (!ok) {
      try {
        navigator.vibrate?.(40);
      } catch {}
    }
    nextRef.current?.focus({ preventScroll: true });
  }, [answered, ok]);

  return (
    <section className={`slide${note ? " has-note" : ""}`} ref={ref} data-id={q.id} aria-label={`Slovíčko ${q.n} z ${q.of}`}>
      <div className="prev-row">
        {onPrev && (
          <button type="button" className="prev" aria-label="Předchozí slovíčko" onClick={onPrev}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M12 20V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        )}
      </div>
      <div className="prompt">
        <div className={`count${q.again ? " again" : ""}`}>
          {q.again ? (
            "znovu"
          ) : (
            <>
              {q.pass > 1 && `kolo ${q.pass} · `}
              {q.n} / {q.of}
            </>
          )}
        </div>
        <h2 className="word">{q.word.la}</h2>
        {q.grammar ? (
          <>
            {/* The grammar note would give the answer away, so it shows only once answered. */}
            {answered ? <div className="info">{q.word.info}</div> : <div className="info">{q.word.cz}</div>}
            {!answered && <p className="grammar-ask">{QUESTION[q.grammar.kind]}</p>}
          </>
        ) : (
          <div className="info">{q.word.info}</div>
        )}
        {note && (
          <div className="note">
            <p className="ex" lang="la">{note.ex}</p>
            <p className="tr">{note.tr}</p>
            {note.remark && <p className="remark">{note.remark}</p>}
            {/* Inside the scrolling prompt, so it never takes room from the example. */}
            <p className="report">
              <button type="button" onClick={async () => setReportMsg(await reportWord(q.word))}>
                Nahlásit chybu
              </button>
              {reportMsg && <span role="status"> {reportMsg}</span>}
            </p>
          </div>
        )}
      </div>

      <div className="feedback" aria-live="polite">
        {answered &&
          (ok ? (
            <span className="verdict good">Recte!</span>
          ) : (
            <span className="verdict bad">
              <b>{q.word.la}</b> = <b>{q.grammar ? q.grammar.choices[q.grammar.answer] : q.word.cz}</b>
            </span>
          ))}
      </div>

      <div className="options">
        {q.grammar?.choices.map((c, i) => {
          let cls = "opt";
          if (answered) {
            if (i === q.grammar!.answer) cls += " right";
            else if (i === q.chosen) cls += " wrong";
            else return null;
          }
          return (
            <button key={c} type="button" className={cls} disabled={answered} onClick={() => onAnswer(i)}>
              <span className="key" aria-hidden="true">{i + 1}</span>
              <span>{c}</span>
            </button>
          );
        })}
        {q.options.map((o, i) => {
          let cls = "opt";
          if (answered) {
            // Only the right option and a wrong pick stay, so the example has room.
            if (o === q.word) cls += " right";
            else if (i === q.chosen) cls += " wrong";
            else return null;
          }
          return (
            <button key={o.la + o.cz} type="button" className={cls} disabled={answered} onClick={() => onAnswer(i)}>
              <span className="key" aria-hidden="true">{i + 1}</span>
              <span>{o.cz}</span>
            </button>
          );
        })}
        {answered && (
          <button ref={nextRef} type="button" className="next" aria-label="Další slovíčko" onClick={onNext}>
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M12 4v15M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
});

export default QuestionCard;
