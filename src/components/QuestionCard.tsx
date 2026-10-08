import { forwardRef, useEffect, useRef } from "react";
import { isCorrect, type Question } from "../quiz/session";

interface Props {
  question: Question;
  number: number;
  onAnswer: (choice: number) => void;
  onNext: () => void;
  /** Back to the previous card; absent on the oldest card in the feed. */
  onPrev?: () => void;
}

const QuestionCard = forwardRef<HTMLElement, Props>(function QuestionCard(
  { question: q, number, onAnswer, onNext, onPrev },
  ref,
) {
  const answered = q.chosen !== null;
  const ok = answered && isCorrect(q);
  const nextRef = useRef<HTMLButtonElement>(null);
  const note = answered ? q.word.note : undefined;

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
    <section className="slide" ref={ref} data-id={q.id} aria-label={`Slovíčko ${number}`}>
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
        <div className={`count${q.again ? " again" : ""}`}>{q.again ? "znovu" : number}</div>
        <h2 className="word">{q.word.la}</h2>
        <div className="info">{q.word.info}</div>
        {note && (
          <div className="note">
            <p className="ex" lang="la">{note.ex}</p>
            <p className="tr">{note.tr}</p>
            {note.remark && <p className="remark">{note.remark}</p>}
          </div>
        )}
      </div>

      <div className="feedback" aria-live="polite">
        {answered &&
          (ok ? (
            <span className="verdict good">Recte!</span>
          ) : (
            <span className="verdict bad">
              <b>{q.word.la}</b>, {q.word.info} = <b>{q.word.cz}</b>
            </span>
          ))}
      </div>

      <div className="options">
        {q.options.map((o, i) => {
          let cls = "opt";
          if (answered) {
            if (o === q.word) cls += " right";
            else if (i === q.chosen) cls += " wrong";
            else cls += " dim";
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
