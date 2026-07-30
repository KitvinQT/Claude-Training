import axe from 'axe-core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from '@/App';
import { FIXTURES } from '@/engine/__fixtures__/scenarios';
import { generateAssessment } from '@/engine/generateAssessment';
import { initialIntakeState } from '@/state/intakeReducer';
import {
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  DURATION_BAND_LABELS,
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_ORDER,
  ROUTE_IDS,
} from '@/engine/types';
import { ROUTE_PROFILES } from '@/data/routeProfiles';
import type { AnswerMap, IntakeState } from '@/types/intake';

/* ------------------------------------------------------------------ *
 * Final pass: the four figures, their table alternatives, and automated
 * accessibility checks on every screen.
 * ------------------------------------------------------------------ */

const recruitment = FIXTURES['recruitmentPortal']!.answers;

function stateFor(screenName: IntakeState['screen'], answers: AnswerMap): IntakeState {
  const base: IntakeState = {
    ...initialIntakeState,
    answers,
    furthestStepIndex: 8,
    reviewUnlocked: true,
    screen: screenName,
  };
  return screenName === 'report'
    ? { ...base, assessment: generateAssessment(answers) }
    : base;
}

function renderReport() {
  return render(<App initialState={stateFor('report', recruitment)} />);
}

/** Figures are one image each; the numbers live in the table alternative. */
function figureFor(title: string | RegExp): HTMLElement {
  const caption = screen.getByText(title, { selector: '.chart__title' });
  const figure = caption.closest('figure');
  if (!figure) throw new Error(`No figure found for ${String(title)}`);
  return figure as HTMLElement;
}

describe('the four figures', () => {
  it('renders exactly the four approved figures, no decorative extras', () => {
    renderReport();
    const figures = screen.getByRole('main').querySelectorAll('figure.chart');
    expect(figures).toHaveLength(4);
  });

  it('gives every figure an image role, a text description, a caption, and provenance', () => {
    renderReport();
    for (const title of [
      'Project feasibility by dimension',
      'Route fit compared with Builder Fit',
      'Risk severity by category (1 to 5)',
      'Phased roadmap: estimated duration per phase',
    ]) {
      const figure = figureFor(title);
      const plot = within(figure).getByRole('img');
      expect(plot.getAttribute('aria-label')!.length, title).toBeGreaterThan(60);
      expect(figure.querySelector('figcaption'), title).not.toBeNull();
      expect(figure.querySelector('[data-provenance]'), title).not.toBeNull();
    }
  });

  it('gives every figure a table alternative holding the same values', async () => {
    const user = userEvent.setup();
    renderReport();
    const assessment = generateAssessment(recruitment);

    // 1. Dimensions
    const dimensionFigure = figureFor('Project feasibility by dimension');
    await user.click(within(dimensionFigure).getByText(/view as table: dimension scores/i));
    const dimensionTable = within(dimensionFigure).getByRole('region', {
      name: /project feasibility dimension values/i,
    });
    for (const id of DIMENSION_ORDER) {
      expect(
        within(dimensionTable).getByRole('rowheader', { name: DIMENSION_LABELS[id] }),
      ).toBeInTheDocument();
    }

    // 2. Route fit versus builder fit
    const fitFigure = figureFor('Route fit compared with Builder Fit');
    await user.click(within(fitFigure).getByText(/view as table: route fit and builder fit/i));
    const fitTable = within(fitFigure).getByRole('region', {
      name: /route fit and builder fit values/i,
    });
    for (const routeId of ROUTE_IDS) {
      expect(
        within(fitTable).getByRole('rowheader', { name: ROUTE_PROFILES[routeId].name }),
        routeId,
      ).toBeInTheDocument();
    }

    // 3. Risk severity
    const riskFigure = figureFor('Risk severity by category (1 to 5)');
    await user.click(within(riskFigure).getByText(/view as table: risk severity/i));
    const riskTable = within(riskFigure).getByRole('region', { name: /risk severity values/i });
    for (const category of RISK_CATEGORY_ORDER) {
      expect(
        within(riskTable).getByRole('rowheader', { name: RISK_CATEGORY_LABELS[category] }),
        category,
      ).toBeInTheDocument();
    }

    // 4. Roadmap
    const roadmapFigure = figureFor('Phased roadmap: estimated duration per phase');
    await user.click(within(roadmapFigure).getByText(/view as table: roadmap phases/i));
    const roadmapTable = within(roadmapFigure).getByRole('region', {
      name: /roadmap phase values/i,
    });
    for (const phase of assessment.roadmap) {
      const row = within(roadmapTable).getByRole('rowheader', { name: phase.label });
      expect(row.closest('tr')!.textContent).toContain(phase.estimatedTime);
    }
  });

  it('plots only values the engine calculated', () => {
    const assessment = generateAssessment(recruitment);
    renderReport();

    const dimensionPlot = within(figureFor('Project feasibility by dimension')).getByRole('img');
    for (const dimension of assessment.projectFeasibility.dimensions) {
      expect(dimensionPlot.getAttribute('aria-label')).toContain(
        `${dimension.label} ${dimension.score}`,
      );
    }

    const riskPlot = within(figureFor('Risk severity by category (1 to 5)')).getByRole('img');
    for (const risk of assessment.risks) {
      expect(riskPlot.getAttribute('aria-label')).toContain(
        `${risk.label} ${risk.score} of 5`,
      );
    }

    const roadmapPlot = within(
      figureFor('Phased roadmap: estimated duration per phase'),
    ).getByRole('img');
    for (const phase of assessment.roadmap) {
      expect(Object.values(DURATION_BAND_LABELS)).toContain(phase.estimatedTime);
      expect(roadmapPlot.getAttribute('aria-label')).toContain(phase.estimatedTime);
    }
  });

  it('states that the risk figure is a single severity scale, not a two-axis grid', () => {
    renderReport();
    const figure = figureFor('Risk severity by category (1 to 5)');
    expect(figure.textContent).toMatch(/not a likelihood-against-impact grid/i);
  });

  it('marks excluded routes in the fit figure without hiding them', () => {
    const assessment = generateAssessment(recruitment);
    renderReport();
    const figure = figureFor('Route fit compared with Builder Fit');
    const excluded = assessment.routes.filter((route) => route.excluded !== null);
    expect(excluded.length).toBeGreaterThan(0);
    expect(within(figure).getAllByText('Excluded')).toHaveLength(excluded.length);
  });
});

