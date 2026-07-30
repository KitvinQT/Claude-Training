import { DataLabel } from '@/components/DataLabel';
import {
  BulletList,
  Disclosure,
  ReportSection,
  ScoreBar,
  ScrollTable,
  StatusPill,
} from '@/components/report/primitives';
import { isIndependentlyDoable } from '@/engine/recommendPaths';
import type { Assessment, DimensionScore, Driver } from '@/engine/types';
import { ABILITY_LABELS, DIMENSION_STATUS_LABELS, SUITABILITY_LABELS } from '@/engine/types';

/* Project feasibility scorecards and the builder fit section. */

function driverLines(drivers: readonly Driver[]): readonly string[] {
  return drivers.map(
    (driver) => `${driver.points > 0 ? '+' : ''}${driver.points} — ${driver.text}`,
  );
}

function DimensionCard({ dimension }: { dimension: DimensionScore }) {
  return (
    <article className="dimension">
      <div className="dimension__head">
        <h3 className="dimension__title">{dimension.label}</h3>
        <StatusPill text={DIMENSION_STATUS_LABELS[dimension.status]} tone={dimension.status} />
      </div>

      <ScoreBar
        label={`${dimension.label} score`}
        provenance={dimension.provenance}
        score={dimension.score}
      />

      <dl className="dimension__meta">
        <div>
          <dt>Weight</dt>
          <dd>{dimension.weight}% of the project score</dd>
        </div>
        <div>
          <dt>Weighted contribution</dt>
          <dd>
            {dimension.weightedContribution} points <DataLabel compact label="derived" />
          </dd>
        </div>
      </dl>

      <p className="dimension__summary">
        {dimension.negativeDrivers[0]?.text ??
          dimension.positiveDrivers[0]?.text ??
          'No individual rule moved this dimension.'}
      </p>

      <p className="dimension__action">
        <strong>Recommended corrective action:</strong> {dimension.correctiveAction}
      </p>

      <Disclosure summary={`How the ${dimension.label.toLowerCase()} score was derived`}>
        <BulletList
          heading="Positive drivers"
          items={
            dimension.positiveDrivers.length > 0
              ? driverLines(dimension.positiveDrivers)
              : ['None.']
          }
          tone="positive"
        />
        <BulletList
          heading="Negative drivers"
          items={
            dimension.negativeDrivers.length > 0
              ? driverLines(dimension.negativeDrivers)
              : ['None.']
          }
          tone="negative"
        />
        <BulletList heading="Evidence used" items={dimension.evidenceUsed} />
        <BulletList
          heading="Assumptions used"
          items={dimension.assumptionsUsed.length > 0 ? dimension.assumptionsUsed : ['None.']}
          tone="muted"
        />
        <BulletList
          heading="Unknowns affecting this score"
          items={
            dimension.unknownsAffecting.length > 0 ? dimension.unknownsAffecting : ['None.']
          }
          tone="muted"
        />
      </Disclosure>
    </article>
  );
}

export function FeasibilitySection({ assessment }: { assessment: Assessment }) {
  const { projectFeasibility } = assessment;

  return (
    <ReportSection
      id="project-feasibility"
      intro={
        <p>
          {projectFeasibility.statement} Ten dimensions, weighted to{' '}
          {projectFeasibility.weightTotal}% in total.
        </p>
      }
      title="Project feasibility"
    >
      <ScoreBar
        description="Weighted across the ten dimensions below."
        label="Project Feasibility Score"
        provenance={projectFeasibility.provenance}
        score={projectFeasibility.score}
        size="large"
      />
      <div className="dimension-grid">
        {projectFeasibility.dimensions.map((dimension) => (
          <DimensionCard dimension={dimension} key={dimension.id} />
        ))}
      </div>
    </ReportSection>
  );
}

