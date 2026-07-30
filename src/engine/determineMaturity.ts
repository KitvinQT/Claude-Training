import { ROUTE_PROFILES } from '@/data/routeProfiles';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  MaturityAssessment,
  MaturityLevel,
  RouteAssessment,
  RouteMaturity,
} from '@/engine/types';
import { MATURITY_LABELS, MATURITY_ORDER } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Maturity classification.
 *
 * A route earns "production-ready" only if it can support persistent storage,
 * authentication, role-based permissions, backups, audit history, security
 * controls, hosting, monitoring, recovery, and a named maintenance owner.
 * The frontend-only prototype this tool itself represents is never
 * production-ready.
 * ------------------------------------------------------------------ */

export const PRODUCTION_REQUIREMENTS: readonly string[] = [
  'Persistent storage that survives a refresh, a browser change, and a device change',
  'Authentication, so actions are attributable to a person',
  'Role-based permissions matching who may see and change what',
  'Backups with a tested restore',
  'Audit history of changes to records and decisions',
  'Security controls appropriate to the sensitivity of the data',
  'Hosting with a named operator',
  'Monitoring, so failures are noticed without a user reporting them',
  'A recovery plan for data loss and for outage',
  'A named maintenance owner with time allocated',
];

function maturityIndex(level: MaturityLevel): number {
  return MATURITY_ORDER.indexOf(level);
}

export function determineMaturity(
  n: NormalizedIntake,
  routes: readonly RouteAssessment[],
): MaturityAssessment {
  const byRoute: RouteMaturity[] = routes.map((route) => {
    const profile = ROUTE_PROFILES[route.routeId];
    const notes: string[] = [];
    const productionBlockers = [...profile.productionBlockers];

    const supportsProduction = profile.supportedMaturity.includes('production-ready');
    if (supportsProduction) {
      notes.push(
        'Can reach production-ready, but only once storage, accounts, permissions, backups, audit history, hosting, monitoring, recovery, and a maintenance owner are all actually in place.',
      );
      if (profile.ownershipBurden === 'high') {
        productionBlockers.push(
          'Every production requirement must be built and operated by you; none is provided automatically',
        );
      }
      if (profile.capabilitiesRequiringVerification.length > 0) {
        productionBlockers.push(
          `Depends on unverified product specifics: ${profile.capabilitiesRequiringVerification.join('; ')}`,
        );
      }
    } else {
      notes.push(
        `Cannot reach production-ready. Highest supportable level is ${MATURITY_LABELS[route.maturityCeiling].toLowerCase()}.`,
      );
    }

    if (maturityIndex(route.maturityCeiling) < maturityIndex(n.requiredMaturity)) {
      notes.push(
        `This project needs ${MATURITY_LABELS[n.requiredMaturity].toLowerCase()}, which is above this route's ceiling. It can still be useful for an earlier phase.`,
      );
    }

    return {
      routeId: route.routeId,
      supported: profile.supportedMaturity,
      ceiling: route.maturityCeiling,
      productionBlockers,
      notes,
    };
  });

  /* Where should work actually start? */
  const recommendedStartingLevel: MaturityLevel = (() => {
    if (!n.problemClear || n.scopeTier === 'unknown') return 'concept';
    if (n.sensitiveData || n.requiredMaturity === 'production-ready') return 'interactive-prototype';
    if (n.requiredMaturity === 'pilot') return 'interactive-prototype';
    return n.requiredMaturity === 'mvp' ? 'interactive-prototype' : n.requiredMaturity;
  })();

  return {
    requiredLevel: n.requiredMaturity,
    requiredLevelReasons: n.requiredMaturityReasons,
    recommendedStartingLevel,
    byRoute,
    productionRequirements: PRODUCTION_REQUIREMENTS,
    prototypeStatement:
      'A frontend-only prototype, including this assessment tool itself, is never production-ready. It can demonstrate a workflow and settle requirements, but it cannot hold records, identify users, enforce permissions, keep an audit history, store documents securely, send messages, or support several people working together.',
    provenance: 'derived',
  };
}
