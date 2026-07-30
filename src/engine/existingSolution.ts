import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type { ExistingSolutionCheck } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Existing-solution check.
 *
 * Run before any build route is recommended. The question is not "could this be
 * built" but "should anything be built at all". Mature product categories are
 * recognised by the described functionality, not by the tool being used to run
 * this assessment.
 * ------------------------------------------------------------------ */

interface CommonCategory {
  readonly name: string;
  readonly patterns: readonly RegExp[];
}

/**
 * Well-served software categories. If a project mostly reproduces one of these,
 * an existing product deserves serious consideration first.
 */
const COMMON_CATEGORIES: readonly CommonCategory[] = [
  {
    name: 'Customer relationship management (CRM)',
    patterns: [/\bcrm\b/, /sales pipeline/, /lead(s)? (tracking|management)/, /customer record/, /deal stage/],
  },
  {
    name: 'Applicant tracking / recruitment (ATS)',
    patterns: [/applicant tracking/, /\bats\b/, /candidate pipeline/, /recruitment portal/, /interview stage/],
  },
  {
    name: 'Project and task management',
    patterns: [/project management/, /task (board|tracking)/, /kanban/, /sprint/, /ticket(ing)? system/],
  },
  {
    name: 'Help desk and ticketing',
    patterns: [/help ?desk/, /support ticket/, /service desk/],
  },
  {
    name: 'Invoicing and accounting',
    patterns: [/invoic/, /accounting/, /bookkeep/, /payroll/],
  },
  {
    name: 'Scheduling and booking',
    patterns: [/appointment/, /booking system/, /calendar scheduling/, /shift (roster|scheduling)/],
  },
  {
    name: 'Document signing and forms',
    patterns: [/e-?signature/, /sign(ing)? document/, /form builder/, /survey/],
  },
  {
    name: 'Learning management',
    patterns: [/\blms\b/, /course (management|delivery)/, /training records/],
  },
];

export function checkExistingSolution(n: NormalizedIntake): ExistingSolutionCheck {
  const haystack = `${n.featureText} ${n.workingTitle.toLowerCase()}`;
  const matched = COMMON_CATEGORIES.find((category) =>
    category.patterns.some((pattern) => pattern.test(haystack)),
  );

  const reasons: string[] = [];
  const counterReasons: string[] = [];
  const conditions: string[] = [];

  const available = matched !== undefined;
  if (matched) {
    reasons.push(
      `The described functionality largely reproduces a mature product category: ${matched.name}.`,
    );
  } else {
    counterReasons.push(
      'The described functionality does not clearly match a well-served product category, so an off-the-shelf fit is less likely.',
    );
  }

  /* Customisation appetite */
  const limitedCustomisation = n.mustHaveCount > 0 && n.mustHaveCount <= 8 && !n.integrationsNeeded;
  if (limitedCustomisation) {
    reasons.push(
      `Customisation needs look limited (${n.mustHaveCount} must-have features, no integration requirement stated).`,
    );
  } else if (n.integrationsNeeded) {
    counterReasons.push('An integration requirement may exceed what a standard product configuration allows.');
  } else if (n.mustHaveCount > 8) {
    counterReasons.push(
      `A large must-have list (${n.mustHaveCount} features) may not fit a standard product without heavy customisation.`,
    );
  }

  /* Can the team own a custom system? */
  const ownershipShortfall =
    !n.developerSupportAvailable &&
    (n.abilities['coding'] ?? 0) <= 2 &&
    (n.requiredCapabilities.authentication > 0 || n.requiredCapabilities['role-based-access'] > 0);
  if (ownershipShortfall) {
    reasons.push(
      'The requirements include accounts or permissions, but there is no developer support to build and maintain them.',
    );
  }

  const maintenanceShortfall =
    (n.maintenanceTier === 'one-off' || n.maintenanceTier === 'occasional') &&
    n.requiredCapabilities.persistence > 0;
  if (maintenanceShortfall) {
    reasons.push(
      'The tool would hold ongoing records, but only light maintenance is expected, which suits a supported product better than a custom build.',
    );
  }

  /* Scale that makes a build hard to justify */
  const teamScale = n.userCountUpper >= 6;
  if (teamScale && matched) {
    reasons.push(
      `Around ${n.userCountUpper} users need shared, permissioned access, which mature products already provide.`,
    );
  }

  /* Reasons an existing product may not be the answer */
  if (n.restrictedRoutes.includes('existing-saas')) {
    counterReasons.push('Existing SaaS products have been explicitly ruled out in the intake.');
  }
  if (n.budgetTier === 'none') {
    counterReasons.push(
      'No budget is available, and most products in this category carry a per-user subscription.',
    );
    conditions.push('Confirm whether a free tier covers the required users and features.');
  }
  if (n.regulatedData) {
    conditions.push('Confirm the product meets the applicable regulatory obligations before adopting it.');
  }

  const strongSignals = reasons.length;
  const preferExisting =
    available &&
    !n.restrictedRoutes.includes('existing-saas') &&
    strongSignals >= 3 &&
    (ownershipShortfall || maintenanceShortfall || teamScale) &&
    n.budgetTier !== 'none';

  if (preferExisting) {
    conditions.push(
      'Shortlist two or three products and check them against the must-have list before building anything.',
      'Confirm subscription pricing for the expected number of users.',
      'Confirm the permission model matches who may see what.',
    );
  }

  return {
    preferExisting,
    available,
    category: matched?.name ?? 'No clear off-the-shelf category identified',
    reasons,
    counterReasons,
    conditions,
    provenance: 'derived',
  };
}
