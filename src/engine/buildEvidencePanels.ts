import { ALL_FIELDS } from '@/data/intakeSteps';
import { formatAnswer } from '@/utils/answers';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  Assessment,
  ConfidenceResult,
  CostEstimate,
  EvidencePanels,
  ProjectFeasibilityResult,
  RouteAssessment,
  TimelineEstimate,
  UnknownDetail,
  VerificationNeed,
} from '@/engine/types';
import { MATURITY_LABELS, PRICING_VERIFICATION_STATEMENT } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Evidence, derived findings, estimates, assumptions, demonstration data,
 * unknowns, and verification needs - separated so a reader can see at a glance
 * which category any statement belongs to.
 *
 * Nothing in the verification list has been researched. The panel says so.
 * ------------------------------------------------------------------ */

/** Why a missing answer matters, and what it affects. Keyed by field id. */
const UNKNOWN_IMPACT: Record<string, { matters: string; affects: string }> = {
  whatItIs: {
    matters: 'Without a description of the project, nothing else can be judged against it.',
    affects: 'Problem and business value, technical feasibility, every route comparison',
  },
  problem: {
    matters: 'The problem is what the project is measured against. Without it, "success" is undefined.',
    affects: 'Problem and business value, MVP recommendation, verdict',
  },
  whyItMatters: {
    matters: 'Value is what justifies the effort and cost.',
    affects: 'Problem and business value',
  },
  intendedUsers: {
    matters: 'Who uses it determines whether accounts, permissions, and multi-user support are needed.',
    affects: 'Required capabilities, route eligibility, security and permissions',
  },
  userCount: {
    matters: 'The number of users drives multi-user requirements and per-seat cost exposure.',
    affects: 'Required capabilities, financial practicality, route fit',
  },
  mustHave: {
    matters: 'The must-have list is the basis of both the scope and the effort estimate.',
    affects: 'Scope realism, effort estimate, MVP recommendation',
  },
  sourceOfTruth: {
    matters: 'Without an authoritative source, two copies will disagree and the tool loses trust.',
    affects: 'Data readiness, source-of-truth risk, verdict gate',
  },
  budget: {
    matters: 'Route costs can only be compared against a stated budget.',
    affects: 'Financial practicality, route fit, cost confidence',
  },
  deadline: {
    matters: 'The deadline determines whether the estimated effort is achievable at all.',
    affects: 'Timeline feasibility, timeline estimate, route fit',
  },
  availableTime: {
    matters: 'Weekly hours convert effort into calendar time.',
    affects: 'Timeline feasibility, deadline assessment',
  },
  builderExperience: {
    matters: 'Builder Fit is calculated from the stated capability. Left unknown, it is treated conservatively.',
    affects: 'Builder Fit for every route, suitability label, timeline',
  },
  codingExperience: {
    matters: 'Coding experience separates configuration routes from build routes.',
    affects: 'Builder Fit for coded routes, suitability label',
  },
  testTroubleshoot: {
    matters: 'Testing and troubleshooting confidence drives several derived abilities.',
    affects: 'Builder Fit, timeline, builder capability risk',
  },
  technicalAssistance: {
    matters: 'Available guidance changes what the builder can reasonably take on.',
    affects: 'Builder Fit support adjustments, suitability label',
  },
  developerSupport: {
    matters: 'Developer support determines whether high-ownership routes are viable at all.',
    affects: 'Builder Fit, practical path, conditions',
  },
  sensitiveInformation: {
    matters: 'Data sensitivity drives the security requirements, required maturity, and several risks.',
    affects: 'Security and permissions, required maturity, privacy and security risk',
  },
  maintenanceExpectation: {
    matters: 'Maintenance capacity decides whether a high-upkeep route is sustainable.',
    affects: 'Maintenance and sustainability, route fit, maintenance risk',
  },
  projectOwner: {
    matters: 'An unowned project decays regardless of how well it is built.',
    affects: 'Operational feasibility, maintenance risk, roadmap owners',
  },
  troubleshooter: {
    matters: 'Somebody has to fix it when it breaks.',
    affects: 'Maintenance and sustainability, maintenance risk',
  },
};

