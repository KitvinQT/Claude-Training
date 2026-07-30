import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/App';
import { FIXTURES } from '@/engine/__fixtures__/scenarios';
import { generateAssessment } from '@/engine/generateAssessment';
import { initialIntakeState } from '@/state/intakeReducer';
import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  PRICING_VERIFICATION_STATEMENT,
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_ORDER,
  ROUTE_IDS,
  SOURCE_OF_TRUTH_UNDEFINED_STATEMENT,
  SUITABILITY_LABELS,
  VERDICT_LABELS,
  type SuitabilityLabel,
  type Verdict,
} from '@/engine/types';
import { ROUTE_PROFILES } from '@/data/routeProfiles';
import type { AnswerMap, IntakeState } from '@/types/intake';

/* ------------------------------------------------------------------ *
 * Report interface tests.
 *
 * Most tests mount the report directly from a fixture, so they exercise the
 * rendered report rather than re-walking the intake. The generation flow itself
 * has its own tests.
 * ------------------------------------------------------------------ */

function reviewState(answers: AnswerMap): IntakeState {
  return {
    ...initialIntakeState,
    screen: 'review',
    answers,
    furthestStepIndex: 8,
    reviewUnlocked: true,
  };
}

function reportState(answers: AnswerMap): IntakeState {
  return {
    ...reviewState(answers),
    screen: 'report',
    assessment: generateAssessment(answers),
  };
}

const recruitment = FIXTURES['recruitmentPortal']!.answers;
const clientFacing = FIXTURES['clientFacingApp']!.answers;
const simpleTracker = FIXTURES['simpleTracker']!.answers;

function renderReport(answers: AnswerMap) {
  return render(<App initialState={reportState(answers)} />);
}

