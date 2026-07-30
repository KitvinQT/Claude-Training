import { ROUTE_DELIVERY } from '@/data/routeDelivery';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  ConfidenceResult,
  CostEstimate,
  FinalRecommendation,
  InappropriateTool,
  MaturityAssessment,
  MvpRecommendation,
  ProjectFeasibilityResult,
  RouteAssessment,
  RoutePlan,
  VerdictResult,
} from '@/engine/types';
import { MATURITY_LABELS, SUITABILITY_LABELS } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Final recommendation.
 *
 * Restates the single verdict from the verdict engine - it never computes a
 * second one - and assembles everything a reader needs in one place.
 * ------------------------------------------------------------------ */

export function buildFinalRecommendation(input: {
  readonly n: NormalizedIntake;
  readonly verdict: VerdictResult;
  readonly feasibility: ProjectFeasibilityResult;
  readonly builderFitScore: number;
  readonly confidence: ConfidenceResult;
  readonly plan: RoutePlan;
  readonly routes: readonly RouteAssessment[];
  readonly recommended: RouteAssessment | null;
  readonly maturity: MaturityAssessment;
  readonly cost: CostEstimate;
  readonly mvp: MvpRecommendation;
}): FinalRecommendation {
  const {
    n,
    verdict,
    feasibility,
    builderFitScore,
    confidence,
    plan,
    routes,
    recommended,
    maturity,
    cost,
    mvp,
  } = input;

  const technicalRoute = routes.find((route) => route.routeId === plan.bestTechnical.routeId);
  const delivery = ROUTE_DELIVERY[plan.bestTechnical.routeId];

  /* ---------- tools ---------- */
  const requiredTools: string[] = [];
  const optionalTools: string[] = [];

  if (plan.practical.routeId !== null) {
    const practicalRoute = routes.find((route) => route.routeId === plan.practical.routeId);
    if (practicalRoute) {
      requiredTools.push(`${practicalRoute.name} — the practical next step`);
      if (!practicalRoute.requiredHosting.startsWith('None')) {
        requiredTools.push(`Hosting: ${practicalRoute.requiredHosting}`);
      }
      if (!practicalRoute.requiredDatabase.startsWith('None')) {
        requiredTools.push(`Data store: ${practicalRoute.requiredDatabase}`);
      }
    }
  }
  if (technicalRoute && technicalRoute.routeId !== plan.practical.routeId) {
    optionalTools.push(
      `${technicalRoute.name} — the best technical route, once ${plan.practical.canBuilderPerformIt ? 'you are ready' : 'support is in place'}`,
    );
  }
  if (plan.alternative) {
    optionalTools.push(`${plan.alternative.name} — the best alternative`);
  }
  if (requiredTools.length === 0) {
    requiredTools.push('None: no route is currently available.');
  }
  if (optionalTools.length === 0) {
    optionalTools.push('None identified beyond the recommended route.');
  }

  const inappropriateTools: InappropriateTool[] = routes
    .filter((route) => route.excluded !== null)
    .map((route) => ({ name: route.name, reason: route.excluded!.reason }));
  const unsuitableForBuilder = routes.filter(
    (route) =>
      route.excluded === null &&
      (route.suitability === 'unsuitable' ||
        route.suitability === 'requires-professional-implementation') &&
      route.routeId !== plan.bestTechnical.routeId,
  );
  for (const route of unsuitableForBuilder) {
    inappropriateTools.push({
      name: route.name,
      reason: `Not appropriate for independent implementation under current conditions: ${SUITABILITY_LABELS[route.suitability].toLowerCase()} (Builder Fit ${route.builderFit.score} of 100). It remains ${route.technicalStatus.replace(/-/g, ' ')}.`,
    });
  }
  if (inappropriateTools.length === 0) {
    inappropriateTools.push({
      name: 'None',
      reason: 'No route was ruled out under current conditions.',
    });
  }

  /* ---------- what not to build yet ---------- */
  const whatNotToBuildYet: string[] = [...mvp.excludedFeatures.slice(0, 4)];
  if (n.requiredMaturity === 'production-ready') {
    whatNotToBuildYet.push(
      'Anything holding real records, until storage, accounts, permissions, backups, audit history, monitoring, and recovery are all in place.',
    );
  }
  if (n.consequentialDomain !== 'none') {
    whatNotToBuildYet.push(
      `Any automatic ${n.consequentialDomain} outcome, and any message sent to a person without human review.`,
    );
  }
  if (n.integrationsNeeded) {
    whatNotToBuildYet.push('Any integration, until the other system is confirmed to expose the data.');
  }

  /* ---------- conditions that could change the recommendation ---------- */
  const conditionsThatCouldChange: string[] = [];
  if (!plan.practical.canBuilderPerformIt) {
    conditionsThatCouldChange.push(
      'Securing developer support would make the best technical route a practical option.',
    );
  }
  if (n.budgetTier === 'unknown' || n.budgetTier === 'none') {
    conditionsThatCouldChange.push(
      'A stated budget would open routes currently ruled out on cost, and would raise cost confidence.',
    );
  }
  if (n.restrictedRoutes.length > 0) {
    conditionsThatCouldChange.push(
      `Relaxing a restriction would return ${n.restrictedRoutes.length} route(s) to consideration; they remain technically valid.`,
    );
  }
  if (n.browserOnly) {
    conditionsThatCouldChange.push(
      'Permission to use a development environment would return the local build routes to consideration.',
    );
  }
  if (!n.sourceOfTruthDefined && n.dataDependent) {
    conditionsThatCouldChange.push(
      'Agreeing an authoritative source of data would lift the source-of-truth gate on the verdict.',
    );
  }
  if (n.scopeTier === 'large' || n.scopeTier === 'very-large') {
    conditionsThatCouldChange.push(
      'Reducing the must-have list would shorten the timeline and could change which route wins.',
    );
  }
  if (confidence.band !== 'high') {
    conditionsThatCouldChange.push(
      `Answering the unknown questions would raise confidence from ${confidence.score} and could change the verdict.`,
    );
  }
  if (conditionsThatCouldChange.length === 0) {
    conditionsThatCouldChange.push(
      'Nothing identified. The recommendation would change if the scope, budget, deadline, or available support changed materially.',
    );
  }

  const implementationLevel = plan.practical.canBuilderPerformIt
    ? `Build it yourself using ${plan.practical.name}${plan.practical.mode === 'build-now' ? '' : ', with the support noted'}.`
    : plan.practical.interimRouteName !== null
      ? `Interim: build ${plan.practical.interimRouteName} yourself. Target: ${plan.bestTechnical.name} with the support its suitability requires.`
      : `Do not implement independently. ${SUITABILITY_LABELS[plan.bestTechnical.routeId ? (technicalRoute?.suitability ?? 'unsuitable') : 'unsuitable']} for the best technical route.`;

  return {
    verdict: verdict.verdict,
    verdictLabel: verdict.label,
    mainReason:
      verdict.decidedBy === 'critical-gate'
        ? (verdict.gates.find((gate) => gate.id === verdict.decidingGate)?.detail ?? verdict.statement)
        : `Project feasibility scored ${feasibility.score}, and no critical gate overrode that band. ${verdict.statement}`,
    projectFeasibilityScore: feasibility.score,
    builderFitScore,
    confidenceScore: confidence.score,
    confidenceBand: confidence.band,
    bestTechnicalRouteName: plan.bestTechnical.name,
    practicalPathHeadline: plan.practical.headline,
    alternativeRouteName: plan.alternative?.name ?? null,
    recommendedImplementationLevel: implementationLevel,
    recommendedMaturity: maturity.recommendedStartingLevel,
    requiredTools,
    optionalTools,
    inappropriateTools,
    hostingNeeded: recommended
      ? recommended.requiredHosting
      : (delivery.hostingTarget ?? 'Not determined'),
    databaseNeeded: recommended?.requiredDatabase ?? 'Not determined: no eligible route.',
    authenticationNeeded:
      n.requiredCapabilities.authentication > 0
        ? (recommended?.authenticationRequirements ?? 'Required, but no eligible route provides it.')
        : 'Not required by the answers given. No individual sign-in requirement was identified.',
    developerSupportNeeded: cost.externalSupportRequirement,
    maintenanceDifficulty: recommended
      ? `${recommended.maintenanceLevel} for ${recommended.name}. ${n.troubleshooterDefined ? 'A maintainer has been named.' : 'No maintainer has been named, which raises this materially.'}`
      : 'Not determined: no eligible route.',
    whatNotToBuildYet,
    requiredConditions: verdict.conditions,
    conditionsThatCouldChange,
    immediateNextActions: verdict.nextActions.slice(0, 3),
    provenance: 'derived',
  };
}

export function maturityLabel(level: MaturityAssessment['requiredLevel']): string {
  return MATURITY_LABELS[level];
}
