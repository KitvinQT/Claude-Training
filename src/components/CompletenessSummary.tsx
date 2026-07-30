import { DataLabel } from '@/components/DataLabel';
import { stepIndexById } from '@/data/intakeSteps';
import { useIntake } from '@/state/IntakeContext';
import type { AnswerSummary } from '@/utils/answers';

/**
 * How much intake information has been supplied, plus the list of unknowns.
 *
 * Completeness is explicitly not a feasibility measure: it counts answered
 * questions and nothing else.
 */
export function CompletenessSummary({ summary }: { summary: AnswerSummary }) {
  const { dispatch } = useIntake();

  return (
    <section aria-labelledby="completeness-heading" className="card completeness">
      <h2 className="card__title" id="completeness-heading">
        Intake completeness
      </h2>

      <div className="completeness__figures">
        <div className="stat">
          <p className="stat__value">{summary.completenessPercent}%</p>
          <p className="stat__label">Information provided</p>
          <DataLabel label="derived" />
        </div>
        <div className="stat">
          <p className="stat__value">
            {summary.providedCount}
            <span className="stat__of"> / {summary.totalFields}</span>
          </p>
          <p className="stat__label">Questions answered</p>
          <DataLabel label="derived" />
        </div>
        <div className="stat">
          <p className="stat__value">{summary.unknownCount}</p>
          <p className="stat__label">Recorded as unknown</p>
          <DataLabel label="unknown" />
        </div>
      </div>

      <div
        aria-label="Intake completeness"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={summary.completenessPercent}
        aria-valuetext={`${summary.completenessPercent} percent of intake questions answered`}
        className="progress__track"
        role="progressbar"
      >
        <div className="progress__fill" style={{ width: `${summary.completenessPercent}%` }} />
      </div>

      <p className="completeness__caveat" role="note">
        This measures how much intake information you have provided. It is{' '}
        <strong>not</strong> a feasibility score and says nothing about whether the
        project is a good idea.
      </p>

      {summary.unknownCount > 0 ? (
        <div className="completeness__unknowns">
          <h3>Unknown information ({summary.unknownCount})</h3>
          <p className="text-sm">
            Nothing has been assumed in place of these. They will be listed in the
            assessment&rsquo;s Unknowns panel and will reduce its stated confidence
            level.
          </p>
          <ul className="unknown-list">
            {summary.unknownFields.map((unknown) => (
              <li key={unknown.fieldId}>
                <span className="unknown-list__label">{unknown.fieldLabel}</span>
                <span className="unknown-list__section text-sm text-muted">
                  {unknown.reviewTitle}
                </span>
                {unknown.important && (
                  <span className="unknown-list__flag">
                    Important - assessment will be more limited
                  </span>
                )}
                <button
                  className="button button--link"
                  onClick={() =>
                    dispatch({ type: 'edit-step', index: stepIndexById(unknown.stepId) })
                  }
                  type="button"
                >
                  Answer this
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="completeness__unknowns no-margin">
          No questions were left unknown.
        </p>
      )}
    </section>
  );
}
