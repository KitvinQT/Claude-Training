import type { IntakeStep } from '@/types/intake';

/**
 * The nine grouped intake steps.
 *
 * Every field can be answered, marked "Not sure / skip" (recorded as Unknown), or
 * - where genuinely applicable - answered as "None". No option list contains a
 * "not sure" choice: uncertainty is always recorded through the skip control so it
 * is tracked consistently and can surface in the Unknowns panel.
 */
export const INTAKE_STEPS: readonly IntakeStep[] = [
  {
    id: 'idea',
    title: 'Project idea and problem',
    reviewTitle: 'Project overview',
    prompt:
      "Let's start with the idea itself. What are you thinking of building, and what problem should it solve?",
    fields: [
      {
        id: 'workingTitle',
        label: 'Project name or working title',
        kind: 'text',
        placeholder: 'e.g. Recruitment and candidate assessment portal',
      },
      {
        id: 'whatItIs',
        label: 'What is the project?',
        kind: 'longtext',
        help: 'A few sentences describing what it would be and what it would do.',
        important: true,
      },
      {
        id: 'problem',
        label: 'What problem should it solve?',
        kind: 'longtext',
        help: 'Describe the current difficulty, not the solution.',
        important: true,
      },
      {
        id: 'whyItMatters',
        label: 'Why does this problem matter?',
        kind: 'longtext',
        help: 'What goes wrong today, and who feels it?',
      },
    ],
  },
  {
    id: 'users',
    title: 'Users and sharing',
    reviewTitle: 'Users and sharing',
    prompt:
      'Now the people. Who would actually use this, and who else needs to see what comes out of it?',
    fields: [
      {
        id: 'intendedUsers',
        label: 'Who are the intended users?',
        kind: 'multi',
        important: true,
        options: [
          { id: 'just-me', label: 'Just me' },
          { id: 'recruiters', label: 'Recruiters' },
          { id: 'hiring-managers', label: 'Hiring managers' },
          { id: 'operations', label: 'Operations team' },
          { id: 'leadership', label: 'Leadership' },
          { id: 'clients', label: 'Clients' },
          { id: 'external-applicants', label: 'External applicants or candidates' },
          { id: 'other-staff', label: 'Other internal staff' },
        ],
      },
      {
        id: 'userCount',
        label: 'Approximately how many people would use it?',
        kind: 'single',
        options: [
          { id: '1', label: 'Just one person' },
          { id: '2-5', label: '2 to 5' },
          { id: '6-25', label: '6 to 25' },
          { id: '26-100', label: '26 to 100' },
          { id: '100-plus', label: 'More than 100' },
        ],
      },
      {
        id: 'useContext',
        label: 'How would it be used?',
        kind: 'single',
        options: [
          { id: 'personal', label: 'Personal use' },
          { id: 'internal', label: 'Internal team use' },
          { id: 'client-facing', label: 'Client-facing' },
          { id: 'public', label: 'Public' },
        ],
      },
      {
        id: 'sharingNeeds',
        label: 'How would the results need to be shared?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'No sharing needed',
        options: [
          { id: 'browser', label: 'Viewed in a browser' },
          { id: 'link', label: 'Sent as a link' },
          { id: 'pdf', label: 'Exported to PDF or print' },
          { id: 'email', label: 'Copied into an email' },
          { id: 'shared-drive', label: 'Placed on a shared drive' },
          { id: 'meeting', label: 'Presented in a meeting' },
        ],
      },
    ],
  },
  {
    id: 'features',
    title: 'Features and scope',
    reviewTitle: 'Features and scope',
    prompt:
      "Let's separate the essentials from the extras. What must it do, and what can wait?",
    fields: [
      {
        id: 'mustHave',
        label: 'Must-have features',
        kind: 'list',
        help: 'One per line. Only what the project fails without.',
        placeholder: 'Record candidate details\nTrack interview stages',
      },
      {
        id: 'niceToHave',
        label: 'Nice-to-have features',
        kind: 'list',
        help: 'One per line. Valuable, but not essential to a first version.',
        allowNone: true,
        noneLabel: 'None to add',
      },
      {
        id: 'excludeForNow',
        label: 'Features to deliberately exclude for now',
        kind: 'list',
        help: 'One per line. Naming these protects the scope.',
        allowNone: true,
        noneLabel: 'Nothing excluded yet',
      },
      {
        id: 'expectedOutput',
        label: 'What should it produce?',
        kind: 'multi',
        options: [
          { id: 'web-app', label: 'A working web application' },
          { id: 'dashboard', label: 'A dashboard or overview screen' },
          { id: 'report', label: 'Reports or documents' },
          { id: 'spreadsheet', label: 'A spreadsheet or structured list' },
          { id: 'template', label: 'Checklists or templates' },
          { id: 'messages', label: 'Draft messages or communications' },
          { id: 'metrics', label: 'Metrics or summary figures' },
        ],
      },
    ],
  },
  {
    id: 'data',
    title: 'Data and source of truth',
    reviewTitle: 'Data and source of truth',
    prompt:
      'Data next. What information already exists, where does it live, and which copy is the one people trust?',
    fields: [
      {
        id: 'availableData',
        label: 'What data is already available?',
        kind: 'multi',
        options: [
          { id: 'spreadsheets', label: 'Spreadsheets' },
          { id: 'documents', label: 'Documents' },
          { id: 'email', label: 'Email threads' },
          { id: 'forms', label: 'Form responses' },
          { id: 'notes', label: 'Personal or team notes' },
          { id: 'exports', label: 'Exports from an existing system' },
          { id: 'paper', label: 'Paper records' },
          { id: 'none-yet', label: 'Nothing yet' },
        ],
      },
      {
        id: 'dataFormat',
        label: 'What format is the data in?',
        kind: 'multi',
        options: [
          { id: 'excel-csv', label: 'Excel or CSV' },
          { id: 'word-docs', label: 'Word or Docs' },
          { id: 'pdf', label: 'PDF' },
          { id: 'plain-text', label: 'Plain text' },
          { id: 'images', label: 'Images or scans' },
          { id: 'in-app', label: 'Only inside another application' },
          { id: 'unstructured', label: 'Unstructured notes' },
        ],
      },
      {
        id: 'dataLocation',
        label: 'Where does the data currently live?',
        kind: 'multi',
        options: [
          { id: 'local', label: 'A local computer' },
          { id: 'shared-drive', label: 'A shared drive' },
          { id: 'cloud-storage', label: 'Cloud storage' },
          { id: 'inbox', label: 'An email inbox' },
          { id: 'saas-tool', label: 'A SaaS tool' },
          { id: 'physical', label: 'Physical or paper files' },
          { id: 'nowhere', label: 'It does not exist yet' },
        ],
      },
      {
        id: 'sourceOfTruth',
        label: 'What is the authoritative source of truth?',
        kind: 'single',
        help: 'When two copies disagree, which one wins?',
        options: [
          { id: 'single-system', label: 'A single system of record' },
          { id: 'one-spreadsheet', label: 'One agreed spreadsheet' },
          { id: 'several-places', label: 'Several places, none authoritative' },
          { id: 'person', label: "One person's knowledge" },
          { id: 'undefined', label: 'Not defined yet' },
        ],
      },
      {
        id: 'readOnlyData',
        label: 'Should any data stay read-only?',
        kind: 'single',
        options: [
          { id: 'yes', label: 'Yes, some data must not be edited' },
          { id: 'no', label: 'No, everything can be edited' },
        ],
      },
    ],
  },
  {
    id: 'budget-time',
    title: 'Budget and timeline',
    reviewTitle: 'Budget and timeline',
    prompt:
      "Practical limits now. These are your figures, not estimates from me - I won't add prices of my own.",
    fields: [
      {
        id: 'budget',
        label: 'What budget is available?',
        kind: 'single',
        help: 'Your own figure. The prototype never invents prices or rates.',
        options: [
          { id: 'none', label: 'No budget' },
          { id: 'under-500', label: 'Under $500' },
          { id: '500-2500', label: '$500 to $2,500' },
          { id: '2500-10000', label: '$2,500 to $10,000' },
          { id: 'over-10000', label: 'Over $10,000' },
        ],
      },
      {
        id: 'deadline',
        label: 'Is there a desired deadline?',
        kind: 'single',
        options: [
          { id: '2-weeks', label: 'Within 2 weeks' },
          { id: '1-month', label: 'Within 1 month' },
          { id: '3-months', label: 'Within 3 months' },
          { id: '6-months', label: 'Within 6 months' },
          { id: 'no-date', label: 'No fixed date' },
        ],
      },
      {
        id: 'availableTime',
        label: 'How much time can you personally give it each week?',
        kind: 'single',
        options: [
          { id: 'under-2', label: 'Under 2 hours' },
          { id: '2-5', label: '2 to 5 hours' },
          { id: '6-10', label: '6 to 10 hours' },
          { id: '11-20', label: '11 to 20 hours' },
          { id: 'over-20', label: 'More than 20 hours' },
        ],
      },
      {
        id: 'timelineFlexible',
        label: 'How flexible is the timeline?',
        kind: 'single',
        options: [
          { id: 'fixed', label: 'Fixed, it cannot move' },
          { id: 'somewhat', label: 'Somewhat flexible' },
          { id: 'flexible', label: 'Fully flexible' },
        ],
      },
    ],
  },
  {
    id: 'builder',
    title: 'Builder capability and support',
    reviewTitle: 'Builder capability and support',
    prompt:
      'These answers shape the Builder Fit score only. They never make a feasible project infeasible - they change who should build it and how much help is needed.',
    fields: [
      {
        id: 'builderExperience',
        label: 'How would you describe your current experience?',
        kind: 'single',
        options: [
          { id: 'non-technical', label: 'No technical background' },
          { id: 'office-tools', label: 'Comfortable with everyday office tools' },
          { id: 'spreadsheet-power', label: 'Confident spreadsheet user' },
          { id: 'ai-assisted', label: 'Have built things with AI assistance' },
          { id: 'some-coding', label: 'Some coding experience' },
          { id: 'developer', label: 'Professional developer' },
        ],
      },
      {
        id: 'codingExperience',
        label: 'How much coding experience do you have?',
        kind: 'single',
        options: [
          { id: 'none', label: 'None' },
          { id: 'read-only', label: 'Can read code but not write it' },
          { id: 'small-edits', label: 'Can make small edits with help' },
          { id: 'simple-scripts', label: 'Can write simple scripts' },
          { id: 'comfortable', label: 'Comfortable writing code' },
        ],
      },
      {
        id: 'noCodeExperience',
        label: 'How much no-code experience do you have?',
        kind: 'single',
        options: [
          { id: 'none', label: 'None' },
          { id: 'tried', label: 'Tried a little' },
          { id: 'built-small', label: 'Built something small' },
          { id: 'built-maintained', label: 'Built and maintained something' },
        ],
      },
      {
        id: 'testTroubleshoot',
        label: 'How confident are you testing and troubleshooting what you build?',
        kind: 'single',
        options: [
          { id: 'not', label: 'Not confident' },
          { id: 'slightly', label: 'Slightly confident' },
          { id: 'moderately', label: 'Moderately confident' },
          { id: 'confident', label: 'Confident' },
          { id: 'very', label: 'Very confident' },
        ],
      },
      {
        id: 'technicalAssistance',
        label: 'What technical assistance is available to you?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'None available',
        options: [
          { id: 'ai-only', label: 'AI assistance only' },
          { id: 'technical-colleague', label: 'A technical colleague' },
          { id: 'occasional-advisor', label: 'An occasional advisor' },
          { id: 'paid-support', label: 'Paid technical support' },
          { id: 'internal-it', label: 'Internal IT support' },
        ],
      },
      {
        id: 'developerSupport',
        label: 'What developer support could you draw on?',
        kind: 'single',
        options: [
          { id: 'none', label: 'None available' },
          { id: 'could-hire', label: 'Could hire short-term help' },
          { id: 'contractor', label: 'A contractor is available' },
          { id: 'in-house', label: 'An in-house developer is available' },
        ],
      },
    ],
  },
  {
    id: 'implementation',
    title: 'Implementation, hosting, and sharing preferences',
    reviewTitle: 'Implementation preferences',
    prompt:
      'How would you prefer this to be built and run? Preferences are weighed, but they never override a genuine blocker.',
    fields: [
      {
        id: 'preferredApproaches',
        label: 'Which approaches would you prefer?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'No preference',
        options: [
          { id: 'existing-saas', label: 'An existing SaaS product' },
          { id: 'chat-only', label: 'A chat-only workflow' },
          { id: 'spreadsheet-doc', label: 'A spreadsheet or document workflow' },
          { id: 'no-code', label: 'A no-code platform' },
          { id: 'claude-artifact', label: 'A Claude Artifact' },
          { id: 'ai-assisted-coding', label: 'AI-assisted coding' },
          { id: 'claude-code', label: 'Claude Code' },
          { id: 'custom-hosted', label: 'A custom hosted web application' },
        ],
      },
      {
        id: 'hostingExpectation',
        label: 'What are your hosting expectations?',
        kind: 'single',
        options: [
          { id: 'none', label: 'No hosting needed' },
          { id: 'local-only', label: 'Runs on one computer only' },
          { id: 'internal-share', label: 'Internal sharing only' },
          { id: 'private-link', label: 'A private link for the team' },
          { id: 'public-site', label: 'A public website' },
          { id: 'custom-domain', label: 'A custom domain' },
        ],
      },
      {
        id: 'databaseExpectation',
        label: 'What are your database expectations?',
        kind: 'single',
        options: [
          { id: 'none', label: 'No database' },
          { id: 'spreadsheet-enough', label: 'A spreadsheet is enough' },
          { id: 'simple-later', label: 'A simple database later' },
          { id: 'proper-now', label: 'A proper database from the start' },
        ],
      },
      {
        id: 'userAccounts',
        label: 'What are your expectations for user accounts?',
        kind: 'single',
        options: [
          { id: 'none', label: 'No accounts at all' },
          { id: 'shared-access', label: 'Shared access, no individual logins' },
          { id: 'individual', label: 'Individual logins' },
          { id: 'role-based', label: 'Role-based permissions' },
        ],
      },
      {
        id: 'sharingRequirements',
        label: 'What sharing capabilities are required?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'None required',
        options: [
          { id: 'read-only-view', label: 'Read-only viewing for others' },
          { id: 'multiple-editors', label: 'Several people editing' },
          { id: 'print-pdf', label: 'Printable or PDF output' },
          { id: 'email-summary', label: 'Email-ready summaries' },
          { id: 'external-access', label: 'Access for people outside the team' },
        ],
      },
    ],
  },
  {
    id: 'restrictions',
    title: 'Restricted methods and permissions',
    reviewTitle: 'Restrictions and permissions',
    prompt:
      'Just as useful as what you want is what is off the table. Anything you rule out here is excluded from the recommendation, with the reason shown.',
    fields: [
      {
        id: 'restrictedMethods',
        label: 'Which approaches do you not want to use?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'Nothing ruled out',
        options: [
          { id: 'existing-saas', label: 'An existing SaaS product' },
          { id: 'chat-only', label: 'A chat-only workflow' },
          { id: 'spreadsheet-doc', label: 'A spreadsheet or document workflow' },
          { id: 'no-code', label: 'A no-code platform' },
          { id: 'claude-artifact', label: 'A Claude Artifact' },
          { id: 'ai-assisted-coding', label: 'AI-assisted coding' },
          { id: 'claude-code', label: 'Claude Code' },
          { id: 'custom-hosted', label: 'A custom hosted web application' },
        ],
      },
      {
        id: 'localDevRestrictions',
        label: 'Are there local-development restrictions?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'No restrictions',
        options: [
          { id: 'no-local-files', label: 'No writing files on my computer' },
          { id: 'no-terminal', label: 'No terminal or PowerShell use' },
          { id: 'no-local-db', label: 'No local databases' },
          { id: 'no-installs', label: 'No installing software' },
          { id: 'no-local-folders', label: 'No dependence on local folders' },
          { id: 'browser-only', label: 'Must work in the browser only' },
        ],
      },
      {
        id: 'permissionConcerns',
        label: 'What permission concerns do you have?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'No concerns',
        options: [
          { id: 'view', label: 'Who can view the data' },
          { id: 'edit', label: 'Who can edit the data' },
          { id: 'delete', label: 'Who can delete the data' },
          { id: 'export', label: 'Who can export the data' },
          { id: 'communicate', label: 'Who can send communications' },
          { id: 'admin', label: 'Who holds administrative control' },
        ],
      },
      {
        id: 'toolsToAvoid',
        label: 'Any specific tools or environments to avoid?',
        kind: 'list',
        help: 'One per line.',
        allowNone: true,
        noneLabel: 'None to avoid',
      },
      {
        id: 'humanControlled',
        label: 'What must stay under human control?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'Nothing specific',
        options: [
          { id: 'final-recommendations', label: 'Final recommendations or decisions' },
          { id: 'communications', label: 'Messages sent to people' },
          { id: 'deletion', label: 'Deleting records' },
          { id: 'external-sharing', label: 'Sharing outside the team' },
          { id: 'published-output', label: 'Anything published' },
          { id: 'costs', label: 'Approving costs' },
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security, maintenance, and ownership',
    reviewTitle: 'Security and maintenance',
    prompt:
      'Last step. What sensitive information is involved, and who looks after this once it exists?',
    fields: [
      {
        id: 'sensitiveInformation',
        label: 'What sensitive information would be involved?',
        kind: 'multi',
        options: [
          { id: 'contact-details', label: 'Personal contact details' },
          { id: 'employment-history', label: 'Employment history or CVs' },
          { id: 'assessments', label: 'Interview notes or assessments' },
          { id: 'client-info', label: 'Client information' },
          { id: 'financial', label: 'Financial information' },
          { id: 'regulated', label: 'Regulated or legally protected data' },
          { id: 'nothing-sensitive', label: 'Nothing sensitive' },
        ],
      },
      {
        id: 'securityConcerns',
        label: 'What security concerns do you have?',
        kind: 'multi',
        allowNone: true,
        noneLabel: 'No specific concerns',
        options: [
          { id: 'unauthorised-access', label: 'Unauthorised access' },
          { id: 'accidental-sharing', label: 'Accidental sharing' },
          { id: 'data-loss', label: 'Data loss' },
          { id: 'wrong-place', label: 'Data stored in the wrong place' },
          { id: 'compliance', label: 'Compliance or regulatory obligations' },
          { id: 'ai-accuracy', label: 'AI producing inaccurate content' },
        ],
      },
      {
        id: 'maintenanceExpectation',
        label: 'What maintenance do you expect?',
        kind: 'single',
        options: [
          { id: 'one-off', label: 'One-off use, then done' },
          { id: 'occasional', label: 'Occasional updates' },
          { id: 'monthly', label: 'Monthly updates' },
          { id: 'weekly', label: 'Weekly updates' },
          { id: 'continuous', label: 'Continuous upkeep' },
        ],
      },
      {
        id: 'projectOwner',
        label: 'Who would own the project?',
        kind: 'single',
        options: [
          { id: 'me', label: 'Me' },
          { id: 'named-person', label: 'Another named person' },
          { id: 'shared-team', label: 'Shared across a team' },
          { id: 'not-decided', label: 'Not decided' },
        ],
      },
      {
        id: 'dataUpdater',
        label: 'Who would keep the data up to date?',
        kind: 'single',
        options: [
          { id: 'me', label: 'Me' },
          { id: 'coordinator', label: 'A recruiter or coordinator' },
          { id: 'whole-team', label: 'The whole team' },
          { id: 'automated', label: 'An automated process' },
          { id: 'not-decided', label: 'Not decided' },
        ],
      },
      {
        id: 'troubleshooter',
        label: 'Who would troubleshoot or maintain it?',
        kind: 'single',
        options: [
          { id: 'me', label: 'Me' },
          { id: 'technical-colleague', label: 'A technical colleague' },
          { id: 'external-support', label: 'External support' },
          { id: 'not-decided', label: 'Not decided' },
        ],
      },
    ],
  },
];

export const TOTAL_STEPS = INTAKE_STEPS.length;

/** All fields across all steps, flattened, with their owning step. */
export const ALL_FIELDS = INTAKE_STEPS.flatMap((step) =>
  step.fields.map((field) => ({ step, field })),
);

export const TOTAL_FIELDS = ALL_FIELDS.length;

export function getStep(index: number): IntakeStep {
  const step = INTAKE_STEPS[index];
  if (!step) {
    throw new Error(`No intake step at index ${index}`);
  }
  return step;
}

export function stepIndexById(id: string): number {
  const index = INTAKE_STEPS.findIndex((step) => step.id === id);
  if (index < 0) {
    throw new Error(`No intake step with id "${id}"`);
  }
  return index;
}
