/**
 * Single source of truth for the prototype's disclaimer wording, so the banner,
 * About panel, footer, README, and print view cannot drift apart.
 */

export const PROTOTYPE_NAME = 'The Feasibility Architect';

export const PROTOTYPE_TAGLINE =
  'An interactive feasibility-assessment prototype for evaluating a project idea before implementation.';

/** Short line shown in the always-visible banner. */
export const BANNER_TEXT =
  'Prototype - illustrative assessment only. Not a production system. Results require human review.';

/** The full set of statements the prototype must make about itself. */
export const PROTOTYPE_STATEMENTS: readonly string[] = [
  'This is an interactive feasibility-assessment prototype.',
  'It is not a production system.',
  'Its scoring rubric is illustrative, not an industry standard.',
  'Its results require human review.',
  'Its estimates are not vendor quotes.',
  'It must not be used to make final legal, financial, hiring, security, or implementation decisions.',
];

/** Constraints of this first version, stated plainly in the interface. */
export const PROTOTYPE_LIMITS: readonly string[] = [
  'Frontend-only: there is no backend, no database, and no authentication.',
  'Nothing is saved. Answers and results are held in memory for this page only - refreshing or closing the page clears the assessment.',
  'No external services are contacted. All scoring runs locally in your browser.',
  'All sample content is fictional. No real candidate, client, financial, or operational data is included.',
  'Cost and timeline figures are effort-based estimates. Pricing must be verified before implementation.',
];

/** Deliberately out of scope for the first version. */
export const FUTURE_FEATURES: readonly string[] = [
  'Saved assessments and persistent drafts',
  'Browser storage or a database',
  'Assessment history and comparison over time',
  'Exportable branded reports',
  'Hosting and a shareable link',
];

export const PALETTE_NOTE =
  'Colours are provisional approximations of a light Timber Creek Virtual look. They are not confirmed official brand codes.';
