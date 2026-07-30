import { ALL_FIELDS } from '@/data/intakeSteps';
import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  DimensionId,
  DimensionScore,
  DimensionStatus,
  Driver,
  ProjectFeasibilityResult,
} from '@/engine/types';
import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  DIMENSION_WEIGHTS,
  PRICING_VERIFICATION_STATEMENT,
} from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Project Feasibility Score.
 *
 * Builder capability is deliberately absent from every rule in this file.
 * Nothing here may reduce a score because the current builder lacks
 * experience - that belongs to Builder Fit, which is scored separately and
 * per route. Technical feasibility answers "can this be built at all", not
 * "can this person build it".
 * ------------------------------------------------------------------ */

/** Fields whose unknown status is relevant to each dimension. */
const DIMENSION_FIELDS: Record<DimensionId, readonly string[]> = {
  'problem-value': ['whatItIs', 'problem', 'whyItMatters', 'intendedUsers'],
  'scope-realism': ['mustHave', 'niceToHave', 'excludeForNow', 'expectedOutput'],
  'data-readiness': ['availableData', 'dataFormat', 'dataLocation', 'sourceOfTruth', 'readOnlyData'],
  'technical-feasibility': ['mustHave', 'expectedOutput', 'databaseExpectation', 'userAccounts'],
  'operational-feasibility': ['projectOwner', 'dataUpdater', 'troubleshooter', 'humanControlled'],
  'financial-practicality': ['budget'],
  'timeline-feasibility': ['deadline', 'availableTime', 'timelineFlexible'],
  'security-permissions': ['sensitiveInformation', 'securityConcerns', 'permissionConcerns', 'userAccounts'],
  'hosting-sharing': ['hostingExpectation', 'sharingNeeds', 'sharingRequirements'],
  'maintenance-sustainability': ['maintenanceExpectation', 'projectOwner', 'dataUpdater', 'troubleshooter'],
};

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  ALL_FIELDS.map(({ field }) => [field.id, field.label]),
);

class Accumulator {
  score: number;
  readonly positives: Driver[] = [];
  readonly negatives: Driver[] = [];
  readonly evidence: string[] = [];
  readonly assumptions: string[] = [];

  constructor(base: number, baseNote: string) {
    this.score = base;
    this.evidence.push(baseNote);
  }

  add(text: string, points: number): void {
    if (points === 0) {
      this.evidence.push(text);
      return;
    }
    this.score += points;
    (points > 0 ? this.positives : this.negatives).push({ text, points });
  }

  note(text: string): void {
    this.evidence.push(text);
  }

  assume(text: string): void {
    this.assumptions.push(text);
  }
}

function statusOf(score: number): DimensionStatus {
  if (score >= 80) return 'strong';
  if (score >= 65) return 'adequate';
  if (score >= 50) return 'watch';
  if (score >= 35) return 'weak';
  return 'critical';
}

function finish(
  id: DimensionId,
  acc: Accumulator,
  normalized: NormalizedIntake,
  correctiveAction: string,
): DimensionScore {
  const score = Math.max(0, Math.min(100, Math.round(acc.score)));
  const weight = DIMENSION_WEIGHTS[id];
  const unknowns = (DIMENSION_FIELDS[id] ?? [])
    .filter((fieldId) => normalized.unknownFieldIds.includes(fieldId))
    .map((fieldId) => FIELD_LABELS[fieldId] ?? fieldId);

  return {
    id,
    label: DIMENSION_LABELS[id],
    score,
    weight,
    weightedContribution: Math.round(score * weight) / 100,
    status: statusOf(score),
    positiveDrivers: acc.positives,
    negativeDrivers: acc.negatives,
    evidenceUsed: acc.evidence,
    assumptionsUsed: acc.assumptions,
    unknownsAffecting: unknowns,
    correctiveAction,
    provenance: 'derived',
  };
}

/* ----------------------------- dimensions ----------------------------- */

