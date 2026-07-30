import type { ProvenanceLabel } from '@/types/labels';

/** How a field is answered. */
export type FieldKind = 'text' | 'longtext' | 'list' | 'single' | 'multi';

export interface FieldOption {
  readonly id: string;
  readonly label: string;
}

export interface IntakeField {
  readonly id: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly help?: string;
  readonly placeholder?: string;
  readonly options?: readonly FieldOption[];
  /**
   * Marks a field the assessment leans on heavily. "Not sure" is still allowed,
   * but choosing it shows a notice that the assessment may be limited.
   */
  readonly important?: boolean;
  /** Offer an explicit "nothing to add" answer, which is information, not a gap. */
  readonly allowNone?: boolean;
  readonly noneLabel?: string;
}

export interface IntakeStep {
  readonly id: string;
  readonly title: string;
  /** Heading used for the matching section of the Review screen. */
  readonly reviewTitle: string;
  /** Conversational lead-in shown as the assistant's turn in the transcript. */
  readonly prompt: string;
  readonly fields: readonly IntakeField[];
}

/**
 * `empty`   - not yet addressed (only possible for steps not yet completed)
 * `answered`- a value was supplied
 * `unknown` - the user explicitly chose "Not sure / skip"
 * `none`    - the user explicitly said there is nothing to add
 */
export type AnswerStatus = 'empty' | 'answered' | 'unknown' | 'none';

/** Where the value came from. Demo answers become `user` once edited. */
export type AnswerSource = 'user' | 'demo';

export interface FieldAnswer {
  readonly status: AnswerStatus;
  /** Used by text, longtext, and list fields ("list" is newline separated). */
  readonly text: string;
  /** Used by single (one entry) and multi fields. */
  readonly choices: readonly string[];
  readonly source: AnswerSource;
}

export type AnswerMap = Readonly<Record<string, FieldAnswer>>;

export const EMPTY_ANSWER: FieldAnswer = {
  status: 'empty',
  text: '',
  choices: [],
  source: 'user',
};

/** Maps an answer to the provenance label shown beside it. */
export function provenanceOf(answer: FieldAnswer): ProvenanceLabel {
  if (answer.status === 'unknown') return 'unknown';
  if (answer.source === 'demo') return 'demonstration-data';
  return 'from-your-answer';
}

export type Screen = 'welcome' | 'intake' | 'review';

export interface IntakeState {
  readonly screen: Screen;
  /** Index into INTAKE_STEPS. */
  readonly stepIndex: number;
  readonly answers: AnswerMap;
  /** Highest step index unlocked so far. Forward jumps beyond this are blocked. */
  readonly furthestStepIndex: number;
  /** True once every step has been completed at least once. */
  readonly reviewUnlocked: boolean;
  /** Set when a step was opened via "Edit" from the Review screen. */
  readonly returnToReview: boolean;
  readonly scenarioName: string | null;
}
