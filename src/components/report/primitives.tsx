import type { ReactNode } from 'react';

import { DataLabel } from '@/components/DataLabel';
import type { ProvenanceLabel } from '@/types/labels';

/* Shared report building blocks. No charts in Phase 3: cards, tables, score
 * bars, status labels, and disclosures only. */

export function ReportSection({
  id,
  title,
  intro,
  children,
  tone = 'plain',
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  tone?: 'plain' | 'accent';
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={`report-section${tone === 'accent' ? ' report-section--accent' : ''}`}
      id={id}
    >
      <h2 className="report-section__title" id={`${id}-heading`}>
        {title}
      </h2>
      {intro !== undefined && <div className="report-section__intro">{intro}</div>}
      {children}
    </section>
  );
}

/**
 * A score with its number in text, plus a decorative bar. The bar is hidden from
 * assistive technology because the value is already stated in words.
 */
export function ScoreBar({
  label,
  score,
  max = 100,
  description,
  provenance,
  size = 'medium',
}: {
  label: string;
  score: number;
  max?: number;
  description?: string;
  provenance: ProvenanceLabel;
  size?: 'medium' | 'large';
}) {
  const percent = Math.max(0, Math.min(100, (score / max) * 100));
  const tone = score >= 80 ? 'strong' : score >= 65 ? 'adequate' : score >= 50 ? 'watch' : score >= 35 ? 'weak' : 'critical';

  return (
    <div className={`score score--${size}`}>
      <p className="score__label">{label}</p>
      <p className="score__value">
        <span className="score__number">{score}</span>
        <span className="score__max"> of {max}</span>
      </p>
      <div aria-hidden="true" className={`score__track score__track--${tone}`}>
        <div className="score__fill" style={{ width: `${percent}%` }} />
      </div>
      {description !== undefined && <p className="score__description">{description}</p>}
      <DataLabel label={provenance} />
    </div>
  );
}

const STATUS_MARKS: Record<string, string> = {
  strong: '▲', // up-pointing triangle
  adequate: '●', // filled circle
  watch: '◆', // diamond
  weak: '▼', // down-pointing triangle
  critical: '✖', // heavy multiplication
  positive: '✓', // check
  neutral: '○', // open circle
  caution: '!',
  blocked: '✖',
};

/** Status is always text plus a shape, never colour alone. */
export function StatusPill({
  text,
  tone,
}: {
  text: string;
  tone: 'strong' | 'adequate' | 'watch' | 'weak' | 'critical' | 'positive' | 'neutral' | 'caution' | 'blocked';
}) {
  return (
    <span className={`status status--${tone}`}>
      <span aria-hidden="true" className="status__mark">
        {STATUS_MARKS[tone] ?? '●'}
      </span>
      {text}
    </span>
  );
}

export function Disclosure({
  summary,
  children,
  open = false,
}: {
  summary: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="disclosure" open={open}>
      <summary className="disclosure__summary">{summary}</summary>
      <div className="disclosure__body">{children}</div>
    </details>
  );
}

export interface FactItem {
  readonly term: string;
  readonly value: ReactNode;
  readonly provenance: ProvenanceLabel;
}

/** Definition list of labelled facts. Every value carries a provenance pill. */
export function FactList({ items, columns = 2 }: { items: readonly FactItem[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={`facts facts--${columns}`}>
      {items.map((item) => (
        <div className="facts__item" key={item.term}>
          <dt className="facts__term">{item.term}</dt>
          <dd className="facts__value">
            <span className="facts__text">{item.value}</span>
            <DataLabel compact label={item.provenance} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({
  items,
  heading,
  tone = 'plain',
  headingLevel = 4,
}: {
  items: readonly string[];
  heading?: string;
  tone?: 'plain' | 'positive' | 'negative' | 'muted';
  /** Use 3 when the list heading is the first heading below a section title. */
  headingLevel?: 3 | 4;
}) {
  if (items.length === 0) return null;
  const Heading = `h${headingLevel}` as 'h3' | 'h4';
  return (
    <div className="bullets">
      {heading !== undefined && <Heading className="bullets__heading">{heading}</Heading>}
      <ul className={`bullets__list bullets__list--${tone}`}>
        {/* Index in the key: engine lists can legitimately repeat a line, such as
         * two route fields both reading "Provided by the platform." */}
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Wide tables scroll inside their own container so the page never scrolls
 * horizontally. The region is focusable and labelled so keyboard users can reach
 * the scroll area.
 */
export function ScrollTable({
  caption,
  children,
  label,
}: {
  caption: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div aria-label={label} className="scroll-table" role="region" tabIndex={0}>
      <table className="data-table">
        <caption className="data-table__caption">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Callout({
  title,
  children,
  tone = 'info',
  level = 3,
}: {
  title: string;
  children: ReactNode;
  tone?: 'info' | 'warning' | 'critical';
  /** Set to 2 when the callout sits directly under the page heading. */
  level?: 2 | 3 | 4;
}) {
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4';
  return (
    <div className={`callout callout--${tone}`} role="note">
      <Heading className="callout__title">{title}</Heading>
      <div className="callout__body">{children}</div>
    </div>
  );
}
