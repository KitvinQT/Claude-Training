import { ALL_FIELDS } from '@/data/intakeSteps';
import { buildEvidencePanels } from '@/engine/buildEvidencePanels';
import { buildFinalRecommendation } from '@/engine/buildFinalRecommendation';
import { buildMvp } from '@/engine/buildMvp';
import { buildRisks, highRisks } from '@/engine/buildRisks';
import { buildRoadmap } from '@/engine/buildRoadmap';
import { buildSourceOfTruth } from '@/engine/buildSourceOfTruth';
import { buildRoutePlan } from '@/engine/recommendPaths';
import { checkExistingSolution } from '@/engine/existingSolution';
import { determineConfidence } from '@/engine/determineConfidence';
import { determineMaturity } from '@/engine/determineMaturity';
import { determineVerdict } from '@/engine/determineVerdict';
import { estimateCost } from '@/engine/estimateCost';
import { estimateTimeline } from '@/engine/estimateTimeline';
import { normalizeAnswers, type NormalizedIntake } from '@/engine/normalizeAnswers';
import { buildSafeguards } from '@/engine/safeguards';
import { scoreBuilderByRoute } from '@/engine/scoreBuilderByRoute';
import { scoreProjectDimensions } from '@/engine/scoreProjectDimensions';
import { scoreRoutes, selectRecommendedRoute } from '@/engine/scoreRoutes';
import type { Assessment, RouteId, TechnicalStatus } from '@/engine/types';
import { MATURITY_LABELS, ROUTE_IDS } from '@/engine/types';
import type { AnswerMap } from '@/types/intake';
import { formatAnswer } from '@/utils/answers';

/* ------------------------------------------------------------------ *
 * Assessment orchestrator.
 *
 * Pure and deterministic: the same answers always produce an identical
 * assessment. No React, no browser APIs, no storage, no network, no clock, no
 * randomness.
 * ------------------------------------------------------------------ */

export function generateAssessment(answers: AnswerMap): Assessment {
  const n = normalizeAnswers(answers);

  const feasibility = scoreProjectDimensions(n);
  const existing = checkExistingSolution(n);
  const routes = scoreRoutes(n, existing);
  const builderFitByRoute = scoreBuilderByRoute(n);
  const recommended = selectRecommendedRoute(routes);

  const headlineBuilderFit =
    builderFitByRoute.find((fit) => fit.routeId === recommended?.routeId) ??
    // With no eligible route, report fit for the least demanding route so the
    // figure still means something, and say so in the explanation.
    fallbackBuilderFit(builderFitByRoute);

  const risks = buildRisks(n, recommended, headlineBuilderFit);
  const confidence = determineConfidence(n, recommended);
  const cost = estimateCost(n, recommended, headlineBuilderFit);
  const timeline = estimateTimeline(n, recommended, headlineBuilderFit, cost.effort.highHours);
  const maturity = determineMaturity(n, routes);
  const sourceOfTruth = buildSourceOfTruth(n);
  const safeguards = buildSafeguards(n);

  const verdict = determineVerdict({
    n,
    feasibility,
    routes,
    recommended,
    existing,
    risks,
    confidence,
    safeguards,
    timeline,
  });

  const routePlan = buildRoutePlan(n, routes, recommended);
  const mvp = buildMvp(n, recommended, safeguards, timeline);
  const roadmap = buildRoadmap(n, recommended, routePlan, timeline);
  const technicalStatus = overallTechnicalStatus(routes);

  const evidencePanels = buildEvidencePanels({
    n,
    feasibility,
    route: recommended,
    cost,
    timeline,
    confidence,
    assessment: {
      suitability: headlineBuilderFit.suitability,
      technicalStatus,
      existingSolution: existing,
      maturity,
      highRisks: highRisks(risks),
    },
  });

  const finalRecommendation = buildFinalRecommendation({
    n,
    verdict,
    feasibility,
    builderFitScore: headlineBuilderFit.score,
    confidence,
    plan: routePlan,
    routes,
    recommended,
    maturity,
    cost,
    mvp,
  });

  const alternativeRouteIds = routes
    .filter((route) => route.eligibleForRecommendation && route.routeId !== recommended?.routeId)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3)
    .map((route) => route.routeId);

  const titleAnswer = answers['workingTitle'];
  const projectName =
    titleAnswer && titleAnswer.status === 'answered' && titleAnswer.text.trim().length > 0
      ? titleAnswer.text.trim()
      : 'Untitled project (no working title given)';

  return {
    projectName,
    projectNameProvenance:
      titleAnswer && titleAnswer.status === 'answered'
        ? titleAnswer.source === 'demo'
          ? 'demonstration-data'
          : 'from-your-answer'
        : 'unknown',
    projectFeasibility: feasibility,
    builderFit: headlineBuilderFit,
    builderFitByRoute,
    routes,
    recommendedRouteId: recommended?.routeId ?? null,
    alternativeRouteIds,
    excludedRouteIds: routes.filter((route) => route.excluded !== null).map((route) => route.routeId),
    existingSolution: existing,
    technicalStatus,
    suitability: headlineBuilderFit.suitability,
    maturity,
    risks,
    highRisks: highRisks(risks),
    confidence,
    cost,
    timeline,
    sourceOfTruth,
    safeguards,
    verdict,
    routePlan,
    mvp,
    roadmap,
    evidencePanels,
    finalRecommendation,
    evidence: collectEvidence(n, answers),
    assumptions: collectAssumptions(n, recommended !== null),
    unknowns: n.unknownFieldLabels,
    limitations: LIMITATIONS,
  };
}

