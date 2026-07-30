import type { AnswerMap, FieldAnswer } from '@/types/intake';
import { EMPTY_ANSWER } from '@/types/intake';
import { ALL_FIELDS } from '@/data/intakeSteps';
import { listEntries } from '@/utils/answers';
import type {
  CapabilityId,
  CapabilityLevel,
  CapabilityMap,
  ConsequentialDomain,
  Level,
  MaturityLevel,
} from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Turns raw intake answers into the typed signals every scorer uses.
 *
 * Rules of this module:
 * - Unknown answers stay unknown. Where a number is unavoidable (builder
 *   ability levels), the conservative level is used and recorded as an
 *   assumption, never presented as the user's answer.
 * - Pure and deterministic: no clock, no randomness, no I/O.
 * ------------------------------------------------------------------ */

export type Specificity = 'detailed' | 'partial' | 'vague' | 'unknown';

export interface Conflict {
  readonly id: string;
  readonly description: string;
}

export interface NormalizedIntake {
  readonly answers: AnswerMap;

  /* Step 1 - idea and problem */
  readonly workingTitle: string;
  readonly ideaSpecificity: Specificity;
  readonly problemSpecificity: Specificity;
  readonly valueSpecificity: Specificity;
  readonly problemClear: boolean;

  /* Step 2 - users and sharing */
  readonly userGroups: readonly string[];
  readonly usersClear: boolean;
  readonly userCountTier: 'one' | 'few' | 'team' | 'large' | 'very-large' | 'unknown';
  readonly userCountUpper: number;
  readonly useContext: 'personal' | 'internal' | 'client-facing' | 'public' | 'unknown';
  readonly sharingNeeds: readonly string[];
  readonly externalAudience: boolean;

  /* Step 3 - features and scope */
  readonly mustHaveCount: number;
  readonly niceToHaveCount: number;
  readonly excludedCount: number;
  readonly scopeExplicitlyBounded: boolean;
  readonly expectedOutputs: readonly string[];
  readonly featureText: string;
  readonly scopeTier: 'tiny' | 'small' | 'moderate' | 'large' | 'very-large' | 'unknown';

  /* Step 4 - data */
  readonly availableData: readonly string[];
  readonly hasData: boolean;
  readonly dataFormats: readonly string[];
  readonly dataLocations: readonly string[];
  readonly sourceOfTruth:
    | 'single-system'
    | 'one-spreadsheet'
    | 'several-places'
    | 'person'
    | 'undefined'
    | 'unknown';
  readonly sourceOfTruthDefined: boolean;
  readonly dataDependent: boolean;
  readonly readOnlyDataRequired: boolean | null;

  /* Step 5 - budget and timeline */
  readonly budgetTier: 'none' | 'under-500' | '500-2500' | '2500-10000' | 'over-10000' | 'unknown';
  readonly budgetKnown: boolean;
  readonly deadlineTier: '2-weeks' | '1-month' | '3-months' | '6-months' | 'no-date' | 'unknown';
  readonly deadlineWeeks: number | null;
  readonly weeklyHours: number | null;
  readonly weeklyHoursTier: 'under-2' | '2-5' | '6-10' | '11-20' | 'over-20' | 'unknown';
  readonly timelineFlexibility: 'fixed' | 'somewhat' | 'flexible' | 'unknown';

  /* Step 6 - builder */
  readonly abilities: Readonly<Record<string, Level>>;
  readonly abilityNotes: Readonly<Record<string, string>>;
  readonly builderAnswersUnknown: readonly string[];
  readonly guidanceAvailable: boolean;
  readonly developerSupportAvailable: boolean;

