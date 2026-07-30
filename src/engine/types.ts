import type { ProvenanceLabel } from '@/types/labels';

/* ------------------------------------------------------------------ *
 * Shared vocabulary for the assessment engine.
 *
 * Every type here is plain data. The engine contains no React, no browser
 * APIs, no storage, no network access, and no randomness or clock reads.
 * ------------------------------------------------------------------ */

export type RouteId =
  | 'existing-saas'
  | 'chat-only'
  | 'spreadsheet-doc'
  | 'no-code'
  | 'claude-artifact'
  | 'ai-assisted-coding'
  | 'claude-code'
  | 'custom-hosted';

export const ROUTE_IDS: readonly RouteId[] = [
  'existing-saas',
  'chat-only',
  'spreadsheet-doc',
  'no-code',
  'claude-artifact',
  'ai-assisted-coding',
  'claude-code',
  'custom-hosted',
];

export type MaturityLevel =
  | 'concept'
  | 'visual-mockup'
  | 'interactive-prototype'
  | 'mvp'
  | 'pilot'
  | 'production-ready';

export const MATURITY_ORDER: readonly MaturityLevel[] = [
  'concept',
  'visual-mockup',
  'interactive-prototype',
  'mvp',
  'pilot',
  'production-ready',
];

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  concept: 'Concept',
  'visual-mockup': 'Visual mockup',
  'interactive-prototype': 'Interactive prototype',
  mvp: 'MVP',
  pilot: 'Pilot',
  'production-ready': 'Production-ready system',
};

/** Cost is expressed as a category. The engine never invents currency values. */
export type CostCategory =
  | 'free-or-existing'
  | 'low'
  | 'moderate'
  | 'high'
  | 'very-high'
  | 'not-justified';

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  'free-or-existing': 'Free or existing tools only',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
  'not-justified': 'Not financially justified',
};

export const PRICING_VERIFICATION_STATEMENT =
  'Pricing must be verified before implementation.';

export const SOURCE_OF_TRUTH_UNDEFINED_STATEMENT =
  'Source of truth requires definition before implementation.';

export type SuitabilityLabel =
  | 'suitable-now'
  | 'light-guidance'
  | 'requires-technical-support'
  | 'requires-developer-support'
  | 'requires-professional-implementation'
  | 'unsuitable';

export const SUITABILITY_LABELS: Record<SuitabilityLabel, string> = {
  'suitable-now': 'Suitable for the current builder',
  'light-guidance': 'Suitable with light guidance',
  'requires-technical-support': 'Requires technical support',
  'requires-developer-support': 'Requires developer support',
  'requires-professional-implementation': 'Requires professional implementation',
  unsuitable: 'Unsuitable under current conditions',
};

/** Technical status is reported separately from builder suitability. */
export type TechnicalStatus =
  | 'technically-feasible'
  | 'feasible-with-limitations'
  | 'technically-blocked'
  | 'requires-verification';

export const TECHNICAL_STATUS_LABELS: Record<TechnicalStatus, string> = {
  'technically-feasible': 'Technically feasible',
  'feasible-with-limitations': 'Technically feasible with limitations',
  'technically-blocked': 'Technically blocked',
  'requires-verification': 'Requires verification',
};

export type Verdict =
  | 'proceed'
  | 'proceed-carefully'
  | 'conditional-go'
  | 'simplify-first'
  | 'revise-before-building'
  | 'delay'
  | 'use-existing-solution'
  | 'do-not-build-yet'
  | 'no-go';

export const VERDICT_LABELS: Record<Verdict, string> = {
  proceed: 'Proceed',
  'proceed-carefully': 'Proceed carefully',
  'conditional-go': 'Conditional Go',
  'simplify-first': 'Simplify first',
  'revise-before-building': 'Revise before building',
  delay: 'Delay',
  'use-existing-solution': 'Use an existing solution',
  'do-not-build-yet': 'Do not build yet',
  'no-go': 'No-Go',
};

export type DimensionId =
  | 'problem-value'
  | 'scope-realism'
  | 'data-readiness'
  | 'technical-feasibility'
  | 'operational-feasibility'
  | 'financial-practicality'
  | 'timeline-feasibility'
  | 'security-permissions'
  | 'hosting-sharing'
  | 'maintenance-sustainability';

