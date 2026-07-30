import { ROUTE_PROFILES, type RouteProfile } from '@/data/routeProfiles';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  AbilityFactor,
  AbilityId,
  BuilderFitResult,
  Driver,
  Level,
  RouteId,
  SuitabilityLabel,
} from '@/engine/types';
import { ABILITY_LABELS, ABILITY_ORDER, ROUTE_IDS } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Builder Fit, calculated separately for every route.
 *
 * The same builder can be a strong fit for a spreadsheet workflow and a poor
 * fit for a custom hosted application. Nothing in this module feeds back into
 * the Project Feasibility Score.
 * ------------------------------------------------------------------ */

/** Abilities inferred rather than asked about directly. */
const DERIVED_ABILITIES: readonly AbilityId[] = [
  'deployment',
  'security-management',
  'maintenance',
  'learning-capacity',
];

function factorScoreFor(gap: number): number {
  // A one-level gap costs 25 points, so a four-level gap reaches zero.
  return Math.max(0, Math.min(100, 100 - gap * 25));
}

function suitabilityFor(
  score: number,
  profile: RouteProfile,
  n: NormalizedIntake,
  codingGap: number,
  securityGap: number,
): SuitabilityLabel {
  if (score < 25) return 'unsuitable';

  const highOwnership = profile.ownershipBurden === 'high';
  if (highOwnership && !n.developerSupportAvailable && score < 55) {
    // Nobody to hand it to, and the route demands ongoing ownership.
    return 'requires-professional-implementation';
  }
  if (highOwnership && codingGap >= 2 && score < 70) {
    return 'requires-developer-support';
  }

  let label: SuitabilityLabel =
    score >= 85
      ? 'suitable-now'
      : score >= 70
        ? 'light-guidance'
        : score >= 55
          ? 'requires-technical-support'
          : score >= 40
            ? 'requires-developer-support'
            : 'requires-professional-implementation';

  // Two honesty constraints on the top label.
  // 1. Sensitive information raises the bar: "suitable now" requires either no
  //    security-management shortfall or some support to fall back on.
  if (
    label === 'suitable-now' &&
    n.sensitiveData &&
    (securityGap > 0 || (!n.guidanceAvailable && !n.developerSupportAvailable))
  ) {
    label = 'light-guidance';
  }
  // 2. Where capability answers were left unknown, the assessment cannot claim
  //    the route is already suitable.
  if (label === 'suitable-now' && n.builderAnswersUnknown.length > 0) {
    label = 'light-guidance';
  }

  return label;
}

