import { RECRUITMENT_PORTAL_SCENARIO, scenarioToAnswers } from '@/data/demoScenarios';
import { ALL_FIELDS } from '@/data/intakeSteps';
import type { AnswerMap, FieldAnswer } from '@/types/intake';

/* ------------------------------------------------------------------ *
 * Golden fixtures.
 *
 * Every scenario is fictional. They exist to pin engine behaviour: if a rule
 * changes, these tests say which scenarios changed and how. Each fixture must
 * answer every field in the schema, so nothing drifts in silently.
 * ------------------------------------------------------------------ */

const t = (text: string): FieldAnswer => ({ status: 'answered', text, choices: [], source: 'user' });
const c = (...choices: string[]): FieldAnswer => ({
  status: 'answered',
  text: '',
  choices,
  source: 'user',
});
const lines = (...entries: string[]): FieldAnswer => t(entries.join('\n'));
const none = (): FieldAnswer => ({ status: 'none', text: '', choices: [], source: 'user' });
const unknown = (): FieldAnswer => ({ status: 'unknown', text: '', choices: [], source: 'user' });

export interface Fixture {
  readonly id: string;
  readonly name: string;
  readonly expectation: string;
  readonly answers: AnswerMap;
}

/* ---------- A. Simple internal tracker ---------- */

const simpleTracker: AnswerMap = {
  workingTitle: t('Shared equipment loan tracker'),
  whatItIs: t(
    'A single shared list showing which pieces of office equipment are on loan, who has each item, when it was taken, and when it is due back, so the operations team can answer questions without walking around the building or asking three people.',
  ),
  problem: t(
    'Equipment goes missing because there is no single list of who borrowed what. Each of the three coordinators keeps their own notes, so nobody can say where an item is without asking everyone, and items are occasionally bought twice.',
  ),
  whyItMatters: t(
    'Roughly an hour a week is lost chasing equipment, and duplicate purchases happen two or three times a year. The coordinators feel it most, and it makes the team look disorganised to the rest of the office.',
  ),
  intendedUsers: c('operations'),
  userCount: c('2-5'),
  useContext: c('internal'),
  sharingNeeds: c('browser', 'shared-drive'),
  mustHave: lines(
    'Record each item on loan with the borrower and the date',
    'Show which items are currently out',
    'Mark an item as returned',
  ),
  niceToHave: none(),
  excludeForNow: lines('Barcode scanning', 'Automatic reminder emails'),
  expectedOutput: c('spreadsheet', 'template'),
  availableData: c('spreadsheets', 'notes'),
  dataFormat: c('excel-csv'),
  dataLocation: c('shared-drive'),
  sourceOfTruth: c('one-spreadsheet'),
  readOnlyData: c('no'),
  budget: c('none'),
  deadline: c('no-date'),
  availableTime: c('2-5'),
  timelineFlexible: c('flexible'),
  builderExperience: c('spreadsheet-power'),
  codingExperience: c('none'),
  noCodeExperience: c('built-small'),
  testTroubleshoot: c('moderately'),
  technicalAssistance: none(),
  developerSupport: c('none'),
  preferredApproaches: c('spreadsheet-doc'),
  hostingExpectation: c('internal-share'),
  databaseExpectation: c('spreadsheet-enough'),
  userAccounts: c('shared-access'),
  sharingRequirements: c('read-only-view'),
  restrictedMethods: none(),
  localDevRestrictions: none(),
  permissionConcerns: none(),
  toolsToAvoid: none(),
  humanControlled: none(),
  sensitiveInformation: c('nothing-sensitive'),
  securityConcerns: none(),
  maintenanceExpectation: c('occasional'),
  projectOwner: c('me'),
  dataUpdater: c('me'),
  troubleshooter: c('me'),
};

/* ---------- B. Common CRM requirement ---------- */