function problemValue(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(55, 'Starts from a neutral 55 and moves with the answers given.');

  switch (n.problemSpecificity) {
    case 'detailed':
      acc.add('The problem is described in specific, concrete terms', 20);
      break;
    case 'partial':
      acc.add('The problem is described, though briefly', 10);
      break;
    case 'vague':
      acc.add('The problem statement is too short to assess properly', -10);
      break;
    case 'unknown':
      acc.add('No problem statement was provided', -25);
      break;
  }

  switch (n.valueSpecificity) {
    case 'detailed':
      acc.add('The cost of the current situation is explained', 12);
      break;
    case 'partial':
      acc.add('Some business value is described', 6);
      break;
    case 'vague':
      acc.add('Business value is asserted but not explained', -3);
      break;
    case 'unknown':
      acc.add('No business value was described', -12);
      break;
  }

  if (n.ideaSpecificity === 'detailed') acc.add('The proposed solution is clearly described', 8);
  else if (n.ideaSpecificity === 'partial') acc.add('The proposed solution is outlined', 4);
  else if (n.ideaSpecificity === 'unknown') acc.add('The project itself was not described', -10);

  if (n.usersClear) acc.add('The intended users are named', 5);
  else acc.add('The intended users were not identified', -12);

  const action =
    n.problemSpecificity === 'unknown' || n.problemSpecificity === 'vague'
      ? 'Write two or three sentences describing what goes wrong today, how often, and who it affects.'
      : n.valueSpecificity === 'unknown'
        ? 'State what the current situation costs in time, errors, or delay, so value can be weighed against effort.'
        : 'No action needed: the problem and its value are clear enough to assess.';

  return finish('problem-value', acc, n, action);
}

function scopeRealism(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(55, 'Starts from a neutral 55 and moves with the answers given.');

  switch (n.scopeTier) {
    case 'tiny':
      acc.add('A very small feature set, which is realistic to deliver', 15);
      break;
    case 'small':
      acc.add('A small, well-bounded feature set', 18);
      break;
    case 'moderate':
      acc.add('A moderate feature set', 8);
      break;
    case 'large':
      acc.add(`A large must-have list (${n.mustHaveCount} features)`, -8);
      break;
    case 'very-large':
      acc.add(`A very large must-have list (${n.mustHaveCount} features)`, -18);
      break;
    case 'unknown':
      acc.add('No must-have features were listed, so scope cannot be judged', -20);
      break;
  }

  if (n.scopeExplicitlyBounded) {
    acc.add('Scope is bounded by naming what is excluded for now', 10);
  } else {
    acc.add('Nothing has been explicitly excluded, so scope can drift', -5);
  }

  if (n.niceToHaveCount > 0) {
    acc.add('Nice-to-haves are separated from must-haves', 4);
  }

  if (
    (n.scopeTier === 'large' || n.scopeTier === 'very-large') &&
    (n.weeklyHoursTier === 'under-2' || n.weeklyHoursTier === '2-5')
  ) {
    acc.add('The feature list is large relative to the time available each week', -12);
  }

  if (n.deadlineTier === '2-weeks' && (n.scopeTier === 'large' || n.scopeTier === 'very-large')) {
    acc.add('A large scope is paired with a two-week deadline', -12);
  }

  if ((n.deadlineTier === 'no-date' || n.timelineFlexibility === 'flexible') && n.scopeTier === 'moderate') {
    acc.add('A moderate scope with a flexible timeline', 4);
  }

  const action =
    n.scopeTier === 'unknown'
      ? 'List the features the project fails without, so scope can be assessed.'
      : n.scopeTier === 'large' || n.scopeTier === 'very-large'
        ? 'Cut the must-have list to the smallest set that solves the problem, and move the rest to a later phase.'
        : 'No action needed: scope looks proportionate.';

  return finish('scope-realism', acc, n, action);
}