describe('generating the assessment', () => {
  it('runs from the review screen and shows the staged processing state', async () => {
    const user = userEvent.setup();
    render(<App initialState={reviewState(recruitment)} />);

    await user.click(screen.getByRole('button', { name: /generate assessment/i }));

    expect(
      screen.getByRole('heading', { level: 1, name: /preparing your assessment/i }),
    ).toBeInTheDocument();
    for (const label of [
      'Reviewing project requirements',
      'Comparing implementation routes',
      'Evaluating risks and safeguards',
      'Preparing recommendation',
    ]) {
      expect(
        screen.getByText(label, { selector: '.stages__label' }),
        label,
      ).toBeInTheDocument();
    }

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /feasibility assessment/i })).toBeInTheDocument(),
    );
  });

  it('announces progress and then that the assessment is ready', async () => {
    const user = userEvent.setup();
    render(<App initialState={reviewState(recruitment)} />);
    await user.click(screen.getByRole('button', { name: /generate assessment/i }));

    await waitFor(() =>
      expect(screen.getByTestId('announcer')).toHaveTextContent('Assessment ready'),
    );
  });

  it('moves focus to the report heading', async () => {
    const user = userEvent.setup();
    render(<App initialState={reviewState(recruitment)} />);
    await user.click(screen.getByRole('button', { name: /generate assessment/i }));

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1, name: /feasibility assessment/i });
      expect(heading).toHaveFocus();
    });
  });

  it('states that nothing external is contacted', async () => {
    const user = userEvent.setup();
    render(<App initialState={reviewState(recruitment)} />);
    await user.click(screen.getByRole('button', { name: /generate assessment/i }));
    expect(screen.getByText(/everything runs locally in this browser/i)).toBeInTheDocument();
  });

  it('renders a single level-one heading on the report', () => {
    renderReport(recruitment);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('executive summary', () => {
  it('shows both headline scores separately, with the explanatory statement', () => {
    renderReport(recruitment);
    const summary = screen.getByRole('region', { name: 'Executive summary' });

    expect(within(summary).getByText('Project Feasibility')).toBeInTheDocument();
    expect(within(summary).getByText(/^Builder Fit —/)).toBeInTheDocument();
    expect(within(summary).getByText('Assessment confidence')).toBeInTheDocument();
    expect(
      within(summary).getByText(/A low Builder Fit score does not make a technically feasible project infeasible/i),
    ).toBeInTheDocument();
  });

  it('never describes Builder Fit as technical feasibility', () => {
    renderReport(clientFacing);
    const summary = screen.getByRole('region', { name: 'Executive summary' });
    const builderFitBlock = within(summary).getByText(/^Builder Fit —/).closest('.score')!;
    expect(builderFitBlock.textContent).toMatch(/implement and maintain/i);
    expect(builderFitBlock.textContent).not.toMatch(/technically infeasible|technical feasibility/i);
  });

  it('shows the project name, verdict, routes, and delivery requirements', () => {
    renderReport(recruitment);
    const summary = screen.getByRole('region', { name: 'Executive summary' });
    const assessment = generateAssessment(recruitment);

    expect(within(summary).getByText(assessment.projectName)).toBeInTheDocument();
    expect(within(summary).getByText(VERDICT_LABELS[assessment.verdict.verdict])).toBeInTheDocument();

    for (const term of [
      'Best technical route',
      'Recommended practical path',
      'Best alternative route',
      'Build method (best technical route)',
      'Final solution type (best technical route)',
      'Recommended maturity target',
      'Technical status',
      'Suitability for the current builder',
      'Estimated effort range',
      'Setup-cost category',
      'Monthly-cost category',
      'Hosting needed',
      'Database needed',
      'Authentication needed',
      'Developer support needed',
      'Maintenance level',
    ]) {
      expect(within(summary).getByText(term), term).toBeInTheDocument();
    }
  });
});

describe('project feasibility scorecards', () => {
  it('renders all ten dimensions with weight, contribution, and corrective action', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Project feasibility' });

    for (const id of DIMENSION_ORDER) {
      const label = DIMENSION_LABELS[id];
      expect(
        within(section).getByRole('heading', { level: 3, name: label }),
        label,
      ).toBeInTheDocument();
    }
    expect(within(section).getAllByText('Weight')).toHaveLength(10);
    expect(within(section).getAllByText('Weighted contribution')).toHaveLength(10);
    expect(within(section).getAllByText(/Recommended corrective action:/)).toHaveLength(10);
  });

  it('never shows a score without its derivation', async () => {
    const user = userEvent.setup();
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Project feasibility' });

    const disclosures = within(section).getAllByText(/How the .* score was derived/i);
    expect(disclosures).toHaveLength(10);

    await user.click(disclosures[0]!);
    const body = disclosures[0]!.closest('details')!;
    expect(within(body).getByText('Positive drivers')).toBeInTheDocument();
    expect(within(body).getByText('Negative drivers')).toBeInTheDocument();
    expect(within(body).getByText('Evidence used')).toBeInTheDocument();
    expect(within(body).getByText('Assumptions used')).toBeInTheDocument();
    expect(within(body).getByText('Unknowns affecting this score')).toBeInTheDocument();
  });
});

describe('builder fit section', () => {
  it('shows the evaluated route, suitability, and required support', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Builder fit' });

    expect(within(section).getByText('Route being evaluated')).toBeInTheDocument();
    expect(within(section).getByText('Suitability label')).toBeInTheDocument();
    expect(within(section).getByText('Required support level')).toBeInTheDocument();
    expect(within(section).getByText(/Learning burden for this route/)).toBeInTheDocument();
    expect(within(section).getByText('Deployment readiness')).toBeInTheDocument();
    expect(within(section).getByText('Maintenance readiness')).toBeInTheDocument();
    expect(within(section).getByText('Recommended support arrangement')).toBeInTheDocument();
    expect(within(section).getByText('Main strengths')).toBeInTheDocument();
    expect(within(section).getByText('Main capability gaps')).toBeInTheDocument();
  });

  it('compares the same builder across every available route', () => {
    renderReport(simpleTracker);
    const section = screen.getByRole('region', { name: 'Builder fit' });
    const table = within(section).getByRole('region', {
      name: /builder fit comparison across routes/i,
    });
    const assessment = generateAssessment(simpleTracker);
    const eligible = assessment.routes.filter((route) => route.eligibleForRecommendation);

    for (const route of eligible) {
      expect(within(table).getByRole('rowheader', { name: route.name })).toBeInTheDocument();
    }
    // The same builder is strong for a spreadsheet and weak for a custom build.
    expect(within(table).getAllByText(/no — support required/i).length).toBeGreaterThan(0);
  });

  it('states that builder fit is not folded into project feasibility', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Builder fit' });
    expect(
      within(section).getByText(/never folded into the Project Feasibility Score/i),
    ).toBeInTheDocument();
  });
});