const commonCrm: AnswerMap = {
  workingTitle: t('Sales CRM for the client team'),
  whatItIs: t(
    'A CRM where the client team records every customer record, tracks leads through each deal stage, logs conversations, and sees which opportunities have gone quiet, replacing the spreadsheet and inbox folders used today.',
  ),
  problem: t(
    'Lead information is split between one spreadsheet, several inbox folders, and individual notebooks. Nobody can see the true state of the pipeline, follow-ups are missed, and two people have contacted the same lead twice this quarter.',
  ),
  whyItMatters: t(
    'Missed follow-ups cost real revenue, and the duplicate contacts embarrassed the team in front of a prospect. Leadership cannot forecast because the pipeline view is rebuilt by hand every month.',
  ),
  intendedUsers: c('operations', 'leadership', 'other-staff'),
  userCount: c('6-25'),
  useContext: c('internal'),
  sharingNeeds: c('browser', 'meeting'),
  mustHave: lines(
    'Hold one customer record per organisation',
    'Track each lead through its deal stage',
    'Log conversations against the customer record',
    'Show which opportunities have had no contact recently',
    'Restrict who can see which accounts',
    'Report on the current pipeline',
  ),
  niceToHave: lines('Shared email templates', 'A simple forecast view'),
  excludeForNow: lines('Marketing automation', 'Quote generation'),
  expectedOutput: c('dashboard', 'report', 'metrics'),
  availableData: c('spreadsheets', 'email'),
  dataFormat: c('excel-csv', 'unstructured'),
  dataLocation: c('shared-drive', 'inbox'),
  sourceOfTruth: c('one-spreadsheet'),
  readOnlyData: c('yes'),
  budget: c('500-2500'),
  deadline: c('3-months'),
  availableTime: c('6-10'),
  timelineFlexible: c('somewhat'),
  builderExperience: c('office-tools'),
  codingExperience: c('small-edits'),
  noCodeExperience: c('tried'),
  testTroubleshoot: c('slightly'),
  technicalAssistance: c('internal-it'),
  developerSupport: c('none'),
  preferredApproaches: c('existing-saas'),
  hostingExpectation: c('internal-share'),
  databaseExpectation: c('proper-now'),
  userAccounts: c('role-based'),
  sharingRequirements: c('read-only-view', 'multiple-editors'),
  restrictedMethods: none(),
  localDevRestrictions: c('no-installs'),
  permissionConcerns: c('view', 'edit', 'delete', 'export'),
  toolsToAvoid: none(),
  humanControlled: c('external-sharing'),
  sensitiveInformation: c('client-info', 'contact-details'),
  securityConcerns: c('unauthorised-access', 'accidental-sharing'),
  maintenanceExpectation: c('monthly'),
  projectOwner: c('named-person'),
  dataUpdater: c('whole-team'),
  troubleshooter: c('external-support'),
};

/* ---------- C. Moderate internal workflow ---------- */

const moderateWorkflow: AnswerMap = {
  workingTitle: t('Internal document review workflow'),
  whatItIs: t(
    'An internal tool where staff raise a document for review, a reviewer is assigned, the review status moves through a few defined states, reviewer comments are captured in one place, and the history of status changes is kept.',
  ),
  problem: t(
    'Review requests arrive by email and are lost in inboxes. Nobody knows which documents are waiting, who is reviewing them, or how long they have been sitting there, and reviewers often work from an outdated copy.',
  ),
  whyItMatters: t(
    'Reviews take twice as long as they should, deadlines slip, and the team occasionally publishes a version that was never properly reviewed, which has caused rework twice this year.',
  ),
  intendedUsers: c('operations', 'other-staff', 'leadership'),
  userCount: c('6-25'),
  useContext: c('internal'),
  sharingNeeds: c('browser', 'email'),
  mustHave: lines(
    'Record each review request with its document reference',
    'Assign a named reviewer',
    'Move the review through defined status states',
    'Capture reviewer comments against the request',
    'Keep a history of status changes',
  ),
  niceToHave: lines('A weekly summary of outstanding reviews', 'Reminders for overdue reviews'),
  excludeForNow: lines('Document storage itself', 'Digital signatures'),
  expectedOutput: c('web-app', 'dashboard'),
  availableData: c('email', 'documents'),
  dataFormat: c('word-docs', 'unstructured'),
  dataLocation: c('inbox', 'shared-drive'),
  sourceOfTruth: c('several-places'),
  readOnlyData: c('yes'),
  budget: c('500-2500'),
  deadline: c('3-months'),
  availableTime: c('6-10'),
  timelineFlexible: c('somewhat'),
  builderExperience: c('ai-assisted'),
  codingExperience: c('small-edits'),
  noCodeExperience: c('built-small'),
  testTroubleshoot: c('moderately'),
  technicalAssistance: c('technical-colleague'),
  developerSupport: c('could-hire'),
  preferredApproaches: c('no-code'),
  hostingExpectation: c('internal-share'),
  databaseExpectation: c('simple-later'),
  userAccounts: c('individual'),
  sharingRequirements: c('read-only-view', 'multiple-editors'),
  restrictedMethods: none(),
  localDevRestrictions: none(),
  permissionConcerns: c('view', 'edit', 'delete'),
  toolsToAvoid: none(),
  humanControlled: c('published-output'),
  sensitiveInformation: c('nothing-sensitive'),
  securityConcerns: c('accidental-sharing'),
  maintenanceExpectation: c('monthly'),
  projectOwner: c('named-person'),
  dataUpdater: c('whole-team'),
  troubleshooter: c('technical-colleague'),
};

