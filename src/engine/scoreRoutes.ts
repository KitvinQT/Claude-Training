import { ROUTE_PROFILES, type RouteProfile } from '@/data/routeProfiles';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import { scoreBuilderForRoute } from '@/engine/scoreBuilderByRoute';
import type {
  BuilderFitResult,
  CapabilityGap,
  CapabilityId,
  CostCategory,
  Driver,
  EffortEstimate,
  ExistingSolutionCheck,
  MaturityLevel,
  RouteAssessment,
  RouteExclusion,
  TechnicalStatus,
} from '@/engine/types';
import {
  CAPABILITY_LABELS,
  CAPABILITY_ORDER,
  MATURITY_LABELS,
  MATURITY_ORDER,
  PRICING_VERIFICATION_STATEMENT,
  ROUTE_IDS,
} from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Route evaluation.
 *
 * Order of reasoning per route:
 *   1. capability match against what the project actually requires
 *   2. technical status (independent of the builder and of user restrictions)
 *   3. exclusions (user restrictions, environment restrictions, security)
 *   4. fit score, which a preference bonus can nudge but never rescue
 * ------------------------------------------------------------------ */

const COST_ORDER: readonly CostCategory[] = [
  'free-or-existing',
  'low',
  'moderate',
  'high',
  'very-high',
  'not-justified',
];

/** Highest cost category the stated budget can absorb. */
const BUDGET_CAPACITY: Record<NormalizedIntake['budgetTier'], CostCategory> = {
  none: 'free-or-existing',
  'under-500': 'low',
  '500-2500': 'moderate',
  '2500-10000': 'high',
  'over-10000': 'very-high',
  unknown: 'free-or-existing',
};

const SCOPE_MULTIPLIER: Record<NormalizedIntake['scopeTier'], number> = {
  tiny: 0.5,
  small: 0.7,
  moderate: 1,
  large: 1.5,
  'very-large': 2.2,
  unknown: 1,
};

/** Maximum points a stated preference may add. Never enough to clear a blocker. */
export const PREFERENCE_BONUS_CAP = 6;

/**
 * Fit starts below the ceiling so that positive matches still register instead
 * of being clipped at 100. A route that matches everything and carries a
 * preference lands near the top; a route with a blocking gap cannot.
 */
const FIT_BASE = 85;

function costIndex(category: CostCategory): number {
  return COST_ORDER.indexOf(category);
}

function maturityIndex(level: MaturityLevel): number {
  return MATURITY_ORDER.indexOf(level);
}

function ceilingOf(profile: RouteProfile): MaturityLevel {
  return profile.supportedMaturity.reduce<MaturityLevel>(
    (highest, level) => (maturityIndex(level) > maturityIndex(highest) ? level : highest),
    'concept',
  );
}

function capabilityGaps(profile: RouteProfile, n: NormalizedIntake): CapabilityGap[] {
  const gaps: CapabilityGap[] = [];
  for (const id of CAPABILITY_ORDER) {
    const required = n.requiredCapabilities[id];
    const available = profile.capabilities[id];
    if (required === 0 || available >= required) continue;
    const gap = required - available;
    gaps.push({
      id,
      label: CAPABILITY_LABELS[id],
      required,
      available,
      gap,
      // A total absence of a required capability blocks the route; a shortfall limits it.
      severity: available === 0 || gap >= 2 ? 'blocking' : 'limiting',
      note: `${CAPABILITY_LABELS[id]}: ${n.capabilityReasons[id as CapabilityId]} ${profile.name} provides level ${available} of the ${required} required.`,
    });
  }
  return gaps;
}