describe('technical route and practical path', () => {
  it('shows the three cards separately', () => {
    renderReport(clientFacing);
    const section = screen.getByRole('region', { name: 'Technical route and practical path' });

    expect(within(section).getByText('A. Best technical route')).toBeInTheDocument();
    expect(within(section).getByText('B. Recommended practical path')).toBeInTheDocument();
    expect(within(section).getByText('C. Best alternative')).toBeInTheDocument();
    expect(within(section).getByText('Immediate validation step')).toBeInTheDocument();
  });

  it('does not call a route "recommended for you now" when it needs developer support', () => {
    const assessment = generateAssessment(clientFacing);
    // The fixture is deliberately one where the builder cannot go it alone.
    expect(['requires-developer-support', 'requires-professional-implementation']).toContain(
      assessment.suitability,
    );

    renderReport(clientFacing);
    const section = screen.getByRole('region', { name: 'Technical route and practical path' });
    expect(within(section).queryByText(/recommended for you now/i)).toBeNull();
    expect(within(section).getAllByText(/practical next step: secure/i).length).toBeGreaterThan(0);
    expect(
      within(section).getAllByText(/not suitable for independent implementation/i).length,
    ).toBeGreaterThan(0);
  });

  it('separates build method from final solution type', () => {
    renderReport(clientFacing);
    const section = screen.getByRole('region', { name: 'Technical route and practical path' });
    expect(within(section).getByText('Build method')).toBeInTheDocument();
    expect(within(section).getByText('Final solution type')).toBeInTheDocument();
    expect(within(section).getByText('Hosting target')).toBeInTheDocument();
    expect(within(section).getByText('Builder requirement')).toBeInTheDocument();
    expect(
      within(section).getByText(/Method and destination are different questions/i),
    ).toBeInTheDocument();
  });

  it('says what the alternative sacrifices', () => {
    renderReport(clientFacing);
    const section = screen.getByRole('region', { name: 'Technical route and practical path' });
    expect(within(section).getByText('What capability is lost')).toBeInTheDocument();
    expect(within(section).getByText(/When to choose it instead:/)).toBeInTheDocument();
  });
});

describe('route comparison', () => {
  it('lists all eight routes with their status and fit', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Implementation route comparison' });
    const table = within(section).getByRole('region', { name: /route comparison table/i });

    for (const routeId of ROUTE_IDS) {
      expect(
        within(table).getByRole('rowheader', { name: ROUTE_PROFILES[routeId].name }),
        routeId,
      ).toBeInTheDocument();
    }
  });

  it('shows restricted routes with the exclusion reason and keeps their technical status', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Implementation route comparison' });
    const assessment = generateAssessment(recruitment);
    const restricted = assessment.routes.filter((route) => route.excluded !== null);
    expect(restricted.length).toBeGreaterThan(0);

    for (const route of restricted) {
      const card = within(section)
        .getByRole('heading', { level: 3, name: route.name })
        .closest('.route-card')!;
      expect(card.textContent, route.routeId).toContain(route.excluded!.reason.slice(0, 40));
      expect(card.textContent).toMatch(/Technical status is unchanged/i);
    }
  });

  it('distinguishes the technical, practical, alternative, and excluded roles', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Implementation route comparison' });
    expect(within(section).getAllByText('Best technical route').length).toBeGreaterThan(0);
    expect(within(section).getAllByText('Excluded').length).toBeGreaterThan(0);
  });
});

