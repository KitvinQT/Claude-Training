import { useEffect, useRef, useState } from 'react';

import { useAnnouncer } from '@/components/Announcer';
import { MemoryNotice } from '@/components/MemoryNotice';
import { generateAssessment } from '@/engine/generateAssessment';
import { useIntake } from '@/state/IntakeContext';

/**
 * Short staged processing state.
 *
 * The assessment itself is computed locally and synchronously - these labels
 * describe the steps the local rules go through, nothing more. No external AI, no
 * network request, and no vendor lookup happens here or anywhere in this
 * prototype. The staging exists so the sections do not appear without warning;
 * it is not an artificial wait, and it is skipped entirely when reduced motion is
 * requested.
 */
const STAGES: readonly string[] = [
  'Reviewing project requirements',
  'Comparing implementation routes',
  'Evaluating risks and safeguards',
  'Preparing recommendation',
];

const STAGE_MS = 170;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function GeneratingScreen() {
  const { state, dispatch } = useIntake();
  const { announce } = useAnnouncer();
  const [stage, setStage] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const assessment = generateAssessment(state.answers);

    if (prefersReducedMotion()) {
      announce('Assessment ready');
      dispatch({ type: 'assessment-ready', assessment });
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    STAGES.forEach((label, index) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setStage(index);
          announce(label);
        }, index * STAGE_MS),
      );
    });

    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        announce('Assessment ready');
        dispatch({ type: 'assessment-ready', assessment });
      }, STAGES.length * STAGE_MS),
    );

    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
    };
    // Runs once for this generation pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stack">
      <h1 ref={headingRef} tabIndex={-1}>
        Preparing your assessment
      </h1>
      <p className="lede">
        Applying the published scoring rules to your answers. Everything runs locally in
        this browser: nothing is sent anywhere, and no vendor, price, or platform is looked
        up.
      </p>
      <MemoryNotice />

      <ol className="stages">
        {STAGES.map((label, index) => (
          <li
            className={`stages__item ${index < stage ? 'stages__item--done' : index === stage ? 'stages__item--active' : 'stages__item--pending'}`}
            key={label}
          >
            <span aria-hidden="true" className="stages__mark">
              {index < stage ? '✓' : index === stage ? '▶' : '·'}
            </span>
            <span className="stages__label">{label}</span>
            <span className="stages__status">
              {index < stage ? 'Done' : index === stage ? 'In progress' : 'Waiting'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
