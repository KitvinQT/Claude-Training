import { useEffect, useRef, useState } from 'react';

import { useAnnouncer } from '@/components/Announcer';
import { CompletenessSummary } from '@/components/CompletenessSummary';
import { ConfirmPanel } from '@/components/ConfirmPanel';
import { DataLabel } from '@/components/DataLabel';
import { MemoryNotice } from '@/components/MemoryNotice';
import { INTAKE_STEPS } from '@/data/intakeSteps';
import { useIntake } from '@/state/IntakeContext';
import { provenanceOf } from '@/types/intake';
import { answerFor, formatAnswer, summariseAnswers } from '@/utils/answers';

export function ReviewScreen() {
  const { state, dispatch } = useIntake();
  const { announce } = useAnnouncer();
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summary = summariseAnswers(state.answers);

  useEffect(() => {
    headingRef.current?.focus();
    announce('Review project details. All nine steps are complete.');
  }, [announce]);

  return (
    <div className="stack">
      <h1 ref={headingRef} tabIndex={-1}>
        Review project details
      </h1>
      <p className="lede">
        Everything you entered, grouped by section, with the source of each value
        shown. Change anything that is not right before an assessment is produced.
      </p>
      <MemoryNotice />

      <CompletenessSummary summary={summary} />

      {INTAKE_STEPS.map((step, index) => (
        <section
          aria-labelledby={`review-${step.id}`}
          className="card review-section"
          key={step.id}
        >
          <div className="review-section__head">
            <h2 className="card__title no-margin" id={`review-${step.id}`}>
              {step.reviewTitle}
            </h2>
            <button
              className="button button--secondary button--small"
              onClick={() => dispatch({ type: 'edit-step', index })}
              type="button"
            >
              Edit {step.reviewTitle.toLowerCase()}
            </button>
          </div>

          <dl className="review-list">
            {step.fields.map((field) => {
              const answer = answerFor(state.answers, field.id);
              return (
                <div
                  className={`review-list__row${answer.status === 'unknown' ? ' review-list__row--unknown' : ''}`}
                  key={field.id}
                >
                  <dt>{field.label}</dt>
                  <dd>
                    <span className="review-list__value">
                      {formatAnswer(field, answer)}
                    </span>
                    <DataLabel label={provenanceOf(answer)} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      <section aria-labelledby="next-heading" className="card card--alt">
        <h2 className="card__title" id="next-heading">
          Next step
        </h2>
        <p id="generate-help">
          The assessment applies a published set of rules to the answers above,
          entirely inside this browser. Nothing is sent anywhere, no vendor or price
          is looked up, and the result requires human review.
        </p>
        {state.assessment !== null && state.assessmentStale && (
          <p className="review-actions__note">
            Answers have changed since the last assessment. Regenerate to bring it up
            to date.
          </p>
        )}
        <div className="review-actions">
          <button
            aria-describedby="generate-help"
            className="button button--primary button--large"
            onClick={() => {
              announce('Generating the assessment.');
              dispatch({ type: 'start-generating' });
            }}
            type="button"
          >
            {state.assessment === null ? 'Generate assessment' : 'Regenerate assessment'}
          </button>
          {state.assessment !== null && (
            <button
              className="button button--secondary"
              onClick={() => dispatch({ type: 'view-report' })}
              type="button"
            >
              Back to the assessment
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="startover-heading" className="card">
        <h2 className="card__title" id="startover-heading">
          Start over
        </h2>
        {confirmingStartOver ? (
          <ConfirmPanel
            body="This clears every answer, including anything loaded from the demonstration scenario. Nothing is saved, so it cannot be recovered."
            cancelLabel="Keep my answers"
            confirmLabel="Clear everything and start over"
            onCancel={() => setConfirmingStartOver(false)}
            onConfirm={() => {
              setConfirmingStartOver(false);
              announce('All answers cleared. Returned to the welcome screen.');
              dispatch({ type: 'start-over' });
            }}
            title="Clear all answers?"
          />
        ) : (
          <>
            <p>
              Clear all {summary.totalFields} answers and return to the welcome
              screen.
            </p>
            <button
              className="button button--secondary"
              onClick={() => setConfirmingStartOver(true)}
              type="button"
            >
              Start over
            </button>
          </>
        )}
      </section>

      <div className="review-footer-nav">
        <button
          className="button button--secondary"
          onClick={() => dispatch({ type: 'back' })}
          type="button"
        >
          Back to the last step
        </button>
      </div>
    </div>
  );
}