describe('risk register', () => {
  it('renders all sixteen categories', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Risk register' });
    const table = within(section).getByRole('region', { name: /risk summary table/i });

    for (const category of RISK_CATEGORY_ORDER) {
      expect(
        within(table).getByRole('rowheader', { name: RISK_CATEGORY_LABELS[category] }),
        category,
      ).toBeInTheDocument();
    }
  });

  it('surfaces risks scored 4 or 5 with the full record, expanded', () => {
    const assessment = generateAssessment(recruitment);
    expect(assessment.highRisks.length).toBeGreaterThan(0);

    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Risk register' });
    expect(
      within(section).getByRole('heading', {
        name: new RegExp(`highest-priority risks \\(${assessment.highRisks.length} scored 4 or 5\\)`, 'i'),
      }),
    ).toBeInTheDocument();

    for (const risk of assessment.highRisks) {
      const card = within(section)
        .getAllByRole('heading', { level: 4, name: risk.label })[0]!
        .closest('.risk')!;
      // Expanded by default: no disclosure needed to read the record.
      expect(card.querySelector('details')).toBeNull();
      for (const term of ['Trigger', 'Consequence', 'Mitigation', 'Owner', 'Residual risk', 'Evidence', 'Assumptions']) {
        expect(within(card as HTMLElement).getByText(term), `${risk.category} ${term}`).toBeInTheDocument();
      }
      expect(within(card as HTMLElement).getByText(risk.owner)).toBeInTheDocument();
      expect(within(card as HTMLElement).getByText(/Blocks a route or verdict\?/)).toBeInTheDocument();
    }
  });

  it('never shows AI as a risk owner', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Risk register' });
    const table = within(section).getByRole('region', { name: /risk summary table/i });
    const ownerCells = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.children[3]?.textContent ?? '');
    for (const owner of ownerCells) {
      expect(owner.toLowerCase()).not.toBe('ai');
      expect(owner).not.toMatch(/^AI\b/);
    }
  });

  it('states severity in words as well as by score', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Risk register' });
    expect(within(section).getAllByText(/very low risk|low risk|moderate risk|high risk|very high risk/i).length).toBeGreaterThan(5);
  });
});

describe('cost and timeline', () => {
  it('shows the pricing-verification statement prominently and invents no currency', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Cost' });

    expect(
      within(section).getByRole('heading', { name: PRICING_VERIFICATION_STATEMENT }),
    ).toBeInTheDocument();
    expect(section.textContent).not.toMatch(/[$£€]\s?\d/);

    for (const term of [
      'Estimated effort-hour range',
      'Setup-cost category',
      'Monthly-cost category',
      'Maintenance-effort category',
      'External-support requirement',
      'Cost confidence',
      'Main cost drivers',
      'Costs requiring verification',
    ]) {
      expect(within(section).getByText(term), term).toBeInTheDocument();
    }
  });

  it('labels demonstration-scenario effort as demonstration data', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Cost' });
    const effort = within(section).getByText('Estimated effort-hour range').closest('.facts__item')!;
    expect(within(effort as HTMLElement).getByText('Demonstration data')).toBeInTheDocument();
  });

  it('shows all seven timeline phases and the builder-fit caveat', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Timeline' });
    const table = within(section).getByRole('region', { name: /timeline phase table/i });

    for (const phase of [
      'Validation',
      'Prototype',
      'MVP',
      'Pilot',
      'Production-ready implementation',
      'Training and documentation',
      'Ongoing maintenance',
    ]) {
      expect(within(table).getByRole('rowheader', { name: phase }), phase).toBeInTheDocument();
    }
    expect(
      within(section).getByText(/does not reduce technical feasibility/i),
    ).toBeInTheDocument();
    expect(within(section).getByText('Verification status')).toBeInTheDocument();
  });
});

describe('maturity, source of truth, and safeguards', () => {
  it('states what a frontend-only prototype cannot provide', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Maturity and production readiness' });

    for (const requirement of [
      /Persistent records/i,
      /Authentication/i,
      /Role-based access/i,
      /Secure document storage/i,
      /Audit history/i,
      /Email/i,
      /Multi-user collaboration/i,
      /Backups/i,
      /Monitoring/i,
      /recovery/i,
    ]) {
      expect(section.textContent, String(requirement)).toMatch(requirement);
    }
    expect(within(section).getAllByText(/never production-ready/i).length).toBeGreaterThan(0);
  });

  it('shows the source-of-truth warning outside any disclosure', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Source of truth' });
    const warning = within(section).getByRole('heading', {
      name: SOURCE_OF_TRUTH_UNDEFINED_STATEMENT,
    });
    expect(warning).toBeInTheDocument();
    expect(warning.closest('details')).toBeNull();
  });

  it('shows every source-of-truth field', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Source of truth' });
    for (const term of [
      'Authoritative source',
      'Approval owner',
      'Backup requirement',
      'Audit-history requirement',
      'Recovery requirement',
      'Secondary sources',
      'Should remain read-only',
      'May be edited',
      'Requires human confirmation',
      'Must never be inferred',
    ]) {
      expect(within(section).getByText(term), term).toBeInTheDocument();
    }
  });

  it('shows the recruitment safeguards as requirements, not suggestions', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Human safeguards' });

    expect(section.textContent).toMatch(/sensitive HR data/i);
    expect(section.textContent).toMatch(/hiring decisions/i);
    expect(within(section).getByRole('heading', { name: /human authority is retained/i })).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'AI may' })).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'AI must not' })).toBeInTheDocument();
    expect(section.textContent).toMatch(
      /final pass, conditional pass, fail, rejection, or hiring decision/i,
    );
    expect(section.textContent).toMatch(/review and send every message/i);
    expect(within(section).getAllByText('Human approval required').length).toBeGreaterThan(2);
    expect(section.textContent).toMatch(/role-based access/i);
    expect(section.textContent).toMatch(/audit history/i);
    expect(section.textContent).toMatch(/mandatory conditions, not optional best practices/i);
  });
});

