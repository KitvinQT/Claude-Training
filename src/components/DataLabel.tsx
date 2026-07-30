import type { ProvenanceLabel } from '@/types/labels';
import { PROVENANCE_LABELS } from '@/types/labels';

interface DataLabelProps {
  label: ProvenanceLabel;
  /** Render without the leading marker, for dense table cells. */
  compact?: boolean;
}

/**
 * Provenance pill. Every displayed figure in the report must be accompanied by
 * one of these so the reader always knows what kind of value they are looking at.
 * The tone is carried by colour *and* the text itself, never colour alone.
 */
export function DataLabel({ label, compact = false }: DataLabelProps) {
  const meta = PROVENANCE_LABELS[label];
  return (
    <span
      className={`data-label data-label--${meta.tone}${compact ? ' data-label--compact' : ''}`}
      data-provenance={label}
    >
      <span aria-hidden="true" className="data-label__dot" />
      <span className="vh">Value type: </span>
      {meta.short}
    </span>
  );
}