/** Weights total exactly 100. Asserted by test. */
export const DIMENSION_WEIGHTS: Record<DimensionId, number> = {
  'problem-value': 12,
  'scope-realism': 10,
  'data-readiness': 10,
  'technical-feasibility': 14,
  'operational-feasibility': 10,
  'financial-practicality': 10,
  'timeline-feasibility': 8,
  'security-permissions': 10,
  'hosting-sharing': 8,
  'maintenance-sustainability': 8,
};

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  'problem-value': 'Problem and business value',
  'scope-realism': 'Scope realism',
  'data-readiness': 'Data readiness',
  'technical-feasibility': 'Technical feasibility',
  'operational-feasibility': 'Operational feasibility',
  'financial-practicality': 'Financial practicality',
  'timeline-feasibility': 'Timeline feasibility',
  'security-permissions': 'Security and permissions',
  'hosting-sharing': 'Hosting and sharing readiness',
  'maintenance-sustainability': 'Maintenance and sustainability',
};

export const DIMENSION_ORDER: readonly DimensionId[] = [
  'problem-value',
  'scope-realism',
  'data-readiness',
  'technical-feasibility',
  'operational-feasibility',
  'financial-practicality',
  'timeline-feasibility',
  'security-permissions',
  'hosting-sharing',
  'maintenance-sustainability',
];

export type DimensionStatus = 'strong' | 'adequate' | 'watch' | 'weak' | 'critical';

export const DIMENSION_STATUS_LABELS: Record<DimensionStatus, string> = {
  strong: 'Strong',
  adequate: 'Adequate',
  watch: 'Watch',
  weak: 'Weak',
  critical: 'Critical',
};

export interface Driver {
  readonly text: string;
  /** Signed points this rule contributed to the dimension score. */
  readonly points: number;
}

export interface DimensionScore {
  readonly id: DimensionId;
  readonly label: string;
  readonly score: number;
  readonly weight: number;
  readonly weightedContribution: number;
  readonly status: DimensionStatus;
  readonly positiveDrivers: readonly Driver[];
  readonly negativeDrivers: readonly Driver[];
  readonly evidenceUsed: readonly string[];
  readonly assumptionsUsed: readonly string[];
  readonly unknownsAffecting: readonly string[];
  readonly correctiveAction: string;
  readonly provenance: ProvenanceLabel;
}

/* ---------------------------- Builder fit ---------------------------- */

export type AbilityId =
  | 'general-technical'
  | 'coding'
  | 'no-code-spreadsheet'
  | 'testing'
  | 'troubleshooting'
  | 'deployment'
  | 'security-management'
  | 'maintenance'
  | 'guidance-available'
  | 'developer-support-available'
  | 'learning-capacity';

export const ABILITY_LABELS: Record<AbilityId, string> = {
  'general-technical': 'General technical experience',
  coding: 'Coding experience',
  'no-code-spreadsheet': 'No-code and spreadsheet experience',
  testing: 'Testing ability',
  troubleshooting: 'Troubleshooting ability',
  deployment: 'Deployment ability',
  'security-management': 'Security-management ability',
  maintenance: 'Maintenance ability',
  'guidance-available': 'Available technical guidance',
  'developer-support-available': 'Available developer support',
  'learning-capacity': 'Capacity to absorb this route’s learning burden',
};

export const ABILITY_ORDER: readonly AbilityId[] = [
  'general-technical',
  'coding',
  'no-code-spreadsheet',
  'testing',
  'troubleshooting',
  'deployment',
  'security-management',
  'maintenance',
  'guidance-available',
  'developer-support-available',
  'learning-capacity',
];

/** Ability and requirement levels share a 0-4 scale. */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface AbilityFactor {
  readonly id: AbilityId;
  readonly label: string;
  readonly builderLevel: Level;
  readonly requiredLevel: Level;
  readonly gap: number;
  readonly weight: number;
  readonly factorScore: number;
  readonly note: string;
}

export interface BuilderFitResult {
  readonly routeId: RouteId;
  readonly score: number;
  readonly suitability: SuitabilityLabel;
  readonly factors: readonly AbilityFactor[];
  readonly strengths: readonly string[];
  readonly gaps: readonly string[];
  readonly supportAdjustments: readonly Driver[];
  readonly assumptionsUsed: readonly string[];
  readonly unknownsAffecting: readonly string[];
  readonly explanation: readonly string[];
  readonly provenance: ProvenanceLabel;
}

/* ---------------------------- Capabilities ---------------------------- */

export type CapabilityId =
  | 'persistence'
  | 'multi-user'
  | 'authentication'
  | 'role-based-access'
  | 'audit-history'
  | 'integrations'
  | 'custom-interface';

export const CAPABILITY_LABELS: Record<CapabilityId, string> = {
  persistence: 'Persistent storage',
  'multi-user': 'Multi-user collaboration',
  authentication: 'Authentication',
  'role-based-access': 'Role-based permissions',
  'audit-history': 'Audit history',
  integrations: 'Integrations',
  'custom-interface': 'Custom interface',
};