function dataReadiness(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(50, 'Starts from 50 because data readiness is rarely neutral.');

  if (n.hasData) acc.add('Relevant data already exists', 12);
  else if (n.dataDependent) acc.add('The project depends on data that does not exist yet', -8);
  else acc.note('The project does not appear to depend on existing data.');

  switch (n.sourceOfTruth) {
    case 'single-system':
      acc.add('A single system of record is already authoritative', 20);
      break;
    case 'one-spreadsheet':
      acc.add('One agreed spreadsheet is authoritative', 14);
      break;
    case 'several-places':
      acc.add('Data lives in several places with none authoritative', -12);
      break;
    case 'person':
      acc.add("The source of truth is one person's knowledge", -14);
      break;
    case 'undefined':
      acc.add('No source of truth has been defined', -18);
      break;
    case 'unknown':
      acc.add('The source of truth was not stated', -20);
      break;
  }

  if (n.dataFormats.includes('excel-csv')) acc.add('Structured data is available in spreadsheet form', 8);
  if (n.dataFormats.includes('unstructured') && !n.dataFormats.includes('excel-csv')) {
    acc.add('Data is largely unstructured notes, which needs preparation', -8);
  }
  if (n.dataFormats.includes('paper') || n.dataLocations.includes('physical')) {
    acc.add('Some data exists only on paper', -6);
  }
  if (n.dataFormats.includes('in-app')) {
    acc.add('Some data is locked inside another application', -4);
  }
  if (n.readOnlyDataRequired === true) {
    acc.add('Read-only information has been identified', 4);
  }
  if (n.dataLocations.includes('cloud-storage') || n.dataLocations.includes('shared-drive')) {
    acc.add('Data is already in shared storage', 5);
  }
  if (n.dataLocations.length === 1 && n.dataLocations.includes('local')) {
    acc.add('Data sits on a single local computer', -5);
  }

  const action = n.sourceOfTruthDefined
    ? 'No action needed: the authoritative source is clear.'
    : 'Agree one authoritative source before building, and write down which copies are secondary.';

  return finish('data-readiness', acc, n, action);
}

function technicalFeasibility(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(
    70,
    'Starts from 70 because most requirements of this kind are technically achievable by some route.',
  );
  acc.note(
    'Builder experience is deliberately excluded from this dimension. Whether the current builder can deliver it is scored separately as Builder Fit.',
  );

  if (n.scopeTier !== 'unknown') {
    acc.add('The required capabilities are within reach of at least one implementation route', 15);
  } else {
    acc.add('Without a feature list, technical requirements cannot be established', -12);
  }

  if (n.scopeTier === 'tiny' || n.scopeTier === 'small') {
    acc.add('A small feature set keeps technical complexity low', 8);
  }
  if (n.scopeTier === 'very-large') {
    acc.add('A very large feature set raises technical complexity', -8);
  }

  if (n.integrationsNeeded) {
    acc.add('An integration with another system is implied, which adds technical uncertainty', -6);
  }
  if (n.integrationsNeeded && n.dataFormats.includes('in-app')) {
    acc.add('Data locked in another application may not be extractable without vendor support', -10);
  }
  if (n.regulatedData) {
    acc.add('Regulated data brings technical controls that must be verified, not assumed', -8);
  }

  const relevantConflicts = n.conflicts.filter((conflict) =>
    ['persistence-without-database', 'auth-without-accounts', 'external-without-hosting'].includes(
      conflict.id,
    ),
  );
  for (const conflict of relevantConflicts.slice(0, 3)) {
    acc.add(`Stated expectations conflict: ${conflict.description}`, -8);
  }

  if (n.requiredCapabilities['audit-history'] > 0) {
    acc.note('An audit history is required, which rules out routes that cannot record change history.');
  }

  const action =
    relevantConflicts.length > 0
      ? 'Resolve the conflicting expectations listed above, then re-check which routes remain technically valid.'
      : n.integrationsNeeded
        ? 'Confirm that the systems you need to connect to actually expose the data, before committing to a route.'
        : 'No action needed: nothing described is technically out of reach.';

  return finish('technical-feasibility', acc, n, action);
}

