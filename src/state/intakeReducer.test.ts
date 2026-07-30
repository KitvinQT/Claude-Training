import { describe, expect, it } from 'vitest';

import { RECRUITMENT_PORTAL_SCENARIO } from '@/data/demoScenarios';
import { ALL_FIELDS, INTAKE_STEPS, TOTAL_STEPS, stepIndexById } from '@/data/intakeSteps';
import {
  canNavigateToStep,
  initialIntakeState,
  intakeReducer,
  stepStatus,
  type IntakeAction,
} from '@/state/intakeReducer';
import type { IntakeState } from '@/types/intake';

function run(state: IntakeState, ...actions: IntakeAction[]): IntakeState {
  return actions.reduce(intakeReducer, state);
}

/** Answers every field on the given step so it can be submitted. */
function completeStep(state: IntakeState, stepIndex: number): IntakeState {
  const step = INTAKE_STEPS[stepIndex]!;
  return step.fields.reduce<IntakeState>((acc, field) => {
    if (field.kind === 'single' || field.kind === 'multi') {
      return intakeReducer(acc, {
        type: 'set-value',
        fieldId: field.id,
        choices: [field.options?.[0]?.id ?? 'x'],
      });
    }
    return intakeReducer(acc, { type: 'set-value', fieldId: field.id, text: 'An answer' });
  }, state);
}

describe('starting an assessment', () => {
  it('starts blank with no answers', () => {
    const state = intakeReducer(initialIntakeState, { type: 'start-blank' });
    expect(state.screen).toBe('intake');
    expect(state.stepIndex).toBe(0);
    expect(state.answers).toEqual({});
    expect(state.scenarioName).toBeNull();
    expect(state.reviewUnlocked).toBe(false);
  });

  it('loads the fictional demo scenario with every field pre-filled', () => {
    const state = intakeReducer(initialIntakeState, {
      type: 'load-demo',
      scenario: RECRUITMENT_PORTAL_SCENARIO,
    });
    expect(state.screen).toBe('intake');
    expect(state.stepIndex).toBe(0);
    expect(state.scenarioName).toBe(RECRUITMENT_PORTAL_SCENARIO.name);
    expect(Object.keys(state.answers)).toHaveLength(ALL_FIELDS.length);
    expect(state.reviewUnlocked).toBe(true);
  });
});

describe('recording answers', () => {
  const started = intakeReducer(initialIntakeState, { type: 'start-blank' });

  it('records an unknown answer without substituting a default', () => {
    const state = intakeReducer(started, { type: 'set-unknown', fieldId: 'problem' });
    expect(state.answers['problem']).toEqual({
      status: 'unknown',
      text: '',
      choices: [],
      source: 'user',
    });
  });

  it('records an explicit "none" separately from unknown', () => {
    const state = intakeReducer(started, { type: 'set-none', fieldId: 'niceToHave' });
    expect(state.answers['niceToHave']?.status).toBe('none');
  });

  it('clears an answer back to empty', () => {
    const state = run(
      started,
      { type: 'set-unknown', fieldId: 'problem' },
      { type: 'clear-answer', fieldId: 'problem' },
    );
    expect(state.answers['problem']?.status).toBe('empty');
  });

  it('treats whitespace-only text as no answer', () => {
    const state = intakeReducer(started, {
      type: 'set-value',
      fieldId: 'workingTitle',
      text: '   ',
    });
    expect(state.answers['workingTitle']?.status).toBe('empty');
  });

  it('marks an edited demo answer as the user’s own', () => {
    const demo = intakeReducer(initialIntakeState, {
      type: 'load-demo',
      scenario: RECRUITMENT_PORTAL_SCENARIO,
    });
    expect(demo.answers['workingTitle']?.source).toBe('demo');
    const edited = intakeReducer(demo, {
      type: 'set-value',
      fieldId: 'workingTitle',
      text: 'My own title',
    });
    expect(edited.answers['workingTitle']?.source).toBe('user');
    expect(edited.answers['workingTitle']?.text).toBe('My own title');
  });
});

describe('step progression', () => {
  it('refuses to advance while a field is unaddressed', () => {
    const started = intakeReducer(initialIntakeState, { type: 'start-blank' });
    const blocked = intakeReducer(started, { type: 'submit-step' });
    expect(blocked.stepIndex).toBe(0);
    expect(blocked.screen).toBe('intake');
  });

  it('advances once every field is answered or skipped', () => {
    let state = intakeReducer(initialIntakeState, { type: 'start-blank' });
    state = completeStep(state, 0);
    state = intakeReducer(state, { type: 'submit-step' });
    expect(state.stepIndex).toBe(1);
    expect(state.furthestStepIndex).toBe(1);
  });

  it('advances when every field is skipped as unknown', () => {
    let state = intakeReducer(initialIntakeState, { type: 'start-blank' });
    for (const field of INTAKE_STEPS[0]!.fields) {
      state = intakeReducer(state, { type: 'set-unknown', fieldId: field.id });
    }
    state = intakeReducer(state, { type: 'submit-step' });
    expect(state.stepIndex).toBe(1);
  });

  it('walks all nine steps and lands on the review screen', () => {
    let state = intakeReducer(initialIntakeState, { type: 'start-blank' });
    for (let index = 0; index < TOTAL_STEPS; index += 1) {
      expect(state.screen).toBe('intake');
      expect(state.stepIndex).toBe(index);
      state = completeStep(state, index);
      state = intakeReducer(state, { type: 'submit-step' });
    }
    expect(state.screen).toBe('review');
    expect(state.reviewUnlocked).toBe(true);
  });

  it('cannot reach the review screen before finishing every step', () => {
    let state = intakeReducer(initialIntakeState, { type: 'start-blank' });
    state = completeStep(state, 0);
    state = intakeReducer(state, { type: 'submit-step' });
    const attempted = intakeReducer(state, { type: 'go-to-review' });
    expect(attempted.screen).toBe('intake');
    expect(attempted.reviewUnlocked).toBe(false);
  });
});

