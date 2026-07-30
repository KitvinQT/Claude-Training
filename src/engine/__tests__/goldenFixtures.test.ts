import { describe, expect, it } from 'vitest';

import { ROUTE_PROFILES } from '@/data/routeProfiles';
import { FIXTURES } from '@/engine/__fixtures__/scenarios';
import { generateAssessment } from '@/engine/generateAssessment';
import { SOURCE_OF_TRUTH_UNDEFINED_STATEMENT } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Golden fixtures A-G.
 *
 * These pin the expected outcome of each scenario. Assertions target the
 * decisions that matter - which route wins, which verdict is returned, what the
 * builder needs - rather than exact score values, so a rule change shows up as a
 * behaviour change rather than as arithmetic noise.
 * ------------------------------------------------------------------ */

describe('A. Simple internal tracker', () => {
  const result = generateAssessment(FIXTURES['simpleTracker']!.answers);

  it('recommends a spreadsheet or document workflow', () => {
    expect(result.recommendedRouteId).toBe('spreadsheet-doc');
  });

  it('keeps the technical burden low', () => {
    expect(result.technicalStatus).toBe('technically-feasible');
    expect(result.cost.effort.highHours).toBeLessThanOrEqual(40);
    expect(result.cost.setupCost).toBe('free-or-existing');
    expect(result.cost.monthlyCost).toBe('free-or-existing');
  });

  it('reports a strong builder fit for a non-developer', () => {
    expect(result.builderFit.score).toBeGreaterThanOrEqual(85);
    expect(result.suitability).toBe('suitable-now');
    expect(result.builderFit.gaps).toEqual([]);
  });

  it('does not recommend a custom build', () => {
    for (const routeId of ['custom-hosted', 'ai-assisted-coding', 'claude-code'] as const) {
      const route = result.routes.find((item) => item.routeId === routeId)!;
      expect(route.fitScore).toBeLessThan(result.routes.find((item) => item.routeId === 'spreadsheet-doc')!.fitScore);
    }
    expect(['proceed', 'proceed-carefully', 'conditional-go']).toContain(result.verdict.verdict);
  });
});

