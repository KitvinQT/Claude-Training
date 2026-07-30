import type {
  AbilityId,
  CapabilityMap,
  CostCategory,
  Level,
  MaturityLevel,
  RouteId,
} from '@/engine/types';

/**
 * Implementation-route profiles.
 *
 * These profiles are written to be neutral between routes. Nothing here gives a
 * Claude-based route an advantage: the two AI-assisted routes carry higher
 * learning burden, higher maintenance ownership, and (for Claude Code) a local
 * environment requirement, while the spreadsheet, SaaS, and no-code routes carry
 * low builder requirements and low effort. A route wins only by matching what the
 * project actually needs.
 *
 * Capability levels: 0 absent, 1 minimal, 2 platform-provided, 3 full control.
 * Ability requirement levels: 0-4, compared against the builder's assessed level.
 */
export interface RouteProfile {
  readonly id: RouteId;
  readonly name: string;
  readonly summary: string;
  readonly capabilities: CapabilityMap;
  /** Capabilities whose real behaviour depends on a specific product or plan. */
  readonly capabilitiesRequiringVerification: readonly string[];
  readonly supportedMaturity: readonly MaturityLevel[];
  readonly productionBlockers: readonly string[];
  readonly builderRequirements: Readonly<Record<AbilityId, Level>>;
  /** Relative importance of each ability for this route; normalised at use. */
  readonly builderImportance: Readonly<Record<AbilityId, number>>;
  readonly requiredSkills: readonly string[];
  readonly requiredTechnicalSupport: string;
  readonly requiredHosting: string;
  readonly requiredDatabase: string;
  readonly authenticationRequirements: string;
  readonly securityConsiderations: readonly string[];
  /** Effort band in builder hours for a moderate scope, before adjustment. */
  readonly baseEffortHours: readonly [number, number];
  readonly setupCost: CostCategory;
  readonly monthlyCost: CostCategory;
  readonly maintenanceLevel: 'minimal' | 'low' | 'moderate' | 'high';
  readonly scalability: string;
  readonly vendorDependency: 'none' | 'low' | 'moderate' | 'high';
  readonly strengths: readonly string[];
  readonly limitations: readonly string[];
  /** Needs a terminal, local installs, or writing files on a local machine. */
  readonly requiresLocalEnvironment: boolean;
  /** True when the route is fundamentally an off-the-shelf product. */
  readonly isExistingProduct: boolean;
  /** Ongoing ownership burden once live, used for sustainability scoring. */
  readonly ownershipBurden: 'minimal' | 'low' | 'moderate' | 'high';
  readonly conditionsBeforeSelection: readonly string[];
}

const noAbilities: Record<AbilityId, Level> = {
  'general-technical': 0,
  coding: 0,
  'no-code-spreadsheet': 0,
  testing: 0,
  troubleshooting: 0,
  deployment: 0,
  'security-management': 0,
  maintenance: 0,
  'guidance-available': 0,
  'developer-support-available': 0,
  'learning-capacity': 0,
};

const evenImportance: Record<AbilityId, number> = {
  'general-technical': 1,
  coding: 1,
  'no-code-spreadsheet': 1,
  testing: 1,
  troubleshooting: 1,
  deployment: 1,
  'security-management': 1,
  maintenance: 1,
  'guidance-available': 1,
  'developer-support-available': 1,
  'learning-capacity': 1,
};