  /* Step 7 - implementation preferences */
  readonly preferredRoutes: readonly string[];
  readonly hostingExpectation:
    | 'none'
    | 'local-only'
    | 'internal-share'
    | 'private-link'
    | 'public-site'
    | 'custom-domain'
    | 'unknown';
  readonly databaseExpectation:
    | 'none'
    | 'spreadsheet-enough'
    | 'simple-later'
    | 'proper-now'
    | 'unknown';
  readonly accountsExpectation: 'none' | 'shared-access' | 'individual' | 'role-based' | 'unknown';
  readonly sharingRequirements: readonly string[];

  /* Step 8 - restrictions */
  readonly restrictedRoutes: readonly string[];
  readonly localRestrictions: readonly string[];
  readonly browserOnly: boolean;
  readonly permissionConcerns: readonly string[];
  readonly toolsToAvoid: readonly string[];
  readonly humanControlled: readonly string[];

  /* Step 9 - security, maintenance, ownership */
  readonly sensitiveInformation: readonly string[];
  readonly sensitiveData: boolean;
  readonly personalData: boolean;
  readonly regulatedData: boolean;
  readonly securityConcerns: readonly string[];
  readonly maintenanceTier: 'one-off' | 'occasional' | 'monthly' | 'weekly' | 'continuous' | 'unknown';
  readonly ownerDefined: boolean;
  readonly dataUpdaterDefined: boolean;
  readonly troubleshooterDefined: boolean;

  /* Derived requirements */
  readonly requiredCapabilities: CapabilityMap;
  readonly capabilityReasons: Readonly<Record<CapabilityId, string>>;
  readonly requiredMaturity: MaturityLevel;
  readonly requiredMaturityReasons: readonly string[];
  readonly consequentialDomain: ConsequentialDomain;
  readonly consequentialEvidence: readonly string[];
  readonly integrationsNeeded: boolean;

  /* Answer quality */
  readonly unknownFieldIds: readonly string[];
  readonly unknownFieldLabels: readonly string[];
  readonly vagueFieldLabels: readonly string[];
  readonly conflicts: readonly Conflict[];
  readonly explicitNoneFieldIds: readonly string[];
}

const HIRING_WORDS = [
  'candidate',
  'interview',
  'recruit',
  'hiring',
  'hire',
  'applicant',
  'shortlist',
  'cv',
  'resume',
];
const LEGAL_WORDS = ['contract', 'legal', 'compliance obligation', 'litigation', 'clause'];
const FINANCIAL_WORDS = ['invoice', 'payroll', 'payment', 'salary', 'financial decision', 'billing'];
const MEDICAL_WORDS = ['patient', 'clinical', 'medical', 'diagnosis'];
const SECURITY_WORDS = ['access approval', 'credential', 'permission grant'];
const INTEGRATION_WORDS = ['integrat', 'sync', 'api', 'connect to', 'import from', 'export to'];
const AUDIT_WORDS = ['audit', 'history', 'track changes', 'who changed'];

function answer(answers: AnswerMap, id: string): FieldAnswer {
  return answers[id] ?? EMPTY_ANSWER;
}

function choice(answers: AnswerMap, id: string): string | null {
  const value = answer(answers, id);
  if (value.status !== 'answered') return null;
  return value.choices[0] ?? null;
}

function choices(answers: AnswerMap, id: string): readonly string[] {
  const value = answer(answers, id);
  return value.status === 'answered' ? value.choices : [];
}

function text(answers: AnswerMap, id: string): string {
  const value = answer(answers, id);
  return value.status === 'answered' ? value.text.trim() : '';
}

function specificityOf(value: string): Specificity {
  if (value.length === 0) return 'unknown';
  const words = value.split(/\s+/).filter(Boolean).length;
  if (words >= 30) return 'detailed';
  if (words >= 10) return 'partial';
  return 'vague';
}

function tierOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function clampLevel(value: number): Level {
  return Math.max(0, Math.min(4, Math.round(value))) as Level;
}

