import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  BuilderFitResult,
  Risk,
  RiskCategory,
  RiskOwner,
  RiskScore,
  RouteAssessment,
} from '@/engine/types';
import {
  PRICING_VERIFICATION_STATEMENT,
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_ORDER,
  RISK_SCORE_LABELS,
} from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Risk engine.
 *
 * Every one of the sixteen categories is evaluated on the 1-5 scale. A score of
 * 4 or 5 carries the full record: trigger, consequence, mitigation, owner,
 * residual risk, evidence, and assumptions. Ownership is always a human role -
 * never "AI".
 * ------------------------------------------------------------------ */

interface RiskInput {
  readonly n: NormalizedIntake;
  readonly route: RouteAssessment | null;
  readonly builderFit: BuilderFitResult | null;
}

function clamp(score: number): RiskScore {
  return Math.max(1, Math.min(5, Math.round(score))) as RiskScore;
}

interface Draft {
  readonly score: number;
  readonly trigger: string;
  readonly consequence: string;
  readonly mitigation: string;
  readonly owner: RiskOwner;
  readonly residualRisk: string;
  readonly evidence: readonly string[];
  readonly assumptions?: readonly string[];
  readonly blocks?: string | null;
}

type Evaluator = (input: RiskInput) => Draft;

const EVALUATORS: Record<RiskCategory, Evaluator> = {
  data: ({ n, route }) => {
    let score = 2;
    const evidence: string[] = [];
    if (!n.hasData && n.dataDependent) {
      score += 1;
      evidence.push('The project depends on data that does not exist yet.');
    }
    if (n.dataFormats.includes('unstructured')) {
      score += 1;
      evidence.push('Some data is unstructured and will need preparation.');
    }
    if (n.dataLocations.includes('physical')) {
      score += 1;
      evidence.push('Some records exist only on paper.');
    }
    if (route && route.capabilityGaps.some((gap) => gap.id === 'persistence')) {
      score += 1;
      evidence.push(`${route.name} cannot retain records as the project requires.`);
    }
    return {
      score,
      trigger: 'Data is incomplete, unstructured, or held in a form the chosen route cannot use.',
      consequence:
        'The tool is populated with unreliable information, and people quietly return to their own copies.',
      mitigation:
        'Prepare and validate a representative sample before building, and agree a single entry format.',
      owner: 'Data owner',
      residualRisk:
        'Moderate: data quality needs ongoing attention even after a clean start.',
      evidence: evidence.length > 0 ? evidence : ['Data appears usable as described.'],
    };
  },

  device: ({ n }) => {
    let score = 1;
    const evidence: string[] = [];
    if (n.dataLocations.includes('local')) {
      score += 1;
      evidence.push('Data sits on a local computer.');
    }
    if (n.localRestrictions.includes('no-local-files') || n.browserOnly) {
      score += 1;
      evidence.push('Working is restricted to the browser, so nothing may be held on a device.');
    }
    if (n.sensitiveData && n.dataLocations.includes('local')) {
      score += 2;
      evidence.push('Sensitive information on a single device is exposed to loss or theft.');
    }
    return {
      score,
      trigger: 'Information is held on an individual device rather than a managed shared location.',
      consequence: 'Loss, theft, or a failed laptop takes the only copy with it.',
      mitigation:
        'Keep the authoritative copy in managed shared storage and treat local copies as temporary.',
      owner: 'Data owner',
      residualRisk: 'Low once the authoritative copy is centralised.',
      evidence: evidence.length > 0 ? evidence : ['No device-specific dependency was identified.'],
    };
  },

  privacy: ({ n }) => {
    let score = 1;
    const evidence: string[] = [];
    if (n.personalData) {
      score += 2;
      evidence.push('Personal information about identifiable people is involved.');
    }
    if (n.sensitiveInformation.includes('assessments')) {
      score += 1;
      evidence.push('Assessment or interview notes are opinions about people, which carry extra sensitivity.');
    }
    if (n.regulatedData) {
      score += 1;
      evidence.push('Regulated or legally protected data is involved.');
    }
    if (n.externalAudience && n.sensitiveData) {
      score += 1;
      evidence.push('Sensitive information would be reachable by people outside the immediate team.');
    }
    return {
      score,
      trigger: 'Personal or sensitive information is collected, stored, or shared.',
      consequence:
        'Individuals lose control of information about them, with legal and reputational consequences.',
      mitigation:
        'Collect only what is needed, restrict access per person, agree a retention period, and record the lawful basis.',
      owner: 'Data owner',
      residualRisk:
        'Moderate: privacy obligations persist for as long as the information is held.',
      evidence: evidence.length > 0 ? evidence : ['No personal information was identified.'],
    };
  },

  security: ({ n, route }) => {
    let score = 1;
    const evidence: string[] = [];
    if (n.sensitiveData) {
      score += 2;
      evidence.push('Sensitive information is involved.');
    }
    if (route && route.capabilityGaps.some((gap) => gap.id === 'authentication')) {
      score += 2;
      evidence.push(`${route.name} does not provide the authentication this project requires.`);
    }
    if (n.securityConcerns.length === 0 && n.sensitiveData) {
      score += 1;
      evidence.push('No security concerns were identified despite sensitive information being involved.');
    }
    if (n.hostingExpectation === 'public-site' && n.sensitiveData) {
      score += 1;
      evidence.push('Public hosting is expected for a system holding sensitive information.');
    }
    return {
      score,
      trigger: 'Sensitive information is placed somewhere without adequate access control.',
      consequence: 'Unauthorised people see information they should not, and the exposure may go unnoticed.',
      mitigation:
        'Choose only routes that support per-person access, review access on a schedule, and keep sensitive data out of demonstrations.',
      owner: 'Security owner',
      residualRisk: 'Moderate: access control needs periodic review, not a one-off setup.',
      evidence: evidence.length > 0 ? evidence : ['No sensitive information was identified.'],
      blocks:
        route && route.capabilityGaps.some((gap) => gap.id === 'authentication')
          ? route.name
          : null,
    };
  },

  permission: ({ n, route }) => {
    let score = 1;
    const evidence: string[] = [];
    if (n.permissionConcerns.length >= 2) {
      score += 1;
      evidence.push(`Several permission concerns were raised (${n.permissionConcerns.length}).`);
    }
    if (n.requiredCapabilities['role-based-access'] > 0) {
      score += 1;
      evidence.push('Role separation is required.');
    }
    if (route && route.capabilityGaps.some((gap) => gap.id === 'role-based-access')) {
      score += 2;
      evidence.push(`${route.name} cannot enforce the role separation required.`);
    }
    if (n.accountsExpectation === 'none' && n.userCountUpper > 1) {
      score += 1;
      evidence.push('Several people would share access with no individual accounts.');
    }
    return {
      score,
      trigger: 'People can see or change information beyond what their role should allow.',
      consequence:
        'Confidential material spreads internally, and changes cannot be attributed to anyone.',
      mitigation:
        'Write down who may view, edit, export, and delete each kind of information, then choose a route that can enforce it.',
      owner: 'Security owner',
      residualRisk: 'Moderate until individual accounts and roles are in place.',
      evidence: evidence.length > 0 ? evidence : ['No permission separation requirement was identified.'],
    };
  },

  'technical-complexity': ({ n, route }) => {
    let score = 2;
    const evidence: string[] = [];
    if (n.scopeTier === 'large') {
      score += 1;
      evidence.push(`A large must-have list (${n.mustHaveCount} features).`);
    }
    if (n.scopeTier === 'very-large') {
      score += 2;
      evidence.push(`A very large must-have list (${n.mustHaveCount} features).`);
    }
    if (n.requiredCapabilities.authentication > 0 && n.requiredCapabilities['role-based-access'] > 0) {
      score += 1;
      evidence.push('Accounts and role-based permissions are both required.');
    }
    if (route && route.effort.highHours >= 120) {
      score += 1;
      evidence.push(`The recommended route is estimated at up to ${route.effort.highHours} hours.`);
    }
    return {
      score,
      trigger: 'The build carries more moving parts than the available time and skill can absorb.',
      consequence: 'Delivery stalls part-built, and the effort produces nothing usable.',
      mitigation:
        'Cut the first release to the smallest useful version and add capability in later phases.',
      owner: 'Technical owner',
      residualRisk: 'Moderate: complexity grows again with every added feature.',
      evidence: evidence.length > 0 ? evidence : ['Complexity looks proportionate to the scope described.'],
    };
  },

  integration: ({ n }) => {
    let score = 1;
    const evidence: string[] = [];
    if (n.integrationsNeeded) {
      score += 2;
      evidence.push('The description implies connecting to or syncing with another system.');
    }
    if (n.dataFormats.includes('in-app')) {
      score += 1;
      evidence.push('Some data is locked inside another application.');
    }
    if (n.integrationsNeeded && !n.developerSupportAvailable) {
      score += 1;
      evidence.push('An integration is implied but no developer support is available.');
    }
    return {
      score,
      trigger: 'Another system does not expose its data, or exposes it only in a form that needs work.',
      consequence:
        'A central assumption fails late, forcing manual copying or a redesign.',
      mitigation:
        'Confirm the export or interface exists and is permitted before committing to the route.',
      owner: 'Technical owner',
      residualRisk: 'Low once the interface has been confirmed in practice.',
      evidence: evidence.length > 0 ? evidence : ['No integration requirement was identified.'],
    };
  },

  'builder-capability': ({ n, route, builderFit }) => {
    let score = 2;
    const evidence: string[] = [];
    if (builderFit) {
      if (builderFit.score < 40) {
        score += 2;
        evidence.push(
          `Builder Fit for ${route?.name ?? 'the recommended route'} is ${builderFit.score} out of 100.`,
        );
      } else if (builderFit.score < 60) {
        score += 1;
        evidence.push(
          `Builder Fit for ${route?.name ?? 'the recommended route'} is ${builderFit.score} out of 100.`,
        );
      } else {
        score -= 1;
        evidence.push(
          `Builder Fit for ${route?.name ?? 'the recommended route'} is ${builderFit.score} out of 100.`,
        );
      }
      if (builderFit.gaps.length >= 3) {
        score += 1;
        evidence.push(`${builderFit.gaps.length} capability gaps were identified for this route.`);
      }
    }
    if (!n.developerSupportAvailable && !n.guidanceAvailable) {
      score += 1;
      evidence.push('Neither technical guidance nor developer support is available.');
    }
    return {
      score,
      trigger: 'The chosen route needs skills or support that are not currently available.',
      consequence:
        'The build stalls, or it ships with defects nobody present can diagnose. This is a delivery risk, not a statement that the project is infeasible.',
      mitigation:
        'Match the route to the current capability, arrange guidance or developer support, or choose a route with a lower learning burden.',
      owner: 'Project owner',
      residualRisk: 'Reduces as capability grows or support is secured.',
      evidence: evidence.length > 0 ? evidence : ['Capability appears sufficient for the recommended route.'],
      assumptions: [
        'Deployment, security, and maintenance ability were derived from the stated experience rather than asked directly.',
      ],
    };
  },

  operational: ({ n }) => {
    let score = 2;
    const evidence: string[] = [];
    if (!n.ownerDefined) {
      score += 1;
      evidence.push('No project owner has been named.');
    }
    if (!n.dataUpdaterDefined) {
      score += 1;
      evidence.push('Nobody is assigned to keep the data current.');
    }
    if (n.userCountUpper > 25) {
      score += 1;
      evidence.push(`A large user group (up to about ${n.userCountUpper}).`);
    }
    if (n.useContext === 'public') {
      score += 1;
      evidence.push('Public use raises operational demands.');
    }
    return {
      score,
      trigger: 'Nobody is clearly responsible for running the tool day to day.',
      consequence: 'Information goes stale, questions go unanswered, and use quietly stops.',
      mitigation: 'Name an owner and a data updater, and agree what they are expected to do.',
      owner: 'Project owner',
      residualRisk: 'Low once responsibilities are named and accepted.',
      evidence: evidence.length > 0 ? evidence : ['Operational responsibilities are assigned.'],
    };
  },

  maintenance: ({ n, route }) => {
    let score = 2;
    const evidence: string[] = [];
    if (!n.troubleshooterDefined) {
      score += 2;
      evidence.push('Nobody is assigned to troubleshoot or maintain it.');
    }
    if (route && route.maintenanceLevel === 'high') {
      score += 1;
      evidence.push(`${route.name} carries a high maintenance level.`);
    }
    if (n.maintenanceTier === 'one-off' && n.requiredCapabilities.persistence > 0) {
      score += 1;
      evidence.push('Ongoing records are expected but maintenance is planned as one-off.');
    }
    return {
      score,
      trigger: 'The tool needs upkeep that nobody has agreed to provide.',
      consequence:
        'It degrades: broken links, stale records, unpatched dependencies, and eventually abandonment.',
      mitigation:
        'Name the maintainer before building, confirm their available time, and prefer routes with lower upkeep.',
      owner: 'Technical owner',
      residualRisk: 'Moderate: maintenance capacity needs re-checking as the tool grows.',
      evidence: evidence.length > 0 ? evidence : ['Maintenance responsibility is assigned.'],
    };
  },

  'vendor-lock-in': ({ n, route }) => {
    let score = 1;
    const evidence: string[] = [];
    if (route && route.vendorDependency === 'high') {
      score += 2;
      evidence.push(`${route.name} carries high vendor dependency.`);
    } else if (route && route.vendorDependency === 'moderate') {
      score += 1;
      evidence.push(`${route.name} carries moderate vendor dependency.`);
    }
    if (n.requiredCapabilities.persistence >= 2 && route?.vendorDependency === 'high') {
      score += 1;
      evidence.push('Business records would live inside the vendor’s platform.');
    }
    return {
      score,
      trigger: 'Essential records and process logic live inside a product you do not control.',
      consequence:
        'Price rises, feature removals, or a shutdown force a migration on someone else’s timetable.',
      mitigation:
        'Confirm data export before committing, keep a periodic export, and avoid deep platform-specific logic.',
      owner: 'Project owner',
      residualRisk: 'Low to moderate, depending on how portable the data remains.',
      evidence: evidence.length > 0 ? evidence : ['No significant vendor dependency was identified.'],
    };
  },

  'ai-accuracy': ({ n, route }) => {
    let score = 2;
    const evidence: string[] = [];
    const aiRoute =
      route !== null &&
      ['chat-only', 'claude-artifact', 'ai-assisted-coding', 'claude-code'].includes(route.routeId);
    if (aiRoute) {
      score += 1;
      evidence.push(`${route?.name ?? 'The recommended route'} relies on AI-generated output.`);
    }
    if (n.consequentialDomain !== 'none') {
      score += 2;
      evidence.push(
        `Output would inform ${n.consequentialDomain} decisions, where an error carries real consequences for people.`,
      );
    }
    if (n.securityConcerns.includes('ai-accuracy')) {
      evidence.push('You raised AI accuracy as a concern yourself.');
    }
    if (n.humanControlled.includes('final-recommendations') || n.humanControlled.includes('communications')) {
      score -= 1;
      evidence.push('Consequential actions are already reserved for humans, which reduces the exposure.');
    }
    return {
      score,
      trigger: 'AI-generated summaries, drafts, or comparisons are treated as verified fact.',
      consequence:
        'A confident but wrong summary influences a decision about a person, and the error is hard to trace afterwards.',
      mitigation:
        'Require human review before any output is used, show the source of each statement, and never let AI issue a final decision.',
      owner: 'Human reviewer',
      residualRisk:
        'Moderate: review reduces the risk but does not remove it, so keep the human decision point explicit.',
      evidence: evidence.length > 0 ? evidence : ['No AI-generated content is central to this route.'],
    };
  },

  cost: ({ n, route }) => {
    let score = 2;
    const evidence: string[] = [];
    if (n.budgetTier === 'unknown') {
      score += 1;
      evidence.push('No budget was stated, so cost fit cannot be judged.');
    }
    if (n.budgetTier === 'none' && route && route.monthlyCost !== 'free-or-existing') {
      score += 2;
      evidence.push(`${route.name} carries a recurring cost with no budget available.`);
    }
    if (route && (route.monthlyCost === 'high' || route.monthlyCost === 'very-high')) {
      score += 1;
      evidence.push(`${route.name} carries a ${route.monthlyCost} monthly cost category.`);
    }
    return {
      score,
      trigger: 'Real prices turn out higher than assumed, or a recurring cost has no owner.',
      consequence: 'The tool is abandoned mid-way, or it runs until an unbudgeted renewal forces a stop.',
      mitigation: `Obtain written pricing for the shortlisted routes and confirm who pays. ${PRICING_VERIFICATION_STATEMENT}`,
      owner: 'Project owner',
      residualRisk: 'Low once prices are confirmed and a budget owner exists.',
      evidence: evidence.length > 0 ? evidence : ['Cost exposure looks proportionate to the stated budget.'],
      assumptions: [
        'No prices are generated by this tool. Only the budget range selected during intake was used.',
      ],
    };
  },

  timeline: ({ n, route }) => {
    let score = 2;
    const evidence: string[] = [];
    const capacityHours = (n.weeklyHours ?? 4) * (n.deadlineWeeks ?? 12);
    if (route && route.effort.highHours > capacityHours) {
      score += 2;
      evidence.push(
        `Estimated effort of up to ${route.effort.highHours} hours against roughly ${Math.round(capacityHours)} hours available before the deadline.`,
      );
    }
    if (n.timelineFlexibility === 'fixed') {
      score += 1;
      evidence.push('The timeline cannot move.');
    }
    if (n.deadlineTier === '2-weeks') {
      score += 1;
      evidence.push('A two-week deadline.');
    }
    if (n.deadlineTier === 'no-date') {
      score -= 1;
      evidence.push('No fixed deadline.');
    }
    return {
      score,
      trigger: 'The work takes longer than the time available, or approvals arrive late.',
      consequence: 'The deadline passes with nothing usable delivered.',
      mitigation:
        'Reduce the first release, extend the deadline, or secure more time each week. Agree which of the three before starting.',
      owner: 'Project owner',
      residualRisk: 'Moderate: estimates are ranges, and approval delays are outside the builder’s control.',
      evidence: evidence.length > 0 ? evidence : ['The timeline looks workable for the scope described.'],
      assumptions: [
        'Available capacity was derived from the stated weekly hours and deadline, both treated as approximate.',
      ],
    };
  },

  recovery: ({ n, route }) => {
    let score = 2;
    const evidence: string[] = [];
    if (n.securityConcerns.includes('data-loss')) {
      score += 1;
      evidence.push('You raised data loss as a concern.');
    }
    if (route && ['chat-only', 'claude-artifact'].includes(route.routeId) && n.requiredCapabilities.persistence > 0) {
      score += 2;
      evidence.push(`${route.name} retains nothing, so there is nothing to recover from.`);
    }
    if (n.requiredCapabilities.persistence > 0 && !n.troubleshooterDefined) {
      score += 1;
      evidence.push('Records would be held with nobody assigned to recover them.');
    }
    if (n.dataLocations.includes('cloud-storage') || n.dataLocations.includes('shared-drive')) {
      score -= 1;
      evidence.push('Data already sits in shared storage, which usually provides version history.');
    }
    return {
      score,
      trigger: 'Records are deleted, corrupted, or lost with no usable backup.',
      consequence: 'Work is unrecoverable, and the process that depended on it stops.',
      mitigation:
        'Confirm what is backed up, how far back it goes, and who can restore it. Test a restore once before relying on it.',
      owner: 'Data owner',
      residualRisk: 'Low once a tested backup and a named restorer exist.',
      evidence: evidence.filter(Boolean).length > 0 ? evidence.filter(Boolean) : ['No specific recovery exposure was identified.'],
    };
  },

  'source-of-truth': ({ n }) => {
    let score = 2;
    const evidence: string[] = [];
    if (!n.sourceOfTruthDefined) {
      score += 2;
      evidence.push(`The authoritative source is "${n.sourceOfTruth}".`);
    }
    if (n.sourceOfTruth === 'several-places') {
      score += 1;
      evidence.push('Data currently lives in several places with none authoritative.');
    }
    if (n.sourceOfTruth === 'person') {
      score += 1;
      evidence.push("The source of truth is one person's knowledge, which is a single point of failure.");
    }
    if (n.dataDependent && !n.sourceOfTruthDefined) {
      evidence.push('The project depends on data while no authoritative copy has been agreed.');
    }
    return {
      score,
      trigger: 'Two copies of the same information disagree and nobody can say which is correct.',
      consequence:
        'People stop trusting the tool and revert to private copies, which recreates the original problem.',
      mitigation:
        'Name one authoritative source before building, mark every other copy as secondary, and agree who may change it.',
      owner: 'Data owner',
      residualRisk: 'Moderate until the authoritative source is agreed in writing.',
      evidence: evidence.length > 0 ? evidence : ['An authoritative source has been identified.'],
    };
  },
};

export function buildRisks(
  n: NormalizedIntake,
  route: RouteAssessment | null,
  builderFit: BuilderFitResult | null,
): readonly Risk[] {
  const input: RiskInput = { n, route, builderFit };

  return RISK_CATEGORY_ORDER.map((category) => {
    const draft = EVALUATORS[category](input);
    const score = clamp(draft.score);
    return {
      category,
      label: RISK_CATEGORY_LABELS[category],
      score,
      scoreLabel: RISK_SCORE_LABELS[score],
      trigger: draft.trigger,
      consequence: draft.consequence,
      mitigation: draft.mitigation,
      owner: draft.owner,
      residualRisk: draft.residualRisk,
      evidence: draft.evidence,
      assumptions: draft.assumptions ?? [],
      blocks: draft.blocks ?? null,
      provenance: 'derived',
    };
  });
}

export function highRisks(risks: readonly Risk[]): readonly Risk[] {
  return risks.filter((risk) => risk.score >= 4);
}