function operationalFeasibility(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(55, 'Starts from a neutral 55 and moves with the answers given.');

  if (n.ownerDefined) acc.add('A project owner has been named', 10);
  else acc.add('No project owner has been named', -12);

  if (n.dataUpdaterDefined) acc.add('Responsibility for keeping data current is assigned', 8);
  else acc.add('Nobody is assigned to keep the data current', -8);

  if (n.troubleshooterDefined) acc.add('Responsibility for troubleshooting is assigned', 8);
  else acc.add('Nobody is assigned to troubleshoot problems', -8);

  if (n.humanControlled.length > 0) {
    acc.add('Actions that must stay under human control have been identified', 5);
  }

  if (n.useContext === 'internal') acc.add('Internal use keeps operational demands contained', 5);
  if (n.useContext === 'public') acc.add('Public use raises operational demands considerably', -5);

  if (n.userCountUpper > 1 && n.accountsExpectation === 'none') {
    acc.add('Several people would share access with no individual accounts', -8);
  }
  if (n.browserOnly && n.requiredCapabilities.persistence > 0) {
    acc.add('Browser-only working restricts how records can be kept and operated', -6);
  }

  const action =
    !n.ownerDefined || !n.troubleshooterDefined
      ? 'Name the owner and the person who will troubleshoot before work starts.'
      : 'No action needed: operational responsibilities are assigned.';

  return finish('operational-feasibility', acc, n, action);
}

function financialPracticality(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(55, 'Starts from a neutral 55 and moves with the answers given.');
  acc.note(
    `No prices are generated by this tool. ${PRICING_VERIFICATION_STATEMENT} Only the budget range you selected is used here.`,
  );

  switch (n.budgetTier) {
    case 'none':
      if (n.requiredMaturity === 'production-ready') {
        acc.add('No budget, against requirements that normally carry a recurring cost', -20);
      } else {
        acc.add('No budget, but free or existing-tool routes are plausible at this scale', 5);
      }
      break;
    case 'under-500':
      acc.add('A small budget, workable for low-cost routes', 5);
      break;
    case '500-2500':
      acc.add('A modest budget that covers subscription-based routes for a small team', 8);
      break;
    case '2500-10000':
      acc.add('A budget that opens up most routes, including some external help', 12);
      break;
    case 'over-10000':
      acc.add('A budget that does not constrain route choice', 15);
      break;
    case 'unknown':
      acc.add('No budget was stated, so financial fit cannot be assessed', -15);
      acc.assume('Assessed as if only free or existing tools are available, pending a stated budget.');
      break;
  }

  if (n.requiredCapabilities.authentication > 0 && n.userCountUpper > 5 && n.budgetTier === 'none') {
    acc.add('Individual accounts for several people usually carry a per-seat cost, with no budget available', -12);
  }
  if (n.scopeTier === 'tiny' || n.scopeTier === 'small') {
    acc.add('A small scope keeps cost exposure low', 5);
  }
  if (
    (n.scopeTier === 'very-large' || n.scopeTier === 'large') &&
    (n.budgetTier === 'none' || n.budgetTier === 'under-500')
  ) {
    acc.add('A large scope against little or no budget', -12);
  }

  const action =
    n.budgetTier === 'unknown'
      ? 'State a budget range, even a rough one, so route costs can be compared against it.'
      : 'Confirm actual subscription and hosting prices for the shortlisted routes before committing.';

  return finish('financial-practicality', acc, n, action);
}

