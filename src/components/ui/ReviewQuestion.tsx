import { useId, useMemo, useState, type ReactNode } from 'react';
import { optionOrder } from '../../lib/review';
import { withBase } from '../../lib/url';
import type { QuizItem } from '../../data/lesson-extras';

/**
 * One review question. Options are shuffled for each presentation (`seed`), and the answer is
 * graded against the original index. `children` appear after the answer, below the explanation.
 */
export default function ReviewQuestion({
  item,
  seed,
  lessonKey,
  lessonTitle,
  onAnswer,
  children,
}: {
  item: QuizItem;
  seed: string;
  lessonKey: string;
  lessonTitle?: string;
  onAnswer: (correct: boolean) => void;
  children?: ReactNode;
}) {
  const uid = useId();
  const order = useMemo(() => optionOrder(item.options.length, seed), [item, seed]);
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === item.answer;

  const choose = (original: number) => {
    if (picked !== null) return;
    setPicked(original);
    onAnswer(original === item.answer);
  };

  return (
    <div className="rv-q">
      <p className="rv-prompt" id={`${uid}-q`}>
        {item.q}
      </p>
      <div className="rv-opts" role="group" aria-labelledby={`${uid}-q`}>
        {order.map((original) => {
          const isRight = picked !== null && original === item.answer;
          const isWrong = picked === original && original !== item.answer;
          return (
            <button key={original} type="button" className={`rv-opt${isRight ? ' is-right' : ''}${isWrong ? ' is-wrong' : ''}`} disabled={picked !== null} aria-pressed={picked === original ? true : undefined} onClick={() => choose(original)}>
              <span className="rv-opt-mark" aria-hidden="true">
                {isRight ? '✓' : isWrong ? '✗' : ''}
              </span>
              <span className="rv-opt-text">{item.options[original]}</span>
              {isRight && <span className="rv-opt-tag">Correct answer</span>}
              {isWrong && <span className="rv-opt-tag">Your answer</span>}
            </button>
          );
        })}
      </div>
      <div className="rv-feedback" aria-live="polite">
        {picked !== null && (
          <>
            <p className={`rv-verdict${right ? ' is-right' : ''}`}>
              <b>{right ? 'Right. ' : 'Not quite. '}</b>
              {item.why}
            </p>
            <p className="rv-from">
              <a href={withBase(`/learn/${lessonKey}/`)}>{lessonTitle ? `From the lesson: ${lessonTitle}` : 'Open the lesson this came from'}</a>
            </p>
          </>
        )}
      </div>
      {picked !== null && children}
    </div>
  );
}