export const CAPABILITY_ORDER: readonly CapabilityId[] = [
  'persistence',
  'multi-user',
  'authentication',
  'role-based-access',
  'audit-history',
  'integrations',
  'custom-interface',
];

/** 0 = absent, 1 = minimal, 2 = platform-provided, 3 = full control. */
export type CapabilityLevel = 0 | 1 | 2 | 3;

export type CapabilityMap = Record<CapabilityId, CapabilityLevel>;

export interface CapabilityGap {
  readonly id: CapabilityId;
  readonly label: string;
  readonly required: CapabilityLevel;
  readonly available: CapabilityLevel;
  readonly gap: number;
  readonly severity: 'blocking' | 'limiting';
  readonly note: string;
}

/* ------------------------------- Routes ------------------------------- */

export type ExclusionType =
  | 'restricted-method'
  | 'environment-restriction'
  | 'security-blocker'
  | 'capability-blocker';

export interface RouteExclusion {
  readonly type: ExclusionType;
  readonly reason: string;
}

export interface EffortEstimate {
  readonly lowHours: number;
  readonly highHours: number;
  readonly basis: readonly string[];
  readonly provenance: ProvenanceLabel;
}

export interface RouteAssessment {
  readonly routeId: RouteId;
  readonly name: string;
  readonly summary: string;
  readonly technicalStatus: TechnicalStatus;
  readonly technicalNotes: readonly string[];
  readonly fitScore: number;
  readonly fitDrivers: readonly Driver[];
  readonly builderFit: BuilderFitResult;
  readonly suitability: SuitabilityLabel;
  readonly maturityCeiling: MaturityLevel;
  readonly supportedMaturity: readonly MaturityLevel[];
  readonly requiredSkills: readonly string[];
  readonly requiredTechnicalSupport: string;
  readonly requiredHosting: string;
  readonly requiredDatabase: string;
  readonly authenticationRequirements: string;
  readonly securityConsiderations: readonly string[];
  readonly effort: EffortEstimate;
  readonly setupCost: CostCategory;
  readonly monthlyCost: CostCategory;
  readonly maintenanceLevel: 'minimal' | 'low' | 'moderate' | 'high';
  readonly scalability: string;
  readonly vendorDependency: 'none' | 'low' | 'moderate' | 'high';
  readonly strengths: readonly string[];
  readonly limitations: readonly string[];
  readonly blockers: readonly string[];
  readonly capabilityGaps: readonly CapabilityGap[];
  readonly conditionsBeforeSelection: readonly string[];
  readonly excluded: RouteExclusion | null;
  readonly eligibleForRecommendation: boolean;
  readonly provenance: ProvenanceLabel;
}

/* -------------------------------- Risk -------------------------------- */

export type RiskCategory =
  | 'data'
  | 'device'
  | 'privacy'
  | 'security'
  | 'permission'
  | 'technical-complexity'
  | 'integration'
  | 'builder-capability'
  | 'operational'
  | 'maintenance'
  | 'vendor-lock-in'
  | 'ai-accuracy'
  | 'cost'
  | 'timeline'
  | 'recovery'
  | 'source-of-truth';

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  data: 'Data risk',
  device: 'Device risk',
  privacy: 'Privacy risk',
  security: 'Security risk',
  permission: 'Permission risk',
  'technical-complexity': 'Technical complexity',
  integration: 'Integration risk',
  'builder-capability': 'Builder capability risk',
  operational: 'Operational risk',
  maintenance: 'Maintenance risk',
  'vendor-lock-in': 'Vendor lock-in risk',
  'ai-accuracy': 'AI accuracy risk',
  cost: 'Cost risk',
  timeline: 'Timeline risk',
  recovery: 'Recovery risk',
  'source-of-truth': 'Source-of-truth risk',
};

export const RISK_CATEGORY_ORDER: readonly RiskCategory[] = [
  'data',
  'device',
  'privacy',
  'security',
  'permission',
  'technical-complexity',
  'integration',
  'builder-capability',
  'operational',
  'maintenance',
  'vendor-lock-in',
  'ai-accuracy',
  'cost',
  'timeline',
  'recovery',
  'source-of-truth',
];

export type RiskScore = 1 | 2 | 3 | 4 | 5;

export const RISK_SCORE_LABELS: Record<RiskScore, string> = {
  1: 'Very low risk',
  2: 'Low risk',
  3: 'Moderate risk',
  4: 'High risk',
  5: 'Very high risk',
};