const GENERIC_IMPACT = {
  matters: 'It was one of the inputs the rubric reads, so the assessment is working with less than it could.',
  affects: 'Assessment confidence',
};

export function buildEvidencePanels(input: {
  readonly n: NormalizedIntake;
  readonly feasibility: ProjectFeasibilityResult;
  readonly route: RouteAssessment | null;
  readonly cost: CostEstimate;
  readonly timeline: TimelineEstimate;
  readonly confidence: ConfidenceResult;
  readonly assessment: Pick<
    Assessment,
    'suitability' | 'technicalStatus' | 'existingSolution' | 'maturity' | 'highRisks'
  >;
}): EvidencePanels {
  const { n, feasibility, route, cost, timeline, confidence, assessment } = input;

  /* ---------- from your answers ---------- */
  const fromYourAnswers: string[] = [];
  const demonstrationData: string[] = [];

  for (const { field } of ALL_FIELDS) {
    const answer = n.answers[field.id];
    if (!answer || answer.status === 'empty' || answer.status === 'unknown') continue;
    const line = `${field.label}: ${formatAnswer(field, answer)}`;
    if (answer.source === 'demo') {
      demonstrationData.push(line);
    } else {
      fromYourAnswers.push(line);
    }
  }
  if (fromYourAnswers.length === 0) {
    fromYourAnswers.push('No answers were supplied directly.');
  }
  if (demonstrationData.length > 0) {
    demonstrationData.unshift(
      'These answers came from a fictional demonstration scenario. They are invented for training purposes and describe no real person, client, or record.',
    );
  }

  /* ---------- derived findings ---------- */
  const derivedFindings: string[] = [
    `Project Feasibility ${feasibility.score} of 100, from ten weighted dimensions.`,
    `Required maturity level: ${MATURITY_LABELS[assessment.maturity.requiredLevel]} — ${assessment.maturity.requiredLevelReasons.join(' ')}`,
    `Technical status: ${assessment.technicalStatus.replace(/-/g, ' ')}.`,
    `Builder suitability for the recommended route: ${assessment.suitability.replace(/-/g, ' ')}.`,
    ...feasibility.dimensions
      .filter((dimension) => dimension.status === 'weak' || dimension.status === 'critical')
      .map((dimension) => `${dimension.label} scored ${dimension.score} (${dimension.status}).`),
    ...assessment.highRisks.map(
      (risk) => `${risk.label} scored ${risk.score} of 5 (${risk.scoreLabel.toLowerCase()}).`,
    ),
  ];
  if (route) {
    derivedFindings.push(
      `${route.name} selected with a route fit of ${route.fitScore} and a Builder Fit of ${route.builderFit.score}.`,
    );
  }
  if (assessment.existingSolution.available) {
    derivedFindings.push(
      `Recognised product category: ${assessment.existingSolution.category}. Existing solution preferred: ${assessment.existingSolution.preferExisting ? 'yes' : 'no'}.`,
    );
  }
  for (const conflict of n.conflicts) {
    derivedFindings.push(`Conflicting answers: ${conflict.description}`);
  }

  /* ---------- estimates ---------- */
  const estimates: string[] = [
    `Effort: ${cost.effort.lowHours} to ${cost.effort.highHours} builder hours. ${cost.effort.basis.join(' ')}`,
    ...timeline.phases.map((phase) => `${phase.label}: ${phase.bandLabel}.`),
    `Setup cost category: ${cost.setupCost}. Monthly cost category: ${cost.monthlyCost}. Maintenance effort: ${cost.maintenanceEffort}.`,
    timeline.deadlineAssessment,
  ];

  /* ---------- assumptions ---------- */
  const assumptions: string[] = [
    'The scoring rubric is illustrative. It is a transparent set of hand-written rules, not a validated industry model.',
  ];
  if (n.weeklyHours === null) {
    assumptions.push(
      'Weekly available time was not stated. About 4 hours per week was used for capacity comparison only, and is not treated as your answer.',
    );
  }
  if (n.deadlineWeeks === null) {
    assumptions.push(
      'No deadline was stated. A 12-week horizon was used for capacity comparison only, and is not treated as your answer.',
    );
  }
  if (n.budgetTier === 'unknown') {
    assumptions.push('No budget was stated, so costs were compared against free or existing tools only.');
  }
  if (n.builderAnswersUnknown.length > 0) {
    assumptions.push(
      `Where a capability answer was unknown (${n.builderAnswersUnknown.join(', ')}), no experience was assumed. That is a conservative placeholder for Builder Fit only, and it does not affect project feasibility.`,
    );
  }
  assumptions.push(
    'Deployment, security-management, maintenance, and learning capacity were inferred from the stated experience rather than asked about directly.',
    'Route profiles describe typical behaviour for each kind of route. A specific product or plan may differ.',
  );

  /* ---------- unknowns ---------- */
  const unknowns: UnknownDetail[] = n.unknownFieldIds.map((fieldId) => {
    const field = ALL_FIELDS.find((entry) => entry.field.id === fieldId)?.field;
    const impact = UNKNOWN_IMPACT[fieldId] ?? GENERIC_IMPACT;
    return {
      field: field?.label ?? fieldId,
      whyItMatters: impact.matters,
      affects: impact.affects,
      wouldImprove: `Answering "${field?.label ?? fieldId}" would raise assessment confidence and remove the conservative handling applied here.`,
    };
  });

  /* ---------- verification needs ---------- */
  const verificationNeeds: VerificationNeed[] = [];

  verificationNeeds.push({
    category: 'Current vendor pricing',
    detail:
      route && route.monthlyCost !== 'free-or-existing'
        ? `${route.name}: subscription or platform pricing for the expected number of users. ${PRICING_VERIFICATION_STATEMENT}`
        : `No recurring vendor cost was identified for the recommended route, but this should still be confirmed. ${PRICING_VERIFICATION_STATEMENT}`,
  });

  if (route && route.technicalStatus === 'requires-verification') {
    verificationNeeds.push({
      category: 'Platform capabilities',
      detail: route.technicalNotes.join(' '),
    });
  } else if (route) {
    verificationNeeds.push({
      category: 'Platform capabilities',
      detail: `Confirm that ${route.name} behaves as described for permissions, data export, and any limits that matter to you.`,
    });
  }

  verificationNeeds.push({
    category: 'Hosting options',
    detail: route
      ? `${route.requiredHosting} Confirm who operates it, what it costs, and who is called when it fails.`
      : 'Not determined: no eligible route.',
  });

  verificationNeeds.push({
    category: 'Integration availability',
    detail: n.integrationsNeeded
      ? 'An integration is implied by the description. Confirm the other system exposes the data, that access is permitted, and in what format.'
      : 'No integration requirement was identified from the answers. Confirm this is correct before building.',
  });

  verificationNeeds.push({
    category: 'Security requirements',
    detail: n.sensitiveData
      ? 'Confirm the access rules per kind of information, the retention period, and who reviews access. Sensitive data should not enter any route until this is settled.'
      : 'No sensitive information was identified. Confirm this with whoever owns the data before real use.',
  });

  if (n.regulatedData || n.consequentialDomain !== 'none') {
    verificationNeeds.push({
      category: 'Legal or policy requirements',
      detail: `This project touches ${n.regulatedData ? 'regulated data' : `${n.consequentialDomain} decisions`}. Confirm the applicable internal policy and legal obligations with a qualified person. This tool does not know them and has not checked them.`,
    });
  }

  if (confidence.band !== 'high') {
    verificationNeeds.push({
      category: 'Missing intake information',
      detail: `Assessment confidence is ${confidence.band}. ${confidence.missingInformation.slice(0, 4).join('; ')}.`,
    });
  }

  return {
    fromYourAnswers,
    derivedFindings,
    estimates,
    assumptions,
    demonstrationData,
    unknowns,
    verificationNeeds,
    notResearchedStatement:
      'None of these has been researched or confirmed by this tool. It has no access to vendors, prices, platforms, policies, or the internet. Every item is something a person must check.',
  };
}
