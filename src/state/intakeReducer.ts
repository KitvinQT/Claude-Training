import { getStep, INTAKE_STEPS, TOTAL_STEPS } from '@/data/intakeSteps';
import { scenarioToAnswers, type DemoScenario } from '@/data/demoScenarios';
import type { AnswerMap, FieldAnswer, IntakeState } from '@/types/intake';
import { EMPTY_ANSWER } from '@/types/intake';
import { allStepsComplete, answerFor, isStepComplete } from '@/utils/answers';

export const initialIntakeState: IntakeState = {
  screen: 'welcome',
  stepIndex: 0,
  answers: {},
  furthestStepIndex: 0,
  reviewUnlocked: false,
  returnToReview: false,
  scenarioName: null,
};

export type IntakeAction =
  | { type: 'start-blank' }
  | { type: 'load-demo'; scenario: DemoScenario }
  | { type: 'set-value'; fieldId: string; text?: string; choices?: readonly string[] }
  | { type: 'set-unknown'; fieldId: string }
  | { type: 'set-none'; fieldId: string }
  | { type: 'clear-answer'; fieldId: string }
  | { type: 'submit-step' }
  | { type: 'back' }
  | { type: 'go-to-step'; index: number }
  | { type: 'edit-step'; index: number }
  | { type: 'go-to-review' }
  | { type: 'start-over' };

/**
 * All intake state lives here, in memory only. Nothing is written to
 * localStorage, sessionStorage, IndexedDB, cookies, or any network destination -
 * reloading the page intentionally clears everything.
 */
export function intakeReducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case 'start-blank':
      return {
        ...initialIntakeState,
        screen: 'intake',
      };

    case 'load-demo': {
      const answers = scenarioToAnswers(action.scenario);
      return {
        screen: 'intake',
        stepIndex: 0,
        answers,
        // A loaded scenario has addressed every step, so all steps are unlocked
        // and the review screen is reachable, but the user still walks the flow.
        furthestStepIndex: TOTAL_STEPS - 1,
        reviewUnlocked: allStepsComplete(answers),
        returnToReview: false,
        scenarioName: action.scenario.name,
      };
    }

    case 'set-value': {
      const previous = answerFor(state.answers, action.fieldId);
      const text = action.text ?? (action.choices ? '' : previous.text);
      const choices = action.choices ?? (action.text === undefined ? previous.choices : []);
      const hasValue = text.trim().length > 0 || choices.length > 0;
      return withAnswer(state, action.fieldId, {
        status: hasValue ? 'answered' : 'empty',
        text,
        choices,
        source: 'user',
      });
    }

    case 'set-unknown':
      return withAnswer(state, action.fieldId, {
        ...EMPTY_ANSWER,
        status: 'unknown',
        source: 'user',
      });

    case 'set-none':
      return withAnswer(state, action.fieldId, {
        ...EMPTY_ANSWER,
        status: 'none',
        source: 'user',
      });

    case 'clear-answer':
      return withAnswer(state, action.fieldId, { ...EMPTY_ANSWER, source: 'user' });

    case 'submit-step': {
      const step = getStep(state.stepIndex);
      // Guard: the step must be addressed before moving on. The UI blocks this
      // too, but the reducer refuses so the rule cannot be bypassed.
      if (!isStepComplete(step, state.answers)) {
        return state;
      }

      const reviewUnlocked = state.reviewUnlocked || allStepsComplete(state.answers);

      if (state.returnToReview) {
        return { ...state, screen: 'review', returnToReview: false, reviewUnlocked };
      }

      const isLastStep = state.stepIndex === TOTAL_STEPS - 1;
      if (isLastStep) {
        return { ...state, screen: 'review', reviewUnlocked };
      }

      const nextIndex = state.stepIndex + 1;
      return {
        ...state,
        stepIndex: nextIndex,
        furthestStepIndex: Math.max(state.furthestStepIndex, nextIndex),
        reviewUnlocked,
      };
    }

    case 'back': {
      if (state.screen === 'review') {
        return { ...state, screen: 'intake', stepIndex: TOTAL_STEPS - 1 };
      }
      if (state.stepIndex === 0) {
        return { ...state, screen: 'welcome' };
      }
      return { ...state, stepIndex: state.stepIndex - 1, returnToReview: false };
    }

    case 'go-to-step': {
      // Backward and lateral navigation only. Jumping ahead to a step that has
      // not been reached is refused.
      if (!canNavigateToStep(state, action.index)) {
        return state;
      }
      return {
        ...state,
        screen: 'intake',
        stepIndex: action.index,
        returnToReview: false,
      };
    }

    case 'edit-step': {
      if (action.index < 0 || action.index >= TOTAL_STEPS) {
        return state;
      }
      return {
        ...state,
        screen: 'intake',
        stepIndex: action.index,
        returnToReview: true,
      };
    }

    case 'go-to-review': {
      if (!allStepsComplete(state.answers)) {
        return state;
      }
      return { ...state, screen: 'review', reviewUnlocked: true, returnToReview: false };
    }

    case 'start-over':
      return initialIntakeState;
  }
}

function withAnswer(
  state: IntakeState,
  fieldId: string,
  answer: FieldAnswer,
): IntakeState {
  const answers: AnswerMap = { ...state.answers, [fieldId]: answer };
  return { ...state, answers };
}

/** Completed or current steps are reachable; future steps are not. */
export function canNavigateToStep(state: IntakeState, index: number): boolean {
  if (index < 0 || index >= TOTAL_STEPS) return false;
  if (index <= state.stepIndex) return true;
  if (index > state.furthestStepIndex) return false;
  // Every step between here and the target must already be addressed.
  return INTAKE_STEPS.slice(state.stepIndex, index).every((step) =>
    isStepComplete(step, state.answers),
  );
}

/**
 * `current`   - the step being answered now
 * `complete`  - every field addressed (answered, "none", or "unknown")
 * `started`   - reached earlier but left with fields outstanding
 * `future`    - not yet reached, and not reachable
 */
export type StepStatus = 'current' | 'complete' | 'started' | 'future';

export function stepStatus(state: IntakeState, index: number): StepStatus {
  if (index === state.stepIndex && state.screen === 'intake') return 'current';
  if (isStepComplete(getStep(index), state.answers)) return 'complete';
  return index <= state.furthestStepIndex ? 'started' : 'future';
}
