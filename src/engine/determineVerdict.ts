import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  ConfidenceResult,
  ExistingSolutionCheck,
  GateId,
  GateResult,
  ProjectFeasibilityResult,
  Risk,
  RouteAssessment,
  Safeguards,
  TimelineEstimate,
  Verdict,
  VerdictResult,
} from '@/engine/types';
import { VERDICT_LABELS } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Verdict engine.
 *
 * Critical gates run before score bands, in the fixed order below. A gate can
 * either force a verdict outright or veto verdicts that would otherwise come
 * from the score band. That is what stops a high average from overriding one
 * unacceptable risk.
 *
 * Only the nine approved verdicts are ever returned.
 * ------------------------------------------------------------------ */

/** Most to least favourable. Vetoes demote along this order. */
const VERDICT_SEVERITY: readonly Verdict[] = [
  'proceed',
  'proceed-carefully',
  'conditional-go',
  'simplify-first',
  'revise-before-building',
  'delay',
  'do-not-build-yet',
  'no-go',
];

const GATE_LABELS: Record<GateId, string> = {
  'no-viable-route': 'Viable route gate',
  'human-decision': 'Human-decision gate',
  security: 'Security gate',
  'problem-user-clarity': 'Problem and user gate',
  'existing-solution': 'Existing-solution gate',
  'source-of-truth': 'Source-of-truth gate',
  capability: 'Capability gate',
  budget: 'Budget gate',
  timeline: 'Timeline gate',
  scope: 'Scope gate',
};

/** Words suggesting the system itself would act without a person. */
const AUTOMATION_WORDS = [
  'automatically send',
  'auto-send',
  'auto send',
  'automatic email',
  'automatically email',
  'automatically reject',
  'auto-reject',
  'automatically decide',
  'automatically score',
  'auto-approve',
  'automatically approve',
];

export interface VerdictInput {
  readonly n: NormalizedIntake;
  readonly feasibility: ProjectFeasibilityResult;
  readonly routes: readonly RouteAssessment[];
  readonly recommended: RouteAssessment | null;
  readonly existing: ExistingSolutionCheck;
  readonly risks: readonly Risk[];
  readonly confidence: ConfidenceResult;
  readonly safeguards: Safeguards;
  readonly timeline: TimelineEstimate;
}

function gate(
  id: GateId,
  triggered: boolean,
  detail: string,
  forcedVerdict: Verdict | null,
  disallowedVerdicts: readonly Verdict[] = [],
  conditions: readonly string[] = [],
): GateResult {
  return {
    id,
    label: GATE_LABELS[id],
    triggered,
    detail,
    forcedVerdict: triggered ? forcedVerdict : null,
    disallowedVerdicts: triggered ? disallowedVerdicts : [],
    conditions: triggered ? conditions : [],
  };
}

function bandVerdict(score: number, hasHighRisk: boolean, weakest: string): {
  verdict: Verdict;
  band: string;
} {
  if (score >= 80) {
    return hasHighRisk
      ? { verdict: 'proceed-carefully', band: '80-100 with at least one risk scored 4 or 5' }
      : { verdict: 'proceed', band: '80-100 with no risk above 3' };
  }
  if (score >= 65) return { verdict: 'conditional-go', band: '65-79' };
  if (score >= 50) {
    return weakest === 'scope-realism' || weakest === 'timeline-feasibility'
      ? { verdict: 'simplify-first', band: '50-64, weakest dimension is scope or timeline' }
      : { verdict: 'revise-before-building', band: '50-64, weakest dimension is not scope or timeline' };
  }
  if (score >= 35) return { verdict: 'do-not-build-yet', band: '35-49' };
  return { verdict: 'no-go', band: '0-34' };
}

