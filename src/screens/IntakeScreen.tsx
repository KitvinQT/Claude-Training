import { ChatTranscript } from '@/components/ChatTranscript';
import { MemoryNotice } from '@/components/MemoryNotice';
import { StepForm } from '@/components/StepForm';
import { StepProgress } from '@/components/StepProgress';
import { getStep } from '@/data/intakeSteps';
import { useIntake } from '@/state/IntakeContext';

export function IntakeScreen() {
  const { state } = useIntake();
  const step = getStep(state.stepIndex);

  return (
    <div className="stack">
      <h1>Project intake</h1>
      <MemoryNotice />

      {state.returnToReview && (
        <p className="edit-notice" role="note">
          Editing from the review screen. Saving this step returns you straight to
          the review.
        </p>
      )}

      <div className="intake-layout">
        <div className="intake-layout__progress">
          <StepProgress />
        </div>

        <section
          aria-labelledby="conversation-heading"
          className="intake-layout__conversation"
        >
          <h2 className="vh" id="conversation-heading">
            Project intake conversation
          </h2>
          <ChatTranscript upToIndex={state.stepIndex} />
          <StepForm step={step} stepIndex={state.stepIndex} />
        </section>
      </div>
    </div>
  );
}
