import { ProvenanceLegend } from '@/components/ProvenanceLegend';
import { DataLabel } from '@/components/DataLabel';
import { RECRUITMENT_PORTAL_SCENARIO } from '@/data/demoScenarios';
import { INTAKE_STEPS, TOTAL_FIELDS, TOTAL_STEPS } from '@/data/intakeSteps';
import { useIntake } from '@/state/IntakeContext';
import { FUTURE_FEATURES, PROTOTYPE_LIMITS } from '@/content/disclaimers';

export function WelcomeScreen() {
  const { dispatch } = useIntake();

  return (
    <div className="stack">
      <h1>Assess a project before you build it</h1>
      <p className="lede">
        Answer {TOTAL_FIELDS} questions across {TOTAL_STEPS} short conversational
        steps. You will then see everything you entered before any assessment is
        produced. The result reports two separate scores: how feasible the{' '}
        <strong>project</strong> is, and how good a fit it is for the{' '}
        <strong>current builder</strong>. A feasible project stays feasible even
        when the builder needs guidance or a developer.
      </p>

      <div className="welcome__actions">
        <button
          className="button button--primary button--large"
          onClick={() => dispatch({ type: 'start-blank' })}
          type="button"
        >
          Start assessment
        </button>
        <button
          className="button button--secondary button--large"
          onClick={() =>
            dispatch({ type: 'load-demo', scenario: RECRUITMENT_PORTAL_SCENARIO })
          }
          type="button"
        >
          Load fictional demo scenario
        </button>
      </div>

      <section aria-labelledby="demo-heading" className="card card--alt">
        <h2 className="card__title" id="demo-heading">
          The demonstration scenario
        </h2>
        <p>
          <strong>{RECRUITMENT_PORTAL_SCENARIO.name}</strong>{' '}
          <DataLabel label="demonstration-data" />
        </p>
        <p>{RECRUITMENT_PORTAL_SCENARIO.summary}</p>
        <p className="no-margin text-sm">
          Every name, figure, and answer in the scenario is invented. It contains no
          real candidate, client, financial, or operational information, and it never
          will. Two answers are deliberately left unknown so you can see how missing
          information is handled.
        </p>
      </section>

      <section aria-labelledby="steps-heading" className="card">
        <h2 className="card__title" id="steps-heading">
          What you will be asked
        </h2>
        <ol className="welcome__steps">
          {INTAKE_STEPS.map((step) => (
            <li key={step.id}>
              <span className="welcome__step-title">{step.title}</span>
              <span className="welcome__step-count text-sm text-muted">
                {step.fields.length} question{step.fields.length === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ol>
        <p className="no-margin">
          Every question can be answered with &ldquo;Not sure / skip&rdquo;. Nothing
          is invented on your behalf: skipped questions are recorded as Unknown,
          listed in the review, and will reduce the confidence level of the
          assessment.
        </p>
      </section>

      <section aria-labelledby="limits-heading" className="card">
        <h2 className="card__title" id="limits-heading">
          What this first version does and does not do
        </h2>
        <ul>
          {PROTOTYPE_LIMITS.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
        <h3>Possible future features (not included here)</h3>
        <ul className="text-muted">
          {FUTURE_FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="legend-heading" className="card">
        <h2 className="card__title" id="legend-heading">
          How values are labelled
        </h2>
        <p>
          Every number and statement in the assessment carries one of these labels,
          so nothing can be mistaken for a confirmed fact or a vendor quote.
        </p>
        <ProvenanceLegend />
      </section>
    </div>
  );
}