export function determineVerdict(input: VerdictInput): VerdictResult {
  const { n, feasibility, routes, recommended, existing, risks, confidence, timeline } = input;
  const gates: GateResult[] = [];

  const eligible = routes.filter((route) => route.eligibleForRecommendation);
  const restrictedButValid = routes.filter(
    (route) =>
      route.excluded !== null &&
      (route.excluded.type === 'restricted-method' || route.excluded.type === 'environment-restriction') &&
      route.technicalStatus !== 'technically-blocked',
  );

  /* --- 1. viable route --------------------------------------------- */
  const noViableRoute = eligible.length === 0;
  gates.push(
    gate(
      'no-viable-route',
      noViableRoute,
      noViableRoute
        ? restrictedButValid.length > 0
          ? `No route remains available. ${restrictedButValid.length} technically valid route(s) are excluded by your own restrictions, so this is a constraint problem rather than a technical one.`
          : 'No route can meet the requirements as described.'
        : `${eligible.length} of ${routes.length} routes remain available.`,
      restrictedButValid.length > 0 ? 'do-not-build-yet' : 'no-go',
      [],
      restrictedButValid.length > 0
        ? ['Relax one restriction, or accept a smaller version that fits within the current constraints.']
        : ['Reduce the requirements until at least one route can meet them.'],
    ),
  );

  /* --- 2. security -------------------------------------------------- */
  const securityCapable = eligible.filter(
    (route) =>
      route.capabilityGaps.filter(
        (item) => item.id === 'authentication' || item.id === 'role-based-access',
      ).length === 0,
  );
  const securityGateTriggered = n.sensitiveData && securityCapable.length === 0 && n.requiredCapabilities.authentication > 0;
  const securitySeverity: Verdict = n.regulatedData ? 'no-go' : eligible.length > 0 ? 'do-not-build-yet' : 'no-go';
  gates.push(
    gate(
      'security',
      securityGateTriggered,
      securityGateTriggered
        ? 'Sensitive information is involved and no available route can enforce the access control required.'
        : n.sensitiveData
          ? `Sensitive information is involved; ${securityCapable.length} available route(s) can enforce the required access control.`
          : 'No sensitive information was identified.',
      securitySeverity,
      [],
      [
        'Sensitive information must not be placed in a route that cannot restrict access per person.',
        'Decide the access rules first, then choose a route that can enforce them.',
      ],
    ),
  );

  /* --- 3. human decision -------------------------------------------- */
  const automationImplied = AUTOMATION_WORDS.some((word) => n.featureText.includes(word));
  const humanControlAsserted =
    n.humanControlled.includes('final-recommendations') || n.humanControlled.includes('communications');
  const consequential = n.consequentialDomain !== 'none';
  const automatedDecisionRisk = consequential && automationImplied && !humanControlAsserted;
  gates.push(
    gate(
      'human-decision',
      consequential,
      consequential
        ? `This project touches ${n.consequentialDomain} decisions. AI may organise, summarise, compare, and draft. A named person must make and own the final decision.${automatedDecisionRisk ? ' The feature description implies automatic action without a human step, which must be removed before building.' : ''}`
        : 'No consequential decision domain was identified.',
      automatedDecisionRisk ? 'revise-before-building' : null,
      ['proceed'],
      input.safeguards.humanApprovalRequirements.map(
        (requirement) => `${requirement.action}: ${requirement.requirement} (${requirement.owner})`,
      ),
    ),
  );

  /* --- 4. problem and user clarity ---------------------------------- */
  const clarityGate = !n.problemClear && !n.usersClear;
  const nothingToWorkWith = clarityGate && n.scopeTier === 'unknown';
  gates.push(
    gate(
      'problem-user-clarity',
      clarityGate,
      clarityGate
        ? `Neither the problem nor the intended users are clear (problem detail: ${n.problemSpecificity}, users named: ${n.usersClear ? 'yes' : 'no'}). There is not enough to assess a build against.`
        : 'The problem and the intended users are clear enough to assess.',
      nothingToWorkWith ? 'delay' : 'revise-before-building',
      ['proceed', 'proceed-carefully'],
      [
        'Describe what goes wrong today, how often, and who it affects.',
        'Name the people who would use this and what each of them needs from it.',
      ],
    ),
  );

  /* --- 5. existing solution ----------------------------------------- */
  gates.push(
    gate(
      'existing-solution',
      existing.preferExisting,
      existing.preferExisting
        ? `An existing product category (${existing.category}) appears to meet the essential requirements more safely and affordably than a custom build. ${existing.reasons.join(' ')}`
        : existing.available
          ? `A product category was recognised (${existing.category}) but the conditions for preferring it are not all met. ${existing.counterReasons.join(' ')}`
          : 'No off-the-shelf category clearly matches the described functionality.',
      'use-existing-solution',
      [],
      existing.conditions,
    ),
  );

  /* --- 6. source of truth ------------------------------------------- */
  const sourceGate = n.dataDependent && !n.sourceOfTruthDefined;
  gates.push(
    gate(
      'source-of-truth',
      sourceGate,
      sourceGate
        ? `The project depends on data, and no authoritative source has been agreed (currently "${n.sourceOfTruth}"). Production use should not be recommended until it is defined.`
        : 'An authoritative source of data has been identified, or the project does not depend on data.',
      null,
      ['proceed', 'proceed-carefully'],
      ['Agree one authoritative source of data, in writing, before building.'],
    ),
  );

  /* --- 7. capability ------------------------------------------------ */
  const limitedRecommendation =
    recommended !== null && recommended.capabilityGaps.length > 0;
  gates.push(
    gate(
      'capability',
      limitedRecommendation,
      limitedRecommendation
        ? `${recommended?.name} does not fully cover ${recommended?.capabilityGaps.map((item) => item.label.toLowerCase()).join(', ')}. Routes that cannot provide a required capability at all are excluded rather than averaged.`
        : 'The recommended route covers every required capability, and routes that could not were excluded outright.',
      null,
      ['proceed'],
      limitedRecommendation
        ? [
            `Accept the stated limitation of ${recommended?.name}, or choose a route that covers it in full.`,
          ]
        : [],
    ),
  );

  /* --- 8. budget ---------------------------------------------------- */
  const fundingCondition =
    recommended?.conditionsBeforeSelection.find((condition) => condition.startsWith('Funding condition')) ??
    null;
  const budgetGate = fundingCondition !== null;
  gates.push(
    gate(
      'budget',
      budgetGate,
      budgetGate
        ? `${recommended?.name} sits above what the stated budget can absorb, so it cannot be recommended without agreed funding.`
        : 'The recommended route sits within the stated budget, on category comparison.',
      null,
      ['proceed', 'proceed-carefully'],
      fundingCondition !== null ? [fundingCondition] : [],
    ),
  );

  /* --- 9. timeline -------------------------------------------------- */
  const timelineGate = timeline.deadlineAchievable === false;
  const timelineFixed = timelineGate && n.timelineFlexibility === 'fixed';
  gates.push(
    gate(
      'timeline',
      timelineGate,
      timelineGate ? timeline.deadlineAssessment : timeline.deadlineAssessment,
      timelineFixed ? 'delay' : null,
      ['proceed'],
      [
        'Reduce the first release, extend the deadline, or add help. Decide which before starting.',
      ],
    ),
  );

  /* --- 10. scope ---------------------------------------------------- */
  const capacityHours = (n.weeklyHours ?? 4) * (n.deadlineWeeks ?? 12);
  const scopeGate =
    recommended !== null &&
    (n.scopeTier === 'large' || n.scopeTier === 'very-large') &&
    recommended.effort.highHours > capacityHours;
  gates.push(
    gate(
      'scope',
      scopeGate,
      scopeGate
        ? `The must-have list (${n.mustHaveCount} features) exceeds what the available time can deliver on the recommended route.`
        : 'Scope looks proportionate to the time available.',
      null,
      ['proceed', 'proceed-carefully'],
      ['Cut the first release to the smallest set that solves the problem.'],
    ),
  );

  /* ---------------- resolve ---------------- */
  const weakest = [...feasibility.dimensions].sort((a, b) => a.score - b.score)[0]?.id ?? '';
  const hasHighRisk = risks.some((risk) => risk.score >= 4);
  const band = bandVerdict(feasibility.score, hasHighRisk, weakest);

  const forcing = gates.find((item) => item.triggered && item.forcedVerdict !== null);
  let verdict: Verdict;
  let decidedBy: VerdictResult['decidedBy'];
  let decidingGate: GateId | null;

  if (forcing?.forcedVerdict) {
    verdict = forcing.forcedVerdict;
    decidedBy = 'critical-gate';
    decidingGate = forcing.id;
  } else {
    verdict = band.verdict;
    decidedBy = 'score-band';
    decidingGate = null;
  }

  // Vetoes: demote until no gate disallows the result.
  const disallowed = new Set(
    gates.filter((item) => item.triggered).flatMap((item) => item.disallowedVerdicts),
  );
  let vetoedBy: GateId | null = null;
  while (disallowed.has(verdict)) {
    const next = VERDICT_SEVERITY[VERDICT_SEVERITY.indexOf(verdict) + 1];
    if (!next) break;
    vetoedBy =
      gates.find((item) => item.triggered && item.disallowedVerdicts.includes(verdict))?.id ?? vetoedBy;
    verdict = next;
    decidedBy = 'critical-gate';
    decidingGate = vetoedBy;
  }

  // Gate conditions first, then the conditions the recommended route carries in
  // its own right, so the verdict is actionable without cross-referencing.
  const conditions = [
    ...new Set([
      ...gates.filter((item) => item.triggered).flatMap((item) => item.conditions),
      ...(recommended?.conditionsBeforeSelection ?? []),
    ]),
  ];

  const nextActions = buildNextActions(verdict, input, conditions);

  return {
    verdict,
    label: VERDICT_LABELS[verdict],
    statement: statementFor(verdict, input, decidedBy, decidingGate),
    decidedBy,
    decidingGate,
    gates,
    bandUsed: `Project feasibility ${feasibility.score} falls in band ${band.band}, which alone would give "${VERDICT_LABELS[band.verdict]}". Confidence is ${confidence.score} (${confidence.band}) and is reported separately.`,
    conditions,
    nextActions,
    provenance: 'derived',
  };
}

