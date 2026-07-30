import { DataLabel } from '@/components/DataLabel';
import type { FieldAnswer, IntakeField } from '@/types/intake';
import { provenanceOf } from '@/types/intake';

interface FieldControlProps {
  field: IntakeField;
  answer: FieldAnswer;
  invalid: boolean;
  onText: (text: string) => void;
  onChoices: (choices: readonly string[]) => void;
  onUnknown: () => void;
  onNone: () => void;
  onClear: () => void;
}

/**
 * One intake field, with its "Not sure / skip" control and - where applicable -
 * an explicit "none" control. Skipping records Unknown; it never substitutes a
 * default answer.
 */
export function FieldControl({
  field,
  answer,
  invalid,
  onText,
  onChoices,
  onUnknown,
  onNone,
  onClear,
}: FieldControlProps) {
  const baseId = `field-${field.id}`;
  const helpId = field.help ? `${baseId}-help` : undefined;
  const statusId = `${baseId}-status`;
  const errorId = `${baseId}-error`;
  const isUnknown = answer.status === 'unknown';
  const isNone = answer.status === 'none';
  const disabled = isUnknown || isNone;

  const describedBy =
    [helpId, disabled ? statusId : null, invalid ? errorId : null]
      .filter((id): id is string => Boolean(id))
      .join(' ') || undefined;

  const controls = (
    <div className="field__controls">
      <button
        aria-pressed={isUnknown}
        className="toggle-button"
        onClick={() => (isUnknown ? onClear() : onUnknown())}
        type="button"
      >
        Not sure / skip
      </button>
      {field.allowNone === true && (
        <button
          aria-pressed={isNone}
          className="toggle-button"
          onClick={() => (isNone ? onClear() : onNone())}
          type="button"
        >
          {field.noneLabel ?? 'None'}
        </button>
      )}
      <span className="field__provenance">
        <DataLabel label={provenanceOf(answer)} />
      </span>
    </div>
  );

  const statusNote = disabled ? (
    <p className="field__status" id={statusId}>
      {isUnknown
        ? 'Recorded as Unknown. Nothing has been assumed in its place.'
        : `Recorded as "${field.noneLabel ?? 'None'}". This counts as an answer, not a gap.`}
    </p>
  ) : null;

  const importantNote =
    isUnknown && field.important === true ? (
      <p className="field__notice" role="note">
        This is one of the answers the assessment leans on most. Leaving it unknown
        is fine - the assessment will simply be more limited, and it will say so.
      </p>
    ) : null;

  const errorNote = invalid ? (
    <p className="field__error" id={errorId}>
      Choose an answer, or select &ldquo;Not sure / skip&rdquo;.
    </p>
  ) : null;

  if (field.kind === 'single' || field.kind === 'multi') {
    const isMulti = field.kind === 'multi';
    return (
      <fieldset
        aria-describedby={describedBy}
        className={`field${invalid ? ' field--invalid' : ''}`}
      >
        <legend className="field__legend">
          {field.label}
          {isMulti && <span className="field__hint"> (choose any that apply)</span>}
        </legend>
        {field.help && (
          <p className="field__help" id={helpId}>
            {field.help}
          </p>
        )}
        {errorNote}
        <div className="option-grid">
          {(field.options ?? []).map((option) => {
            const optionId = `${baseId}-${option.id}`;
            const checked = answer.choices.includes(option.id);
            return (
              <div className="option" key={option.id}>
                <input
                  checked={checked && !disabled}
                  disabled={disabled}
                  id={optionId}
                  name={isMulti ? optionId : baseId}
                  onChange={(event) => {
                    if (isMulti) {
                      const next = event.target.checked
                        ? [...answer.choices, option.id]
                        : answer.choices.filter((id) => id !== option.id);
                      onChoices(next);
                    } else {
                      onChoices([option.id]);
                    }
                  }}
                  type={isMulti ? 'checkbox' : 'radio'}
                  value={option.id}
                />
                <label htmlFor={optionId}>{option.label}</label>
              </div>
            );
          })}
        </div>
        {statusNote}
        {importantNote}
        {controls}
      </fieldset>
    );
  }

  const isMultiline = field.kind === 'longtext' || field.kind === 'list';

  return (
    <div className={`field${invalid ? ' field--invalid' : ''}`}>
      <label className="field__legend" htmlFor={baseId}>
        {field.label}
      </label>
      {field.help && (
        <p className="field__help" id={helpId}>
          {field.help}
        </p>
      )}
      {errorNote}
      {isMultiline ? (
        <textarea
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          id={baseId}
          onChange={(event) => onText(event.target.value)}
          placeholder={field.placeholder ?? ''}
          rows={field.kind === 'list' ? 4 : 3}
          value={disabled ? '' : answer.text}
        />
      ) : (
        <input
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          id={baseId}
          onChange={(event) => onText(event.target.value)}
          placeholder={field.placeholder ?? ''}
          type="text"
          value={disabled ? '' : answer.text}
        />
      )}
      {statusNote}
      {importantNote}
      {controls}
    </div>
  );
}