/* ---------- D. Custom client-facing application ---------- */

const clientFacingApp: AnswerMap = {
  workingTitle: t('Client deliverable portal'),
  whatItIs: t(
    'A branded web application where each client signs in to see their own deliverables, download approved documents, comment on drafts, approve a stage, and follow progress, with staff seeing every client and clients seeing only their own material.',
  ),
  problem: t(
    'Deliverables are emailed as attachments, so clients cannot find the current version, approvals are buried in email threads, and staff spend hours resending files and reconstructing who approved what and when.',
  ),
  whyItMatters: t(
    'Two disputes this year came down to nobody being able to prove which version a client approved. Staff lose several hours a week resending files, and clients say the experience feels unprofessional.',
  ),
  intendedUsers: c('clients', 'operations', 'leadership'),
  userCount: c('26-100'),
  useContext: c('client-facing'),
  sharingNeeds: c('browser', 'link', 'pdf'),
  mustHave: lines(
    'Individual client sign-in',
    'Show each client only their own deliverables',
    'Download approved documents',
    'Comment on a draft deliverable',
    'Record a client approval of a stage',
    'Keep an audit history of approvals and changes',
    'Role-based access separating staff from clients',
  ),
  niceToHave: lines('Branded appearance per client', 'A progress view per engagement'),
  excludeForNow: lines('Invoicing', 'Time tracking'),
  expectedOutput: c('web-app', 'dashboard', 'report'),
  availableData: c('documents', 'email', 'spreadsheets'),
  dataFormat: c('word-docs', 'pdf', 'excel-csv'),
  dataLocation: c('cloud-storage', 'inbox'),
  sourceOfTruth: c('single-system'),
  readOnlyData: c('yes'),
  budget: c('over-10000'),
  deadline: c('6-months'),
  availableTime: c('11-20'),
  timelineFlexible: c('somewhat'),
  builderExperience: c('ai-assisted'),
  codingExperience: c('small-edits'),
  noCodeExperience: c('tried'),
  testTroubleshoot: c('slightly'),
  technicalAssistance: c('ai-only'),
  developerSupport: c('contractor'),
  preferredApproaches: c('custom-hosted'),
  hostingExpectation: c('custom-domain'),
  databaseExpectation: c('proper-now'),
  userAccounts: c('role-based'),
  sharingRequirements: c('read-only-view', 'external-access', 'print-pdf'),
  restrictedMethods: none(),
  localDevRestrictions: none(),
  permissionConcerns: c('view', 'edit', 'export', 'admin'),
  toolsToAvoid: none(),
  humanControlled: c('external-sharing', 'published-output'),
  sensitiveInformation: c('client-info', 'contact-details'),
  securityConcerns: c('unauthorised-access', 'accidental-sharing', 'data-loss'),
  maintenanceExpectation: c('monthly'),
  projectOwner: c('named-person'),
  dataUpdater: c('coordinator'),
  troubleshooter: c('external-support'),
};

/* ---------- E. Restricted local development ---------- */