function timelineFeasibility(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(55, 'Starts from a neutral 55 and moves with the answers given.');
  acc.note(
    'This dimension covers the project timeline only. Where a lower Builder Fit would lengthen delivery, that appears in the timeline estimate, not here.',
  );

  switch (n.deadlineTier) {
    case 'no-date':
      acc.add('No fixed deadline', 15);
      break;
    case '6-months':
      acc.add('A six-month horizon', 10);
      break;
    case '3-months':
      acc.add('A three-month horizon', 5);
      break;
    case '1-month':
      acc.add('A one-month deadline', -5);
      break;
    case '2-weeks':
      acc.add('A two-week deadline', -15);
      break;
    case 'unknown':
      acc.add('No deadline was stated', -12);
      break;
  }

  switch (n.timelineFlexibility) {
    case 'flexible':
      acc.add('The timeline is fully flexible', 8);
      break;
    case 'somewhat':
      acc.add('The timeline is somewhat flexible', 3);
      break;
    case 'fixed':
      acc.add('The timeline cannot move', -8);
      break;
    case 'unknown':
      acc.add('Timeline flexibility was not stated', -3);
      break;
  }

  switch (n.weeklyHoursTier) {
    case 'over-20':
      acc.add('More than 20 hours a week available', 8);
      break;
    case '11-20':
      acc.add('11 to 20 hours a week available', 5);
      break;
    case '6-10':
      acc.add('6 to 10 hours a week available', 2);
      break;
    case '2-5':
      acc.add('Only 2 to 5 hours a week available', -3);
      break;
    case 'under-2':
      acc.add('Under 2 hours a week available', -10);
      break;
    case 'unknown':
      acc.add('Available time each week was not stated', -8);
      break;
  }

  if (n.scopeTier === 'large' || n.scopeTier === 'very-large') {
    acc.add('The scope is large relative to any short timeline', -10);
  }

  const action =
    n.deadlineTier === '2-weeks' || n.weeklyHoursTier === 'under-2'
      ? 'Either extend the deadline, reduce the first release, or secure more time each week.'
      : 'No action needed: the timeline looks workable for the scope described.';

  return finish('timeline-feasibility', acc, n, action);
}

function securityPermissions(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(65, 'Starts from 65, then moves with the sensitivity of the data.');

  if (n.sensitiveData) acc.add('Sensitive information is involved', -10);
  else acc.add('No sensitive information was identified', 8);
  if (n.personalData) acc.add('Personal information about identifiable people is involved', -6);
  if (n.regulatedData) acc.add('Regulated or legally protected data is involved', -12);

  if (n.permissionConcerns.length > 0) {
    acc.add('Permission concerns have been thought through and named', 8);
  } else if (n.sensitiveData) {
    acc.add('Sensitive data is involved but no permission concerns were named', -8);
  }

  if (n.securityConcerns.length > 0) {
    acc.add('Security concerns have been identified', 5);
  } else if (n.sensitiveData) {
    acc.add('Sensitive data is involved but no security concerns were identified', -8);
  }

  if (n.humanControlled.includes('communications') || n.humanControlled.includes('final-recommendations')) {
    acc.add('Consequential actions are explicitly reserved for humans', 6);
  }

  if (
    n.requiredCapabilities['role-based-access'] > 0 &&
    (n.accountsExpectation === 'none' || n.accountsExpectation === 'shared-access')
  ) {
    acc.add('Role separation is needed but no individual accounts are expected', -15);
  }
  if (n.sensitiveData && (n.hostingExpectation === 'public-site' || n.hostingExpectation === 'custom-domain')) {
    acc.add('Sensitive data paired with public hosting expectations', -20);
  }
  if (n.readOnlyDataRequired === true) {
    acc.add('Information that must stay read-only has been identified', 5);
  }

  const action = n.sensitiveData
    ? 'Decide who may see, edit, export, and delete each kind of information, and choose only routes that can enforce it.'
    : 'No action needed, though access should still be reviewed before real data is used.';

  return finish('security-permissions', acc, n, action);
}