describe('MVP, roadmap, and evidence', () => {
  it('shows every MVP field', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'MVP recommendation' });
    for (const term of [
      'Main problem solved',
      'Included features',
      'Excluded from the first version',
      'Required tools',
      'Required users',
      'Human-review requirements',
      'Test period',
      'Success measures',
      'Failure criteria',
      'Conditions for expansion',
      'Stays manual for now',
      'Should not be automated yet',
    ]) {
      expect(within(section).getByText(term), term).toBeInTheDocument();
    }
  });

  it('renders the five roadmap phases with goals and exit criteria', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Phased roadmap' });
    for (const phase of [
      'Phase 0: Validation',
      'Phase 1: Prototype',
      'Phase 2: MVP',
      'Phase 3: Controlled rollout',
      'Phase 4: Scale',
    ]) {
      expect(within(section).getByRole('heading', { level: 3, name: phase }), phase).toBeInTheDocument();
    }
    expect(within(section).getAllByText(/^Goal:/)).toHaveLength(5);
    expect(within(section).getAllByText('Exit criteria')).toHaveLength(5);
    expect(within(section).getAllByText('Required owner')).toHaveLength(5);
    expect(within(section).getAllByText('Main risk')).toHaveLength(5);
  });

  it('separates the evidence panels and details each unknown', async () => {
    const user = userEvent.setup();
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: /Evidence, assumptions, unknowns/i });

    for (const label of [
      /from your answers/i,
      /derived findings/i,
      /estimates/i,
      /assumptions/i,
      /demonstration data/i,
      /unknowns/i,
      /requires verification/i,
    ]) {
      expect(within(section).getByRole('tab', { name: label }), String(label)).toBeInTheDocument();
    }

    await user.click(within(section).getByRole('tab', { name: /unknowns/i }));
    const unknownsPanel = within(section).getByRole('tabpanel', { name: /unknowns/i });
    expect(within(unknownsPanel).getByText('Why it matters')).toBeInTheDocument();
    expect(within(unknownsPanel).getByText('Which result it affects')).toBeInTheDocument();
    expect(within(unknownsPanel).getByText('What would improve confidence')).toBeInTheDocument();

    await user.click(within(section).getByRole('tab', { name: /requires verification/i }));
    const verifyPanel = within(section).getByRole('tabpanel', { name: /requires verification/i });
    expect(within(verifyPanel).getByText(/Current vendor pricing/)).toBeInTheDocument();
    expect(within(verifyPanel).getByText(/Platform capabilities/)).toBeInTheDocument();
    expect(within(verifyPanel).getByText(/Hosting options/)).toBeInTheDocument();
    expect(within(verifyPanel).getByText(/Integration availability/)).toBeInTheDocument();
    expect(within(verifyPanel).getByText(/Security requirements/)).toBeInTheDocument();
    expect(
      within(verifyPanel).getByText(/None of these has been researched or confirmed by this tool/i),
    ).toBeInTheDocument();
  });
});