const restrictedLocalDev: AnswerMap = {
  workingTitle: t('Team handover checklist tool'),
  whatItIs: t(
    'A browser-based tool where a coordinator works through a handover checklist for each departing staff member, records what has been returned or transferred, and produces a summary for the manager to sign off.',
  ),
  problem: t(
    'Handovers are tracked on a printed checklist that gets lost, so managers cannot tell which steps were completed. Items are occasionally never returned, and the same questions get asked weeks later with nobody able to answer.',
  ),
  whyItMatters: t(
    'Incomplete handovers create security and equipment problems, and the manager spends an afternoon per departure reconstructing what happened. It has already caused one access account to be left open for months.',
  ),
  intendedUsers: c('operations', 'hiring-managers'),
  userCount: c('6-25'),
  useContext: c('internal'),
  sharingNeeds: c('browser', 'pdf'),
  mustHave: lines(
    'Work through a defined checklist per departure',
    'Record what has been returned or transferred',
    'Show which steps remain outstanding',
    'Produce a summary for manager sign-off',
  ),
  niceToHave: none(),
  excludeForNow: lines('Integration with the HR system', 'Automatic account closure'),
  expectedOutput: c('web-app', 'report'),
  availableData: c('documents', 'spreadsheets'),
  dataFormat: c('excel-csv', 'word-docs'),
  dataLocation: c('shared-drive'),
  sourceOfTruth: c('one-spreadsheet'),
  readOnlyData: c('yes'),
  budget: c('under-500'),
  deadline: c('3-months'),
  availableTime: c('6-10'),
  timelineFlexible: c('somewhat'),
  builderExperience: c('ai-assisted'),
  codingExperience: c('small-edits'),
  noCodeExperience: c('built-small'),
  testTroubleshoot: c('moderately'),
  technicalAssistance: c('technical-colleague'),
  developerSupport: c('could-hire'),
  // Claude Code is a preferred approach, and remains technically valid, but the
  // environment restrictions below rule it out in practice.
  preferredApproaches: c('claude-code', 'claude-artifact'),
  hostingExpectation: c('internal-share'),
  databaseExpectation: c('simple-later'),
  userAccounts: c('shared-access'),
  sharingRequirements: c('read-only-view', 'print-pdf'),
  restrictedMethods: none(),
  localDevRestrictions: c('no-terminal', 'no-installs', 'no-local-files', 'browser-only'),
  permissionConcerns: c('view'),
  toolsToAvoid: lines('Anything requiring software installed on a work laptop'),
  humanControlled: c('final-recommendations'),
  sensitiveInformation: c('nothing-sensitive'),
  securityConcerns: c('wrong-place'),
  maintenanceExpectation: c('occasional'),
  projectOwner: c('me'),
  dataUpdater: c('coordinator'),
  troubleshooter: c('technical-colleague'),
};

/* ---------- G. Insufficient information ---------- */

const insufficientInformation: AnswerMap = Object.fromEntries(
  ALL_FIELDS.map(({ field }) => [field.id, unknown()]),
);

export const FIXTURES: Readonly<Record<string, Fixture>> = {
  simpleTracker: {
    id: 'A',
    name: 'Simple internal tracker',
    expectation:
      'A spreadsheet or document route wins, technical burden is low, Builder Fit is strong for a non-developer, and no custom build is recommended.',
    answers: simpleTracker,
  },
  commonCrm: {
    id: 'B',
    name: 'Common CRM requirement',
    expectation: 'An existing SaaS route wins and the verdict is "Use an existing solution".',
    answers: commonCrm,
  },
  moderateWorkflow: {
    id: 'C',
    name: 'Moderate internal workflow',
    expectation: 'A no-code route wins, with a Conditional Go or Proceed carefully verdict.',
    answers: moderateWorkflow,
  },
  clientFacingApp: {
    id: 'D',
    name: 'Custom client-facing application',
    expectation:
      'Technically feasible, a coded custom route wins, and the builder requires developer or professional support.',
    answers: clientFacingApp,
  },
  restrictedLocalDev: {
    id: 'E',
    name: 'Restricted local development',
    expectation:
      'Claude Code stays technically valid but is excluded by the stated environment restrictions, and a browser-based alternative is recommended.',
    answers: restrictedLocalDev,
  },
  recruitmentPortal: {
    id: 'F',
    name: 'Sensitive recruitment system (TCV demonstration scenario)',
    expectation:
      'A prototype is feasible, production needs authentication, role permissions, secure storage, audit history, and human approval, and AI cannot make final hiring decisions.',
    answers: scenarioToAnswers(RECRUITMENT_PORTAL_SCENARIO),
  },
  insufficientInformation: {
    id: 'G',
    name: 'Insufficient information',
    expectation: 'Low confidence, a Revise before building or Delay verdict, and no false precision.',
    answers: insufficientInformation,
  },
};

export const FIXTURE_LIST: readonly Fixture[] = Object.values(FIXTURES);