const EXPERIENCE_LEVELS: Record<string, Level> = {
  'non-technical': 0,
  'office-tools': 1,
  'spreadsheet-power': 2,
  'ai-assisted': 2,
  'some-coding': 3,
  developer: 4,
};
const CODING_LEVELS: Record<string, Level> = {
  none: 0,
  'read-only': 1,
  'small-edits': 2,
  'simple-scripts': 3,
  comfortable: 4,
};
const NO_CODE_LEVELS: Record<string, Level> = {
  none: 0,
  tried: 1,
  'built-small': 2,
  'built-maintained': 3,
};
const CONFIDENCE_LEVELS: Record<string, Level> = {
  not: 0,
  slightly: 1,
  moderately: 2,
  confident: 3,
  very: 4,
};
const ASSISTANCE_LEVELS: Record<string, Level> = {
  'ai-only': 1,
  'technical-colleague': 2,
  'occasional-advisor': 2,
  'internal-it': 2,
  'paid-support': 3,
};
const DEVELOPER_SUPPORT_LEVELS: Record<string, Level> = {
  none: 0,
  'could-hire': 2,
  contractor: 3,
  'in-house': 4,
};

const WEEKLY_HOURS: Record<string, number> = {
  'under-2': 1,
  '2-5': 3.5,
  '6-10': 8,
  '11-20': 15,
  'over-20': 25,
};

const DEADLINE_WEEKS: Record<string, number> = {
  '2-weeks': 2,
  '1-month': 4,
  '3-months': 13,
  '6-months': 26,
};

const USER_COUNT_UPPER: Record<string, number> = {
  '1': 1,
  '2-5': 5,
  '6-25': 25,
  '26-100': 100,
  '100-plus': 250,
};

