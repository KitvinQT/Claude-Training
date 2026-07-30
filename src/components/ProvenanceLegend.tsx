import { DataLabel } from '@/components/DataLabel';
import { PROVENANCE_LABELS, PROVENANCE_LABEL_ORDER } from '@/types/labels';

/**
 * Key explaining the provenance pills. Shown on the welcome screen and reused in
 * the report's evidence panel.
 */
export function ProvenanceLegend() {
  return (
    <dl className="legend">
      {PROVENANCE_LABEL_ORDER.map((label) => (
        <div className="legend__row" key={label}>
          <dt className="legend__term">
            <DataLabel label={label} />
          </dt>
          <dd className="legend__desc">{PROVENANCE_LABELS[label].description}</dd>
        </div>
      ))}
    </dl>
  );
}
