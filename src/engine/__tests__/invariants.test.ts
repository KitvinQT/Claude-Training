import { describe, expect, it } from 'vitest';

import { ROUTE_PROFILES } from '@/data/routeProfiles';
import { FIXTURES, FIXTURE_LIST } from '@/engine/__fixtures__/scenarios';
import { generateAssessment } from '@/engine/generateAssessment';
import { normalizeAnswers } from '@/engine/normalizeAnswers';
import { scoreProjectDimensions } from '@/engine/scoreProjectDimensions';
import type { Assessment, RiskOwner, RouteId } from '@/engine/types';
import {
  ABILITY_ORDER,
  DIMENSION_ORDER,
  DIMENSION_WEIGHTS,
  DURATION_BAND_ORDER,
  MATURITY_ORDER,
  PRICING_VERIFICATION_STATEMENT,
  RISK_CATEGORY_ORDER,
  ROUTE_IDS,
  VERDICT_LABELS,
} from '@/engine/types';
import type { AnswerMap, FieldAnswer } from '@/types/intake';

const ALLOWED_OWNERS: readonly RiskOwner[] = [
  'Project owner',
  'Data owner',
  'Technical owner',
  'Security owner',
  'Hiring manager',
  'Human reviewer',
  'Developer',
  'Vendor',
];

const CLAUDE_ROUTES: readonly RouteId[] = ['claude-artifact', 'claude-code'];

function answered(text: string): FieldAnswer {
  return { status: 'answered', text, choices: [], source: 'user' };
}
function chose(...choices: string[]): FieldAnswer {
  return { status: 'answered', text: '', choices, source: 'user' };
}
function noneAnswer(): FieldAnswer {
  return { status: 'none', text: '', choices: [], source: 'user' };
}

function withAnswers(base: AnswerMap, overrides: Record<string, FieldAnswer>): AnswerMap {
  return { ...base, ...overrides };
}

describe('rubric structure', () => {
  it('weights the ten project dimensions to exactly 100', () => {
    const total = DIMENSION_ORDER.reduce((sum, id) => sum + DIMENSION_WEIGHTS[id], 0);
    expect(total).toBe(100);
    expect(DIMENSION_ORDER).toHaveLength(10);
  });

  it('reports every dimension with its weight and weighted contribution', () => {
    const result = generateAssessment(FIXTURES['simpleTracker']!.answers);
    expect(result.projectFeasibility.weightTotal).toBe(100);
    expect(result.projectFeasibility.dimensions).toHaveLength(10);
    for (const dimension of result.projectFeasibility.dimensions) {
      expect(dimension.weight).toBe(DIMENSION_WEIGHTS[dimension.id]);
      expect(dimension.weightedContribution).toBeCloseTo((dimension.score * dimension.weight) / 100, 2);
      expect(dimension.correctiveAction.length).toBeGreaterThan(10);
      expect(dimension.status).toBeTruthy();
    }
  });

  it('evaluates all eleven builder abilities for all eight routes', () => {
    const result = generateAssessment(FIXTURES['moderateWorkflow']!.answers);
    expect(result.builderFitByRoute).toHaveLength(8);
    expect(result.builderFitByRoute.map((fit) => fit.routeId).sort()).toEqual([...ROUTE_IDS].sort());
    for (const fit of result.builderFitByRoute) {
      expect(fit.factors).toHaveLength(ABILITY_ORDER.length);
      expect(fit.explanation.length).toBeGreaterThan(0);
    }
  });

  it('evaluates all sixteen risk categories', () => {
    const result = generateAssessment(FIXTURES['recruitmentPortal']!.answers);
    expect(result.risks.map((risk) => risk.category)).toEqual([...RISK_CATEGORY_ORDER]);
  });
});