describe('automated accessibility checks', () => {
  /** Runs axe against the rendered container and returns serious+ violations. */
  async function seriousViolations(container: HTMLElement) {
    const results = await axe.run(container, {
      resultTypes: ['violations'],
      rules: {
        // jsdom has no layout engine, so contrast is verified in a real browser
        // instead. See docs/ACCESSIBILITY.md for the browser-run results.
        'color-contrast': { enabled: false },
      },
    });
    return results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
  }

  it('finds no serious or critical violations on the welcome screen', async () => {
    const { container } = render(<App />);
    expect(await seriousViolations(container)).toEqual([]);
  }, 30000);

  it('finds no serious or critical violations on the intake screen', async () => {
    const { container } = render(<App initialState={stateFor('intake', recruitment)} />);
    expect(await seriousViolations(container)).toEqual([]);
  }, 30000);

  it('finds no serious or critical violations on the review screen', async () => {
    const { container } = render(<App initialState={stateFor('review', recruitment)} />);
    expect(await seriousViolations(container)).toEqual([]);
  }, 30000);

  it('finds no serious or critical violations on the report screen', async () => {
    const { container } = render(<App initialState={stateFor('report', recruitment)} />);
    expect(await seriousViolations(container)).toEqual([]);
  }, 60000);
});

describe('keyboard operation of the figures', () => {
  /*
   * jsdom does not implement the browser's built-in Enter-toggles-summary
   * behaviour, so this asserts the summary is focusable and toggles on
   * activation. The real Enter keypress is verified in a browser during the
   * final verification run; see docs/ACCESSIBILITY.md.
   */
  it('exposes a focusable disclosure that toggles on activation', async () => {
    const user = userEvent.setup();
    renderReport();
    const summary = within(figureFor('Risk severity by category (1 to 5)')).getByText(
      /view as table: risk severity/i,
    );

    summary.focus();
    expect(summary).toHaveFocus();
    expect(summary.tagName).toBe('SUMMARY');

    await user.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
  });
});