describe('B. Common CRM requirement', () => {
  const result = generateAssessment(FIXTURES['commonCrm']!.answers);

  it('recognises the product category and prefers an existing solution', () => {
    expect(result.existingSolution.available).toBe(true);
    expect(result.existingSolution.category).toMatch(/CRM/);
    expect(result.existingSolution.preferExisting).toBe(true);
    expect(result.existingSolution.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it('recommends the existing SaaS route', () => {
    expect(result.recommendedRouteId).toBe('existing-saas');
  });

  it('returns the "Use an existing solution" verdict from the existing-solution gate', () => {
    expect(result.verdict.verdict).toBe('use-existing-solution');
    expect(result.verdict.decidedBy).toBe('critical-gate');
    expect(result.verdict.decidingGate).toBe('existing-solution');
  });

  it('lists conditions to check before adopting a product', () => {
    expect(result.verdict.conditions.join(' ')).toMatch(/shortlist|pricing|permission/i);
  });
});

describe('C. Moderate internal workflow', () => {
  const result = generateAssessment(FIXTURES['moderateWorkflow']!.answers);

  it('recommends the no-code route', () => {
    expect(result.recommendedRouteId).toBe('no-code');
  });

  it('returns Conditional Go or Proceed carefully', () => {
    expect(['conditional-go', 'proceed-carefully']).toContain(result.verdict.verdict);
  });

  it('rules out routes that cannot keep a change history', () => {
    const spreadsheet = result.routes.find((item) => item.routeId === 'spreadsheet-doc')!;
    expect(spreadsheet.capabilityGaps.map((gap) => gap.id)).toContain('audit-history');
    expect(spreadsheet.fitScore).toBeLessThan(result.routes.find((item) => item.routeId === 'no-code')!.fitScore);
  });

  it('flags the undefined source of truth', () => {
    expect(result.sourceOfTruth.authoritativeSourceDefined).toBe(false);
    expect(result.sourceOfTruth.statement).toBe(SOURCE_OF_TRUTH_UNDEFINED_STATEMENT);
    const gate = result.verdict.gates.find((item) => item.id === 'source-of-truth')!;
    expect(gate.triggered).toBe(true);
    expect(gate.disallowedVerdicts).toContain('proceed');
  });
});

describe('D. Custom client-facing application', () => {
  const result = generateAssessment(FIXTURES['clientFacingApp']!.answers);

  it('remains technically feasible', () => {
    expect(result.technicalStatus).toBe('technically-feasible');
    const recommended = result.routes.find((route) => route.routeId === result.recommendedRouteId)!;
    expect(recommended.technicalStatus).toBe('technically-feasible');
    expect(recommended.capabilityGaps).toEqual([]);
  });

  it('selects a coded custom route', () => {
    expect(['custom-hosted', 'ai-assisted-coding', 'claude-code']).toContain(result.recommendedRouteId);
    expect(ROUTE_PROFILES[result.recommendedRouteId!].ownershipBurden).toBe('high');
  });

  it('requires developer or professional support for the current builder', () => {
    expect(['requires-developer-support', 'requires-professional-implementation']).toContain(
      result.suitability,
    );
    expect(result.cost.externalSupportRequirement).toMatch(/developer|professional/i);
    expect(result.verdict.conditions.join(' ')).toMatch(/developer support/i);
  });

  it('excludes off-the-shelf and spreadsheet routes that cannot deliver a client-facing interface', () => {
    const saas = result.routes.find((route) => route.routeId === 'existing-saas')!;
    expect(saas.eligibleForRecommendation).toBe(false);
    expect(saas.capabilityGaps.map((gap) => gap.id)).toContain('custom-interface');
  });

  it('does not treat the builder gap as a feasibility problem', () => {
    expect(result.projectFeasibility.score).toBeGreaterThanOrEqual(65);
    const technical = result.projectFeasibility.dimensions.find(
      (dimension) => dimension.id === 'technical-feasibility',
    )!;
    expect(technical.score).toBeGreaterThanOrEqual(65);
  });
});

describe('E. Restricted local development', () => {
  const result = generateAssessment(FIXTURES['restrictedLocalDev']!.answers);
  const claudeCode = result.routes.find((route) => route.routeId === 'claude-code')!;

  it('keeps Claude Code technically valid', () => {
    expect(claudeCode.technicalStatus).not.toBe('technically-blocked');
    expect(claudeCode.blockers).toEqual([]);
    expect(claudeCode.fitScore).toBeGreaterThan(40);
  });

  it('excludes it under the stated environment restrictions, with the reason shown', () => {
    expect(claudeCode.excluded?.type).toBe('environment-restriction');
    expect(claudeCode.excluded?.reason).toMatch(/local development environment/i);
    expect(claudeCode.excluded?.reason).toMatch(/remains technically valid/i);
    expect(claudeCode.eligibleForRecommendation).toBe(false);
  });

  it('recommends a route that needs no local environment', () => {
    expect(result.recommendedRouteId).not.toBe('claude-code');
    expect(ROUTE_PROFILES[result.recommendedRouteId!].requiresLocalEnvironment).toBe(false);
  });

  it('does not penalise the project score for the user’s own restriction', () => {
    expect(result.projectFeasibility.score).toBeGreaterThanOrEqual(70);
    expect(result.confidence.band).toBe('high');
  });
});

describe('F. Sensitive recruitment system (TCV demonstration scenario)', () => {
  const result = generateAssessment(FIXTURES['recruitmentPortal']!.answers);

  it('finds a prototype feasible', () => {
    expect(result.technicalStatus).not.toBe('technically-blocked');
    expect(result.recommendedRouteId).not.toBeNull();
    const artifact = result.routes.find((route) => route.routeId === 'claude-artifact')!;
    expect(artifact.supportedMaturity).toContain('interactive-prototype');
    expect(artifact.supportedMaturity).not.toContain('production-ready');
  });

  it('requires production-grade controls for a real implementation', () => {
    expect(result.maturity.requiredLevel).toBe('production-ready');
    const requirements = result.maturity.productionRequirements.join(' ');
    expect(requirements).toMatch(/Authentication/i);
    expect(requirements).toMatch(/Role-based permissions/i);
    expect(requirements).toMatch(/Audit history/i);
    expect(requirements).toMatch(/Backups/i);
    expect(requirements).toMatch(/recovery/i);
  });

  it('treats candidate and interview information as sensitive HR data', () => {
    expect(result.safeguards.consequentialDomain).toBe('hiring');
    expect(result.safeguards.notes.join(' ')).toMatch(/sensitive HR data/i);
    expect(result.safeguards.sensitiveDataHandling.join(' ')).toMatch(/retention/i);
    const privacy = result.risks.find((risk) => risk.category === 'privacy')!;
    expect(privacy.score).toBeGreaterThanOrEqual(4);
  });

  it('forbids AI from issuing the final hiring decision', () => {
    const mustNot = result.safeguards.aiMustNotDo.join(' ');
    expect(mustNot).toMatch(/final pass, conditional pass, fail, rejection, or hiring decision/i);
    expect(mustNot).toMatch(/without human review/i);
    const may = result.safeguards.aiMayDo.join(' ');
    expect(may).toMatch(/organise|summarise|draft/i);
  });

  it('requires human approval for outcomes and candidate communications', () => {
    const actions = result.safeguards.humanApprovalRequirements;
    expect(actions.length).toBeGreaterThanOrEqual(3);
    expect(actions.map((item) => item.action).join(' ')).toMatch(/stage outcome/i);
    expect(actions.map((item) => item.action).join(' ')).toMatch(/communications/i);
    expect(actions.every((item) => item.owner !== 'Vendor')).toBe(true);
    const gate = result.verdict.gates.find((item) => item.id === 'human-decision')!;
    expect(gate.triggered).toBe(true);
    expect(gate.disallowedVerdicts).toContain('proceed');
  });

  it('requires an authoritative candidate record and an audit history', () => {
    expect(result.sourceOfTruth.authoritativeSourceDefined).toBe(false);
    expect(result.sourceOfTruth.statement).toBe(SOURCE_OF_TRUTH_UNDEFINED_STATEMENT);
    expect(result.sourceOfTruth.auditHistoryRequirement).toMatch(/required/i);
    expect(result.sourceOfTruth.readOnlyInformation.join(' ')).toMatch(/interview notes/i);
    expect(result.sourceOfTruth.mustNeverBeInferred.join(' ')).toMatch(/suitability|protected characteristic/i);
    expect(result.sourceOfTruth.approvalOwner).toBe('Hiring manager');
  });

  it('never returns a plain Proceed for a consequential domain', () => {
    expect(result.verdict.verdict).not.toBe('proceed');
    expect(result.verdict.conditions.join(' ')).toMatch(/human/i);
  });

  it('excludes the routes the user ruled out, with reasons', () => {
    const saas = result.routes.find((route) => route.routeId === 'existing-saas')!;
    expect(saas.excluded?.type).toBe('restricted-method');
    expect(saas.technicalStatus).not.toBe('technically-blocked');
  });

  it('states what a frontend-only prototype cannot satisfy', () => {
    const unmet = result.safeguards.productionRequirementsUnmetByPrototype.join(' ');
    for (const requirement of [
      'Persistent records',
      'Authentication',
      'Role-based access',
      'Audit history',
      'Secure document storage',
      'Email',
      'Multi-user collaboration',
    ]) {
      expect(unmet).toMatch(new RegExp(requirement, 'i'));
    }
  });
});

describe('G. Insufficient information', () => {
  const result = generateAssessment(FIXTURES['insufficientInformation']!.answers);

  it('reports low confidence', () => {
    expect(result.confidence.band).toBe('low');
    expect(result.confidence.score).toBeLessThan(50);
  });

  it('returns Revise before building or Delay', () => {
    expect(['revise-before-building', 'delay']).toContain(result.verdict.verdict);
    expect(result.verdict.decidingGate).toBe('problem-user-clarity');
  });

  it('avoids false precision', () => {
    expect(result.unknowns.length).toBeGreaterThan(40);
    expect(result.assumptions.join(' ')).toMatch(/no experience was assumed/i);
    expect(result.assumptions.join(' ')).toMatch(/not treated as your answer/i);
    expect(result.cost.costConfidence).toBe('low');
    expect(result.confidence.missingInformation.length).toBeGreaterThan(5);
  });

  it('asks for the problem and the users before anything else', () => {
    expect(result.verdict.nextActions.join(' ')).toMatch(/problem/i);
    expect(result.verdict.nextActions.join(' ')).toMatch(/users/i);
  });
});
