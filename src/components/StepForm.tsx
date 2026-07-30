import { useEffect, useRef, useState } from 'react';

import { FieldControl } from '@/components/FieldControl';
import { useAnnouncer } from '@/components/Announcer';
import { TOTAL_STEPS } from '@/data/intakeSteps';
import { useIntake } from '@/state/IntakeContext';
import type { IntakeStep } from '@/types/intake';
import { answerFor, unaddressedFields } from '@/utils/answers';

interface StepFormProps {
  step: IntakeStep;
  stepIndex: number;
}

/**
 * The current step's questions. Every field must be answered or explicitly
 * skipped before the step can be submitted - the user is never forced to invent
 * an answer, but they must make a choice.
 */
export function StepForm({ step, stepIndex }: StepFormProps) {
  const { state, dispatch } = useIntake();
  const { announce } = useAnnouncer();
  const [showErrors, setShowErrors] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const isLastStep = stepIndex === TOTAL_STEPS - 1;
  const outstanding = unaddressedFields(step, state.answers);

  // Moving to a step: reset validation display, focus the step heading, and
  // announce the change for screen-reader users.
  useEffect(() => {
    setShowErrors(false);
    headingRef.current?.focus();
    announce(`Step ${stepIndex + 1} of ${TOTAL_STEPS}: ${step.title}`);
  }, [announce, step.title, stepIndex]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (outstanding.length > 0) {
      setShowErrors(true);
      // Focus the summary so the blocked fields are read out immediately.
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    announce(`Step ${stepIndex + 1} saved.`);
    dispatch({ type: 'submit-step' });
  }

  const continueLabel = state.returnToReview
    ? 'Save and return to review'
    : isLastStep
      ? 'Review project details'
      : 'Continue';

  return (
    <form className="card step-form" noValidate onSubmit={handleSubmit}>
      <p className="step-form__eyebrow">
        Step {stepIndex + 1} of {TOTAL_STEPS}
      </p>
      <h3 className="step-form__title" ref={headingRef} tabIndex={-1}>
        {step.title}
      </h3>

      {showErrors && outstanding.length > 0 && (
        <div
          className="error-summary"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <p className="error-summary__title">
            {outstanding.length} question{outstanding.length === 1 ? '' : 's'} still
            needs an answer or a skip:
          </p>
          <ul>
            {outstanding.map((field) => (
              <li key={field.id}>
                <a href={`#field-${field.id}`}>{field.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-sm no-margin">
            You never have to invent an answer - choose &ldquo;Not sure /
            skip&rdquo; and it will be recorded as Unknown.
          </p>
        </div>
      )}

      <div className="step-form__fields">
        {step.fields.map((field) => {
          const answer = answerFor(state.answers, field.id);
          const invalid = showErrors && answer.status === 'empty';
          return (
            <FieldControl
              answer={answer}
              field={field}
              invalid={invalid}
              key={field.id}
              onChoices={(choices) => {
                dispatch({ type: 'set-value', fieldId: field.id, choices });
                announce(`${field.label} updated.`);
              }}
              onClear={() => {
                dispatch({ type: 'clear-answer', fieldId: field.id });
                announce(`${field.label} cleared.`);
              }}
              onNone={() => {
                dispatch({ type: 'set-none', fieldId: field.id });
                announce(`${field.label} recorded as ${field.noneLabel ?? 'none'}.`);
              }}
              onText={(text) => dispatch({ type: 'set-value', fieldId: field.id, text })}
              onUnknown={() => {
                dispatch({ type: 'set-unknown', fieldId: field.id });
                announce(`${field.label} recorded as unknown.`);
              }}
            />
          );
        })}
      </div>

      <div className="step-form__actions">
        <button
          className="button button--secondary"
          onClick={() => dispatch({ type: 'back' })}
          type="button"
        >
          {stepIndex === 0 ? 'Back to welcome' : 'Back'}
        </button>
        <button className="button button--primary" type="submit">
          {continueLabel}
        </button>
      </div>
    </form>
  );
}
