import { ROUTE_DELIVERY } from '@/data/routeDelivery';
import { ROUTE_PROFILES } from '@/data/routeProfiles';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  AlternativeRouteCard,
  MaturityLevel,
  PracticalMode,
  PracticalPathCard,
  RouteAssessment,
  RoutePlan,
  SuitabilityLabel,
  TechnicalRouteCard,
} from '@/engine/types';
import {
  CAPABILITY_LABELS,
  CAPABILITY_ORDER,
  MATURITY_LABELS,
  MATURITY_ORDER,
  ROUTE_IDS,
  SUITABILITY_LABELS,
} from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Best technical route, recommended practical path, best alternative.
 *
 * The point of this module is to stop "technically best" being read as
 * "personally build this immediately". The technical choice ignores the
 * builder entirely; the practical choice is the one that accounts for who is
 * actually available to do the work.
 * ------------------------------------------------------------------ */

/** Suitability labels that must never be described as ready to build now. */
const NOT_INDEPENDENT: readonly SuitabilityLabel[] = [
  'requires-developer-support',
  'requires-professional-implementation',
  'unsuitable',
];

export function isIndependentlyDoable(suitability: SuitabilityLabel): boolean {
  return !NOT_INDEPENDENT.includes(suitability);
}

function maturityIndex(level: MaturityLevel): number {
  return MATURITY_ORDER.indexOf(level);
}

/**
 * Technical satisfaction only: capability coverage and maturity headroom.
 * Deliberately blind to Builder Fit, cost, and time.
 */
function technicalScore(route: RouteAssessment, n: NormalizedIntake): number {
  let score = 100;
  for (const gap of route.capabilityGaps) {
    score -= gap.severity === 'blocking' ? 50 : 12;
  }
  const shortfall = maturityIndex(n.requiredMaturity) - maturityIndex(route.maturityCeiling);
  if (shortfall > 0) score -= shortfall * 15;
  // Headroom above the required level is a mild plus, not a licence to over-build.
  if (shortfall < 0) score += 2;
  // "Requires verification" is deliberately not penalised here. It means a
  // product detail must be checked, not that the route is technically weaker -
  // and penalising it would quietly favour hand-built routes over platform ones.
  return score;
}