export const ROUTE_PROFILES: Readonly<Record<RouteId, RouteProfile>> = {
  'existing-saas': {
    id: 'existing-saas',
    name: 'Existing SaaS product',
    summary:
      'Buy or subscribe to a product that already does most of this, and configure it.',
    capabilities: {
      persistence: 3,
      'multi-user': 3,
      authentication: 3,
      'role-based-access': 2,
      'audit-history': 2,
      integrations: 2,
      'custom-interface': 1,
    },
    capabilitiesRequiringVerification: [
      'Role-based permissions vary by product and plan tier',
      'Audit history is not offered by every product',
      'Subscription price and seat count',
      'Data residency and retention terms',
    ],
    supportedMaturity: [
      'concept',
      'interactive-prototype',
      'mvp',
      'pilot',
      'production-ready',
    ],
    productionBlockers: [],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 1,
      'no-code-spreadsheet': 1,
      testing: 1,
      troubleshooting: 1,
      'security-management': 2,
      maintenance: 1,
      'guidance-available': 1,
      'learning-capacity': 2,
    },
    builderImportance: {
      ...evenImportance,
      coding: 0,
      deployment: 0.3,
      'security-management': 2,
      'general-technical': 1.5,
      'developer-support-available': 0.3,
    },
    requiredSkills: [
      'Evaluating and comparing products against a requirement list',
      'Configuring settings, users, and permissions',
      'Preparing and importing existing data',
    ],
    requiredTechnicalSupport:
      'None for basic configuration. Vendor support or internal IT for permissions and any integration.',
    requiredHosting: 'Provided by the vendor.',
    requiredDatabase: 'Provided by the vendor.',
    authenticationRequirements:
      'Provided by the vendor, usually with individual logins and roles. Confirm the plan includes the roles you need.',
    securityConsiderations: [
      'Data leaves your control and sits with the vendor',
      'Access review becomes an ongoing administrative task',
      'Exit and data-export terms need checking before commitment',
    ],
    baseEffortHours: [8, 30],
    setupCost: 'low',
    monthlyCost: 'moderate',
    maintenanceLevel: 'low',
    scalability: 'High. The vendor absorbs growth in users and data.',
    vendorDependency: 'high',
    strengths: [
      'Fastest route to a supported, multi-user system',
      'Authentication, permissions, and backups already exist',
      'No code to own and no hosting to run',
    ],
    limitations: [
      'Fits your process only as far as its configuration allows',
      'Recurring cost per user, indefinitely',
      'Switching later means migrating data out',
    ],
    requiresLocalEnvironment: false,
    isExistingProduct: true,
    ownershipBurden: 'low',
    conditionsBeforeSelection: [
      'Confirm at least one product covers the must-have features',
      'Confirm subscription pricing for the expected number of users',
      'Confirm the permissions model matches who may see what',
    ],
  },

  'chat-only': {
    id: 'chat-only',
    name: 'Chat-only workflow',
    summary:
      'Use an AI assistant conversationally each time, with no tool built and nothing stored.',
    capabilities: {
      persistence: 0,
      'multi-user': 0,
      authentication: 0,
      'role-based-access': 0,
      'audit-history': 0,
      integrations: 0,
      'custom-interface': 0,
    },
    capabilitiesRequiringVerification: [],
    supportedMaturity: ['concept', 'interactive-prototype'],
    productionBlockers: [
      'Nothing is stored between conversations',
      'No shared record any team member can rely on',
      'No permissions, no audit history, no backups',
    ],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 0,
      troubleshooting: 1,
      'learning-capacity': 1,
    },
    builderImportance: {
      ...evenImportance,
      coding: 0,
      deployment: 0,
      'no-code-spreadsheet': 0.3,
      'developer-support-available': 0,
      'security-management': 0.5,
      maintenance: 0.3,
    },
    requiredSkills: ['Writing a clear prompt', 'Reviewing output before using it'],
    requiredTechnicalSupport: 'None.',
    requiredHosting: 'None.',
    requiredDatabase: 'None.',
    authenticationRequirements: 'None. Whoever holds the chat account has access.',
    securityConsiderations: [
      'Sensitive information pasted into a chat leaves your systems',
      'No access control over who sees what was discussed',
      'Output accuracy depends entirely on human review',
    ],
    baseEffortHours: [1, 4],
    setupCost: 'free-or-existing',
    monthlyCost: 'free-or-existing',
    maintenanceLevel: 'minimal',
    scalability: 'Very low. Effort repeats in full for every use.',
    vendorDependency: 'moderate',
    strengths: [
      'Available immediately with nothing to build',
      'Excellent for testing whether the idea is worth building at all',
      'No hosting, no cost, no maintenance',
    ],
    limitations: [
      'Nothing accumulates: no records, no history, no shared view',
      'Repeats the same manual effort every time',
      'Cannot support a team process or any compliance requirement',
    ],
    requiresLocalEnvironment: false,
    isExistingProduct: false,
    ownershipBurden: 'minimal',
    conditionsBeforeSelection: [
      'Accept that nothing is retained between sessions',
      'Keep sensitive information out of the conversation',
    ],
  },

  'spreadsheet-doc': {
    id: 'spreadsheet-doc',
    name: 'Spreadsheet or document workflow',
    summary:
      'Structure the work in a shared spreadsheet or document set, with agreed conventions.',
    capabilities: {
      persistence: 2,
      'multi-user': 2,
      authentication: 2,
      'role-based-access': 1,
      'audit-history': 1,
      integrations: 1,
      'custom-interface': 1,
    },
    capabilitiesRequiringVerification: [
      'Sharing and permission settings depend on the storage platform',
      'Version history depth depends on the platform and plan',
    ],
    supportedMaturity: ['concept', 'interactive-prototype', 'mvp', 'pilot'],
    productionBlockers: [
      'Row-level and field-level permissions are not reliably enforceable',
      'Audit history is limited to platform version history',
      'Accidental edits and broken formulas are hard to prevent',
    ],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 1,
      'no-code-spreadsheet': 2,
      testing: 1,
      troubleshooting: 1,
      maintenance: 1,
      'security-management': 1,
      'learning-capacity': 1,
    },
    builderImportance: {
      ...evenImportance,
      coding: 0,
      deployment: 0.2,
      'no-code-spreadsheet': 2.5,
      'developer-support-available': 0.2,
      'general-technical': 1.2,
    },
    requiredSkills: [
      'Confident spreadsheet structuring',
      'Agreeing and holding to naming and status conventions',
      'Managing sharing permissions on the storage platform',
    ],
    requiredTechnicalSupport: 'None, beyond help setting sharing permissions.',
    requiredHosting: 'Existing shared drive or cloud storage.',
    requiredDatabase: 'The spreadsheet itself acts as the store.',
    authenticationRequirements:
      'Whatever the storage platform provides, typically per-account file sharing.',
    securityConsiderations: [
      'Anyone with file access can usually see every row',
      'Copies proliferate easily and drift from the original',
      'Deletions may go unnoticed until much later',
    ],
    baseEffortHours: [4, 20],
    setupCost: 'free-or-existing',
    monthlyCost: 'free-or-existing',
    maintenanceLevel: 'low',
    scalability:
      'Moderate. Works well up to a few thousand rows and a handful of editors.',
    vendorDependency: 'low',
    strengths: [
      'Uses tools the team already has and already understands',
      'Immediate to change when the process changes',
      'No build, no hosting, no new subscription',
    ],
    limitations: [
      'Weak permissions: hard to hide specific fields or rows',
      'No enforced validation, so data quality relies on discipline',
      'Becomes fragile as rules and volume grow',
    ],
    requiresLocalEnvironment: false,
    isExistingProduct: true,
    ownershipBurden: 'low',
    conditionsBeforeSelection: [
      'Agree one authoritative file and forbid local copies',
      'Confirm the storage platform’s sharing model is good enough',
    ],
  },

  'no-code': {
    id: 'no-code',
    name: 'No-code platform',
    summary:
      'Assemble the tool on a no-code platform with built-in data, forms, and permissions.',
    capabilities: {
      persistence: 2,
      'multi-user': 2,
      authentication: 2,
      'role-based-access': 2,
      'audit-history': 2,
      integrations: 2,
      'custom-interface': 2,
    },
    capabilitiesRequiringVerification: [
      'Role-based permission granularity differs sharply between platforms',
      'Audit history may require a higher plan tier',
      'Per-user pricing and record limits',
      'Data export and portability terms',
    ],
    supportedMaturity: [
      'concept',
      'visual-mockup',
      'interactive-prototype',
      'mvp',
      'pilot',
      'production-ready',
    ],
    productionBlockers: [],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 2,
      'no-code-spreadsheet': 2,
      testing: 2,
      troubleshooting: 2,
      deployment: 1,
      'security-management': 2,
      maintenance: 2,
      'guidance-available': 1,
      'learning-capacity': 3,
    },
    builderImportance: {
      ...evenImportance,
      coding: 0.3,
      'no-code-spreadsheet': 2,
      testing: 1.5,
      troubleshooting: 1.5,
      'security-management': 1.5,
      maintenance: 1.5,
      'developer-support-available': 0.5,
      'learning-capacity': 1.5,
    },
    requiredSkills: [
      'Modelling data as tables and relationships',
      'Building forms, views, and simple automations',
      'Configuring roles and sharing',
      'Testing the flow before the team relies on it',
    ],
    requiredTechnicalSupport:
      'Occasional advice on data modelling and permissions is valuable; not strictly required.',
    requiredHosting: 'Provided by the platform.',
    requiredDatabase: 'Provided by the platform.',
    authenticationRequirements:
      'Platform accounts with roles. Confirm the plan supports the roles you need.',
    securityConsiderations: [
      'Permission models are platform-specific and easy to misconfigure',
      'Sharing a view publicly can expose more than intended',
      'Data sits with the platform vendor',
    ],
    baseEffortHours: [20, 80],
    setupCost: 'low',
    monthlyCost: 'moderate',
    maintenanceLevel: 'moderate',
    scalability: 'Good for internal team scale; per-seat cost grows with the team.',
    vendorDependency: 'high',
    strengths: [
      'Real multi-user tool without writing code',
      'Permissions, forms, and storage come built in',
      'Changes are quick once the model is right',
    ],
    limitations: [
      'Platform limits shape the process, not the other way round',
      'Cost scales per user and per record',
      'Migrating away later is real work',
    ],
    requiresLocalEnvironment: false,
    isExistingProduct: false,
    ownershipBurden: 'moderate',
    conditionsBeforeSelection: [
      'Verify the platform’s permission model against your access rules',
      'Verify pricing for the expected number of users and records',
      'Confirm data export is possible before committing',
    ],
  },

  'claude-artifact': {
    id: 'claude-artifact',
    name: 'Claude Artifact',
    summary:
      'A single self-contained browser page generated by Claude, with no backend and no storage.',
    capabilities: {
      persistence: 0,
      'multi-user': 0,
      authentication: 0,
      'role-based-access': 0,
      'audit-history': 0,
      integrations: 0,
      'custom-interface': 2,
    },
    capabilitiesRequiringVerification: [],
    supportedMaturity: ['concept', 'visual-mockup', 'interactive-prototype'],
    productionBlockers: [
      'No persistent storage: data entered is lost on refresh',
      'No authentication and no permissions',
      'No audit history, no backups, no recovery',
      'Not a multi-user system',
    ],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 1,
      testing: 1,
      troubleshooting: 1,
      'learning-capacity': 1,
    },
    builderImportance: {
      ...evenImportance,
      coding: 0.3,
      deployment: 0.3,
      'no-code-spreadsheet': 0.5,
      'security-management': 0.5,
      maintenance: 0.5,
      'developer-support-available': 0.2,
    },
    requiredSkills: [
      'Describing the interface and behaviour clearly',
      'Reviewing and testing what comes back',
    ],
    requiredTechnicalSupport: 'None.',
    requiredHosting: 'None for review. Sharing more widely needs a decision later.',
    requiredDatabase: 'None. Nothing is stored.',
    authenticationRequirements: 'None available.',
    securityConsiderations: [
      'Use fictional or sanitised data only',
      'Anyone given the page can see everything in it',
      'Nothing entered can be retained, which is a safety property as well as a limit',
    ],
    baseEffortHours: [2, 10],
    setupCost: 'free-or-existing',
    monthlyCost: 'free-or-existing',
    maintenanceLevel: 'minimal',
    scalability: 'Not applicable. It demonstrates a workflow rather than running one.',
    vendorDependency: 'moderate',
    strengths: [
      'Fastest way to make an idea tangible and test the workflow with people',
      'No hosting, no cost, no installation',
      'Excellent for agreeing requirements before committing to a build',
    ],
    limitations: [
      'Cannot store anything, so it cannot be the real tool',
      'No accounts, permissions, or history',
      'Demonstration only, never production',
    ],
    requiresLocalEnvironment: false,
    isExistingProduct: false,
    ownershipBurden: 'minimal',
    conditionsBeforeSelection: [
      'Accept it as a demonstration, not the operating tool',
      'Use only fictional or sanitised content',
    ],
  },

  'ai-assisted-coding': {
    id: 'ai-assisted-coding',
    name: 'AI-assisted coding',
    summary:
      'Write a real application with AI help, reviewing and testing the code as you go.',
    capabilities: {
      persistence: 3,
      'multi-user': 3,
      authentication: 3,
      'role-based-access': 3,
      'audit-history': 3,
      integrations: 3,
      'custom-interface': 3,
    },
    capabilitiesRequiringVerification: [
      'Every capability must actually be implemented, tested, and operated by you',
      'Hosting and any managed database pricing',
    ],
    supportedMaturity: [
      'concept',
      'visual-mockup',
      'interactive-prototype',
      'mvp',
      'pilot',
      'production-ready',
    ],
    productionBlockers: [],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 3,
      coding: 3,
      testing: 3,
      troubleshooting: 3,
      deployment: 3,
      'security-management': 3,
      maintenance: 3,
      'guidance-available': 2,
      'developer-support-available': 2,
      'learning-capacity': 4,
    },
    builderImportance: {
      ...evenImportance,
      coding: 2,
      testing: 2,
      troubleshooting: 2,
      deployment: 1.5,
      'security-management': 2,
      maintenance: 2,
      'no-code-spreadsheet': 0.3,
      'guidance-available': 1.5,
      'developer-support-available': 1.5,
      'learning-capacity': 1.5,
    },
    requiredSkills: [
      'Reading and judging generated code',
      'Testing behaviour rather than trusting output',
      'Deploying and operating what you build',
      'Handling authentication, permissions, and data safety',
    ],
    requiredTechnicalSupport:
      'Developer review is strongly advisable before anything sensitive goes live.',
    requiredHosting: 'You choose and operate it.',
    requiredDatabase: 'You choose, model, back up, and maintain it.',
    authenticationRequirements:
      'Must be built or integrated deliberately. Nothing is provided for free.',
    securityConsiderations: [
      'Security is entirely your responsibility, including mistakes you cannot see',
      'Generated code can look correct and still be unsafe',
      'Dependency updates and patching become an ongoing duty',
    ],
    baseEffortHours: [40, 160],
    setupCost: 'low',
    monthlyCost: 'low',
    maintenanceLevel: 'high',
    scalability: 'High, if built and operated competently.',
    vendorDependency: 'low',
    strengths: [
      'No platform limits: the tool fits the process exactly',
      'Low recurring cost compared with per-seat products',
      'You own the code and the data',
    ],
    limitations: [
      'You own every defect, outage, and security gap',
      'Substantially more effort than configuring an existing product',
      'Needs genuine testing discipline to be trustworthy',
    ],
    requiresLocalEnvironment: false,
    isExistingProduct: false,
    ownershipBurden: 'high',
    conditionsBeforeSelection: [
      'Arrange developer review before any sensitive data is involved',
      'Name who maintains it after the first release',
      'Agree a testing approach before build starts',
    ],
  },

  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    summary:
      'An agentic coding tool that builds and edits a real codebase in a development environment.',
    capabilities: {
      persistence: 3,
      'multi-user': 3,
      authentication: 3,
      'role-based-access': 3,
      'audit-history': 3,
      integrations: 3,
      'custom-interface': 3,
    },
    capabilitiesRequiringVerification: [
      'Every capability must be implemented, tested, and operated by you',
      'A development environment must be available and permitted',
      'Hosting and any managed database pricing',
    ],
    supportedMaturity: [
      'concept',
      'visual-mockup',
      'interactive-prototype',
      'mvp',
      'pilot',
      'production-ready',
    ],
    productionBlockers: [],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 3,
      coding: 3,
      testing: 3,
      troubleshooting: 3,
      deployment: 3,
      'security-management': 3,
      maintenance: 3,
      'guidance-available': 2,
      'developer-support-available': 2,
      'learning-capacity': 3,
    },
    builderImportance: {
      ...evenImportance,
      coding: 1.8,
      testing: 2,
      troubleshooting: 2,
      deployment: 1.8,
      'security-management': 2,
      maintenance: 2,
      'no-code-spreadsheet': 0.3,
      'guidance-available': 1.5,
      'developer-support-available': 1.5,
    },
    requiredSkills: [
      'Working in a development environment',
      'Reviewing changes before accepting them',
      'Running tests and reading failures',
      'Deploying and operating the result',
    ],
    requiredTechnicalSupport:
      'Developer review advisable; essential before anything sensitive goes live.',
    requiredHosting: 'You choose and operate it.',
    requiredDatabase: 'You choose, model, back up, and maintain it.',
    authenticationRequirements: 'Must be built or integrated deliberately.',
    securityConsiderations: [
      'Security remains your responsibility end to end',
      'Fast output makes unreviewed change a real hazard',
      'Environment access itself needs to be permitted and controlled',
    ],
    baseEffortHours: [30, 120],
    setupCost: 'low',
    monthlyCost: 'low',
    maintenanceLevel: 'high',
    scalability: 'High, if built and operated competently.',
    vendorDependency: 'low',
    strengths: [
      'Fast progress on a real codebase, including tests and documentation',
      'No platform ceiling on what can be built',
      'You own the code and the data',
    ],
    limitations: [
      'Normally needs a development environment, which some settings forbid',
      'You own every defect, outage, and security gap',
      'Unreviewed speed is a risk in itself',
    ],
    requiresLocalEnvironment: true,
    isExistingProduct: false,
    ownershipBurden: 'high',
    conditionsBeforeSelection: [
      'Confirm a permitted development environment is available',
      'Arrange developer review before sensitive data is involved',
      'Name who maintains the codebase afterwards',
    ],
  },

  'custom-hosted': {
    id: 'custom-hosted',
    name: 'Custom hosted web application',
    summary:
      'A bespoke application with its own hosting, database, accounts, and operational ownership.',
    capabilities: {
      persistence: 3,
      'multi-user': 3,
      authentication: 3,
      'role-based-access': 3,
      'audit-history': 3,
      integrations: 3,
      'custom-interface': 3,
    },
    capabilitiesRequiringVerification: [
      'Hosting, database, backup, and monitoring costs',
      'Who operates it, patches it, and answers when it breaks',
    ],
    supportedMaturity: ['mvp', 'pilot', 'production-ready'],
    productionBlockers: [],
    builderRequirements: {
      ...noAbilities,
      'general-technical': 3,
      coding: 3,
      testing: 3,
      troubleshooting: 3,
      deployment: 3,
      'security-management': 4,
      maintenance: 4,
      'guidance-available': 2,
      'developer-support-available': 3,
      'learning-capacity': 4,
    },
    builderImportance: {
      ...evenImportance,
      coding: 2,
      testing: 1.8,
      troubleshooting: 1.8,
      deployment: 2,
      'security-management': 2.5,
      maintenance: 2.5,
      'no-code-spreadsheet': 0.2,
      'developer-support-available': 2,
      'guidance-available': 1.2,
    },
    requiredSkills: [
      'Application development and data modelling',
      'Authentication and permission design',
      'Deployment, monitoring, and backup operations',
      'Ongoing patching and incident response',
    ],
    requiredTechnicalSupport:
      'Developer involvement expected. Professional implementation where data is sensitive.',
    requiredHosting: 'Required, with monitoring and backups.',
    requiredDatabase: 'Required, with a backup and recovery plan.',
    authenticationRequirements:
      'Individual accounts and role-based permissions, designed deliberately.',
    securityConsiderations: [
      'Full responsibility for access control, encryption, and retention',
      'Needs a named security owner and periodic review',
      'Incident response and recovery must exist before real data arrives',
    ],
    baseEffortHours: [80, 320],
    setupCost: 'moderate',
    monthlyCost: 'moderate',
    maintenanceLevel: 'high',
    scalability: 'High, with proper engineering and operations.',
    vendorDependency: 'low',
    strengths: [
      'Fits the process exactly, with no platform ceiling',
      'Supports real permissions, audit history, and integrations',
      'Full ownership of data and behaviour',
    ],
    limitations: [
      'Highest effort and highest ongoing ownership of any route',
      'Needs operational discipline: backups, monitoring, patching',
      'Rarely justified for a small internal process',
    ],
    requiresLocalEnvironment: false,
    isExistingProduct: false,
    ownershipBurden: 'high',
    conditionsBeforeSelection: [
      'Secure developer capacity for build and for ongoing maintenance',
      'Confirm hosting, backup, and monitoring costs',
      'Name the security owner and the maintenance owner',
    ],
  },
};

export function routeProfile(id: RouteId): RouteProfile {
  return ROUTE_PROFILES[id];
}