/** Ownership is always a human role. Never "AI". */
export type RiskOwner =
  | 'Project owner'
  | 'Data owner'
  | 'Technical owner'
  | 'Security owner'
  | 'Hiring manager'
  | 'Human reviewer'
  | 'Developer'
  | 'Vendor';

export interface Risk {
  readonly category: RiskCategory;
  readonly label: string;
  readonly score: RiskScore;
  readonly scoreLabel: string;
  readonly trigger: string;
  readonly consequence: string;
  readonly mitigation: string;
  readonly owner: RiskOwner;
  readonly residualRisk: string;
  readonly evidence: readonly string[];
  readonly assumptions: readonly string[];
  /** Names the route or verdict this risk blocks, or null when it blocks neither. */
  readonly blocks: string | null;
  readonly provenance: ProvenanceLabel;
}

/* ------------------------------ Confidence ---------------------------- */

export type ConfidenceBand = 'low' | 'moderate' | 'high';

export interface ConfidenceDeduction {
  readonly reason: string;
  readonly points: number;
  readonly detail: string;
}

export interface ConfidenceResult {
  readonly score: number;
  readonly band: ConfidenceBand;
  readonly deductions: readonly ConfidenceDeduction[];
  readonly missingInformation: readonly string[];
  readonly statement: string;
  readonly provenance: ProvenanceLabel;
}

/* --------------------------------- Cost ------------------------------- */

export interface CostEstimate {
  readonly effort: EffortEstimate;
  readonly setupCost: CostCategory;
  readonly monthlyCost: CostCategory;
  readonly maintenanceEffort: CostCategory;
  readonly externalSupportRequirement: string;
  readonly costsRequiringVerification: readonly string[];
  readonly costConfidence: ConfidenceBand;
  readonly mainCostDrivers: readonly string[];
  readonly pricingStatement: string;
  readonly labels: readonly ProvenanceLabel[];
  readonly provenance: ProvenanceLabel;
}

/* ------------------------------- Timeline ----------------------------- */

export type DurationBand =
  | '30-minutes-1-hour'
  | '2-4-hours'
  | '1-2-days'
  | '3-5-days'
  | '1-2-weeks'
  | '2-4-weeks'
  | '1-3-months'
  | 'more-than-3-months';

export const DURATION_BAND_LABELS: Record<DurationBand, string> = {
  '30-minutes-1-hour': '30 minutes to 1 hour',
  '2-4-hours': '2 to 4 hours',
  '1-2-days': '1 to 2 days',
  '3-5-days': '3 to 5 days',
  '1-2-weeks': '1 to 2 weeks',
  '2-4-weeks': '2 to 4 weeks',
  '1-3-months': '1 to 3 months',
  'more-than-3-months': 'More than 3 months',
};

export const DURATION_BAND_ORDER: readonly DurationBand[] = [
  '30-minutes-1-hour',
  '2-4-hours',
  '1-2-days',
  '3-5-days',
  '1-2-weeks',
  '2-4-weeks',
  '1-3-months',
  'more-than-3-months',
];

export type TimelinePhaseId =
  | 'validation'
  | 'prototype'
  | 'mvp'
  | 'pilot'
  | 'production'
  | 'training-documentation'
  | 'ongoing-maintenance';

export const TIMELINE_PHASE_LABELS: Record<TimelinePhaseId, string> = {
  validation: 'Validation',
  prototype: 'Prototype',
  mvp: 'MVP',
  pilot: 'Pilot',
  production: 'Production-ready implementation',
  'training-documentation': 'Training and documentation',
  'ongoing-maintenance': 'Ongoing maintenance',
};

export interface TimelinePhase {
  readonly id: TimelinePhaseId;
  readonly label: string;
  readonly band: DurationBand;
  readonly bandLabel: string;
  readonly achievable: boolean;
  readonly basis: readonly string[];
  readonly provenance: ProvenanceLabel;
}

export interface TimelineEstimate {
  readonly phases: readonly TimelinePhase[];
  readonly factors: readonly string[];
  readonly builderFitEffect: string;
  readonly deadlineAssessment: string;
  readonly deadlineAchievable: boolean | null;
  readonly provenance: ProvenanceLabel;
}

/* ------------------------------- Maturity ----------------------------- */

export interface RouteMaturity {
  readonly routeId: RouteId;
  readonly supported: readonly MaturityLevel[];
  readonly ceiling: MaturityLevel;
  readonly productionBlockers: readonly string[];
  readonly notes: readonly string[];
}