/** Least ownership first, among routes that satisfy the requirements equally. */
const OWNERSHIP_ORDER: Record<string, number> = {
  minimal: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

export function buildRoutePlan(
  n: NormalizedIntake,
  routes: readonly RouteAssessment[],
  practicalRoute: RouteAssessment | null,
): RoutePlan {
  const eligible = routes.filter((route) => route.eligibleForRecommendation);

  /* ---------- A. best technical route ---------- */
  const ranked = [...eligible].sort((a, b) => {
    const diff = technicalScore(b, n) - technicalScore(a, n);
    if (diff !== 0) return diff;
    // Equal technical satisfaction: prefer the route that gets there with less
    // ownership, then with less effort. Satisfying the requirement by hand is not
    // technically better than satisfying it with a platform.
    const ownership =
      (OWNERSHIP_ORDER[ROUTE_PROFILES[a.routeId].ownershipBurden] ?? 3) -
      (OWNERSHIP_ORDER[ROUTE_PROFILES[b.routeId].ownershipBurden] ?? 3);
    if (ownership !== 0) return ownership;
    if (a.effort.highHours !== b.effort.highHours) return a.effort.highHours - b.effort.highHours;
    return ROUTE_IDS.indexOf(a.routeId) - ROUTE_IDS.indexOf(b.routeId);
  });

  const technicalRoute = ranked[0] ?? practicalRoute ?? routes[0]!;
  const bestTechnical = technicalCard(technicalRoute, n);

  /* ---------- B. recommended practical path ---------- */
  const practical = practicalCard(n, technicalRoute, practicalRoute, eligible);

  /* ---------- C. best alternative ---------- */
  const usedIds = new Set(
    [technicalRoute.routeId, practical.routeId, practical.interimRouteId].filter(Boolean),
  );
  const alternativeRoute =
    eligible
      .filter((route) => !usedIds.has(route.routeId))
      .sort((a, b) => {
        // The next strongest *realistic* option: fit, then how doable it is.
        const doable = Number(isIndependentlyDoable(b.suitability)) - Number(isIndependentlyDoable(a.suitability));
        if (doable !== 0) return doable;
        if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
        return ROUTE_IDS.indexOf(a.routeId) - ROUTE_IDS.indexOf(b.routeId);
      })[0] ?? null;

  const alternative = alternativeRoute
    ? alternativeCard(alternativeRoute, technicalRoute, n)
    : null;

  const technicalRouteLabel = labelForTechnicalRoute(technicalRoute.suitability);

  return {
    bestTechnical,
    practical,
    alternative,
    technicalRouteLabel,
    separationStatement:
      'The best technical route answers "what would satisfy the requirements". The recommended practical path answers "what should this team do next". They are often different, and the difference is not a failure of the project.',
  };
}

function labelForTechnicalRoute(suitability: SuitabilityLabel): string {
  switch (suitability) {
    case 'suitable-now':
      return 'Best technical route, and suitable for the current builder';
    case 'light-guidance':
      return 'Best technical route, suitable with light guidance';
    case 'requires-technical-support':
      return 'Best technical route, suitable with technical support';
    case 'requires-developer-support':
      return 'Best technical route. Technically suitable with developer support - not suitable for independent implementation';
    case 'requires-professional-implementation':
      return 'Best technical route. Requires professional implementation - not suitable for independent implementation';
    case 'unsuitable':
      return 'Best technical route on the requirements, but unsuitable under current conditions';
  }
}

function technicalCard(route: RouteAssessment, n: NormalizedIntake): TechnicalRouteCard {
  const delivery = ROUTE_DELIVERY[route.routeId];
  const profile = ROUTE_PROFILES[route.routeId];

  const requiredCapabilities = CAPABILITY_ORDER.filter((id) => n.requiredCapabilities[id] > 0).map(
    (id) => `${CAPABILITY_LABELS[id]}: ${n.capabilityReasons[id]}`,
  );

  const whyItFits: string[] = [];
  if (route.capabilityGaps.length === 0) {
    whyItFits.push('Covers every capability the project requires, with nothing missing.');
  } else {
    whyItFits.push(
      `Covers the requirements apart from ${route.capabilityGaps.map((gap) => gap.label.toLowerCase()).join(' and ')}.`,
    );
  }
  whyItFits.push(
    `Supports up to ${MATURITY_LABELS[route.maturityCeiling].toLowerCase()}, against a required ${MATURITY_LABELS[n.requiredMaturity].toLowerCase()}.`,
  );
  whyItFits.push(...route.strengths.slice(0, 2));

  const requiredSecurityInfrastructure: string[] = [];
  if (n.requiredCapabilities.authentication > 0) {
    requiredSecurityInfrastructure.push(profile.authenticationRequirements);
  }
  if (n.requiredCapabilities.persistence > 0) {
    requiredSecurityInfrastructure.push(profile.requiredDatabase);
  }
  requiredSecurityInfrastructure.push(profile.requiredHosting);
  requiredSecurityInfrastructure.push(...profile.securityConsiderations.slice(0, 2));

  return {
    routeId: route.routeId,
    name: route.name,
    whyItFits,
    requiredCapabilities:
      requiredCapabilities.length > 0
        ? requiredCapabilities
        : ['No storage, account, or collaboration capabilities were identified as required.'],
    requiredSecurityInfrastructure,
    builderSupportNeeded: `${SUITABILITY_LABELS[route.suitability]} (Builder Fit ${route.builderFit.score} of 100 for this route). ${profile.requiredTechnicalSupport}`,
    mainLimitation: route.limitations[0] ?? 'No significant limitation identified.',
    buildMethod: delivery.buildMethod,
    finalSolutionType: delivery.finalSolutionType,
    hostingTarget: delivery.hostingTarget,
    builderRequirement: delivery.builderRequirementSummary,
    overlapNote: delivery.overlapNote,
    provenance: 'derived',
  };
}

function practicalCard(
  n: NormalizedIntake,
  technicalRoute: RouteAssessment,
  practicalRoute: RouteAssessment | null,
  eligible: readonly RouteAssessment[],
): PracticalPathCard {
  /* Nothing available at all. */
  if (eligible.length === 0 || practicalRoute === null) {
    return {
      routeId: null,
      name: 'No route currently available',
      headline: 'Practical next step: change a condition before building anything',
      mode: 'no-action',
      whatToDoNow: [
        'Relax one restriction, reduce the requirements, or secure the support needed.',
        'Re-run this assessment once something has changed.',
      ],
      canBuilderPerformIt: false,
      builderStatement:
        'No route is currently available, so there is nothing for the builder to attempt.',
      supportNeeded: 'Depends on which condition changes.',
      interimRouteId: null,
      interimRouteName: null,
      interimRationale: null,
      immediateValidationStep:
        'Write down the single condition that, if changed, would open the most options.',
      provenance: 'derived',
    };
  }

  /*
   * The route this team should work on is one the builder can actually perform.
   * That is judged on the practical route, not the technical one: the two can
   * differ without anybody needing extra support.
   */
  if (isIndependentlyDoable(practicalRoute.suitability)) {
    const mode: PracticalMode =
      practicalRoute.suitability === 'suitable-now'
        ? 'build-now'
        : practicalRoute.suitability === 'light-guidance'
          ? 'build-with-guidance'
          : 'build-with-technical-support';

    const differsFromTechnical = practicalRoute.routeId !== technicalRoute.routeId;

    return {
      routeId: practicalRoute.routeId,
      name: practicalRoute.name,
      headline:
        mode === 'build-now'
          ? `Recommended for you now: ${practicalRoute.name}`
          : `Recommended for you now, with support: ${practicalRoute.name}`,
      mode,
      whatToDoNow: [
        `Start with ${practicalRoute.name} at ${MATURITY_LABELS[startingLevel(n)].toLowerCase()} level.`,
        ...(differsFromTechnical
          ? [
              `The best technical route (${technicalRoute.name}) has more headroom, and is ${SUITABILITY_LABELS[technicalRoute.suitability].toLowerCase()}. It is not required for the first version, and moving to it later is a deliberate decision rather than a fix.`,
            ]
          : []),
        ...practicalRoute.conditionsBeforeSelection.slice(0, 2),
      ],
      canBuilderPerformIt: true,
      builderStatement: `${SUITABILITY_LABELS[practicalRoute.suitability]} (Builder Fit ${practicalRoute.builderFit.score} of 100 for this route).`,
      supportNeeded:
        mode === 'build-now'
          ? 'None expected for this route.'
          : mode === 'build-with-guidance'
            ? 'Occasional advice while learning the unfamiliar parts.'
            : 'Arranged technical guidance for the unfamiliar parts.',
      interimRouteId: null,
      interimRouteName: null,
      interimRationale: null,
      immediateValidationStep: validationStep(n),
      provenance: 'derived',
    };
  }

  /* The practical route needs support. Look for something useful to do meanwhile. */
  const interim =
    eligible
      .filter(
        (route) =>
          route.routeId !== practicalRoute.routeId &&
          route.routeId !== technicalRoute.routeId &&
          isIndependentlyDoable(route.suitability),
      )
      .sort((a, b) => b.fitScore - a.fitScore)[0] ?? null;

  const supportWord =
    practicalRoute.suitability === 'requires-professional-implementation'
      ? 'professional implementation'
      : practicalRoute.suitability === 'unsuitable'
        ? 'a different arrangement entirely'
        : 'developer support';

  return {
    routeId: interim?.routeId ?? null,
    name: interim?.name ?? technicalRoute.name,
    headline: interim
      ? `Practical next step: secure ${supportWord}. Practical interim route: ${interim.name}`
      : `Practical next step: secure ${supportWord} before building`,
    mode: interim ? 'interim-then-support' : 'secure-support-first',
    whatToDoNow: [
      validationStep(n),
      `Do not attempt ${practicalRoute.name} unaided: ${SUITABILITY_LABELS[practicalRoute.suitability].toLowerCase()}.`,
      ...(interim
        ? [
            `Use ${interim.name} in the meantime to relieve the immediate problem and settle requirements.`,
          ]
        : []),
      `Obtain a written scope and cost for ${supportWord}. Pricing must be verified before implementation.`,
    ],
    canBuilderPerformIt: false,
    builderStatement: `${practicalRoute.name} is ${SUITABILITY_LABELS[practicalRoute.suitability].toLowerCase()} for the current builder (Builder Fit ${practicalRoute.builderFit.score} of 100). That is a delivery constraint, not a judgement on the project: the project itself remains feasible.`,
    supportNeeded: `${supportWord.charAt(0).toUpperCase()}${supportWord.slice(1)} for build and for ongoing maintenance.`,
    interimRouteId: interim?.routeId ?? null,
    interimRouteName: interim?.name ?? null,
    interimRationale: interim
      ? `${interim.name} is ${SUITABILITY_LABELS[interim.suitability].toLowerCase()} and can carry a reduced version of the workflow while support is arranged. It will not meet every requirement: ${interim.limitations[0]?.toLowerCase() ?? 'see its limitations'}.`
      : null,
    immediateValidationStep: validationStep(n),
    provenance: 'derived',
  };
}

function startingLevel(n: NormalizedIntake): MaturityLevel {
  if (n.requiredMaturity === 'production-ready' || n.requiredMaturity === 'pilot') {
    return 'interactive-prototype';
  }
  return n.requiredMaturity;
}

function validationStep(n: NormalizedIntake): string {
  if (!n.problemClear) {
    return 'Validate the problem first: write down what goes wrong today, how often, and who it affects.';
  }
  if (!n.sourceOfTruthDefined && n.dataDependent) {
    return 'Validate the data first: agree which single source is authoritative before anything is built.';
  }
  if (n.consequentialDomain !== 'none') {
    return `Validate the workflow with a fictional or sanitised prototype, and confirm where the human ${n.consequentialDomain} decision sits before any real data is used.`;
  }
  return 'Validate the workflow with a prototype and two or three real users before committing to a build.';
}

function alternativeCard(
  route: RouteAssessment,
  technicalRoute: RouteAssessment,
  n: NormalizedIntake,
): AlternativeRouteCard {
  const whyEasier: string[] = [];
  if (route.effort.highHours < technicalRoute.effort.highHours) {
    whyEasier.push(
      `Less work: ${route.effort.lowHours}-${route.effort.highHours} hours against ${technicalRoute.effort.lowHours}-${technicalRoute.effort.highHours} for the technical route.`,
    );
  }
  if (route.builderFit.score > technicalRoute.builderFit.score) {
    whyEasier.push(
      `Closer to the current capability: Builder Fit ${route.builderFit.score} against ${technicalRoute.builderFit.score}.`,
    );
  }
  if (route.maintenanceLevel !== 'high' && technicalRoute.maintenanceLevel === 'high') {
    whyEasier.push(`Lower upkeep: ${route.maintenanceLevel} maintenance rather than high.`);
  }
  if (route.monthlyCost === 'free-or-existing') {
    whyEasier.push('No recurring cost: it uses tools you already have.');
  }
  if (whyEasier.length === 0) {
    whyEasier.push(...route.strengths.slice(0, 2));
  }

  const capabilityLost = route.capabilityGaps.map(
    (gap) =>
      `${gap.label}: provides level ${gap.available} of the ${gap.required} this project needs.`,
  );
  if (route.maturityCeiling !== technicalRoute.maturityCeiling) {
    capabilityLost.push(
      `Maturity ceiling drops to ${MATURITY_LABELS[route.maturityCeiling].toLowerCase()}, so it cannot become the long-term system if requirements hold.`,
    );
  }
  if (capabilityLost.length === 0) {
    capabilityLost.push(
      `No required capability is lost. The trade-off is ${route.limitations[0]?.toLowerCase() ?? 'described in its limitations'}.`,
    );
  }

  const chooseWhen = isIndependentlyDoable(route.suitability)
    ? `Choose this instead when support for the technical route cannot be arranged, when the deadline matters more than completeness, or when you want to prove the workflow before committing. It is ${SUITABILITY_LABELS[route.suitability].toLowerCase()}.`
    : `Choose this only with the support its suitability implies (${SUITABILITY_LABELS[route.suitability].toLowerCase()}).`;

  return {
    routeId: route.routeId,
    name: route.name,
    whyEasier,
    capabilityLost,
    chooseWhen: n.consequentialDomain !== 'none'
      ? `${chooseWhen} Whichever route is chosen, the human ${n.consequentialDomain} decision point does not move.`
      : chooseWhen,
    provenance: 'derived',
  };
}