function hostingSharing(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(60, 'Starts from 60 and moves with hosting and sharing expectations.');

  switch (n.hostingExpectation) {
    case 'none':
      acc.add('No hosting is expected, so there is nothing to arrange', 10);
      break;
    case 'local-only':
      acc.add('Running on one computer only, which is simple but limits sharing', 5);
      break;
    case 'internal-share':
      acc.add('Internal sharing only, which existing tools can usually satisfy', 8);
      break;
    case 'private-link':
      acc.add('A private link for the team, which needs a hosting decision', 4);
      break;
    case 'public-site':
      acc.add('A public website, which adds hosting and exposure to manage', -6);
      break;
    case 'custom-domain':
      acc.add('A custom domain, which adds cost and administration', -10);
      break;
    case 'unknown':
      acc.add('Hosting expectations were not stated', -10);
      break;
  }

  if (n.sharingNeeds.length > 0 || n.sharingRequirements.length > 0) {
    acc.add('Sharing needs have been described', 5);
  }
  if (n.externalAudience && (n.hostingExpectation === 'none' || n.hostingExpectation === 'local-only')) {
    acc.add('People outside the immediate team need access, but no hosting is planned', -15);
  }
  if (n.browserOnly && (n.hostingExpectation === 'custom-domain' || n.hostingExpectation === 'public-site')) {
    acc.add('Browser-only restrictions sit awkwardly with public hosting plans', -8);
  }
  if (n.sharingRequirements.includes('print-pdf')) {
    acc.add('Printable output is a modest, easily met requirement', 4);
  }

  const action =
    n.hostingExpectation === 'unknown'
      ? 'Decide whether this needs to be hosted at all, and if so who may reach it.'
      : 'No action needed: hosting expectations are clear enough to compare routes.';

  return finish('hosting-sharing', acc, n, action);
}

function maintenanceSustainability(n: NormalizedIntake): DimensionScore {
  const acc = new Accumulator(55, 'Starts from a neutral 55 and moves with the answers given.');

  switch (n.maintenanceTier) {
    case 'one-off':
      if (n.requiredCapabilities.persistence > 0) {
        acc.add('One-off maintenance is expected, but the tool would hold ongoing records', -10);
      } else {
        acc.add('One-off use, so there is little to sustain', 10);
      }
      break;
    case 'occasional':
      acc.add('Occasional updates expected, which is sustainable', 8);
      break;
    case 'monthly':
      acc.add('Monthly updates expected', 3);
      break;
    case 'weekly':
      acc.add('Weekly updates expected, which is a standing commitment', -3);
      break;
    case 'continuous':
      acc.add('Continuous upkeep expected, which needs a dedicated owner', -8);
      break;
    case 'unknown':
      acc.add('Maintenance expectations were not stated', -10);
      break;
  }

  if (n.troubleshooterDefined) acc.add('A named person will maintain and troubleshoot it', 10);
  else acc.add('No named person will maintain or troubleshoot it', -10);

  if (n.ownerDefined) acc.add('Ownership is assigned', 8);
  else acc.add('Ownership is unassigned, so decay is likely', -8);

  if (n.requiredCapabilities.persistence > 0 && !n.dataUpdaterDefined) {
    acc.add('Records would need upkeep, but nobody is assigned to it', -8);
  }

  const action = n.troubleshooterDefined
    ? 'No action needed, though the maintenance expectation should be revisited once a route is chosen.'
    : 'Name who maintains this after the first release, and confirm they have the time.';

  return finish('maintenance-sustainability', acc, n, action);
}

const SCORERS: Record<DimensionId, (n: NormalizedIntake) => DimensionScore> = {
  'problem-value': problemValue,
  'scope-realism': scopeRealism,
  'data-readiness': dataReadiness,
  'technical-feasibility': technicalFeasibility,
  'operational-feasibility': operationalFeasibility,
  'financial-practicality': financialPracticality,
  'timeline-feasibility': timelineFeasibility,
  'security-permissions': securityPermissions,
  'hosting-sharing': hostingSharing,
  'maintenance-sustainability': maintenanceSustainability,
};

export function scoreProjectDimensions(n: NormalizedIntake): ProjectFeasibilityResult {
  const dimensions = DIMENSION_ORDER.map((id) => SCORERS[id](n));
  const weightTotal = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const score = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / weightTotal,
  );

  return {
    score,
    dimensions,
    weightTotal,
    statement:
      'Project feasibility describes the project itself. It excludes who would build it: builder capability is reported separately as Builder Fit and never lowers this score.',
    provenance: 'derived',
  };
}
