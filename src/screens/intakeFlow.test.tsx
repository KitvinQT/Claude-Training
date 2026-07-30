import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/App';
import { RECRUITMENT_PORTAL_SCENARIO } from '@/data/demoScenarios';
import { INTAKE_STEPS, TOTAL_FIELDS, TOTAL_STEPS } from '@/data/intakeSteps';

/** Returns the fieldset or field wrapper that owns a question, by its label. */
function fieldGroup(labelText: string | RegExp): HTMLElement {
  const group = screen.queryByRole('group', { name: labelText });
  if (group) return group;
  const control = screen.getByLabelText(labelText);
  const wrapper = control.closest('.field');
  if (!wrapper) throw new Error(`No field wrapper found for ${String(labelText)}`);
  return wrapper as HTMLElement;
}

function announcer(): HTMLElement {
  return screen.getByTestId('announcer');
}

async function loadDemo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /load fictional demo scenario/i }));
}

/** Walks the pre-filled demo scenario through to the review screen. */
async function walkDemoToReview(user: ReturnType<typeof userEvent.setup>) {
  await loadDemo(user);
  for (let index = 0; index < TOTAL_STEPS - 1; index += 1) {
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  }
  await user.click(screen.getByRole('button', { name: /review project details/i }));
}

describe('welcome screen', () => {
  it('offers both starting actions and describes the demo scenario', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /assess a project before you build it/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start assessment/i })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /load fictional demo scenario/i }),
    ).toBeEnabled();
    expect(screen.getByText(RECRUITMENT_PORTAL_SCENARIO.name)).toBeInTheDocument();
    expect(screen.getAllByText('Demonstration data').length).toBeGreaterThan(0);
  });

  it('starts a blank assessment with nothing pre-filled', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    expect(screen.getByRole('heading', { level: 1, name: /project intake/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/project name or working title/i)).toHaveValue('');
    expect(screen.getByText('Step 1 of 9')).toBeInTheDocument();
  });

  it('loads the fictional demo scenario, labelled as demonstration data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);

    expect(screen.getByLabelText(/project name or working title/i)).toHaveValue(
      'Recruitment and Candidate Assessment Portal',
    );
    const group = fieldGroup(/what is the project\?/i);
    expect(within(group).getByText('Demonstration data')).toBeInTheDocument();
  });

  it('shows the refresh-clears-data notice once intake begins', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText(/refreshing or closing the page clears them/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: /start assessment/i }));
    expect(screen.getByText(/refreshing or closing the page clears them/i)).toBeInTheDocument();
  });
});

describe('stepping through the intake', () => {
  it('walks all nine steps and reaches the review screen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);

    for (let index = 0; index < TOTAL_STEPS; index += 1) {
      const step = INTAKE_STEPS[index]!;
      expect(screen.getByText(`Step ${index + 1} of ${TOTAL_STEPS}`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: step.title })).toBeInTheDocument();
      const nextLabel = index === TOTAL_STEPS - 1 ? /review project details/i : 'Continue';
      await user.click(screen.getByRole('button', { name: nextLabel }));
    }

    expect(
      screen.getByRole('heading', { level: 1, name: /review project details/i }),
    ).toBeInTheDocument();
  });

  it('blocks progress until every question is answered or skipped', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/4 questions still needs? an answer or a skip/i);
    expect(screen.getByRole('heading', { level: 3, name: /project idea and problem/i })).toBeInTheDocument();
    expect(alert).toHaveTextContent(/never have to invent an answer/i);
  });

  it('advances when every question is skipped as unknown', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    for (const field of INTAKE_STEPS[0]!.fields) {
      const group = fieldGroup(new RegExp(field.label.replace(/[?()]/g, '.'), 'i'));
      await user.click(within(group).getByRole('button', { name: /not sure \/ skip/i }));
    }
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 3, name: /users and sharing/i })).toBeInTheDocument();
  });

  it('records a skip as Unknown without substituting a default', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    const group = fieldGroup(/what problem should it solve/i);
    await user.click(within(group).getByRole('button', { name: /not sure \/ skip/i }));

    expect(within(group).getByText('Unknown')).toBeInTheDocument();
    expect(within(group).getByText(/recorded as unknown\. nothing has been assumed/i)).toBeInTheDocument();
    expect(within(group).getByLabelText(/what problem should it solve/i)).toBeDisabled();
    expect(within(group).getByRole('button', { name: /not sure \/ skip/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('warns gently when an important question is left unknown', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    const important = fieldGroup(/what problem should it solve/i);
    await user.click(within(important).getByRole('button', { name: /not sure \/ skip/i }));
    expect(
      within(important).getByRole('note', { name: '' }) ??
        within(important).getByText(/assessment will simply be more limited/i),
    ).toBeInTheDocument();

    const ordinary = fieldGroup(/project name or working title/i);
    await user.click(within(ordinary).getByRole('button', { name: /not sure \/ skip/i }));
    expect(within(ordinary).queryByText(/more limited/i)).toBeNull();
  });

  it('records an explicit "none" as an answer rather than a gap', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const group = fieldGroup(/nice-to-have features/i);
    await user.click(within(group).getByRole('button', { name: /none to add/i }));
    expect(within(group).getByText(/counts as an answer, not a gap/i)).toBeInTheDocument();
    expect(within(group).getByText('From your answer')).toBeInTheDocument();
  });
});