function statementFor(
  verdict: Verdict,
  input: VerdictInput,
  decidedBy: VerdictResult['decidedBy'],
  decidingGate: GateId | null,
): string {
  const routeName = input.recommended?.name ?? 'no available route';
  const basis =
    decidedBy === 'critical-gate' && decidingGate !== null
      ? `Decided by the ${GATE_LABELS[decidingGate].toLowerCase()} rather than by the score alone.`
      : 'Decided by the project feasibility score band, with no critical gate overriding it.';

  const core: Record<Verdict, string> = {
    proceed: `Proceed with ${routeName}. Nothing in the answers argues against starting.`,
    'proceed-carefully': `Proceed with ${routeName}, with attention to the high-scoring risks listed below.`,
    'conditional-go': `Go ahead with ${routeName} once the stated conditions are met. They are not optional.`,
    'simplify-first': `The core idea holds, but the current scope does not fit the time and resources available. Cut it back, then re-assess.`,
    'revise-before-building': `There is not enough settled to build against yet. Revise the inputs listed below and re-assess.`,
    delay: `Hold this for now. The blocking factor is timing or a prerequisite, not the idea itself.`,
    'use-existing-solution': `Do not build this. An existing product in the ${input.existing.category} category should be evaluated first.`,
    'do-not-build-yet': `Do not build this yet. The conditions needed to do it safely and sustainably are not in place.`,
    'no-go': `Do not proceed as described. The requirements cannot be met acceptably by any available route.`,
  };

  return `${core[verdict]} ${basis}`;
}

