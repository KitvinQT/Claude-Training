import { useState } from 'react';

import { useAnnouncer } from '@/components/Announcer';
import { ConfirmPanel } from '@/components/ConfirmPanel';
import { useIntake } from '@/state/IntakeContext';

/**
 * Report actions. Editing and regenerating keep the intake answers in memory.
 * There is deliberately no save, export, print, share, publish, download, or
 * deployment control at this phase.
 */
export function ReportActions({ position }: { position: 'top' | 'bottom' }) {
  const { dispatch } = useIntake();
  const { announce } = useAnnouncer();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={`report-actions report-actions--${position}`}>
      {confirming ? (
        <ConfirmPanel
          body="This clears every answer and the assessment, including anything loaded from the demonstration scenario. Nothing is saved, so it cannot be recovered."
          cancelLabel="Keep my answers"
          confirmLabel="Clear everything and start over"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            announce('All answers and the assessment were cleared. Returned to the welcome screen.');
            dispatch({ type: 'start-over' });
          }}
          title="Clear all answers and this assessment?"
        />
      ) : (
        <>
          <button
            className="button button--secondary"
            onClick={() => dispatch({ type: 'go-to-review' })}
            type="button"
          >
            Edit project details
          </button>
          <button
            className="button button--secondary"
            onClick={() => {
              announce('Regenerating the assessment.');
              dispatch({ type: 'start-generating' });
            }}
            type="button"
          >
            Regenerate assessment
          </button>
          <button
            className="button button--secondary"
            onClick={() => setConfirming(true)}
            type="button"
          >
            Start over
          </button>
        </>
      )}
    </div>
  );
}
