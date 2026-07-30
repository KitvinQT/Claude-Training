import { ALL_FIELDS, INTAKE_STEPS, TOTAL_FIELDS } from '@/data/intakeSteps';
import type { AnswerMap, FieldAnswer, IntakeField, IntakeStep } from '@/types/intake';
import { EMPTY_ANSWER } from '@/types/intake';

export function answerFor(answers: AnswerMap, fieldId: string): FieldAnswer {
  return answers[fieldId] ?? EMPTY_ANSWER;
}

/** Splits a newline-separated list field into trimmed entries. */
export function listEntries(answer: FieldAnswer): string[] {
  return answer.text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function optionLabel(field: IntakeField, id: string): string {
  return field.options?.find((option) => option.id === id)?.label ?? id;
}

/** Human-readable rendering of an answer, for transcripts and the review screen. */
export function formatAnswer(field: IntakeField, answer: FieldAnswer): string {
  if (answer.status === 'unknown') return 'Not sure - recorded as unknown';
  if (answer.status === 'none') return field.noneLabel ?? 'None';
  if (answer.status === 'empty') return 'Not yet answered';

  switch (field.kind) {
    case 'text':
    case 'longtext':
      return answer.text.trim();
    case 'list':
      return listEntries(answer).join('; ');
    case 'single':
    case 'multi':
      return answer.choices.map((id) => optionLabel(field, id)).join(', ');
  }
}

/** True when the field has been addressed, either with a value, "none", or "unknown". */
export function isAddressed(answer: FieldAnswer): boolean {
  return answer.status !== 'empty';
}

/** True when the field carries actual information (an answer or an explicit "none"). */
export function isProvided(answer: FieldAnswer): boolean {
  return answer.status === 'answered' || answer.status === 'none';
}

export interface UnknownField {
  readonly stepId: string;
  readonly stepTitle: string;
  readonly reviewTitle: string;
  readonly fieldId: string;
  readonly fieldLabel: string;
  readonly important: boolean;
}

export interface AnswerSummary {
  readonly totalFields: number;
  readonly providedCount: number;
  readonly unknownCount: number;
  readonly unansweredCount: number;
  /**
   * Share of intake information supplied, 0-100. This measures how much was
   * provided - it is not a feasibility score.
   */
  readonly completenessPercent: number;
  readonly unknownFields: readonly UnknownField[];
}

export function summariseAnswers(answers: AnswerMap): AnswerSummary {
  let provided = 0;
  let unknownCount = 0;
  const unknownFields: UnknownField[] = [];

  for (const { step, field } of ALL_FIELDS) {
    const answer = answerFor(answers, field.id);
    if (isProvided(answer)) {
      provided += 1;
    } else if (answer.status === 'unknown') {
      unknownCount += 1;
      unknownFields.push({
        stepId: step.id,
        stepTitle: step.title,
        reviewTitle: step.reviewTitle,
        fieldId: field.id,
        fieldLabel: field.label,
        important: field.important === true,
      });
    }
  }

  return {
    totalFields: TOTAL_FIELDS,
    providedCount: provided,
    unknownCount,
    unansweredCount: TOTAL_FIELDS - provided - unknownCount,
    completenessPercent: Math.round((provided / TOTAL_FIELDS) * 100),
    unknownFields,
  };
}

/** Fields on a step that still need either an answer or an explicit skip. */
export function unaddressedFields(step: IntakeStep, answers: AnswerMap): IntakeField[] {
  return step.fields.filter((field) => !isAddressed(answerFor(answers, field.id)));
}

export function isStepComplete(step: IntakeStep, answers: AnswerMap): boolean {
  return unaddressedFields(step, answers).length === 0;
}

export function stepUnknownCount(step: IntakeStep, answers: AnswerMap): number {
  return step.fields.filter((field) => answerFor(answers, field.id).status === 'unknown')
    .length;
}

export function allStepsComplete(answers: AnswerMap): boolean {
  return INTAKE_STEPS.every((step) => isStepComplete(step, answers));
}