describe('navigation rules', () => {
  let twoStepsIn = intakeReducer(initialIntakeState, { type: 'start-blank' });
  twoStepsIn = completeStep(twoStepsIn, 0);
  twoStepsIn = intakeReducer(twoStepsIn, { type: 'submit-step' });
  twoStepsIn = completeStep(twoStepsIn, 1);
  twoStepsIn = intakeReducer(twoStepsIn, { type: 'submit-step' });

  it('moves backward one step at a time', () => {
    const back = intakeReducer(twoStepsIn, { type: 'back' });
    expect(back.stepIndex).toBe(1);
  });

  it('returns to the welcome screen from the first step', () => {
    const started = intakeReducer(initialIntakeState, { type: 'start-blank' });
    expect(intakeReducer(started, { type: 'back' }).screen).toBe('welcome');
  });

  it('allows jumping back to any completed step', () => {
    expect(canNavigateToStep(twoStepsIn, 0)).toBe(true);
    expect(canNavigateToStep(twoStepsIn, 1)).toBe(true);
    const jumped = intakeReducer(twoStepsIn, { type: 'go-to-step', index: 0 });
    expect(jumped.stepIndex).toBe(0);
  });

  it('refuses to jump forward to a step not yet reached', () => {
    expect(canNavigateToStep(twoStepsIn, 3)).toBe(false);
    expect(canNavigateToStep(twoStepsIn, TOTAL_STEPS - 1)).toBe(false);
    const attempted = intakeReducer(twoStepsIn, { type: 'go-to-step', index: 5 });
    expect(attempted.stepIndex).toBe(2);
  });

  it('refuses to skip over an incomplete earlier step', () => {
    // Go back to step 1 and wipe an answer, leaving step 1 incomplete.
    let state = intakeReducer(twoStepsIn, { type: 'go-to-step', index: 0 });
    const firstField = INTAKE_STEPS[0]!.fields[0]!;
    state = intakeReducer(state, { type: 'clear-answer', fieldId: firstField.id });
    expect(canNavigateToStep(state, 2)).toBe(false);
  });

  it('reports step status for current, complete, started, and future steps', () => {
    expect(stepStatus(twoStepsIn, 0)).toBe('complete');
    expect(stepStatus(twoStepsIn, 2)).toBe('current');
    expect(stepStatus(twoStepsIn, 5)).toBe('future');
    const cleared = intakeReducer(twoStepsIn, {
      type: 'clear-answer',
      fieldId: INTAKE_STEPS[0]!.fields[0]!.id,
    });
    expect(stepStatus(cleared, 0)).toBe('started');
  });
});

describe('editing from the review screen', () => {
  function reachReview(): IntakeState {
    let state = intakeReducer(initialIntakeState, {
      type: 'load-demo',
      scenario: RECRUITMENT_PORTAL_SCENARIO,
    });
    for (let index = 0; index < TOTAL_STEPS; index += 1) {
      state = intakeReducer(state, { type: 'submit-step' });
    }
    return state;
  }

  it('opens the requested step and returns straight to the review on save', () => {
    const review = reachReview();
    expect(review.screen).toBe('review');

    const editing = intakeReducer(review, {
      type: 'edit-step',
      index: stepIndexById('budget-time'),
    });
    expect(editing.screen).toBe('intake');
    expect(editing.stepIndex).toBe(stepIndexById('budget-time'));
    expect(editing.returnToReview).toBe(true);

    const edited = intakeReducer(editing, {
      type: 'set-value',
      fieldId: 'budget',
      choices: ['500-2500'],
    });
    const saved = intakeReducer(edited, { type: 'submit-step' });
    expect(saved.screen).toBe('review');
    expect(saved.returnToReview).toBe(false);
    expect(saved.answers['budget']).toEqual({
      status: 'answered',
      text: '',
      choices: ['500-2500'],
      source: 'user',
    });
  });

  it('clears everything on start over', () => {
    const cleared = intakeReducer(reachReview(), { type: 'start-over' });
    expect(cleared).toEqual(initialIntakeState);
  });
});