export interface MaturityAssessment {
  readonly requiredLevel: MaturityLevel;
  readonly requiredLevelReasons: readonly string[];
  readonly recommendedStartingLevel: MaturityLevel;
  readonly byRoute: readonly RouteMaturity[];
  readonly productionRequirements: readonly string[];
  readonly prototypeStatement: string;
  readonly provenance: ProvenanceLabel;
}

/* --------------------------- Source of truth -------------------------- */

export interface SourceOfTruthResult {
  readonly authoritativeSource: string;
  readonly authoritativeSourceDefined: boolean;
  readonly secondarySources: readonly string[];
  readonly readOnlyInformation: readonly string[];
  readonly editableInformation: readonly string[];
  readonly requiresHumanConfirmation: readonly string[];
  readonly mustNeverBeInferred: readonly string[];
  readonly approvalOwner: RiskOwner;
  readonly backupRequirement: string;
  readonly auditHistoryRequirement: string;
  readonly recoveryRequirement: string;
  readonly statement: string | null;
  readonly provenance: ProvenanceLabel;
}

/* ------------------------------ Safeguards ---------------------------- */

export type ConsequentialDomain =
  | 'hiring'
  | 'legal'
  | 'financial'
  | 'security'
  | 'medical'
  | 'none';

export interface HumanApprovalRequirement {
  readonly action: string;
  readonly requirement: string;
  readonly owner: RiskOwner;
}

export interface Safeguards {
  readonly consequentialDomain: ConsequentialDomain;
  readonly aiMayDo: readonly string[];
  readonly aiMustNotDo: readonly string[];
  readonly humanApprovalRequirements: readonly HumanApprovalRequirement[];
  readonly sensitiveDataHandling: readonly string[];
  readonly productionRequirementsUnmetByPrototype: readonly string[];
  readonly notes: readonly string[];
}

/* ------------------------------- Verdict ------------------------------ */

export type GateId =
  | 'no-viable-route'
  | 'human-decision'
  | 'security'
  | 'problem-user-clarity'
  | 'existing-solution'
  | 'source-of-truth'
  | 'capability'
  | 'budget'
  | 'timeline'
  | 'scope';

export interface GateResult {
  readonly id: GateId;
  readonly label: string;
  readonly triggered: boolean;
  readonly detail: string;
  /** Verdict this gate forces when it decides the outcome. */
  readonly forcedVerdict: Verdict | null;
  /** Verdict this gate prevents, regardless of score band. */
  readonly disallowedVerdicts: readonly Verdict[];
  readonly conditions: readonly string[];
}

export interface VerdictResult {
  readonly verdict: Verdict;
  readonly label: string;
  readonly statement: string;
  readonly decidedBy: 'critical-gate' | 'score-band';
  readonly decidingGate: GateId | null;
  readonly gates: readonly GateResult[];
  readonly bandUsed: string;
  readonly conditions: readonly string[];
  readonly nextActions: readonly string[];
  readonly provenance: ProvenanceLabel;
}

/* ------------------------------ Assessment ---------------------------- */

export interface ProjectFeasibilityResult {
  readonly score: number;
  readonly dimensions: readonly DimensionScore[];
  readonly weightTotal: number;
  readonly statement: string;
  readonly provenance: ProvenanceLabel;
}

export interface ExistingSolutionCheck {
  readonly preferExisting: boolean;
  readonly available: boolean;
  readonly category: string;
  readonly reasons: readonly string[];
  readonly counterReasons: readonly string[];
  readonly conditions: readonly string[];
  readonly provenance: ProvenanceLabel;
}

export interface Assessment {
  readonly projectFeasibility: ProjectFeasibilityResult;
  readonly builderFit: BuilderFitResult;
  readonly builderFitByRoute: readonly BuilderFitResult[];
  readonly routes: readonly RouteAssessment[];
  readonly recommendedRouteId: RouteId | null;
  readonly alternativeRouteIds: readonly RouteId[];
  readonly excludedRouteIds: readonly RouteId[];
  readonly existingSolution: ExistingSolutionCheck;
  readonly technicalStatus: TechnicalStatus;
  readonly suitability: SuitabilityLabel;
  readonly maturity: MaturityAssessment;
  readonly risks: readonly Risk[];
  readonly highRisks: readonly Risk[];
  readonly confidence: ConfidenceResult;
  readonly cost: CostEstimate;
  readonly timeline: TimelineEstimate;
  readonly sourceOfTruth: SourceOfTruthResult;
  readonly safeguards: Safeguards;
  readonly verdict: VerdictResult;
  readonly evidence: readonly string[];
  readonly assumptions: readonly string[];
  readonly unknowns: readonly string[];
  readonly limitations: readonly string[];
}
