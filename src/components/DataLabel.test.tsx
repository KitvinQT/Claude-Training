import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataLabel } from '@/components/DataLabel';
import { ProvenanceLegend } from '@/components/ProvenanceLegend';
import {
  PROVENANCE_LABELS,
  PROVENANCE_LABEL_ORDER,
  type ProvenanceLabel,
} from '@/types/labels';

describe('provenance labelling', () => {
  it.each(PROVENANCE_LABEL_ORDER)('renders the "%s" label with its text', (label) => {
    render(<DataLabel label={label} />);
    expect(screen.getByText(PROVENANCE_LABELS[label].short)).toBeInTheDocument();
  });

  it('exposes the label kind to assistive technology, not colour alone', () => {
    const { container } = render(<DataLabel label="estimate" />);
    expect(screen.getByText(/value type/i)).toBeInTheDocument();
    expect(container.querySelector('[data-provenance="estimate"]')).not.toBeNull();
  });

  it('keeps the label set and its metadata in step', () => {
    const metaKeys = Object.keys(PROVENANCE_LABELS) as ProvenanceLabel[];
    expect(new Set(metaKeys)).toEqual(new Set(PROVENANCE_LABEL_ORDER));
    expect(PROVENANCE_LABEL_ORDER).toHaveLength(7);
  });

  it('lists every label with a description in the legend', () => {
    render(<ProvenanceLegend />);
    for (const label of PROVENANCE_LABEL_ORDER) {
      expect(screen.getByText(PROVENANCE_LABELS[label].description)).toBeInTheDocument();
    }
  });
});
