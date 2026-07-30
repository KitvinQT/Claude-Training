import type { AnswerMap, FieldAnswer } from '@/types/intake';

/**
 * Fictional demonstration scenarios.
 *
 * Every value here is invented for demonstration purposes. No real candidate,
 * client, employee, financial, or operational information appears in this file,
 * and none may ever be added to it. Answers loaded from a scenario are marked
 * "Demonstration data" until the user edits them.
 */

type DemoAnswerSpec =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'choices'; readonly choices: readonly string[] }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'none' };

const t = (text: string): DemoAnswerSpec => ({ kind: 'text', text });
const c = (...choices: string[]): DemoAnswerSpec => ({ kind: 'choices', choices });
const unknown = (): DemoAnswerSpec => ({ kind: 'unknown' });
const none = (): DemoAnswerSpec => ({ kind: 'none' });

export interface DemoScenario {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  /** Keyed by field id. Must cover every field in the intake schema. */
  readonly answers: Readonly<Record<string, DemoAnswerSpec>>;
}

export const RECRUITMENT_PORTAL_SCENARIO: DemoScenario = {
  id: 'recruitment-portal',
  name: 'TCV Recruitment and Candidate Assessment Portal',
  summary:
    'A fictional internal portal for tracking candidates through L1, L2, and L3 interviews, organising recruiter notes, and producing interview summaries and basic recruitment metrics. All content is invented for demonstration.',
  answers: {
    // Step 1 - project idea and problem
    workingTitle: t('Recruitment and Candidate Assessment Portal'),
    whatItIs: t(
      'A browser-based internal portal where recruiters record candidate details, move each candidate through L1, L2, and L3 interview stages, keep interview notes in one place, and generate an interview summary report for the hiring manager. It would also compare shortlisted candidates side by side and show simple recruitment metrics such as how many candidates sit at each stage.',
    ),
    problem: t(
      'Candidate information is currently spread across separate spreadsheets, email threads, and individual recruiters’ notes. Nobody can see the true state of a hiring round without asking three people, interview notes get written in different formats, and summary reports are rebuilt by hand for every hiring manager.',
    ),
    whyItMatters: t(
      'Hiring decisions get delayed while information is gathered, two recruiters occasionally contact the same candidate, and inconsistent notes make it harder to compare candidates fairly. The people who feel it most are the recruiters chasing information and the hiring managers waiting on summaries.',
    ),

    // Step 2 - users and sharing
    intendedUsers: c('recruiters', 'hiring-managers', 'operations', 'leadership'),
    userCount: c('6-25'),
    useContext: c('internal'),
    sharingNeeds: c('browser', 'pdf', 'email', 'meeting'),

    // Step 3 - features and scope
    mustHave: t(
      [
        'Record candidate details in one consistent place',
        'Track each candidate through L1, L2, and L3 interview stages',
        'Organise recruiter notes against the right candidate and stage',
        'Generate an interview summary report per candidate',
        'Record a pass, conditional pass, or fail recommendation per stage',
        'Show hiring-stage progress across the whole round',
      ].join('\n'),
    ),
    niceToHave: t(
      [
        'Compare shortlisted candidates side by side',
        'Draft candidate communications for a recruiter to review and send',
        'Basic recruitment metrics such as candidates per stage and average time in stage',
      ].join('\n'),
    ),
    excludeForNow: t(
      [
        'Automatic sending of any candidate email',
        'Automated scoring or ranking of candidates',
        'Integration with an external job board',
        'Offer letters and contracts',
      ].join('\n'),
    ),
    expectedOutput: c('web-app', 'dashboard', 'report', 'messages', 'metrics'),

    // Step 4 - data and source of truth
    availableData: c('spreadsheets', 'documents', 'email', 'notes'),
    dataFormat: c('excel-csv', 'word-docs', 'pdf', 'unstructured'),
    dataLocation: c('shared-drive', 'inbox', 'local'),
    sourceOfTruth: c('several-places'),
    readOnlyData: c('yes'),

    // Step 5 - budget and timeline
    // Deliberately left unknown so the Unknowns handling is visible in the demo.
    budget: unknown(),
    deadline: c('3-months'),
    availableTime: c('6-10'),
    timelineFlexible: c('somewhat'),

    // Step 6 - builder capability and support
    builderExperience: c('ai-assisted'),
    codingExperience: c('small-edits'),
    noCodeExperience: c('built-small'),
    testTroubleshoot: c('moderately'),
    technicalAssistance: c('ai-only', 'technical-colleague'),
    developerSupport: c('could-hire'),

    // Step 7 - implementation, hosting, and sharing preferences
    preferredApproaches: c('claude-artifact', 'no-code', 'claude-code'),
    hostingExpectation: c('internal-share'),
    databaseExpectation: c('simple-later'),
    userAccounts: c('shared-access'),
    sharingRequirements: c('read-only-view', 'print-pdf', 'email-summary'),

    // Step 8 - restricted methods and permissions
    restrictedMethods: c('chat-only', 'existing-saas'),
    localDevRestrictions: c('no-terminal', 'no-local-db', 'no-installs', 'browser-only'),
    permissionConcerns: c('view', 'edit', 'export', 'communicate'),
    // Nothing beyond the local-development restrictions already listed above.
    toolsToAvoid: none(),
    humanControlled: c('final-recommendations', 'communications', 'deletion', 'external-sharing'),

    // Step 9 - security, maintenance, and ownership
    sensitiveInformation: c('contact-details', 'employment-history', 'assessments'),
    securityConcerns: c('unauthorised-access', 'accidental-sharing', 'wrong-place', 'ai-accuracy'),
    maintenanceExpectation: c('monthly'),
    projectOwner: c('named-person'),
    // Deliberately left unknown so the Unknowns handling is visible in the demo.
    dataUpdater: unknown(),
    troubleshooter: c('technical-colleague'),
  },
};

export const DEMO_SCENARIOS: readonly DemoScenario[] = [RECRUITMENT_PORTAL_SCENARIO];

/** Converts a scenario into the answer map, marking every value as demo data. */
export function scenarioToAnswers(scenario: DemoScenario): AnswerMap {
  const answers: Record<string, FieldAnswer> = {};
  for (const [fieldId, spec] of Object.entries(scenario.answers)) {
    answers[fieldId] = specToAnswer(spec);
  }
  return answers;
}

function specToAnswer(spec: DemoAnswerSpec): FieldAnswer {
  switch (spec.kind) {
    case 'text':
      return { status: 'answered', text: spec.text, choices: [], source: 'demo' };
    case 'choices':
      return { status: 'answered', text: '', choices: spec.choices, source: 'demo' };
    case 'none':
      return { status: 'none', text: '', choices: [], source: 'demo' };
    case 'unknown':
      return { status: 'unknown', text: '', choices: [], source: 'demo' };
  }
}
