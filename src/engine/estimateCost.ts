import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  BuilderFitResult,
  ConfidenceBand,
  CostCategory,
  CostEstimate,
  EffortEstimate,
  RouteAssessment,
} from '@/engine/types';
import { PRICING_VERIFICATION_STATEMENT } from '@/engine/types';
import type { ProvenanceLabel } from '@/types/labels';

/* ------------------------------------------------------------------ *
 * Cost engine.
 *
 * No dollar values, hourly rates, subscription prices, or vendor prices are
 * produced anywhere in this module. Output is effort hours plus cost
 * categories, and the pricing-verification statement is always present.
 * ------------------------------------------------------------------ */

const MAINTENANCE_EFFORT: Record<RouteAssessment['maintenanceLevel'], CostCategory> = {
  minimal: 'free-or-existing',
  low: 'low',
  moderate: 'moderate',
  high: 'high',
};

/**
 * A lower Builder Fit means more hours for the same work: more learning, more
 * rework, more checking. It does not change technical feasibility.
 */
function builderMultiplier(fit: BuilderFitResult | null): { value: number; note: string } {
  if (!fit) {
    return { value: 1, note: 'No route selected, so no builder adjustment applied.' };
  }
  if (fit.score >= 85) {
    return { value: 0.9, note: `Builder Fit ${fit.score}: work is squarely within current capability (x0.9).` };
  }
  if (fit.score >= 70) {
    return { value: 1, note: `Builder Fit ${fit.score}: no adjustment (x1.0).` };
  }
  if (fit.score >= 55) {
    return { value: 1.3, note: `Builder Fit ${fit.score}: extra learning and checking time (x1.3).` };
  }
  if (fit.score >= 40) {
    return { value: 1.6, note: `Builder Fit ${fit.score}: substantial learning curve and rework expected (x1.6).` };
  }
  return {
    value: 2,
    note: `Builder Fit ${fit.score}: the route sits well outside current capability, so hours roughly double or the work is handed to someone else (x2.0).`,
  };
}

export function estimateCost(
  n: NormalizedIntake,
  route: RouteAssessment | null,
  builderFit: BuilderFitResult | null,
): CostEstimate {
  const multiplier = builderMultiplier(builderFit);

  const baseEffort: EffortEstimate = route?.effort ?? {
    lowHours: 0,
    highHours: 0,
    basis: ['No eligible route, so no effort estimate was produced.'],
    provenance: 'estimate',
  };

  const effort: EffortEstimate = {
    lowHours: Math.round(baseEffort.lowHours * multiplier.value),
    highHours: Math.round(baseEffort.highHours * multiplier.value),
    basis: [...baseEffort.basis, multiplier.note, 'Broad range by design. This is an estimate, not a quotation.'],
    provenance: 'estimate',
  };

  const costsRequiringVerification: string[] = [];
  if (route) {
    if (route.monthlyCost !== 'free-or-existing') {
      costsRequiringVerification.push(
        `${route.name}: subscription or platform pricing for the expected number of users`,
      );
    }
    if (route.requiredHosting !== 'None.' && !route.requiredHosting.startsWith('Provided')) {
      costsRequiringVerification.push(`${route.name}: hosting cost and who pays it`);
    }
    if (route.requiredDatabase.includes('choose')) {
      costsRequiringVerification.push(`${route.name}: managed database cost, backup storage cost`);
    }
    if (
      route.suitability === 'requires-developer-support' ||
      route.suitability === 'requires-professional-implementation'
    ) {
      costsRequiringVerification.push(
        'External developer time: day rate and expected number of days, obtained in writing',
      );
    }
  }
  if (n.budgetTier === 'unknown') {
    costsRequiringVerification.push('The available budget itself, which was not stated');
  }
  if (costsRequiringVerification.length === 0) {
    costsRequiringVerification.push(
      'Nothing beyond tools you already have, though this should still be confirmed before starting',
    );
  }

  const externalSupportRequirement = (() => {
    if (!route) return 'Not determined: no eligible route was found.';
    switch (route.suitability) {
      case 'suitable-now':
        return 'None expected. The route sits within current capability.';
      case 'light-guidance':
        return 'Occasional advice would help, but paid support is not expected.';
      case 'requires-technical-support':
        return 'Technical guidance should be arranged for the unfamiliar parts.';
      case 'requires-developer-support':
        return 'Developer support is required, whether internal or contracted.';
      case 'requires-professional-implementation':
        return 'Professional implementation is required. Budget for it explicitly.';
      case 'unsuitable':
        return 'This route should not be attempted under current conditions.';
    }
  })();

  const mainCostDrivers: string[] = [];
  if (route) {
    mainCostDrivers.push(`Builder hours for ${route.name} (${effort.lowHours}-${effort.highHours} hours)`);
    if (route.monthlyCost !== 'free-or-existing') {
      mainCostDrivers.push(`Recurring ${route.monthlyCost} platform or subscription cost`);
    }
    if (route.maintenanceLevel === 'high') {
      mainCostDrivers.push('Ongoing maintenance, which is a standing cost rather than a one-off');
    }
  }
  if (n.userCountUpper > 5) {
    mainCostDrivers.push(`Per-user pricing across roughly ${n.userCountUpper} users, where it applies`);
  }
  if (n.requiredCapabilities.authentication > 0) {
    mainCostDrivers.push('Accounts and permissions, which often sit on a higher plan tier');
  }
  if (mainCostDrivers.length === 0) {
    mainCostDrivers.push('No significant cost drivers identified beyond your own time');
  }

  const costConfidence: ConfidenceBand =
    n.budgetTier === 'unknown' || costsRequiringVerification.length >= 3
      ? 'low'
      : costsRequiringVerification.length >= 2
        ? 'moderate'
        : 'high';

  const labels: ProvenanceLabel[] = ['estimate', 'requires-verification'];

  return {
    effort,
    setupCost: route?.setupCost ?? 'free-or-existing',
    monthlyCost: route?.monthlyCost ?? 'free-or-existing',
    maintenanceEffort: route ? MAINTENANCE_EFFORT[route.maintenanceLevel] : 'free-or-existing',
    externalSupportRequirement,
    costsRequiringVerification,
    costConfidence,
    mainCostDrivers,
    pricingStatement: PRICING_VERIFICATION_STATEMENT,
    labels,
    provenance: 'estimate',
  };
}
