import { describe, expect, it } from 'vitest';

import { RECRUITMENT_PORTAL_SCENARIO, scenarioToAnswers } from '@/data/demoScenarios';
import { ALL_FIELDS, INTAKE_STEPS, TOTAL_FIELDS, TOTAL_STEPS } from '@/data/intakeSteps';
import type { AnswerMap, FieldAnswer } from '@/types/intake';
import { provenanceOf } from '@/types/intake';
import {
  allStepsComplete,
  formatAnswer,
  isStepComplete,
  summariseAnswers,
} from '@/utils/answers';

const answered = (text: string): FieldAnswer => ({
  status: 'answered',
  text,
  choices: [],
  source: 'user',
});
const unknown: FieldAnswer = { status: 'unknown', text: '', choices: [], source: 'user' };
const none: FieldAnswer = { status: 'none', text: '', choices: [], source: 'user' };

function answerEverything(overrides: Record<string, FieldAnswer> = {}): AnswerMap {
  const answers: Record<string, FieldAnswer> = {};
  for (const { field } of ALL_FIELDS) {
    answers[field.id] =
      field.kind === 'single' || field.kind === 'multi'
        ? { status: 'answered', text: '', choices: [field.options?.[0]?.id ?? 'x'], source: 'user' }
        : answered('An answer');
  }
  return { ...answers, ...overrides };
}

describe('intake schema', () => {
  it('has nine steps grouping every field', () => {
    expect(TOTAL_STEPS).toBe(9);
    expect(INTAKE_STEPS.reduce((n, step) => n + step.fields.length, 0)).toBe(TOTAL_FIELDS);
  });

  it('uses unique field ids across all steps', () => {
    const ids = ALL_FIELDS.map(({ field }) => field.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never offers a "not sure" choice inside an option list', () => {
    for (const { field } of ALL_FIELDS) {
      for (const option of field.options ?? []) {
        expect(option.label.toLowerCase()).not.toContain('not sure');
      }
    }
  });

  it('gives choice-based fields at least two options', () => {
    for (const { field } of ALL_FIELDS) {
      if (field.kind === 'single' || field.kind === 'multi') {
        expect((field.options ?? []).length).toBeGreaterThan(1);
      }
    }
  });
});

describe('completeness and unknown counting', () => {
  it('reports zero completeness with no answers', () => {
    const summary = summariseAnswers({});
    expect(summary.completenessPercent).toBe(0);
    expect(summary.providedCount).toBe(0);
    expect(summary.unknownCount).toBe(0);
    expect(summary.unansweredCount).toBe(TOTAL_FIELDS);
  });

  it('reports full completeness when everything is answered', () => {
    const summary = summariseAnswers(answerEverything());
    expect(summary.completenessPercent).toBe(100);
    expect(summary.providedCount).toBe(TOTAL_FIELDS);
    expect(summary.unknownCount).toBe(0);
  });

  it('counts an explicit "none" as information provided, not as a gap', () => {
    const summary = summariseAnswers(answerEverything({ toolsToAvoid: none }));
    expect(summary.completenessPercent).toBe(100);
    expect(summary.unknownCount).toBe(0);
  });

  it('counts unknown answers separately and lists them', () => {
    const summary = summariseAnswers(answerEverything({ budget: unknown, problem: unknown }));
    expect(summary.unknownCount).toBe(2);
    expect(summary.providedCount).toBe(TOTAL_FIELDS - 2);
    expect(summary.completenessPercent).toBe(
      Math.round(((TOTAL_FIELDS - 2) / TOTAL_FIELDS) * 100),
    );
    expect(summary.unknownFields.map((f) => f.fieldId)).toEqual(['problem', 'budget']);
  });

  it('flags unknown answers on important fields', () => {
    const summary = summariseAnswers(answerEverything({ problem: unknown, budget: unknown }));
    const problem = summary.unknownFields.find((f) => f.fieldId === 'problem');
    const budget = summary.unknownFields.find((f) => f.fieldId === 'budget');
    expect(problem?.important).toBe(true);
    expect(budget?.important).toBe(false);
  });

  it('treats a step as complete only when every field is addressed', () => {
    const step = INTAKE_STEPS[0]!;
    expect(isStepComplete(step, {})).toBe(false);
    expect(isStepComplete(step, answerEverything())).toBe(true);
    expect(allStepsComplete({})).toBe(false);
    expect(allStepsComplete(answerEverything())).toBe(true);
  });
});

describe('answer formatting and provenance', () => {
  const titleField = INTAKE_STEPS[0]!.fields[0]!;
  const usersField = INTAKE_STEPS[1]!.fields[0]!;

  it('renders unknown answers as unknown, with no substituted value', () => {
    expect(formatAnswer(titleField, unknown)).toBe('Not sure - recorded as unknown');
    expect(provenanceOf(unknown)).toBe('unknown');
  });

  it('renders option labels rather than raw ids', () => {
    const answer: FieldAnswer = {
      status: 'answered',
      text: '',
      choices: ['recruiters', 'hiring-managers'],
      source: 'user',
    };
    expect(formatAnswer(usersField, answer)).toBe('Recruiters, Hiring managers');
  });

  it('labels demo answers as demonstration data and user answers as their own', () => {
    expect(provenanceOf({ ...answered('x'), source: 'demo' })).toBe('demonstration-data');
    expect(provenanceOf(answered('x'))).toBe('from-your-answer');
  });
});

describe('demonstration scenario', () => {
  const answers = scenarioToAnswers(RECRUITMENT_PORTAL_SCENARIO);

  it('covers every field in the schema', () => {
    for (const { field } of ALL_FIELDS) {
      expect(answers[field.id], `missing demo answer for ${field.id}`).toBeDefined();
    }
    expect(Object.keys(RECRUITMENT_PORTAL_SCENARIO.answers)).toHaveLength(TOTAL_FIELDS);
  });

  it('only references option ids that exist', () => {
    for (const { field } of ALL_FIELDS) {
      const answer = answers[field.id]!;
      const validIds = (field.options ?? []).map((option) => option.id);
      for (const choice of answer.choices) {
        expect(validIds, `${field.id} -> ${choice}`).toContain(choice);
      }
    }
  });

  it('marks every scenario value as demonstration data', () => {
    for (const answer of Object.values(answers)) {
      expect(answer.source).toBe('demo');
    }
  });

  it('completes every step so the review screen is reachable', () => {
    expect(allStepsComplete(answers)).toBe(true);
  });

  it('leaves two answers unknown so the unknown handling is demonstrable', () => {
    const summary = summariseAnswers(answers);
    expect(summary.unknownCount).toBe(2);
    expect(summary.unknownFields.map((f) => f.fieldId).sort()).toEqual([
      'budget',
      'dataUpdater',
    ]);
    expect(summary.completenessPercent).toBeLessThan(100);
  });
});
