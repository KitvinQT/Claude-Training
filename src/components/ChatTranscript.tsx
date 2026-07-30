import { DataLabel } from '@/components/DataLabel';
import { INTAKE_STEPS } from '@/data/intakeSteps';
import { useIntake } from '@/state/IntakeContext';
import { provenanceOf } from '@/types/intake';
import { answerFor, formatAnswer, isStepComplete } from '@/utils/answers';

/**
 * The conversation so far: each completed step appears as a prompt from the tool
 * followed by a summary of what was answered. Rendered as a polite log so a
 * screen reader is told when new turns are added.
 */
export function ChatTranscript({ upToIndex }: { upToIndex: number }) {
  const { state, dispatch } = useIntake();
  const earlierSteps = INTAKE_STEPS.slice(0, upToIndex);
  const currentStep = INTAKE_STEPS[upToIndex];

  return (
    <div aria-live="polite" aria-relevant="additions" className="chat" role="log">
      <div className="chat__turn chat__turn--system">
        <p className="chat__who">Feasibility Architect</p>
        <p className="chat__bubble">
          I will ask about your project across nine short steps, then show you
          everything before any assessment is produced. If you do not know
          something, choose &ldquo;Not sure / skip&rdquo; - I will record it as
          Unknown rather than guessing.
        </p>
      </div>

      {state.scenarioName !== null && (
        <div className="chat__turn chat__turn--system">
          <p className="chat__who">Feasibility Architect</p>
          <p className="chat__bubble">
            Loaded the fictional scenario <strong>{state.scenarioName}</strong>. Every
            answer is invented for demonstration and is labelled accordingly. Edit
            anything you like - edited answers become your own.
          </p>
          <p className="chat__meta">
            <DataLabel label="demonstration-data" />
          </p>
        </div>
      )}

      {earlierSteps.map((step, index) => {
        if (!isStepComplete(step, state.answers)) return null;
        return (
          <div className="chat__pair" key={step.id}>
            <div className="chat__turn chat__turn--system">
              <p className="chat__who">
                Step {index + 1}: {step.title}
              </p>
              <p className="chat__bubble">{step.prompt}</p>
            </div>
            <div className="chat__turn chat__turn--user">
              <p className="chat__who">Your answers</p>
              <dl className="chat__answers">
                {step.fields.map((field) => {
                  const answer = answerFor(state.answers, field.id);
                  return (
                    <div className="chat__answer" key={field.id}>
                      <dt>{field.label}</dt>
                      <dd>
                        <span className="chat__value">{formatAnswer(field, answer)}</span>{' '}
                        <DataLabel compact label={provenanceOf(answer)} />
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <button
                className="button button--link"
                onClick={() => dispatch({ type: 'go-to-step', index })}
                type="button"
              >
                Edit step {index + 1}
              </button>
            </div>
          </div>
        );
      })}

      {currentStep && (
        <div className="chat__turn chat__turn--system">
          <p className="chat__who">
            Step {upToIndex + 1}: {currentStep.title}
          </p>
          <p className="chat__bubble">{currentStep.prompt}</p>
        </div>
      )}
    </div>
  );
}