export function normalizeAnswers(answers: AnswerMap): NormalizedIntake {
  /* ---------- answer quality ---------- */
  const unknownFieldIds: string[] = [];
  const unknownFieldLabels: string[] = [];
  const explicitNoneFieldIds: string[] = [];
  const vagueFieldLabels: string[] = [];

  for (const { field } of ALL_FIELDS) {
    const value = answer(answers, field.id);
    if (value.status === 'unknown' || value.status === 'empty') {
      unknownFieldIds.push(field.id);
      unknownFieldLabels.push(field.label);
    }
    if (value.status === 'none') {
      explicitNoneFieldIds.push(field.id);
    }
    // Only prose answers can be "too brief to interpret". List fields are
    // legitimately terse - a three-word feature is a feature, not a vague answer.
    if (
      value.status === 'answered' &&
      field.kind === 'longtext' &&
      specificityOf(value.text.trim()) === 'vague'
    ) {
      vagueFieldLabels.push(field.label);
    }
  }

  /* ---------- step 1 ---------- */
  const ideaText = text(answers, 'whatItIs');
  const problemText = text(answers, 'problem');
  const valueText = text(answers, 'whyItMatters');
  const ideaSpecificity = specificityOf(ideaText);
  const problemSpecificity = specificityOf(problemText);
  const valueSpecificity = specificityOf(valueText);
  const problemClear = problemSpecificity === 'detailed' || problemSpecificity === 'partial';

  /* ---------- step 2 ---------- */
  const userGroups = choices(answers, 'intendedUsers');
  const userCountTier = ((): NormalizedIntake['userCountTier'] => {
    switch (choice(answers, 'userCount')) {
      case '1':
        return 'one';
      case '2-5':
        return 'few';
      case '6-25':
        return 'team';
      case '26-100':
        return 'large';
      case '100-plus':
        return 'very-large';
      default:
        return 'unknown';
    }
  })();
  const userCountUpper = USER_COUNT_UPPER[choice(answers, 'userCount') ?? ''] ?? 0;
  const useContext = tierOf(
    choice(answers, 'useContext'),
    ['personal', 'internal', 'client-facing', 'public'] as const,
    'unknown' as const,
  );
  const sharingNeeds = choices(answers, 'sharingNeeds');
  const sharingRequirements = choices(answers, 'sharingRequirements');
  const externalAudience =
    useContext === 'client-facing' ||
    useContext === 'public' ||
    userGroups.includes('clients') ||
    userGroups.includes('external-applicants') ||
    sharingRequirements.includes('external-access');

  /* ---------- step 3 ---------- */
  const mustHave = listEntries(answer(answers, 'mustHave'));
  const niceToHave = listEntries(answer(answers, 'niceToHave'));
  const excluded = listEntries(answer(answers, 'excludeForNow'));
  const expectedOutputs = choices(answers, 'expectedOutput');
  const featureText = [...mustHave, ...niceToHave, ideaText, problemText]
    .join(' ')
    .toLowerCase();
  const scopeTier = ((): NormalizedIntake['scopeTier'] => {
    if (answer(answers, 'mustHave').status !== 'answered') return 'unknown';
    if (mustHave.length <= 1) return 'tiny';
    if (mustHave.length <= 3) return 'small';
    if (mustHave.length <= 6) return 'moderate';
    if (mustHave.length <= 10) return 'large';
    return 'very-large';
  })();

  /* ---------- step 4 ---------- */
  const availableData = choices(answers, 'availableData');
  const hasData = availableData.length > 0 && !availableData.includes('none-yet');
  const sourceOfTruth = tierOf(
    choice(answers, 'sourceOfTruth'),
    ['single-system', 'one-spreadsheet', 'several-places', 'person', 'undefined'] as const,
    'unknown' as const,
  );
  const sourceOfTruthDefined =
    sourceOfTruth === 'single-system' || sourceOfTruth === 'one-spreadsheet';
  const readOnlyChoice = choice(answers, 'readOnlyData');
  const readOnlyDataRequired = readOnlyChoice === null ? null : readOnlyChoice === 'yes';

  /* ---------- step 5 ---------- */
  const budgetTier = tierOf(
    choice(answers, 'budget'),
    ['none', 'under-500', '500-2500', '2500-10000', 'over-10000'] as const,
    'unknown' as const,
  );
  const deadlineTier = tierOf(
    choice(answers, 'deadline'),
    ['2-weeks', '1-month', '3-months', '6-months', 'no-date'] as const,
    'unknown' as const,
  );
  const weeklyHoursTier = tierOf(
    choice(answers, 'availableTime'),
    ['under-2', '2-5', '6-10', '11-20', 'over-20'] as const,
    'unknown' as const,
  );
  const timelineFlexibility = tierOf(
    choice(answers, 'timelineFlexible'),
    ['fixed', 'somewhat', 'flexible'] as const,
    'unknown' as const,
  );

  /* ---------- step 6 : builder abilities ---------- */
  const builderAnswersUnknown: string[] = [];
  const abilityNotes: Record<string, string> = {};

  function levelFrom(
    fieldId: string,
    map: Record<string, Level>,
    label: string,
  ): Level {
    const selected = choice(answers, fieldId);
    if (selected === null) {
      builderAnswersUnknown.push(label);
      return 0;
    }
    return map[selected] ?? 0;
  }

  const generalTechnical = levelFrom('builderExperience', EXPERIENCE_LEVELS, 'builder experience');
  const coding = levelFrom('codingExperience', CODING_LEVELS, 'coding experience');
  const noCodeRaw = levelFrom('noCodeExperience', NO_CODE_LEVELS, 'no-code experience');
  const spreadsheetFloor: Level =
    choice(answers, 'builderExperience') === 'spreadsheet-power'
      ? 3
      : choice(answers, 'builderExperience') === 'office-tools'
        ? 1
        : 0;
  const noCodeSpreadsheet = clampLevel(Math.max(noCodeRaw, spreadsheetFloor));
  const confidence = levelFrom('testTroubleshoot', CONFIDENCE_LEVELS, 'testing confidence');

  const assistanceChoices = choices(answers, 'technicalAssistance');
  const assistanceAnswer = answer(answers, 'technicalAssistance');
  if (assistanceAnswer.status === 'unknown' || assistanceAnswer.status === 'empty') {
    builderAnswersUnknown.push('available technical assistance');
  }
  const guidance = clampLevel(
    assistanceChoices.reduce((max, id) => Math.max(max, ASSISTANCE_LEVELS[id] ?? 0), 0),
  );
  const developerSupport = levelFrom(
    'developerSupport',
    DEVELOPER_SUPPORT_LEVELS,
    'developer support',
  );

  const deployment = clampLevel(coding * 0.6 + generalTechnical * 0.4);
  const securityManagement = clampLevel(
    generalTechnical * 0.5 + confidence * 0.25 + coding * 0.25,
  );
  const maintenanceAbility = clampLevel(
    generalTechnical * 0.4 + confidence * 0.3 + Math.max(coding, noCodeSpreadsheet) * 0.3,
  );
  const learningCapacity = clampLevel(
    (generalTechnical + confidence) / 2 + (noCodeSpreadsheet >= 2 ? 0.5 : 0),
  );

  abilityNotes['general-technical'] = 'From the stated builder experience.';
  abilityNotes['coding'] = 'From the stated coding experience.';
  abilityNotes['no-code-spreadsheet'] =
    'From no-code experience, raised where the builder is a confident spreadsheet user.';
  abilityNotes['testing'] = 'From the stated testing and troubleshooting confidence.';
  abilityNotes['troubleshooting'] = 'From the stated testing and troubleshooting confidence.';
  abilityNotes['deployment'] =
    'Derived from coding and general technical experience; not asked directly.';
  abilityNotes['security-management'] =
    'Derived from general technical experience, coding, and testing confidence; not asked directly.';
  abilityNotes['maintenance'] =
    'Derived from general technical experience, testing confidence, and building experience.';
  abilityNotes['guidance-available'] = 'From the technical assistance available.';
  abilityNotes['developer-support-available'] = 'From the developer support available.';
  abilityNotes['learning-capacity'] =
    'Derived from general technical experience and testing confidence.';

  const abilities: Record<string, Level> = {
    'general-technical': generalTechnical,
    coding,
    'no-code-spreadsheet': noCodeSpreadsheet,
    testing: confidence,
    troubleshooting: confidence,
    deployment,
    'security-management': securityManagement,
    maintenance: maintenanceAbility,
    'guidance-available': guidance,
    'developer-support-available': developerSupport,
    'learning-capacity': learningCapacity,
  };

  /* ---------- step 7 ---------- */
  const preferredRoutes = choices(answers, 'preferredApproaches');
  const hostingExpectation = tierOf(
    choice(answers, 'hostingExpectation'),
    ['none', 'local-only', 'internal-share', 'private-link', 'public-site', 'custom-domain'] as const,
    'unknown' as const,
  );
  const databaseExpectation = tierOf(
    choice(answers, 'databaseExpectation'),
    ['none', 'spreadsheet-enough', 'simple-later', 'proper-now'] as const,
    'unknown' as const,
  );
  const accountsExpectation = tierOf(
    choice(answers, 'userAccounts'),
    ['none', 'shared-access', 'individual', 'role-based'] as const,
    'unknown' as const,
  );

  /* ---------- step 8 ---------- */
  const restrictedRoutes = choices(answers, 'restrictedMethods');
  const localRestrictions = choices(answers, 'localDevRestrictions');
  const browserOnly =
    localRestrictions.includes('browser-only') ||
    localRestrictions.includes('no-terminal') ||
    localRestrictions.includes('no-installs') ||
    localRestrictions.includes('no-local-files');
  const permissionConcerns = choices(answers, 'permissionConcerns');
  const toolsToAvoid = listEntries(answer(answers, 'toolsToAvoid'));
  const humanControlled = choices(answers, 'humanControlled');

  /* ---------- step 9 ---------- */
  const sensitiveInformation = choices(answers, 'sensitiveInformation');
  const meaningfulSensitive = sensitiveInformation.filter((id) => id !== 'nothing-sensitive');
  const sensitiveData = meaningfulSensitive.length > 0;
  const personalData =
    sensitiveInformation.includes('contact-details') ||
    sensitiveInformation.includes('employment-history') ||
    sensitiveInformation.includes('assessments');
  const regulatedData = sensitiveInformation.includes('regulated');
  const securityConcerns = choices(answers, 'securityConcerns');
  const maintenanceTier = tierOf(
    choice(answers, 'maintenanceExpectation'),
    ['one-off', 'occasional', 'monthly', 'weekly', 'continuous'] as const,
    'unknown' as const,
  );
  const ownerChoice = choice(answers, 'projectOwner');
  const updaterChoice = choice(answers, 'dataUpdater');
  const troubleshooterChoice = choice(answers, 'troubleshooter');

  /* ---------- derived requirements ---------- */
  const multiUser = userCountUpper > 1 || sharingRequirements.includes('multiple-editors');
  const dataDependent =
    hasData ||
    databaseExpectation === 'simple-later' ||
    databaseExpectation === 'proper-now' ||
    databaseExpectation === 'spreadsheet-enough' ||
    expectedOutputs.includes('dashboard') ||
    expectedOutputs.includes('metrics') ||
    /record|track|log|store|register|history/.test(featureText);
  const needsPersistence =
    dataDependent &&
    (databaseExpectation !== 'none' || /record|track|store|register/.test(featureText));
  const needsAuth =
    accountsExpectation === 'individual' ||
    accountsExpectation === 'role-based' ||
    (sensitiveData && multiUser) ||
    externalAudience;
  const needsRbac =
    accountsExpectation === 'role-based' ||
    (sensitiveData && multiUser) ||
    permissionConcerns.filter((id) => id !== 'admin').length >= 2;
  const needsAudit =
    AUDIT_WORDS.some((word) => featureText.includes(word)) ||
    (sensitiveData && multiUser) ||
    permissionConcerns.includes('delete');
  const integrationsNeeded = INTEGRATION_WORDS.some((word) => featureText.includes(word));

  const capabilityReasons: Record<CapabilityId, string> = {
    persistence: needsPersistence
      ? 'The described features involve recording or tracking information over time.'
      : 'No persistent record appears to be required.',
    'multi-user': multiUser
      ? `More than one person needs to use it (${userCountTier === 'unknown' ? 'user count not stated' : `up to about ${userCountUpper}`}).`
      : 'Single-user use as described.',
    authentication: needsAuth
      ? 'Individual identity matters, because of account expectations, sensitive data, or an external audience.'
      : 'No individual sign-in requirement was identified.',
    'role-based-access': needsRbac
      ? 'Different people must be able to do different things, or permission concerns were raised.'
      : 'No role separation requirement was identified.',
    'audit-history': needsAudit
      ? 'Changes need to be traceable, because of the features described, sensitive data, or deletion concerns.'
      : 'No change-history requirement was identified.',
    integrations: integrationsNeeded
      ? 'The description refers to connecting to or syncing with another system.'
      : 'No integration requirement was identified.',
    'custom-interface':
      expectedOutputs.includes('web-app') && externalAudience
        ? 'A web application is expected for an audience outside the immediate team, which needs full control of the interface rather than a configurable one.'
        : expectedOutputs.includes('web-app') || expectedOutputs.includes('dashboard')
          ? 'A purpose-built screen or dashboard is expected.'
          : 'No bespoke interface requirement was identified.',
  };

  const requiredCapabilities: CapabilityMap = {
    persistence: (needsPersistence ? (databaseExpectation === 'proper-now' ? 3 : 2) : 0) as CapabilityLevel,
    'multi-user': (multiUser ? (userCountUpper > 25 ? 3 : 2) : 0) as CapabilityLevel,
    authentication: (needsAuth ? (externalAudience || regulatedData ? 3 : 2) : 0) as CapabilityLevel,
    'role-based-access': (needsRbac ? (regulatedData ? 3 : 2) : 0) as CapabilityLevel,
    'audit-history': (needsAudit ? 2 : 0) as CapabilityLevel,
    integrations: (integrationsNeeded ? 2 : 0) as CapabilityLevel,
    'custom-interface': (expectedOutputs.includes('web-app') && externalAudience
      ? 3
      : expectedOutputs.includes('web-app')
        ? 2
        : expectedOutputs.includes('dashboard')
          ? 1
          : 0) as CapabilityLevel,
  };

  /* ---------- consequential domain ---------- */
  const consequentialEvidence: string[] = [];
  let consequentialDomain: ConsequentialDomain = 'none';
  const domainHaystack = `${featureText} ${text(answers, 'workingTitle').toLowerCase()}`;
  if (
    HIRING_WORDS.some((word) => domainHaystack.includes(word)) ||
    sensitiveInformation.includes('employment-history') ||
    sensitiveInformation.includes('assessments') ||
    userGroups.includes('external-applicants')
  ) {
    consequentialDomain = 'hiring';
    consequentialEvidence.push(
      'The project involves candidate, interview, or employment information.',
    );
  } else if (MEDICAL_WORDS.some((word) => domainHaystack.includes(word))) {
    consequentialDomain = 'medical';
    consequentialEvidence.push('The project refers to clinical or patient information.');
  } else if (
    FINANCIAL_WORDS.some((word) => domainHaystack.includes(word)) ||
    sensitiveInformation.includes('financial')
  ) {
    consequentialDomain = 'financial';
    consequentialEvidence.push('The project involves financial information or decisions.');
  } else if (LEGAL_WORDS.some((word) => domainHaystack.includes(word)) || regulatedData) {
    consequentialDomain = 'legal';
    consequentialEvidence.push('The project involves legal, contractual, or regulated material.');
  } else if (SECURITY_WORDS.some((word) => domainHaystack.includes(word))) {
    consequentialDomain = 'security';
    consequentialEvidence.push('The project involves access or credential decisions.');
  }

  /* ---------- required maturity ---------- */
  const requiredMaturityReasons: string[] = [];
  let requiredMaturity: MaturityLevel = 'interactive-prototype';
  if (needsPersistence) {
    requiredMaturity = 'mvp';
    requiredMaturityReasons.push('Information must be retained between uses.');
  }
  if (multiUser) {
    requiredMaturity = 'mvp';
    requiredMaturityReasons.push('More than one person needs to use it.');
  }
  if (needsAuth || needsRbac) {
    requiredMaturity = 'pilot';
    requiredMaturityReasons.push('Individual access or role separation is required.');
  }
  if (sensitiveData && multiUser) {
    requiredMaturity = 'production-ready';
    requiredMaturityReasons.push(
      'Sensitive information would be handled by several people, which requires production-grade controls.',
    );
  }
  if (consequentialDomain !== 'none' && needsPersistence) {
    requiredMaturity = 'production-ready';
    requiredMaturityReasons.push(
      `Records supporting ${consequentialDomain} decisions must be dependable and traceable.`,
    );
  }
  if (requiredMaturityReasons.length === 0) {
    requiredMaturityReasons.push(
      'Nothing in the answers requires storage, accounts, or multi-user use, so an interactive prototype may be sufficient.',
    );
  }

  /* ---------- conflicts ---------- */
  const conflicts: Conflict[] = [];
  const preferredAndRestricted = preferredRoutes.filter((id) => restrictedRoutes.includes(id));
  if (preferredAndRestricted.length > 0) {
    conflicts.push({
      id: 'preferred-and-restricted',
      description: `The same approach appears as both preferred and restricted: ${preferredAndRestricted.join(', ')}.`,
    });
  }
  if (needsPersistence && databaseExpectation === 'none') {
    conflicts.push({
      id: 'persistence-without-database',
      description:
        'The features require records to be kept, but the stated expectation is no database.',
    });
  }
  if (needsAuth && accountsExpectation === 'none') {
    conflicts.push({
      id: 'auth-without-accounts',
      description:
        'Individual access appears necessary, but the stated expectation is no user accounts.',
    });
  }
  if (externalAudience && hostingExpectation === 'none') {
    conflicts.push({
      id: 'external-without-hosting',
      description:
        'People outside the immediate team need access, but no hosting is expected.',
    });
  }
  if (sensitiveData && accountsExpectation === 'none' && multiUser) {
    conflicts.push({
      id: 'sensitive-without-accounts',
      description:
        'Sensitive information would be handled by several people with no individual accounts.',
    });
  }
  if (
    budgetTier === 'none' &&
    (hostingExpectation === 'custom-domain' || hostingExpectation === 'public-site')
  ) {
    conflicts.push({
      id: 'hosting-without-budget',
      description: 'Public hosting is expected but no budget is available.',
    });
  }
  if (maintenanceTier === 'one-off' && needsPersistence) {
    conflicts.push({
      id: 'ongoing-records-one-off-maintenance',
      description:
        'The tool would hold ongoing records, but maintenance is expected to be one-off.',
    });
  }

  return {
    answers,
    workingTitle: text(answers, 'workingTitle'),
    ideaSpecificity,
    problemSpecificity,
    valueSpecificity,
    problemClear,
    userGroups,
    usersClear: userGroups.length > 0,
    userCountTier,
    userCountUpper,
    useContext,
    sharingNeeds,
    externalAudience,
    mustHaveCount: mustHave.length,
    niceToHaveCount: niceToHave.length,
    excludedCount: excluded.length,
    scopeExplicitlyBounded:
      excluded.length > 0 || answer(answers, 'excludeForNow').status === 'none',
    expectedOutputs,
    featureText,
    scopeTier,
    availableData,
    hasData,
    dataFormats: choices(answers, 'dataFormat'),
    dataLocations: choices(answers, 'dataLocation'),
    sourceOfTruth,
    sourceOfTruthDefined,
    dataDependent,
    readOnlyDataRequired,
    budgetTier,
    budgetKnown: budgetTier !== 'unknown',
    deadlineTier,
    deadlineWeeks: DEADLINE_WEEKS[deadlineTier] ?? null,
    weeklyHours: WEEKLY_HOURS[weeklyHoursTier] ?? null,
    weeklyHoursTier,
    timelineFlexibility,
    abilities,
    abilityNotes,
    builderAnswersUnknown,
    guidanceAvailable: guidance > 0,
    developerSupportAvailable: developerSupport >= 2,
    preferredRoutes,
    hostingExpectation,
    databaseExpectation,
    accountsExpectation,
    sharingRequirements,
    restrictedRoutes,
    localRestrictions,
    browserOnly,
    permissionConcerns,
    toolsToAvoid,
    humanControlled,
    sensitiveInformation,
    sensitiveData,
    personalData,
    regulatedData,
    securityConcerns,
    maintenanceTier,
    ownerDefined: ownerChoice !== null && ownerChoice !== 'not-decided',
    dataUpdaterDefined: updaterChoice !== null && updaterChoice !== 'not-decided',
    troubleshooterDefined: troubleshooterChoice !== null && troubleshooterChoice !== 'not-decided',
    requiredCapabilities,
    capabilityReasons,
    requiredMaturity,
    requiredMaturityReasons,
    consequentialDomain,
    consequentialEvidence,
    integrationsNeeded,
    unknownFieldIds,
    unknownFieldLabels,
    vagueFieldLabels,
    conflicts,
    explicitNoneFieldIds,
  };
}