function technicalStatusFor(
  profile: RouteProfile,
  gaps: readonly CapabilityGap[],
  maturityShortfall: number,
  n: NormalizedIntake,
): { status: TechnicalStatus; notes: string[] } {
  const notes: string[] = [];
  const blocking = gaps.filter((gap) => gap.severity === 'blocking');
  const limiting = gaps.filter((gap) => gap.severity === 'limiting');

  notes.push(
    'Technical status describes the route itself. It is not reduced by the current builder’s experience, and it is not reduced by the restrictions you have chosen.',
  );

  if (blocking.length > 0) {
    notes.push(
      `Cannot provide: ${blocking.map((gap) => gap.label.toLowerCase()).join(', ')}.`,
    );
    return { status: 'technically-blocked', notes };
  }

  const verificationNeeded = profile.capabilitiesRequiringVerification.length > 0 &&
    CAPABILITY_ORDER.some(
      (id) => n.requiredCapabilities[id] >= 2 && profile.capabilities[id] === 2,
    );

  if (limiting.length > 0 || maturityShortfall > 0) {
    if (maturityShortfall > 0) {
      notes.push(
        `Supports up to ${MATURITY_LABELS[ceilingOf(profile)].toLowerCase()}, while this project needs ${MATURITY_LABELS[n.requiredMaturity].toLowerCase()}.`,
      );
    }
    if (limiting.length > 0) {
      notes.push(`Partially provides: ${limiting.map((gap) => gap.label.toLowerCase()).join(', ')}.`);
    }
    return { status: 'feasible-with-limitations', notes };
  }

  if (verificationNeeded) {
    notes.push(
      `Depends on product or plan specifics that must be checked: ${profile.capabilitiesRequiringVerification.join('; ')}.`,
    );
    return { status: 'requires-verification', notes };
  }

  notes.push('Meets every capability this project requires.');
  return { status: 'technically-feasible', notes };
}

function exclusionFor(
  profile: RouteProfile,
  n: NormalizedIntake,
  gaps: readonly CapabilityGap[],
): RouteExclusion | null {
  if (n.restrictedRoutes.includes(profile.id)) {
    return {
      type: 'restricted-method',
      reason: `Excluded because you listed ${profile.name} under restricted methods. This is a stated constraint, not a technical judgement: the route may remain technically valid.`,
    };
  }

  if (profile.requiresLocalEnvironment && n.browserOnly) {
    const stated = n.localRestrictions.join(', ');
    return {
      type: 'environment-restriction',
      reason: `Excluded because ${profile.name} normally needs a local development environment, which your stated restrictions rule out (${stated}). The route remains technically valid where those restrictions do not apply.`,
    };
  }

  const blocking = gaps.filter((gap) => gap.severity === 'blocking');
  if (blocking.length > 0) {
    return {
      type: 'capability-blocker',
      reason: `Excluded because it cannot provide ${blocking.map((gap) => gap.label.toLowerCase()).join(' or ')}, which this project requires.`,
    };
  }

  // Sensitive data with no access control at all is a security blocker, not a limitation.
  if (
    n.sensitiveData &&
    n.requiredCapabilities.authentication > 0 &&
    profile.capabilities.authentication === 0
  ) {
    return {
      type: 'security-blocker',
      reason: `Excluded because sensitive information is involved and ${profile.name} offers no authentication or access control.`,
    };
  }

  return null;
}

function effortFor(profile: RouteProfile, n: NormalizedIntake): EffortEstimate {
  const scopeMultiplier = SCOPE_MULTIPLIER[n.scopeTier];
  const basis: string[] = [
    `${profile.name} base range of ${profile.baseEffortHours[0]}-${profile.baseEffortHours[1]} builder hours for a moderate scope.`,
    `Scope multiplier ${scopeMultiplier} (${n.scopeTier === 'unknown' ? 'scope not stated, treated as moderate' : `${n.scopeTier} scope, ${n.mustHaveCount} must-have features`}).`,
  ];

  // Routes that own their own implementation carry extra work per required capability.
  let capabilityMultiplier = 1;
  if (profile.ownershipBurden === 'high') {
    const selfBuilt = CAPABILITY_ORDER.filter((id) => n.requiredCapabilities[id] >= 2);
    capabilityMultiplier = 1 + 0.2 * selfBuilt.length;
    if (selfBuilt.length > 0) {
      basis.push(
        `Capability multiplier ${Math.round(capabilityMultiplier * 100) / 100}: this route implements ${selfBuilt.map((id) => CAPABILITY_LABELS[id].toLowerCase()).join(', ')} itself.`,
      );
    }
  } else if (CAPABILITY_ORDER.some((id) => n.requiredCapabilities[id] >= 2)) {
    capabilityMultiplier = 1.1;
    basis.push('Capability multiplier 1.1: platform configuration for the required capabilities.');
  }

  const low = Math.round(profile.baseEffortHours[0] * scopeMultiplier * capabilityMultiplier);
  const high = Math.round(profile.baseEffortHours[1] * scopeMultiplier * capabilityMultiplier);
  basis.push('Ranges are deliberately broad. They are estimates, not quotations.');

  return { lowHours: low, highHours: high, basis, provenance: 'estimate' };
}