function buildNextActions(
  verdict: Verdict,
  input: VerdictInput,
  conditions: readonly string[],
): readonly string[] {
  const actions: string[] = [];
  const { n, feasibility, recommended, existing } = input;

  switch (verdict) {
    case 'use-existing-solution':
      actions.push(
        `Shortlist two or three products in the ${existing.category} category and score them against your must-have list.`,
        'Request written pricing for the expected number of users.',
        'Only revisit building if no product covers the must-haves.',
      );
      break;
    case 'revise-before-building':
      actions.push(
        'Write down the problem in two or three specific sentences.',
        'Name the intended users and what each needs.',
        'Re-run this assessment once those are settled.',
      );
      break;
    case 'simplify-first':
      actions.push(
        'Cut the must-have list to the smallest set that solves the problem.',
        'Move everything else to a named later phase.',
        'Re-run the assessment against the reduced scope.',
      );
      break;
    case 'delay':
      actions.push(
        'Record what must be true before this restarts.',
        'Agree a date to revisit it.',
        'Meanwhile, use the lowest-effort route to relieve the immediate pain.',
      );
      break;
    case 'do-not-build-yet':
    case 'no-go':
      actions.push(
        'Address the blocking conditions listed above before reconsidering.',
        'Consider whether a smaller, non-sensitive slice of the problem is worth solving now.',
      );
      break;
    default:
      actions.push(
        recommended
          ? `Start with ${recommended.name} at ${input.n.requiredMaturity === 'production-ready' ? 'prototype level first' : 'the recommended maturity level'}.`
          : 'Identify a viable route before starting.',
        'Meet the stated conditions before any real data is involved.',
        'Re-check the assumptions listed in the evidence panel with the people affected.',
      );
      break;
  }

  // Clarity comes before everything else, whichever verdict was returned.
  if (!n.problemClear || !n.usersClear) {
    actions.unshift(
      !n.problemClear
        ? 'Describe the problem in two or three specific sentences: what goes wrong today, how often, and who it affects.'
        : 'Name the intended users and what each of them needs from this.',
    );
    if (!n.problemClear && !n.usersClear) {
      actions.splice(1, 0, 'Name the intended users and what each of them needs from this.');
    }
  }

  const worstDimension = [...feasibility.dimensions].sort((a, b) => a.score - b.score)[0];
  if (worstDimension && worstDimension.score < 65) {
    actions.push(worstDimension.correctiveAction);
  }
  if (n.consequentialDomain !== 'none') {
    actions.push(
      `Write down that ${n.consequentialDomain} decisions stay with a named person, and that the tool only organises and drafts.`,
    );
  }
  if (conditions.length > 0 && actions.length < 5) {
    actions.push(conditions[0] as string);
  }

  return [...new Set(actions)].slice(0, 6);
}
