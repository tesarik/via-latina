import { forwardRef, useEffect, useRef } from "react";
import { isCorrect, type Question } from "../quiz/session";
import type { Direction } from "../quiz/types";

interface Props {
  question: Question;
  number: number;
  direction: Direction;
  onAnswer: (choice: number) => void;
  onNext: () => void;
}

const QuestionCard = forwardRef<HTMLElement, Props>(function QuestionCard(
  { question: q, number, direction, onAnswer, onNext },
  ref,
) {
  const la = direction === "la";
  const answered = q.chosen !== null;
  const ok = answered && isCorrect(q);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (answered && !ok) {
      try {
        navigator.vibrate?.(40);
      } catch {}
      nextRef.current?.focus({ preventScroll: true });
    }
  }, [answered, ok]);

  return (
    <section className="slide" ref={ref} aria-label={`Slovíčko ${number}`}>
      <div className="prompt">
        <div className={`count${q.again ? " again" : ""}`}>{q.again ? "znovu" : `slovíčko ${number}`}</div>
        <h2 className="word">{la ? q.word.la : q.word.cz}</h2>
        <div className="info">{la ? q.word.info : "přelož do latiny"}</div>
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
          if (!la) cls += " la";
          if (answered) {
            if (o === q.word) cls += " right";
            else if (i === q.chosen) cls += " wrong";
            else cls += " dim";
          }
          return (
            <button key={o.la + o.cz} type="button" className={cls} disabled={answered} onClick={() => onAnswer(i)}>
              <span className="key" aria-hidden="true">{i + 1}</span>
              <span>{la ? o.cz : o.la}</span>
            </button>
          );
        })}
        {answered && !ok && (
          <button ref={nextRef} type="button" className="next" onClick={onNext}>
            Další slovíčko
          </button>
        )}
      </div>
    </section>
  );
});

export default QuestionCard;
