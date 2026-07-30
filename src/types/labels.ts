/**
 * Provenance labelling.
 *
 * Every figure, score, estimate, and statement shown anywhere in the interface
 * must carry exactly one of these labels, so a reader can always tell where a
 * value came from. The set is fixed - do not add a value here without also
 * documenting it in docs/LABELLING.md.
 */

export type ProvenanceLabel =
  | 'from-your-answer'
  | 'derived'
  | 'estimate'
  | 'assumption'
  | 'demonstration-data'
  | 'unknown'
  | 'requires-verification';

export interface ProvenanceLabelMeta {
  /** Short text shown inside the pill. */
  readonly short: string;
  /** Longer explanation, surfaced as a tooltip/description. */
  readonly description: string;
  /** Visual tone; always paired with the text above, never colour alone. */
  readonly tone: 'neutral' | 'info' | 'estimate' | 'caution' | 'demo';
}

export const PROVENANCE_LABELS: Record<ProvenanceLabel, ProvenanceLabelMeta> = {
  'from-your-answer': {
    short: 'From your answer',
    description: 'Taken directly from what you entered during intake.',
    tone: 'info',
  },
  derived: {
    short: 'Derived from your answers',
    description:
      'Calculated by the published scoring rules from the answers you gave.',
    tone: 'info',
  },
  estimate: {
    short: 'Estimate',
    description:
      'A calculated range, not a measured or quoted figure. Treat as indicative only.',
    tone: 'estimate',
  },
  assumption: {
    short: 'Assumption',
    description:
      'A default the prototype applied because the information was not supplied.',
    tone: 'caution',
  },
  'demonstration-data': {
    short: 'Demonstration data',
    description:
      'Fictional sample data included so the interface can be demonstrated. Not real.',
    tone: 'demo',
  },
  unknown: {
    short: 'Unknown',
    description: 'Not supplied and not inferred. Recorded as an open question.',
    tone: 'neutral',
  },
  'requires-verification': {
    short: 'Requires verification',
    description:
      'Must be confirmed with a real source, vendor, or specialist before implementation.',
    tone: 'caution',
  },
};

export const PROVENANCE_LABEL_ORDER: readonly ProvenanceLabel[] = [
  'from-your-answer',
  'derived',
  'estimate',
  'assumption',
  'demonstration-data',
  'unknown',
  'requires-verification',
];
