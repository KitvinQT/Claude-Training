import { useEffect, useRef } from 'react';

interface ConfirmPanelProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Inline confirmation for a destructive action. Implemented as an ARIA alert
 * dialog rather than a native <dialog> so behaviour is identical across browsers
 * and in tests. Escape cancels, and focus starts on the cancel action.
 */
export function ConfirmPanel({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmPanelProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      aria-describedby="confirm-body"
      aria-labelledby="confirm-title"
      aria-modal="true"
      className="confirm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
      role="alertdialog"
    >
      <h3 className="confirm__title" id="confirm-title">
        {title}
      </h3>
      <p className="confirm__body" id="confirm-body">
        {body}
      </p>
      <div className="confirm__actions">
        <button
          className="button button--secondary"
          onClick={onCancel}
          ref={cancelRef}
          type="button"
        >
          {cancelLabel}
        </button>
        <button className="button button--danger" onClick={onConfirm} type="button">
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