function fallbackBuilderFit(
  fits: readonly ReturnType<typeof scoreBuilderByRoute>[number][],
): ReturnType<typeof scoreBuilderByRoute>[number] {
  const preferredOrder: readonly RouteId[] = ['spreadsheet-doc', 'chat-only', ...ROUTE_IDS];
  for (const routeId of preferredOrder) {
    const match = fits.find((fit) => fit.routeId === routeId);
    if (match) {
      return {
        ...match,
        explanation: [
          'No route is currently eligible, so this figure is shown for the least demanding route only, as a reference point.',
          ...match.explanation,
        ],
      };
    }
  }
  throw new Error('No builder fit results were produced.');
}

/**
 * The overall technical status is the best status any route achieves, because
 * "is this technically possible" is a question about the requirement, not about
 * the builder or the user's chosen restrictions. Restricted-but-valid routes
 * still count towards technical possibility.
 */
function overallTechnicalStatus(
  routes: readonly { technicalStatus: TechnicalStatus }[],
): TechnicalStatus {
  const order: readonly TechnicalStatus[] = [
    'technically-feasible',
    'requires-verification',
    'feasible-with-limitations',
    'technically-blocked',
  ];
  for (const status of order) {
    if (routes.some((route) => route.technicalStatus === status)) return status;
  }
  return 'technically-blocked';
}

function collectEvidence(n: NormalizedIntake, answers: AnswerMap): readonly string[] {
  const evidence: string[] = [];
  const interesting = [
    'problem',
    'intendedUsers',
    'mustHave',
    'sourceOfTruth',
    'budget',
    'deadline',
    'availableTime',
    'builderExperience',
    'developerSupport',
    'restrictedMethods',
    'localDevRestrictions',
    'sensitiveInformation',
    'maintenanceExpectation',
    'projectOwner',
  ];

  for (const fieldId of interesting) {
    const entry = ALL_FIELDS.find(({ field }) => field.id === fieldId);
    const value = answers[fieldId];
    if (!entry || !value || value.status === 'empty') continue;
    evidence.push(`${entry.field.label}: ${formatAnswer(entry.field, value)}`);
  }

  evidence.push(
    `Required maturity level derived as ${MATURITY_LABELS[n.requiredMaturity]}: ${n.requiredMaturityReasons.join(' ')}`,
  );
  if (n.consequentialEvidence.length > 0) {
    evidence.push(...n.consequentialEvidence);
  }
  return evidence;
}

function collectAssumptions(n: NormalizedIntake, hasRoute: boolean): readonly string[] {
  const assumptions: string[] = [
    'The scoring rubric is illustrative. It is a transparent set of hand-written rules, not a validated industry model.',
    'Effort figures are broad ranges, not quotations. No hourly rate, subscription price, or hosting price is generated by this tool.',
  ];

  if (n.weeklyHours === null) {
    assumptions.push(
      'Weekly available time was not stated. Roughly 4 hours per week was used only for capacity comparisons, and is not treated as your answer.',
    );
  }
  if (n.deadlineWeeks === null) {
    assumptions.push(
      'No deadline was stated. A 12-week horizon was used only for capacity comparisons, and is not treated as your answer.',
    );
  }
  if (n.budgetTier === 'unknown') {
    assumptions.push(
      'No budget was stated, so route costs were compared against free or existing tools only.',
    );
  }
  if (n.builderAnswersUnknown.length > 0) {
    assumptions.push(
      `Where a capability question was left unknown (${n.builderAnswersUnknown.join(', ')}), no experience was assumed. That is a conservative placeholder for Builder Fit only, and it does not affect project feasibility.`,
    );
  }
  if (n.scopeTier === 'unknown') {
    assumptions.push('No must-have features were listed, so effort was estimated against a moderate scope.');
  }
  assumptions.push(
    'Deployment, security-management, maintenance, and learning capacity were inferred from the stated experience rather than asked about directly.',
  );
  if (!hasRoute) {
    assumptions.push('No route is eligible, so cost and timeline figures are placeholders rather than estimates.');
  }
  return assumptions;
}

const LIMITATIONS: readonly string[] = [
  'This is an illustrative assessment prototype, not professional consulting, and not a production system.',
  'Scores come from hand-written rules over the answers given. Different rules would give different numbers.',
  'Nothing here has been validated against real project outcomes.',
  'Cost and timeline figures are estimates expressed as ranges and categories. They are not vendor quotations.',
  'Route profiles describe typical behaviour. Specific products and plans differ and must be verified.',
  'The assessment cannot see anything you did not tell it, and it does not fill gaps with guesses.',
  'Results require human review. They must not be used to make final legal, financial, hiring, security, or implementation decisions.',
];