function fitScoreFor(
  profile: RouteProfile,
  n: NormalizedIntake,
  gaps: readonly CapabilityGap[],
  effort: EffortEstimate,
  existing: ExistingSolutionCheck,
  excluded: RouteExclusion | null,
): { score: number; drivers: Driver[] } {
  const drivers: Driver[] = [];
  let score = FIT_BASE;

  function apply(text: string, points: number): void {
    if (points === 0) return;
    score += points;
    drivers.push({ text, points });
  }

  for (const gap of gaps.slice(0, 4)) {
    apply(
      `${gap.severity === 'blocking' ? 'Cannot provide' : 'Only partly provides'} ${gap.label.toLowerCase()}`,
      gap.severity === 'blocking' ? -45 : -10,
    );
  }

  const shortfall = maturityIndex(n.requiredMaturity) - maturityIndex(ceilingOf(profile));
  if (shortfall > 0) {
    apply(
      `Reaches ${MATURITY_LABELS[ceilingOf(profile)].toLowerCase()} at best, against a required ${MATURITY_LABELS[n.requiredMaturity].toLowerCase()}`,
      -Math.min(36, shortfall * 12),
    );
  } else if (shortfall < 0) {
    apply('Comfortably exceeds the maturity level this project needs', 4);
  }

  const capacity = BUDGET_CAPACITY[n.budgetTier];
  const routeCost = costIndex(profile.setupCost) > costIndex(profile.monthlyCost)
    ? profile.setupCost
    : profile.monthlyCost;
  if (costIndex(routeCost) > costIndex(capacity)) {
    apply(
      `Cost category (${routeCost}) sits above what the stated budget can absorb (${capacity})`,
      -20,
    );
  } else if (costIndex(routeCost) < costIndex(capacity)) {
    apply('Cost category sits comfortably inside the stated budget', 5);
  }

  const weeklyHours = n.weeklyHours ?? 4;
  const weeks = n.deadlineWeeks ?? 12;
  const capacityHours = weeklyHours * weeks;
  if (effort.highHours > capacityHours * 2) {
    apply(
      `Estimated effort (${effort.lowHours}-${effort.highHours} hours) is far beyond the roughly ${Math.round(capacityHours)} hours available before the deadline`,
      -28,
    );
  } else if (effort.highHours > capacityHours) {
    apply(
      `Estimated effort (${effort.lowHours}-${effort.highHours} hours) exceeds the roughly ${Math.round(capacityHours)} hours available before the deadline`,
      -18,
    );
  } else if (effort.highHours <= capacityHours * 0.5) {
    apply('Estimated effort fits comfortably within the time available', 6);
  }

  if (
    (n.maintenanceTier === 'one-off' || n.maintenanceTier === 'occasional') &&
    profile.ownershipBurden === 'high'
  ) {
    apply('Demands ongoing ownership that the stated maintenance expectation does not cover', -12);
  }
  if (n.sensitiveData && profile.capabilities['role-based-access'] === 0) {
    apply('Offers no role-based access for sensitive information', -10);
  }
  if (n.sensitiveData && profile.capabilities['audit-history'] === 0 && n.requiredCapabilities['audit-history'] > 0) {
    apply('Keeps no change history where one is required', -8);
  }

  if (existing.preferExisting) {
    if (profile.isExistingProduct) {
      apply('An existing product covers this need without a build', 10);
    } else if (profile.ownershipBurden === 'high') {
      apply('A custom build is hard to justify when a suitable product already exists', -10);
    }
  }

  if (n.preferredRoutes.includes(profile.id) && excluded === null) {
    const blocked = gaps.some((gap) => gap.severity === 'blocking');
    apply(
      blocked
        ? 'Stated as a preferred approach, but a blocker cannot be offset by preference'
        : 'Stated as a preferred approach',
      blocked ? 0 : PREFERENCE_BONUS_CAP,
    );
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), drivers };
}

