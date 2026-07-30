/**
 * Reminder that nothing is stored. Shown on the intake and review screens, where
 * the user has work that a refresh would discard.
 */
export function MemoryNotice() {
  return (
    <p className="memory-notice" role="note">
      <span aria-hidden="true" className="memory-notice__mark">
        !
      </span>
      Nothing is saved. Your answers are held in memory for this page only -
      refreshing or closing the page clears them, and there is no way to recover
      them.
    </p>
  );
}