export function BuilderFitSection({ assessment }: { assessment: Assessment }) {
  const { builderFit, builderFitByRoute, routes, routePlan } = assessment;
  const evaluatedRoute = routes.find((route) => route.routeId === builderFit.routeId);

  const learning = builderFit.factors.find((factor) => factor.id === 'learning-capacity');
  const deployment = builderFit.factors.find((factor) => factor.id === 'deployment');
  const maintenance = builderFit.factors.find((factor) => factor.id === 'maintenance');

  const eligible = routes.filter((route) => route.eligibleForRecommendation);

  return (
    <ReportSection
      id="builder-fit"
      intro={
        <p>
          Builder Fit is calculated separately for every route, because the same person
          can be a strong fit for one way of working and a poor fit for another. It is
          never folded into the Project Feasibility Score.
        </p>
      }
      title="Builder fit"
    >
      <div className="fit__head">
        <div>
          <p className="fit__eyebrow">Route being evaluated</p>
          <p className="fit__route">{evaluatedRoute?.name ?? builderFit.routeId}</p>
          <p className="fit__note">
            This is the route the practical path points to. {routePlan.separationStatement}
          </p>
        </div>
        <ScoreBar
          label="Builder Fit for this route"
          provenance={builderFit.provenance}
          score={builderFit.score}
          size="large"
        />
      </div>

      <dl className="fit__meta">
        <div>
          <dt>Suitability label</dt>
          <dd>
            <StatusPill
              text={SUITABILITY_LABELS[builderFit.suitability]}
              tone={
                builderFit.suitability === 'suitable-now'
                  ? 'positive'
                  : builderFit.suitability === 'light-guidance'
                    ? 'adequate'
                    : builderFit.suitability === 'unsuitable'
                      ? 'critical'
                      : 'caution'
              }
            />{' '}
            <DataLabel compact label="derived" />
          </dd>
        </div>
        <div>
          <dt>Required support level</dt>
          <dd>
            {routePlan.practical.supportNeeded} <DataLabel compact label="derived" />
          </dd>
        </div>
        <div>
          <dt>Learning burden for this route</dt>
          <dd>
            {learning
              ? `Route needs level ${learning.requiredLevel} of 4; builder assessed at level ${learning.builderLevel}.`
              : 'Not applicable.'}{' '}
            <DataLabel compact label="assumption" />
          </dd>
        </div>
        <div>
          <dt>Deployment readiness</dt>
          <dd>
            {deployment
              ? `Route needs level ${deployment.requiredLevel} of 4; builder assessed at level ${deployment.builderLevel}. ${deployment.note}`
              : 'Not applicable.'}{' '}
            <DataLabel compact label="assumption" />
          </dd>
        </div>
        <div>
          <dt>Maintenance readiness</dt>
          <dd>
            {maintenance
              ? `Route needs level ${maintenance.requiredLevel} of 4; builder assessed at level ${maintenance.builderLevel}. ${maintenance.note}`
              : 'Not applicable.'}{' '}
            <DataLabel compact label="assumption" />
          </dd>
        </div>
        <div>
          <dt>Recommended support arrangement</dt>
          <dd>
            {routePlan.practical.canBuilderPerformIt
              ? routePlan.practical.supportNeeded
              : `${routePlan.practical.supportNeeded} ${routePlan.practical.interimRouteName ? `Interim route while that is arranged: ${routePlan.practical.interimRouteName}.` : ''}`}{' '}
            <DataLabel compact label="derived" />
          </dd>
        </div>
      </dl>

      <BulletList
        heading="Main strengths"
        headingLevel={3}
        items={builderFit.strengths.length > 0 ? builderFit.strengths : ['None identified for this route.']}
        tone="positive"
      />
      <BulletList
        heading="Main capability gaps"
        headingLevel={3}
        items={builderFit.gaps.length > 0 ? builderFit.gaps : ['None: the route sits within current capability.']}
        tone="negative"
      />

      <Disclosure summary="How this Builder Fit score was derived">
        <BulletList items={builderFit.explanation} />
        <BulletList
          heading="Support adjustments"
          items={
            builderFit.supportAdjustments.length > 0
              ? builderFit.supportAdjustments.map(
                  (adjustment) =>
                    `${adjustment.points === 0 ? '' : `${adjustment.points > 0 ? '+' : ''}${adjustment.points} — `}${adjustment.text}`,
                )
              : ['None applied.']
          }
        />
        <BulletList heading="Assumptions used" items={builderFit.assumptionsUsed} tone="muted" />
        <BulletList
          heading="Unknowns affecting this score"
          items={
            builderFit.unknownsAffecting.length > 0 ? builderFit.unknownsAffecting : ['None.']
          }
          tone="muted"
        />
        <ScrollTable
          caption="Ability factors for this route: builder level against required level"
          label="Builder ability factors"
        >
          <thead>
            <tr>
              <th scope="col">Ability</th>
              <th scope="col">Builder level</th>
              <th scope="col">Required</th>
              <th scope="col">Gap</th>
              <th scope="col">Factor score</th>
            </tr>
          </thead>
          <tbody>
            {builderFit.factors.map((factor) => (
              <tr key={factor.id}>
                <th scope="row">{ABILITY_LABELS[factor.id]}</th>
                <td>{factor.builderLevel} of 4</td>
                <td>{factor.requiredLevel} of 4</td>
                <td>{factor.gap === 0 ? 'None' : `${factor.gap} level${factor.gap === 1 ? '' : 's'} short`}</td>
                <td>{factor.factorScore}</td>
              </tr>
            ))}
          </tbody>
        </ScrollTable>
      </Disclosure>

      <h3 className="fit__subhead">Builder Fit across the available routes</h3>
      <p className="fit__note">
        The same builder, compared against every route that is currently available.
      </p>
      <ScrollTable
        caption="Builder Fit for each available route, with the support each would need"
        label="Builder fit comparison across routes"
      >
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Builder Fit</th>
            <th scope="col">Suitability</th>
            <th scope="col">Can the builder do this unaided?</th>
          </tr>
        </thead>
        <tbody>
          {eligible.map((route) => {
            const fit = builderFitByRoute.find((item) => item.routeId === route.routeId)!;
            return (
              <tr key={route.routeId}>
                <th scope="row">{route.name}</th>
                <td>
                  {fit.score} of 100 <DataLabel compact label="derived" />
                </td>
                <td>{SUITABILITY_LABELS[fit.suitability]}</td>
                <td>
                  {isIndependentlyDoable(fit.suitability)
                    ? 'Yes, with the support noted'
                    : 'No — support required'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </ScrollTable>
    </ReportSection>
  );
}