function conditionsFor(
  profile: RouteProfile,
  n: NormalizedIntake,
  builderFit: BuilderFitResult,
  effort: EffortEstimate,
): string[] {
  const conditions = [...profile.conditionsBeforeSelection];

  if (
    builderFit.suitability === 'requires-developer-support' ||
    builderFit.suitability === 'requires-professional-implementation'
  ) {
    conditions.push(
      'Arrange developer support before starting: the current capability profile does not cover this route unaided.',
    );
  } else if (builderFit.suitability === 'requires-technical-support') {
    conditions.push('Line up technical guidance for the parts of this route that are new to you.');
  }

  const capacity = BUDGET_CAPACITY[n.budgetTier];
  const routeCost = costIndex(profile.setupCost) > costIndex(profile.monthlyCost)
    ? profile.setupCost
    : profile.monthlyCost;
  if (costIndex(routeCost) > costIndex(capacity)) {
    conditions.push(
      `Funding condition: this route's cost category (${routeCost}) exceeds the stated budget. It should not be selected without agreed funding. ${PRICING_VERIFICATION_STATEMENT}`,
    );
  }

  const capacityHours = (n.weeklyHours ?? 4) * (n.deadlineWeeks ?? 12);
  if (effort.highHours > capacityHours) {
    conditions.push(
      'Either extend the deadline, reduce the first release, or add help: the estimated effort exceeds the time available.',
    );
  }

  if (n.sensitiveData && profile.capabilities['role-based-access'] < 2) {
    conditions.push(
      'Sensitive information must not be placed in this route until access can be restricted per person.',
    );
  }
  if (n.consequentialDomain !== 'none') {
    conditions.push(
      `Human approval is mandatory for any ${n.consequentialDomain} decision. This route may organise and draft, but a named person decides.`,
    );
  }
  if (profile.capabilitiesRequiringVerification.length > 0) {
    conditions.push(
      `Verify before committing: ${profile.capabilitiesRequiringVerification.join('; ')}.`,
    );
  }

  return conditions;
}

export function assessRoute(
  routeId: RouteAssessment['routeId'],
  n: NormalizedIntake,
  existing: ExistingSolutionCheck,
): RouteAssessment {
  const profile = ROUTE_PROFILES[routeId];
  const gaps = capabilityGaps(profile, n);
  const shortfall = maturityIndex(n.requiredMaturity) - maturityIndex(ceilingOf(profile));
  const { status, notes } = technicalStatusFor(profile, gaps, Math.max(0, shortfall), n);
  const excluded = exclusionFor(profile, n, gaps);
  const builderFit = scoreBuilderForRoute(routeId, n);
  const effort = effortFor(profile, n);
  const { score, drivers } = fitScoreFor(profile, n, gaps, effort, existing, excluded);

  const blockers: string[] = gaps
    .filter((gap) => gap.severity === 'blocking')
    .map((gap) => gap.note);
  if (excluded?.type === 'security-blocker') blockers.push(excluded.reason);
  for (const blocker of profile.productionBlockers) {
    if (n.requiredMaturity === 'production-ready') blockers.push(blocker);
  }

  return {
    routeId,
    name: profile.name,
    summary: profile.summary,
    technicalStatus: status,
    technicalNotes: notes,
    fitScore: score,
    fitDrivers: drivers,
    builderFit,
    suitability: builderFit.suitability,
    maturityCeiling: ceilingOf(profile),
    supportedMaturity: profile.supportedMaturity,
    requiredSkills: profile.requiredSkills,
    requiredTechnicalSupport: profile.requiredTechnicalSupport,
    requiredHosting: profile.requiredHosting,
    requiredDatabase: profile.requiredDatabase,
    authenticationRequirements: profile.authenticationRequirements,
    securityConsiderations: profile.securityConsiderations,
    effort,
    setupCost: profile.setupCost,
    monthlyCost: profile.monthlyCost,
    maintenanceLevel: profile.maintenanceLevel,
    scalability: profile.scalability,
    vendorDependency: profile.vendorDependency,
    strengths: profile.strengths,
    limitations: profile.limitations,
    blockers,
    capabilityGaps: gaps,
    conditionsBeforeSelection: conditionsFor(profile, n, builderFit, effort),
    excluded,
    eligibleForRecommendation: excluded === null && status !== 'technically-blocked',
    provenance: 'derived',
  };
}

export function scoreRoutes(
  n: NormalizedIntake,
  existing: ExistingSolutionCheck,
): readonly RouteAssessment[] {
  return ROUTE_IDS.map((routeId) => assessRoute(routeId, n, existing));
}

/**
 * Picks the recommended route. Eligibility comes first, so an excluded or
 * technically blocked route can never win on score. Ties break by lower effort,
 * then by the fixed route order, so the result is deterministic.
 */
export function selectRecommendedRoute(
  routes: readonly RouteAssessment[],
): RouteAssessment | null {
  const eligible = routes.filter((route) => route.eligibleForRecommendation);
  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    if (b.builderFit.score !== a.builderFit.score) return b.builderFit.score - a.builderFit.score;
    if (a.effort.highHours !== b.effort.highHours) return a.effort.highHours - b.effort.highHours;
    return ROUTE_IDS.indexOf(a.routeId) - ROUTE_IDS.indexOf(b.routeId);
  })[0] ?? null;
}