describe('determinism and bounds', () => {
  it('produces an identical assessment for identical answers', () => {
    for (const fixture of FIXTURE_LIST) {
      const first = generateAssessment(fixture.answers);
      const second = generateAssessment(fixture.answers);
      expect(second).toEqual(first);
    }
  });

  it('does not depend on the order the answers were recorded in', () => {
    const original = FIXTURES['clientFacingApp']!.answers;
    const reversed: AnswerMap = Object.fromEntries(Object.entries(original).reverse());
    expect(generateAssessment(reversed)).toEqual(generateAssessment(original));
  });

  it('keeps every score inside its documented range', () => {
    for (const fixture of FIXTURE_LIST) {
      const result = generateAssessment(fixture.answers);
      expectInRange(result.projectFeasibility.score);
      expectInRange(result.confidence.score);
      expectInRange(result.builderFit.score);
      for (const dimension of result.projectFeasibility.dimensions) expectInRange(dimension.score);
      for (const fit of result.builderFitByRoute) {
        expectInRange(fit.score);
        for (const factor of fit.factors) {
          expectInRange(factor.factorScore);
          expect(factor.builderLevel).toBeGreaterThanOrEqual(0);
          expect(factor.builderLevel).toBeLessThanOrEqual(4);
          expect(factor.requiredLevel).toBeGreaterThanOrEqual(0);
          expect(factor.requiredLevel).toBeLessThanOrEqual(4);
        }
      }
      for (const route of result.routes) expectInRange(route.fitScore);
      for (const risk of result.risks) {
        expect(risk.score).toBeGreaterThanOrEqual(1);
        expect(risk.score).toBeLessThanOrEqual(5);
      }
      expect(Object.keys(VERDICT_LABELS)).toContain(result.verdict.verdict);
      for (const phase of result.timeline.phases) {
        expect(DURATION_BAND_ORDER).toContain(phase.band);
      }
      expect(MATURITY_ORDER).toContain(result.maturity.requiredLevel);
    }
  });

  it('contains no clock, randomness, storage, or network access in the engine', async () => {
    const sources = import.meta.glob<string>('/src/engine/**/*.ts', {
      query: '?raw',
      import: 'default',
    });
    const forbidden = [
      /Math\.random/,
      /Date\.now/,
      /new Date\(/,
      /\blocalStorage\s*[.[]/,
      /\bsessionStorage\s*[.[]/,
      /\bindexedDB\s*[.[]/,
      /\bfetch\s*\(/,
      /from 'react'/,
      /from "react"/,
    ];
    const paths = Object.keys(sources).filter((path) => !path.includes('__tests__'));
    expect(paths.length).toBeGreaterThan(10);
    for (const path of paths) {
      const source = await sources[path]!();
      for (const pattern of forbidden) {
        expect(pattern.test(source), `${path} must not match ${String(pattern)}`).toBe(false);
      }
    }
  });
});

describe('builder fit never changes project feasibility', () => {
  const base = FIXTURES['clientFacingApp']!.answers;

  const strongBuilder = withAnswers(base, {
    builderExperience: chose('developer'),
    codingExperience: chose('comfortable'),
    noCodeExperience: chose('built-maintained'),
    testTroubleshoot: chose('very'),
    technicalAssistance: chose('paid-support', 'technical-colleague'),
    developerSupport: chose('in-house'),
  });
  const weakBuilder = withAnswers(base, {
    builderExperience: chose('non-technical'),
    codingExperience: chose('none'),
    noCodeExperience: chose('none'),
    testTroubleshoot: chose('not'),
    technicalAssistance: noneAnswer(),
    developerSupport: chose('none'),
  });

  it('gives an identical project feasibility score and dimensions', () => {
    const strong = generateAssessment(strongBuilder);
    const weak = generateAssessment(weakBuilder);
    expect(weak.projectFeasibility).toEqual(strong.projectFeasibility);
  });

  it('never lets the builder change the technical status of a route', () => {
    const strong = generateAssessment(strongBuilder);
    const weak = generateAssessment(weakBuilder);
    for (const routeId of ROUTE_IDS) {
      const strongRoute = strong.routes.find((route) => route.routeId === routeId)!;
      const weakRoute = weak.routes.find((route) => route.routeId === routeId)!;
      expect(weakRoute.technicalStatus).toBe(strongRoute.technicalStatus);
      expect(weakRoute.capabilityGaps).toEqual(strongRoute.capabilityGaps);
    }
  });

  it('does report a lower builder fit and a stronger support requirement', () => {
    const strong = generateAssessment(strongBuilder);
    const weak = generateAssessment(weakBuilder);
    expect(weak.builderFit.score).toBeLessThan(strong.builderFit.score);
    expect(weak.suitability).not.toBe('suitable-now');
  });

  it('allows high project feasibility to coexist with low builder fit', () => {
    const weak = generateAssessment(weakBuilder);
    expect(weak.projectFeasibility.score).toBeGreaterThanOrEqual(65);
    expect(weak.builderFit.score).toBeLessThan(50);
    expect(weak.technicalStatus).not.toBe('technically-blocked');
  });

  it('lengthens the timeline for a weaker builder without changing feasibility', () => {
    const strong = generateAssessment(strongBuilder);
    const weak = generateAssessment(weakBuilder);
    expect(weak.cost.effort.highHours).toBeGreaterThan(strong.cost.effort.highHours);
    expect(weak.timeline.builderFitEffect).toMatch(/does not change what is technically possible/i);
  });

  it('scores the same builder differently across routes', () => {
    const result = generateAssessment(FIXTURES['simpleTracker']!.answers);
    const spreadsheet = result.builderFitByRoute.find((fit) => fit.routeId === 'spreadsheet-doc')!;
    const custom = result.builderFitByRoute.find((fit) => fit.routeId === 'custom-hosted')!;
    expect(spreadsheet.score).toBeGreaterThan(custom.score + 20);
    expect(spreadsheet.suitability).toBe('suitable-now');
    expect(['requires-developer-support', 'requires-professional-implementation', 'unsuitable']).toContain(
      custom.suitability,
    );
  });
});

describe('restrictions and blockers cannot be averaged away', () => {
  it('excludes a restricted route from recommendation even when it fits best', () => {
    const base = FIXTURES['simpleTracker']!.answers;
    const unrestricted = generateAssessment(base);
    expect(unrestricted.recommendedRouteId).toBe('spreadsheet-doc');

    const restricted = generateAssessment(
      withAnswers(base, { restrictedMethods: chose('spreadsheet-doc') }),
    );
    const route = restricted.routes.find((item) => item.routeId === 'spreadsheet-doc')!;
    expect(route.excluded?.type).toBe('restricted-method');
    expect(route.eligibleForRecommendation).toBe(false);
    expect(restricted.recommendedRouteId).not.toBe('spreadsheet-doc');
    expect(route.excluded?.reason).toMatch(/restricted methods/i);
    // Exclusion is a stated constraint, not a technical judgement.
    expect(route.technicalStatus).not.toBe('technically-blocked');
  });

  it('keeps a preference from rescuing a route with a blocking capability gap', () => {
    const base = FIXTURES['simpleTracker']!.answers;
    const result = generateAssessment(
      withAnswers(base, { preferredApproaches: chose('claude-artifact', 'chat-only') }),
    );
    for (const routeId of ['claude-artifact', 'chat-only'] as const) {
      const route = result.routes.find((item) => item.routeId === routeId)!;
      expect(route.eligibleForRecommendation).toBe(false);
      expect(route.excluded?.type).toBe('capability-blocker');
      expect(route.fitScore).toBeLessThan(60);
    }
    expect(result.recommendedRouteId).toBe('spreadsheet-doc');
  });

  it('reports a reason for every exclusion', () => {
    for (const fixture of FIXTURE_LIST) {
      const result = generateAssessment(fixture.answers);
      for (const route of result.routes) {
        if (route.excluded) {
          expect(route.excluded.reason.length).toBeGreaterThan(20);
          expect(route.eligibleForRecommendation).toBe(false);
        }
      }
    }
  });

  it('returns No-Go or Do not build yet when nothing remains available', () => {
    const base = FIXTURES['simpleTracker']!.answers;
    const result = generateAssessment(
      withAnswers(base, { restrictedMethods: chose(...ROUTE_IDS) }),
    );
    expect(result.recommendedRouteId).toBeNull();
    expect(['no-go', 'do-not-build-yet']).toContain(result.verdict.verdict);
    expect(result.verdict.decidedBy).toBe('critical-gate');
  });

  it('lets a gate veto override a favourable score band', () => {
    // Scores in the "Proceed" band, but the recommended route has a capability
    // limitation, so the gate demotes the verdict.
    const result = generateAssessment(FIXTURES['restrictedLocalDev']!.answers);
    expect(result.projectFeasibility.score).toBeGreaterThanOrEqual(80);
    expect(result.verdict.bandUsed).toMatch(/would give "Proceed"/);
    expect(result.verdict.verdict).not.toBe('proceed');
    expect(result.verdict.decidedBy).toBe('critical-gate');
  });

  it('does not let a high feasibility score override an unacceptable critical risk', () => {
    // Regulated data, several users, no accounts, public hosting expectations,
    // and every route that could enforce access control ruled out.
    const base = FIXTURES['moderateWorkflow']!.answers;
    const unsafe = generateAssessment(
      withAnswers(base, {
        sensitiveInformation: chose('employment-history', 'assessments', 'regulated'),
        userAccounts: chose('none'),
        hostingExpectation: chose('public-site'),
        restrictedMethods: chose('existing-saas', 'no-code', 'custom-hosted'),
      }),
    );
    expect(unsafe.verdict.verdict).not.toBe('proceed');
    expect(unsafe.verdict.verdict).not.toBe('proceed-carefully');
    const activeGates = unsafe.verdict.gates.filter((item) => item.triggered);
    expect(activeGates.length).toBeGreaterThan(0);
    expect(
      activeGates.some(
        (item) => item.forcedVerdict !== null || item.disallowedVerdicts.length > 0,
      ),
    ).toBe(true);
  });
});

describe('no bias toward Claude-based routes', () => {
  it('does not recommend a Claude route for a simple tracker even when both are preferred', () => {
    const base = FIXTURES['simpleTracker']!.answers;
    const result = generateAssessment(
      withAnswers(base, { preferredApproaches: chose('claude-code', 'claude-artifact') }),
    );
    expect(CLAUDE_ROUTES).not.toContain(result.recommendedRouteId);
    expect(result.recommendedRouteId).toBe('spreadsheet-doc');
  });

  it('recommends non-Claude routes across the simple, CRM, workflow, and restricted scenarios', () => {
    for (const key of ['simpleTracker', 'commonCrm', 'moderateWorkflow', 'restrictedLocalDev'] as const) {
      const result = generateAssessment(FIXTURES[key]!.answers);
      expect(CLAUDE_ROUTES, `${key} should not select a Claude route`).not.toContain(
        result.recommendedRouteId,
      );
    }
  });

  it('gives the Claude Artifact route no capability advantage it does not have', () => {
    const artifact = ROUTE_PROFILES['claude-artifact'];
    expect(artifact.capabilities.persistence).toBe(0);
    expect(artifact.capabilities.authentication).toBe(0);
    expect(artifact.supportedMaturity).not.toContain('production-ready');
    expect(artifact.productionBlockers.length).toBeGreaterThan(2);
  });

  it('holds the two coded Claude-adjacent routes to the same requirements as a custom build', () => {
    for (const routeId of ['ai-assisted-coding', 'claude-code'] as const) {
      const profile = ROUTE_PROFILES[routeId];
      expect(profile.ownershipBurden).toBe('high');
      expect(profile.maintenanceLevel).toBe('high');
      expect(profile.builderRequirements['security-management']).toBeGreaterThanOrEqual(3);
      expect(profile.builderRequirements.testing).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('confidence', () => {
  it('does not reduce confidence for a valid "none" answer', () => {
    const base = FIXTURES['simpleTracker']!.answers;
    const withNone = generateAssessment(base);
    const withContent = generateAssessment(
      withAnswers(base, { niceToHave: answered('A printable summary sheet for the noticeboard') }),
    );
    expect(withNone.confidence.score).toBe(withContent.confidence.score);
    expect(withNone.confidence.deductions).toEqual(withContent.confidence.deductions);
  });

  it('does not reduce confidence for a deliberate exclusion or a stated restriction', () => {
    const base = FIXTURES['restrictedLocalDev']!.answers;
    const result = generateAssessment(base);
    const reasons = result.confidence.deductions.map((deduction) => deduction.reason).join(' ');
    expect(reasons).not.toMatch(/restrict/i);
    expect(reasons).not.toMatch(/exclude/i);
    expect(result.confidence.band).toBe('high');
  });

  it('reduces confidence for unknown answers and lists what would raise it', () => {
    const result = generateAssessment(FIXTURES['insufficientInformation']!.answers);
    expect(result.confidence.band).toBe('low');
    expect(result.confidence.score).toBeLessThan(60);
    expect(result.confidence.deductions.length).toBeGreaterThan(3);
    expect(result.confidence.missingInformation.length).toBeGreaterThan(3);
    for (const deduction of result.confidence.deductions) {
      expect(deduction.points).toBeGreaterThan(0);
      expect(deduction.detail.length).toBeGreaterThan(5);
    }
  });

  it('reduces confidence when answers conflict', () => {
    const base = FIXTURES['simpleTracker']!.answers;
    const conflicting = generateAssessment(
      withAnswers(base, {
        preferredApproaches: chose('no-code'),
        restrictedMethods: chose('no-code'),
        databaseExpectation: chose('none'),
      }),
    );
    const reasons = conflicting.confidence.deductions.map((deduction) => deduction.reason);
    expect(reasons).toContain('Answers conflict with each other');
    expect(conflicting.confidence.score).toBeLessThan(generateAssessment(base).confidence.score);
  });

  it('never presents confidence as a probability that the recommendation is correct', () => {
    const result = generateAssessment(FIXTURES['commonCrm']!.answers);
    expect(result.confidence.statement).toMatch(/not a probability/i);
    expect(result.confidence.statement).not.toMatch(/likelihood that|chance that/i);
  });

  it('keeps confidence separate from feasibility', () => {
    const insufficient = generateAssessment(FIXTURES['insufficientInformation']!.answers);
    expect(insufficient.confidence.score).not.toBe(insufficient.projectFeasibility.score);
  });
});

describe('risk records', () => {
  it('gives every risk scored 4 or 5 all mandatory fields', () => {
    for (const fixture of FIXTURE_LIST) {
      const result = generateAssessment(fixture.answers);
      for (const risk of result.highRisks) {
        expect(risk.score).toBeGreaterThanOrEqual(4);
        expect(risk.trigger.length, risk.category).toBeGreaterThan(15);
        expect(risk.consequence.length, risk.category).toBeGreaterThan(15);
        expect(risk.mitigation.length, risk.category).toBeGreaterThan(15);
        expect(risk.residualRisk.length, risk.category).toBeGreaterThan(10);
        expect(ALLOWED_OWNERS, risk.category).toContain(risk.owner);
        expect(risk.evidence.length, risk.category).toBeGreaterThan(0);
        expect(risk.scoreLabel).toMatch(/High risk|Very high risk/);
      }
    }
  });

  it('never assigns risk ownership to AI', () => {
    for (const fixture of FIXTURE_LIST) {
      const result = generateAssessment(fixture.answers);
      for (const risk of result.risks) {
        expect(ALLOWED_OWNERS).toContain(risk.owner);
        expect(risk.owner.toLowerCase()).not.toContain('ai');
      }
    }
  });

  it('records builder capability as a delivery risk, not a feasibility one', () => {
    const result = generateAssessment(FIXTURES['clientFacingApp']!.answers);
    const risk = result.risks.find((item) => item.category === 'builder-capability')!;
    expect(risk.consequence).toMatch(/not a statement that the project is infeasible/i);
  });
});

describe('cost and pricing discipline', () => {
  it('never generates a currency figure of its own', () => {
    for (const fixture of FIXTURE_LIST) {
      const result = generateAssessment(fixture.answers);
      const costText = JSON.stringify({
        cost: result.cost,
        timeline: result.timeline,
        routes: result.routes,
        verdict: result.verdict,
      });
      expect(costText, fixture.name).not.toMatch(/[$£€]\s?\d/);
      expect(costText).not.toMatch(/per hour|hourly rate of|\bday rate of\b/i);
    }
  });

  it('always states that pricing must be verified', () => {
    for (const fixture of FIXTURE_LIST) {
      const result = generateAssessment(fixture.answers);
      expect(result.cost.pricingStatement).toBe(PRICING_VERIFICATION_STATEMENT);
      expect(result.cost.costsRequiringVerification.length).toBeGreaterThan(0);
    }
  });

  it('expresses cost as categories and effort as a broad range', () => {
    const result = generateAssessment(FIXTURES['clientFacingApp']!.answers);
    expect(['free-or-existing', 'low', 'moderate', 'high', 'very-high', 'not-justified']).toContain(
      result.cost.setupCost,
    );
    expect(result.cost.effort.highHours).toBeGreaterThan(result.cost.effort.lowHours);
    expect(result.cost.effort.basis.length).toBeGreaterThan(2);
    expect(result.cost.labels).toContain('requires-verification');
  });
});

describe('provenance', () => {
  it('attaches provenance to every numeric result', () => {
    for (const fixture of FIXTURE_LIST) {
      const result = generateAssessment(fixture.answers);
      const problems: string[] = [];
      walk(result, false, '', problems);
      expect(problems, `${fixture.name}: ${problems.join(' | ')}`).toEqual([]);
    }
  });
});

/** Structural keys that are not results in their own right. */
const STRUCTURAL_NUMERIC_KEYS = new Set([
  'points',
  'weight',
  'gap',
  'required',
  'available',
  'builderLevel',
  'requiredLevel',
  'factorScore',
]);

function walk(value: unknown, covered: boolean, path: string, problems: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, covered, `${path}[${index}]`, problems));
    return;
  }
  if (value === null || typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  const hasProvenance = typeof record['provenance'] === 'string';
  const numericKeys = Object.entries(record)
    .filter(([key, item]) => typeof item === 'number' && !STRUCTURAL_NUMERIC_KEYS.has(key))
    .map(([key]) => key);

  if (numericKeys.length > 0 && !hasProvenance && !covered) {
    problems.push(`${path || 'root'} has numeric ${numericKeys.join(',')} without provenance`);
  }

  for (const [key, item] of Object.entries(record)) {
    walk(item, covered || hasProvenance, path ? `${path}.${key}` : key, problems);
  }
}

function expectInRange(score: number): void {
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
}

describe('normalisation', () => {
  it('does not invent an answer for an unknown field', () => {
    const normalized = normalizeAnswers(FIXTURES['insufficientInformation']!.answers);
    expect(normalized.budgetKnown).toBe(false);
    expect(normalized.sourceOfTruth).toBe('unknown');
    expect(normalized.weeklyHours).toBeNull();
    expect(normalized.deadlineWeeks).toBeNull();
    expect(normalized.unknownFieldIds.length).toBeGreaterThan(40);
  });

  it('separates an explicit "none" from an unknown', () => {
    const normalized = normalizeAnswers(FIXTURES['simpleTracker']!.answers);
    expect(normalized.explicitNoneFieldIds).toContain('restrictedMethods');
    expect(normalized.unknownFieldIds).not.toContain('restrictedMethods');
  });

  it('scores dimensions without reference to builder ability', () => {
    const base = FIXTURES['moderateWorkflow']!.answers;
    const strong = scoreProjectDimensions(
      normalizeAnswers(withAnswers(base, { builderExperience: chose('developer') })),
    );
    const weak = scoreProjectDimensions(
      normalizeAnswers(withAnswers(base, { builderExperience: chose('non-technical') })),
    );
    expect(weak).toEqual(strong);
  });

  it('states in the technical dimension that builder experience is excluded', () => {
    const result = generateAssessment(FIXTURES['clientFacingApp']!.answers);
    const technical = result.projectFeasibility.dimensions.find(
      (dimension) => dimension.id === 'technical-feasibility',
    )!;
    expect(technical.evidenceUsed.join(' ')).toMatch(/builder experience is deliberately excluded/i);
  });
});

describe('assessment shape', () => {
  it('reports the required narrative sections for every fixture', () => {
    for (const fixture of FIXTURE_LIST) {
      const result: Assessment = generateAssessment(fixture.answers);
      expect(result.limitations.length).toBeGreaterThan(4);
      expect(result.assumptions.length).toBeGreaterThan(2);
      expect(result.evidence.length).toBeGreaterThan(2);
      expect(result.verdict.gates.length).toBe(10);
      expect(result.verdict.nextActions.length).toBeGreaterThan(1);
      expect(result.maturity.productionRequirements.length).toBe(10);
      expect(result.safeguards.aiMayDo.length).toBeGreaterThan(3);
      expect(result.sourceOfTruth.mustNeverBeInferred.length).toBeGreaterThan(0);
    }
  });

  it('says plainly that a frontend-only prototype is not production-ready', () => {
    const result = generateAssessment(FIXTURES['recruitmentPortal']!.answers);
    expect(result.maturity.prototypeStatement).toMatch(/never production-ready/i);
    expect(result.safeguards.productionRequirementsUnmetByPrototype).toContain('Authentication');
  });
});