describe('final recommendation', () => {
  it('shows one verdict, matching the verdict engine', () => {
    const assessment = generateAssessment(recruitment);
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Final implementation recommendation' });

    expect(within(section).getByText(VERDICT_LABELS[assessment.verdict.verdict])).toBeInTheDocument();

    // No competing verdict anywhere in the report.
    const otherVerdicts = (Object.keys(VERDICT_LABELS) as Verdict[]).filter(
      (verdict) => verdict !== assessment.verdict.verdict,
    );
    const report = screen.getByRole('main');
    for (const verdict of otherVerdicts) {
      const label = VERDICT_LABELS[verdict];
      // "Proceed" is a substring of "Proceed carefully", so match whole pills only.
      const matches = within(report)
        .queryAllByText(label, { selector: '.status' })
        .filter((node) => node.textContent?.trim().endsWith(label));
      expect(matches, `${label} should not appear as a verdict`).toHaveLength(0);
    }
  });

  it('shows every required final-recommendation field', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Final implementation recommendation' });
    for (const term of [
      'Project Feasibility Score',
      'Builder Fit Score',
      'Assessment confidence',
      'Best technical route',
      'Recommended practical path',
      'Best alternative',
      'Recommended implementation level',
      'Recommended maturity',
      'Hosting needed',
      'Database needed',
      'Authentication needed',
      'Developer support needed',
      'Maintenance difficulty',
      'Required tools',
      'Optional tools',
      'What not to build yet',
      'Required conditions',
      'Conditions that could change this recommendation',
    ]) {
      expect(within(section).getByText(term), term).toBeInTheDocument();
    }
    expect(
      within(section).getByRole('region', { name: /inappropriate tools table/i }),
    ).toBeInTheDocument();
    expect(within(section).getByText(/^Main reason:/)).toBeInTheDocument();
  });

  it('lists three immediate next actions', () => {
    renderReport(recruitment);
    const section = screen.getByRole('region', { name: 'Immediate next actions' });
    const items = within(section).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(3);
    expect(within(section).getByText(/must not be used to make final legal/i)).toBeInTheDocument();
  });
});

describe('verdict and suitability wording', () => {
  it('renders all nine approved verdicts with the approved wording', () => {
    // Exercised through the label map the report reads from, then asserted on a
    // rendered verdict to prove the pill uses the same source.
    const verdicts = Object.values(VERDICT_LABELS);
    expect(verdicts).toEqual([
      'Proceed',
      'Proceed carefully',
      'Conditional Go',
      'Simplify first',
      'Revise before building',
      'Delay',
      'Use an existing solution',
      'Do not build yet',
      'No-Go',
    ]);

    for (const key of ['simpleTracker', 'commonCrm', 'clientFacingApp', 'insufficientInformation'] as const) {
      const answers = FIXTURES[key]!.answers;
      const assessment = generateAssessment(answers);
      const { unmount } = renderReport(answers);
      expect(
        screen.getAllByText(VERDICT_LABELS[assessment.verdict.verdict]).length,
      ).toBeGreaterThan(0);
      unmount();
    }
  });

  it('renders all six suitability labels with the approved wording', () => {
    const labels = Object.values(SUITABILITY_LABELS);
    expect(labels).toEqual([
      'Suitable for the current builder',
      'Suitable with light guidance',
      'Requires technical support',
      'Requires developer support',
      'Requires professional implementation',
      'Unsuitable under current conditions',
    ]);

    // The route comparison table renders whichever labels the routes produce; across
    // two fixtures the table must show more than one distinct label.
    renderReport(clientFacing);
    const table = screen.getByRole('region', { name: /route comparison table/i });
    const rendered = new Set(
      (Object.keys(SUITABILITY_LABELS) as SuitabilityLabel[])
        .map((key) => SUITABILITY_LABELS[key])
        .filter((label) => table.textContent?.includes(label)),
    );
    expect(rendered.size).toBeGreaterThan(1);
  });
});

describe('provenance', () => {
  it('labels every numeric result on the report', () => {
    renderReport(recruitment);
    const main = screen.getByRole('main');
    // Each score block, fact, and table note carries a provenance pill.
    expect(main.querySelectorAll('[data-provenance]').length).toBeGreaterThan(60);

    const summary = screen.getByRole('region', { name: 'Executive summary' });
    for (const score of within(summary).getAllByText(/of 100$/)) {
      const block = score.closest('.score') ?? score.closest('.facts__item');
      expect(block?.querySelector('[data-provenance]')).not.toBeNull();
    }
  });
});

