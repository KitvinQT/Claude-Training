import { INTAKE_STEPS, TOTAL_STEPS } from '@/data/intakeSteps';
import { useIntake } from '@/state/IntakeContext';
import { canNavigateToStep, stepStatus, type StepStatus } from '@/state/intakeReducer';
import { isStepComplete, stepUnknownCount } from '@/utils/answers';

const STATUS_TEXT: Record<StepStatus, string> = {
  current: 'Current step',
  complete: 'Completed',
  started: 'Started, answers outstanding',
  future: 'Not yet available',
};

const STATUS_MARK: Record<StepStatus, string> = {
  current: '▶', // right-pointing triangle
  complete: '✓', // check mark
  started: '•', // bullet
  future: '·', // middle dot
};

/**
 * Keyboard-operable progress indicator. Completed and current steps are buttons;
 * steps not yet reached are disabled, so the user cannot jump ahead. Status is
 * conveyed by text as well as colour and shape.
 */
export function StepProgress() {
  const { state, dispatch } = useIntake();
  const completed = INTAKE_STEPS.filter((step) => isStepComplete(step, state.answers))
    .length;
  const percent = Math.round((completed / TOTAL_STEPS) * 100);

  return (
    <nav aria-label="Intake progress" className="progress">
      <h2 className="progress__heading">Intake progress</h2>

      <div className="progress__meter">
        <div
          aria-label="Steps completed"
          aria-valuemax={TOTAL_STEPS}
          aria-valuemin={0}
          aria-valuenow={completed}
          aria-valuetext={`${completed} of ${TOTAL_STEPS} steps complete`}
          className="progress__track"
          role="progressbar"
        >
          <div className="progress__fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="progress__count">
          {completed} of {TOTAL_STEPS} steps complete
        </p>
      </div>

      <ol className="progress__list">
        {INTAKE_STEPS.map((step, index) => {
          const status = stepStatus(state, index);
          const unknowns = stepUnknownCount(step, state.answers);
          const reachable = canNavigateToStep(state, index);
          const isCurrent = status === 'current';

          return (
            <li className={`progress__item progress__item--${status}`} key={step.id}>
              <button
                aria-current={isCurrent ? 'step' : undefined}
                className="progress__button"
                disabled={!reachable}
                onClick={() => dispatch({ type: 'go-to-step', index })}
                type="button"
              >
                <span aria-hidden="true" className="progress__mark">
                  {STATUS_MARK[status]}
                </span>
                <span className="progress__label">
                  <span className="progress__number">Step {index + 1}</span>
                  <span className="progress__title">{step.title}</span>
                  <span className="progress__status">{STATUS_TEXT[status]}</span>
                  {unknowns > 0 && (
                    <span className="progress__unknowns">
                      {unknowns} unknown answer{unknowns === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="progress__note text-sm">
        You can return to any step you have already reached. Steps ahead open once
        you have answered or skipped the questions before them.
      </p>
    </nav>
  );
}
