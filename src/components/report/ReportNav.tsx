import { REPORT_SECTIONS } from '@/components/report/sections';

/**
 * Compact report navigation. Plain anchors, so it is keyboard-operable and works
 * without script. Sticky beside the report on wide screens; a horizontally
 * scrolling strip on narrow ones.
 */
export function ReportNav() {
  return (
    <nav aria-label="Report sections" className="report-nav">
      <h2 className="report-nav__heading">Report sections</h2>
      <ol className="report-nav__list">
        {REPORT_SECTIONS.map((section, index) => (
          <li key={section.id}>
            <a className="report-nav__link" href={`#${section.id}`}>
              <span aria-hidden="true" className="report-nav__number">
                {index + 1}
              </span>
              {section.navLabel}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
