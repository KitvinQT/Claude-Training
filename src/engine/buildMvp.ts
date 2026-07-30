import { listEntries } from '@/utils/answers';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  MvpRecommendation,
  RouteAssessment,
  Safeguards,
  TimelineEstimate,
} from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Minimum viable version.
 *
 * Grounded in what the assessment actually supports: the must-have list the user
 * gave, the capabilities the recommended route provides, and the human-approval
 * requirements the safeguards demand. Nothing is invented.
 * ------------------------------------------------------------------ */

/** How many must-haves a first version should carry, by available capacity. */
function includedCount(n: NormalizedIntake): number {
  if (n.weeklyHours !== null && n.weeklyHours <= 3.5) return 2;
  if (n.scopeTier === 'very-large' || n.scopeTier === 'large') return 3;
  return 4;
}

export function buildMvp(
  n: NormalizedIntake,
  route: RouteAssessment | null,
  safeguards: Safeguards,
  timeline: TimelineEstimate,
): MvpRecommendation {
  const mustHave = listEntries(n.answers['mustHave'] ?? { status: 'empty', text: '', choices: [], source: 'user' });
  const niceToHave = listEntries(n.answers['niceToHave'] ?? { status: 'empty', text: '', choices: [], source: 'user' });
  const excludedByUser = listEntries(
    n.answers['excludeForNow'] ?? { status: 'empty', text: '', choices: [], source: 'user' },
  );

  const limit = includedCount(n);
  const included = mustHave.slice(0, limit);
  const deferredMustHaves = mustHave.slice(limit);

  const excluded: string[] = [
    ...deferredMustHaves.map((feature) => `${feature} (a must-have, deliberately held to a later phase)`),
    ...niceToHave.map((feature) => `${feature} (nice to have)`),
    ...excludedByUser.map((feature) => `${feature} (you excluded this yourself)`),
  ];
  if (excluded.length === 0) {
    excluded.push('Nothing identified to exclude. Revisit once the feature list is written down.');
  }

  const requiredTools: string[] = [];
  if (route) {
    requiredTools.push(route.name);
    if (route.requiredHosting !== 'None.') requiredTools.push(`Hosting: ${route.requiredHosting}`);
    if (!route.requiredDatabase.startsWith('None')) {
      requiredTools.push(`Data store: ${route.requiredDatabase}`);
    }
  } else {
    requiredTools.push('Not determined: no eligible route.');
  }

  const requiredUsers: string[] = [];
  if (n.userGroups.length > 0) {
    requiredUsers.push(
      `Two or three people from: ${n.userGroups.join(', ')} — enough to test the workflow, not the whole group.`,
    );
  } else {
    requiredUsers.push('Not determined: the intended users were not identified.');
  }
  if (n.ownerDefined) requiredUsers.push('The named project owner, to accept or reject the result.');

  const humanReviewRequirements =
    safeguards.humanApprovalRequirements.length > 0
      ? safeguards.humanApprovalRequirements.map(
          (requirement) => `${requirement.action}: ${requirement.requirement} Owner: ${requirement.owner}.`,
        )
      : ['Any output used to make a decision should be checked by a person before it is acted on.'];

  const prototypeBand = timeline.phases.find((phase) => phase.id === 'prototype')?.bandLabel ?? 'not estimated';
  const mvpBand = timeline.phases.find((phase) => phase.id === 'mvp')?.bandLabel ?? 'not estimated';

  const successMeasures: string[] = [
    'The people testing it stop using their own private copies for the parts it covers.',
    included.length > 0
      ? `Each of the ${included.length} included features is used at least once by someone other than the builder.`
      : 'The first feature is used by someone other than the builder.',
    'Nobody has to ask a colleague for information the tool is supposed to hold.',
  ];
  if (n.problemClear) {
    successMeasures.push('The specific problem described in the intake measurably reduces during the test period.');
  }

  const failureCriteria: string[] = [
    'People keep a parallel private copy because they do not trust it.',
    'The information in it goes stale within the test period.',
    'It takes longer to use than the current way of working.',
  ];
  if (n.requiredCapabilities['role-based-access'] > 0) {
    failureCriteria.push('Anyone can see information they should not.');
  }
  if (n.consequentialDomain !== 'none') {
    failureCriteria.push(
      `A ${n.consequentialDomain} decision is influenced by unreviewed generated content.`,
    );
  }

  const expansionConditions: string[] = [
    'The success measures above are met during the test period.',
    'A named owner and maintainer are still in place and have the time.',
  ];
  if (route && route.conditionsBeforeSelection.length > 0) {
    expansionConditions.push(...route.conditionsBeforeSelection.slice(0, 2));
  }
  if (n.requiredMaturity === 'production-ready') {
    expansionConditions.push(
      'The production requirements are met before real data is entered: storage, accounts, permissions, backups, audit history, monitoring, and recovery.',
    );
  }

  const remainManual: string[] = [];
  const doNotAutomateYet: string[] = [];

  if (n.consequentialDomain !== 'none') {
    remainManual.push(
      `Every ${n.consequentialDomain} decision, recorded by the person who made it.`,
      'Sending any message to a person: drafts only, reviewed before sending.',
    );
    doNotAutomateYet.push(
      `Any final ${n.consequentialDomain} outcome`,
      'Automatic messages to people outside the team',
      'Scoring or ranking that substitutes for human judgement',
    );
  }
  if (n.integrationsNeeded) {
    remainManual.push('Moving data between systems, until the interface has been confirmed to exist.');
    doNotAutomateYet.push('Two-way synchronisation with another system');
  }
  if (n.requiredCapabilities['audit-history'] > 0 && route && route.capabilityGaps.some((gap) => gap.id === 'audit-history')) {
    remainManual.push('Keeping a record of who changed what, until a route that supports it is in place.');
  }
  if (remainManual.length === 0) {
    remainManual.push('Nothing needs to stay manual beyond ordinary data entry.');
  }
  if (doNotAutomateYet.length === 0) {
    doNotAutomateYet.push('Nothing was identified as unsafe to automate at this stage.');
  }
  doNotAutomateYet.push('Deleting records without a human confirmation step');

  return {
    mainProblemSolved: n.problemClear
      ? firstSentence(n.answers['problem']?.text ?? '')
      : 'Not established: the problem was not described clearly enough to state here.',
    includedFeatures:
      included.length > 0
        ? included
        : ['Not determined: no must-have features were listed during intake.'],
    excludedFeatures: excluded,
    requiredTools,
    requiredUsers,
    humanReviewRequirements,
    testPeriod: `Two to four weeks of real use after a working version exists. Reaching that version is estimated at ${prototypeBand} for a prototype and ${mvpBand} for the MVP.`,
    successMeasures,
    failureCriteria,
    expansionConditions,
    remainManual,
    doNotAutomateYet,
    provenance: 'derived',
  };
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 'Not established.';
  const match = /^(.{20,240}?[.!?])(\s|$)/.exec(trimmed);
  return match?.[1] ?? `${trimmed.slice(0, 200)}${trimmed.length > 200 ? '…' : ''}`;
}
