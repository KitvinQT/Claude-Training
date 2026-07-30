import { DataLabel } from '@/components/DataLabel';
import { Callout, FactList, ReportSection, ScoreBar, StatusPill, type FactItem } from '@/components/report/primitives';
import type { Assessment } from '@/engine/types';
import {
  COST_CATEGORY_LABELS,
  MATURITY_LABELS,
  SUITABILITY_LABELS,
  TECHNICAL_STATUS_LABELS,
} from '@/engine/types';

const FEASIBILITY_EXPLANATION =
  'Project Feasibility measures whether the project can realistically work. Builder Fit measures whether the current builder can implement and maintain the recommended route. A low Builder Fit score does not make a technically feasible project infeasible.';

const VERDICT_TONE: Record<string, 'strong' | 'adequate' | 'watch' | 'weak' | 'critical'> = {
  proceed: 'strong',
  'proceed-carefully': 'adequate',
  'conditional-go': 'adequate',
  'simplify-first': 'watch',
  'revise-before-building': 'watch',
  delay: 'watch',
  'use-existing-solution': 'adequate',
  'do-not-build-yet': 'weak',
  'no-go': 'critical',
};

export function ExecutiveSummary({ assessment }: { assessment: Assessment }) {
  const {
    projectName,
    projectNameProvenance,
    projectFeasibility,
    builderFit,
    confidence,
    verdict,
    routePlan,
    maturity,
    technicalStatus,
    suitability,
    cost,
    finalRecommendation,
    routes,
    recommendedRouteId,
  } = assessment;

  const practicalRoute = routes.find((route) => route.routeId === routePlan.practical.routeId);
  const recommended = routes.find((route) => route.routeId === recommendedRouteId);

  const routeFacts: readonly FactItem[] = [
    {
      term: 'Best technical route',
      value: `${routePlan.bestTechnical.name} — ${routePlan.technicalRouteLabel}`,
      provenance: 'derived',
    },
    {
      term: 'Recommended practical path',
      value: routePlan.practical.headline,
      provenance: 'derived',
    },
    {
      term: 'Best alternative route',
      value: routePlan.alternative
        ? `${routePlan.alternative.name} — ${routePlan.alternative.chooseWhen}`
        : 'None identified beyond the routes above.',
      provenance: 'derived',
    },
    {
      term: 'Build method (best technical route)',
      value: routePlan.bestTechnical.buildMethod,
      provenance: 'derived',
    },
    {
      term: 'Final solution type (best technical route)',
      value: routePlan.bestTechnical.finalSolutionType,
      provenance: 'derived',
    },
    {
      term: 'Recommended maturity target',
      value: `Start at ${MATURITY_LABELS[maturity.recommendedStartingLevel]}. The project requires ${MATURITY_LABELS[maturity.requiredLevel]}.`,
      provenance: 'derived',
    },
  ];

  const deliveryFacts: readonly FactItem[] = [
    {
      term: 'Technical status',
      value: <StatusPill text={TECHNICAL_STATUS_LABELS[technicalStatus]} tone={technicalStatus === 'technically-blocked' ? 'blocked' : technicalStatus === 'technically-feasible' ? 'positive' : 'caution'} />,
      provenance: 'derived',
    },
    {
      term: 'Suitability for the current builder',
      value: <StatusPill text={SUITABILITY_LABELS[suitability]} tone={suitability === 'suitable-now' ? 'positive' : suitability === 'light-guidance' ? 'adequate' : suitability === 'unsuitable' ? 'critical' : 'caution'} />,
      provenance: 'derived',
    },
    {
      term: 'Estimated effort range',
      value: `${cost.effort.lowHours} to ${cost.effort.highHours} builder hours`,
      provenance: 'estimate',
    },
    {
      term: 'Setup-cost category',
      value: COST_CATEGORY_LABELS[cost.setupCost],
      provenance: 'requires-verification',
    },
    {
      term: 'Monthly-cost category',
      value: COST_CATEGORY_LABELS[cost.monthlyCost],
      provenance: 'requires-verification',
    },
    { term: 'Hosting needed', value: finalRecommendation.hostingNeeded, provenance: 'derived' },
    { term: 'Database needed', value: finalRecommendation.databaseNeeded, provenance: 'derived' },
    {
      term: 'Authentication needed',
      value: finalRecommendation.authenticationNeeded,
      provenance: 'derived',
    },
    {
      term: 'Developer support needed',
      value: finalRecommendation.developerSupportNeeded,
      provenance: 'derived',
    },
    {
      term: 'Maintenance level',
      value: finalRecommendation.maintenanceDifficulty,
      provenance: 'derived',
    },
  ];

  return (
    <ReportSection id="executive-summary" title="Executive summary" tone="accent">
      <div className="exec__head">
        <div>
          <p className="exec__eyebrow">Project</p>
          <p className="exec__project">
            {projectName} <DataLabel compact label={projectNameProvenance} />
          </p>
        </div>
        <div className="exec__verdict">
          <p className="exec__eyebrow">Final verdict</p>
          <p className="exec__verdict-value">
            <StatusPill text={verdict.label} tone={VERDICT_TONE[verdict.verdict] ?? 'watch'} />
          </p>
          <p className="exec__verdict-note">{verdict.statement}</p>
          <DataLabel label="derived" />
        </div>
      </div>

      <div className="exec__scores">
        <ScoreBar
          description="Whether the project itself can realistically work."
          label="Project Feasibility"
          provenance="derived"
          score={projectFeasibility.score}
          size="large"
        />
        <ScoreBar
          description={`Whether the current builder can implement and maintain ${practicalRoute?.name ?? builderFit.routeId}.`}
          label={`Builder Fit — ${practicalRoute?.name ?? recommended?.name ?? 'recommended route'}`}
          provenance="derived"
          score={builderFit.score}
          size="large"
        />
        <ScoreBar
          description={`${confidence.band} confidence. How much information the assessment had to work with.`}
          label="Assessment confidence"
          provenance="derived"
          score={confidence.score}
          size="large"
        />
      </div>

      <Callout title="Reading these two scores">
        <p className="no-margin">{FEASIBILITY_EXPLANATION}</p>
      </Callout>

      <h3 className="exec__subhead">Route and destination</h3>
      <FactList items={routeFacts} />

      <h3 className="exec__subhead">Delivery requirements</h3>
      <FactList items={deliveryFacts} />
    </ReportSection>
  );
}