export function scoreBuilderForRoute(
  routeId: RouteId,
  n: NormalizedIntake,
): BuilderFitResult {
  const profile = ROUTE_PROFILES[routeId];
  const factors: AbilityFactor[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];

  const importanceTotal = ABILITY_ORDER.reduce(
    (sum, ability) => sum + (profile.builderImportance[ability] ?? 0),
    0,
  );

  let weightedScore = 0;
  let codingGap = 0;
  let securityGap = 0;

  for (const ability of ABILITY_ORDER) {
    const builderLevel = (n.abilities[ability] ?? 0) as Level;
    // Sensitive information raises what the builder needs to manage safely,
    // whichever route is used. Documented as a project-context uplift.
    const uplift =
      ability === 'security-management' && n.sensitiveData ? 1 : 0;
    const requiredLevel = Math.min(
      4,
      profile.builderRequirements[ability] + uplift,
    ) as Level;
    const rawWeight = profile.builderImportance[ability] ?? 0;
    const weight = importanceTotal === 0 ? 0 : rawWeight / importanceTotal;
    const gap = Math.max(0, requiredLevel - builderLevel);
    const factorScore = factorScoreFor(gap);

    if (ability === 'coding') codingGap = gap;
    if (ability === 'security-management') securityGap = gap;

    weightedScore += factorScore * weight;

    factors.push({
      id: ability,
      label: ABILITY_LABELS[ability],
      builderLevel,
      requiredLevel,
      gap,
      weight: Math.round(weight * 1000) / 1000,
      factorScore,
      note: n.abilityNotes[ability] ?? '',
    });

    if (requiredLevel > 0 && gap === 0 && rawWeight >= 1) {
      strengths.push(
        `${ABILITY_LABELS[ability]} meets what this route needs (level ${builderLevel} against ${requiredLevel} required).`,
      );
    }
    if (gap > 0 && rawWeight >= 0.5) {
      gaps.push(
        `${ABILITY_LABELS[ability]} is ${gap} level${gap === 1 ? '' : 's'} below what this route needs (level ${builderLevel} against ${requiredLevel} required).`,
      );
    }
  }

  /* ---- support adjustments ---- */
  const supportAdjustments: Driver[] = [];
  const learningBurden = profile.builderRequirements['learning-capacity'];
  const guidance = n.abilities['guidance-available'] ?? 0;
  const developerSupport = n.abilities['developer-support-available'] ?? 0;

  if (guidance > 0 && learningBurden >= 2) {
    const points = Math.min(6, guidance * 2);
    supportAdjustments.push({
      text: 'Technical guidance is available to draw on while learning this route',
      points,
    });
  }
  if (developerSupport >= 3 && profile.ownershipBurden === 'high') {
    supportAdjustments.push({
      text: 'Developer support is available for a route that demands ongoing ownership',
      points: 8,
    });
  } else if (developerSupport === 2 && profile.ownershipBurden === 'high') {
    supportAdjustments.push({
      text: 'Short-term developer help could be hired for a route that demands ongoing ownership',
      points: 4,
    });
  }
  if (developerSupport === 0 && profile.ownershipBurden === 'high' && codingGap >= 2) {
    supportAdjustments.push({
      text: 'No developer support is available for a route that expects code ownership',
      points: -6,
    });
  }
  if (n.browserOnly && profile.requiresLocalEnvironment) {
    supportAdjustments.push({
      text: 'The stated environment restrictions conflict with this route’s working method',
      points: -8,
    });
  }

  const adjustmentTotal = supportAdjustments.reduce((sum, item) => sum + item.points, 0);
  let score = Math.max(0, Math.min(100, Math.round(weightedScore + adjustmentTotal)));

  /*
   * A serious shortfall in an ability this route leans on cannot be averaged
   * away by strengths elsewhere - the same principle the verdict gates apply.
   * Only routes where the builder owns the implementation are capped this way;
   * configuring an existing product is a different kind of work.
   */
  const ownsImplementation =
    profile.ownershipBurden === 'high' || profile.ownershipBurden === 'moderate';
  const criticalGaps = factors.filter(
    (factor) => factor.gap >= 2 && (profile.builderImportance[factor.id] ?? 0) >= 1.5,
  );
  if (ownsImplementation && criticalGaps.length >= 3) {
    score = Math.min(score, 39);
    supportAdjustments.push({
      text: `Capped: ${criticalGaps.length} abilities this route depends on are two or more levels short (${criticalGaps.map((factor) => factor.label.toLowerCase()).join(', ')})`,
      points: 0,
    });
  } else if (ownsImplementation && criticalGaps.length > 0) {
    score = Math.min(score, 54);
    supportAdjustments.push({
      text: `Capped: ${criticalGaps.map((factor) => factor.label.toLowerCase()).join(' and ')} ${criticalGaps.length === 1 ? 'is' : 'are'} two or more levels short of what this route needs, which strengths elsewhere do not offset`,
      points: 0,
    });
  }

  /* ---- assumptions and unknowns ---- */
  const assumptionsUsed = DERIVED_ABILITIES.filter(
    (ability) => profile.builderRequirements[ability] > 0,
  ).map((ability) => `${ABILITY_LABELS[ability]}: ${n.abilityNotes[ability] ?? 'derived'}`);

  if (n.builderAnswersUnknown.length > 0) {
    assumptionsUsed.push(
      `Where a capability answer was left unknown (${n.builderAnswersUnknown.join(', ')}), no experience was assumed. This is a conservative placeholder, not a statement about the builder.`,
    );
  }

  const explanation = [
    `Each of the ${ABILITY_ORDER.length} factors is scored by comparing the builder's assessed level (0-4) against what ${profile.name} requires; a one-level shortfall costs 25 points on that factor.`,
    `Factors are weighted by how much they matter for this route, then combined into ${Math.round(weightedScore)} before support adjustments.`,
    adjustmentTotal === 0
      ? 'No support adjustments applied.'
      : `Support adjustments changed the result by ${adjustmentTotal > 0 ? '+' : ''}${adjustmentTotal}.`,
    'This score affects the recommended route, the conditions, and the timeline. It never changes the Project Feasibility Score or the technical status.',
  ];

  return {
    routeId,
    score,
    suitability: suitabilityFor(score, profile, n, codingGap, securityGap),
    factors,
    strengths,
    gaps,
    supportAdjustments,
    assumptionsUsed,
    unknownsAffecting: n.builderAnswersUnknown,
    explanation,
    provenance: 'derived',
  };
}

export function scoreBuilderByRoute(n: NormalizedIntake): readonly BuilderFitResult[] {
  return ROUTE_IDS.map((routeId) => scoreBuilderForRoute(routeId, n));
}