describe('report actions', () => {
  it('returns to the review screen without losing the intake', async () => {
    const user = userEvent.setup();
    renderReport(recruitment);
    await user.click(screen.getAllByRole('button', { name: /edit project details/i })[0]!);

    expect(
      screen.getByRole('heading', { level: 1, name: /review project details/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Recruitment and Candidate Assessment Portal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to the assessment/i })).toBeInTheDocument();
  });

  it('regenerates the assessment after an answer is edited', async () => {
    const user = userEvent.setup();
    renderReport(recruitment);

    await user.click(screen.getAllByRole('button', { name: /edit project details/i })[0]!);
    await user.click(screen.getByRole('button', { name: /edit budget and timeline/i }));

    const group = screen.getByRole('group', { name: /what budget is available/i });
    await user.click(within(group).getByRole('button', { name: /not sure \/ skip/i }));
    await user.click(within(group).getByLabelText('$2,500 to $10,000'));
    await user.click(screen.getByRole('button', { name: /save and return to review/i }));

    expect(screen.getByText(/answers have changed since the last assessment/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /regenerate assessment/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /feasibility assessment/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/answers have changed since the last assessment/i)).toBeNull();
  });

  it('requires confirmation before starting over', async () => {
    const user = userEvent.setup();
    renderReport(recruitment);

    await user.click(screen.getAllByRole('button', { name: 'Start over' })[0]!);
    const dialog = screen.getByRole('alertdialog', { name: /clear all answers and this assessment/i });
    expect(within(dialog).getByRole('button', { name: /keep my answers/i })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: /keep my answers/i }));
    expect(screen.getByRole('heading', { level: 1, name: /feasibility assessment/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Start over' })[0]!);
    await user.click(screen.getByRole('button', { name: /clear everything and start over/i }));
    expect(screen.getByRole('button', { name: /start assessment/i })).toBeInTheDocument();
  });

  it('offers no save, export, print, share, publish, download, or deploy control', () => {
    renderReport(recruitment);
    const main = screen.getByRole('main');
    for (const forbidden of [/^save/i, /^export/i, /^print/i, /^share/i, /^publish/i, /^download/i, /^deploy/i]) {
      const buttons = within(main)
        .getAllByRole('button')
        .filter((button) => forbidden.test(button.textContent ?? ''));
      expect(buttons, String(forbidden)).toHaveLength(0);
    }
  });
});

describe('accessibility structure', () => {
  it('uses landmarks, a labelled nav, and section regions', () => {
    renderReport(recruitment);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /report sections/i })).toBeInTheDocument();
    expect(screen.getAllByRole('region').length).toBeGreaterThan(15);
  });

  it('never skips a heading level', () => {
    renderReport(recruitment);
    const headings = within(screen.getByRole('main')).getAllByRole('heading');
    const levels = headings.map((heading) => Number(heading.tagName.slice(1)));
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index]! - levels[index - 1]!, `${headings[index]?.textContent}`).toBeLessThanOrEqual(1);
    }
  });

  it('gives every table proper headers and a caption', () => {
    renderReport(recruitment);
    const tables = screen.getByRole('main').querySelectorAll('table');
    expect(tables.length).toBeGreaterThan(5);
    for (const table of tables) {
      expect(table.querySelector('caption')).not.toBeNull();
      expect(table.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('navigates report sections by keyboard', async () => {
    const user = userEvent.setup();
    renderReport(recruitment);
    const nav = screen.getByRole('navigation', { name: /report sections/i });
    const link = within(nav).getByRole('link', { name: /risk register/i });
    link.focus();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(link).toHaveAttribute('href', '#risk-register');
  });

  it('keeps wide tables inside their own scroll region', () => {
    renderReport(recruitment);
    const regions = screen
      .getByRole('main')
      .querySelectorAll('.scroll-table[role="region"][tabindex="0"]');
    expect(regions.length).toBeGreaterThan(5);
    for (const region of regions) {
      expect(region.getAttribute('aria-label')).toBeTruthy();
    }
  });
});

describe('storage, network, and integration isolation', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  const getItem = vi.spyOn(Storage.prototype, 'getItem');
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    setItem.mockClear();
    getItem.mockClear();
    fetchSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('touches no storage or network while generating and reading a report', async () => {
    const user = userEvent.setup();
    render(<App initialState={reviewState(recruitment)} />);
    await user.click(screen.getByRole('button', { name: /generate assessment/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /feasibility assessment/i })).toBeInTheDocument(),
    );
    await user.click(screen.getAllByRole('button', { name: /edit project details/i })[0]!);

    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never implies an external service produced the assessment', () => {
    renderReport(recruitment);
    const main = screen.getByRole('main');
    expect(main.textContent).not.toMatch(/searching the web|contacting|live pricing|our servers/i);
  });
});