describe('navigation', () => {
  it('moves backward and preserves the earlier answer', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 3, name: /users and sharing/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText(/project name or working title/i)).toHaveValue(
      'Recruitment and Candidate Assessment Portal',
    );
  });

  it('returns to the welcome screen from the first step', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));
    await user.click(screen.getByRole('button', { name: /back to welcome/i }));
    expect(screen.getByRole('button', { name: /start assessment/i })).toBeInTheDocument();
  });

  it('jumps back to a completed step from the progress indicator', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 3, name: /features and scope/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /step 1.*project idea and problem/i }));
    expect(screen.getByRole('heading', { level: 3, name: /project idea and problem/i })).toBeInTheDocument();
  });

  it('prevents jumping ahead to steps not yet reached', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    const future = screen.getByRole('button', { name: /step 5.*budget and timeline/i });
    expect(future).toBeDisabled();
    expect(future).toHaveAccessibleName(/not yet available/i);

    await user.click(future);
    expect(screen.getByRole('heading', { level: 3, name: /project idea and problem/i })).toBeInTheDocument();
  });
});

describe('progress indicator', () => {
  it('exposes progress accessibly and marks the current step', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    const nav = screen.getByRole('navigation', { name: /intake progress/i });
    const bar = within(nav).getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', String(TOTAL_STEPS));
    expect(bar).toHaveAccessibleName(/steps completed/i);

    const current = within(nav).getByRole('button', { name: /step 1.*current step/i });
    expect(current).toHaveAttribute('aria-current', 'step');
  });

  it('flags steps that contain unknown answers', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);

    const nav = screen.getByRole('navigation', { name: /intake progress/i });
    expect(
      within(nav).getByRole('button', { name: /step 5.*1 unknown answer/i }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole('button', { name: /step 9.*1 unknown answer/i }),
    ).toBeInTheDocument();
  });
});

describe('screen-reader announcements', () => {
  it('announces each new step', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);
    expect(announcer()).toHaveTextContent('Step 1 of 9: Project idea and problem');

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(announcer()).toHaveTextContent('Step 2 of 9: Users and sharing');
  });

  it('announces when an answer changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    const group = fieldGroup(/what problem should it solve/i);
    await user.click(within(group).getByRole('button', { name: /not sure \/ skip/i }));
    expect(announcer()).toHaveTextContent(/what problem should it solve\?? recorded as unknown/i);
  });

  it('moves focus to the new step heading', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 3, name: /users and sharing/i })).toHaveFocus();
  });
});

describe('keyboard operation', () => {
  it('reaches and activates the starting action with the keyboard alone', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.tab();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /start assessment/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 1, name: /project intake/i })).toBeInTheDocument();
  });

  it('operates the progress indicator with the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadDemo(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    screen.getByRole('button', { name: /step 1.*project idea and problem/i }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 3, name: /project idea and problem/i })).toBeInTheDocument();
  });

  it('skips a question using the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /start assessment/i }));

    const group = fieldGroup(/why does this problem matter/i);
    const skip = within(group).getByRole('button', { name: /not sure \/ skip/i });
    skip.focus();
    await user.keyboard(' ');
    expect(skip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('review screen', () => {
  it('groups every answer with its provenance and counts unknowns', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);

    for (const step of INTAKE_STEPS) {
      expect(
        screen.getByRole('heading', { level: 2, name: step.reviewTitle }),
      ).toBeInTheDocument();
    }

    const completeness = screen.getByRole('region', { name: /intake completeness/i });
    expect(within(completeness).getByText('95%')).toBeInTheDocument();
    expect(within(completeness).getByText(`${TOTAL_FIELDS - 2}`)).toBeInTheDocument();
    expect(within(completeness).getByText('2')).toBeInTheDocument();
    expect(
      within(completeness).getByRole('heading', { name: /unknown information \(2\)/i }),
    ).toBeInTheDocument();
    expect(within(completeness).getByText(/what budget is available/i)).toBeInTheDocument();
  });

  it('states that completeness is not a feasibility score', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);
    expect(
      screen.getByText(/measures how much intake information you have provided/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/not/i, { selector: 'strong' })).toBeInTheDocument();
  });

  it('keeps Generate assessment disabled with a Phase 2 explanation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);

    const generate = screen.getByRole('button', { name: /generate assessment/i });
    expect(generate).toBeDisabled();
    expect(screen.getByText('Assessment engine added in Phase 2.')).toBeInTheDocument();
    expect(generate).toHaveAccessibleDescription(/assessment engine is not built yet/i);
  });

  it('edits a section and returns to the review with the new value', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);

    await user.click(screen.getByRole('button', { name: /edit budget and timeline/i }));
    expect(screen.getByText(/editing from the review screen/i)).toBeInTheDocument();

    const group = fieldGroup(/what budget is available/i);
    await user.click(within(group).getByRole('button', { name: /not sure \/ skip/i }));
    await user.click(within(group).getByLabelText('$500 to $2,500'));
    await user.click(screen.getByRole('button', { name: /save and return to review/i }));

    expect(
      screen.getByRole('heading', { level: 1, name: /review project details/i }),
    ).toBeInTheDocument();
    const completeness = screen.getByRole('region', { name: /intake completeness/i });
    expect(within(completeness).getByRole('heading', { name: /unknown information \(1\)/i })).toBeInTheDocument();
    expect(within(completeness).getByText('98%')).toBeInTheDocument();
  });

  it('answers an unknown directly from the unknown list', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);

    const completeness = screen.getByRole('region', { name: /intake completeness/i });
    const rows = within(completeness).getAllByRole('button', { name: /answer this/i });
    await user.click(rows[0]!);
    expect(screen.getByRole('heading', { level: 3, name: /budget and timeline/i })).toBeInTheDocument();
  });

  it('requires confirmation before starting over', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    const dialog = screen.getByRole('alertdialog', { name: /clear all answers\?/i });
    expect(within(dialog).getByRole('button', { name: /keep my answers/i })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: /keep my answers/i }));
    expect(screen.getByRole('heading', { level: 1, name: /review project details/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    await user.click(screen.getByRole('button', { name: /clear everything and start over/i }));
    expect(screen.getByRole('button', { name: /start assessment/i })).toBeInTheDocument();
  });

  it('shows the refresh-clears-data notice', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);
    expect(screen.getByText(/refreshing or closing the page clears them/i)).toBeInTheDocument();
  });
});

describe('storage and network isolation', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  const getItem = vi.spyOn(Storage.prototype, 'getItem');
  const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    setItem.mockClear();
    getItem.mockClear();
    removeItem.mockClear();
    fetchSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never touches browser storage or the network during a full run', async () => {
    const user = userEvent.setup();
    render(<App />);
    await walkDemoToReview(user);
    await user.click(screen.getByRole('button', { name: /edit project overview/i }));
    await user.click(screen.getByRole('button', { name: /save and return to review/i }));

    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('contains no storage or network calls in the source of the intake flow', async () => {
    const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
    });
    // Member access, so prose that merely names these APIs does not trip the check.
    const forbidden = [
      /\blocalStorage\s*[.[]/,
      /\bsessionStorage\s*[.[]/,
      /\bindexedDB\s*[.[]/,
      /document\s*\.\s*cookie/,
      /new\s+XMLHttpRequest/,
      /\bfetch\s*\(/,
    ];
    for (const [path, load] of Object.entries(sources)) {
      if (path.includes('.test.')) continue;
      const source = await load();
      for (const pattern of forbidden) {
        expect(pattern.test(source), `${path} must not use ${String(pattern)}`).toBe(false);
      }
    }
  });
});
