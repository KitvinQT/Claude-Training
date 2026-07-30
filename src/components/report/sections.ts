/** Report section order and navigation labels. Single source for both. */
export interface ReportSectionMeta {
  readonly id: string;
  readonly navLabel: string;
  readonly title: string;
}

export const REPORT_SECTIONS: readonly ReportSectionMeta[] = [
  { id: 'executive-summary', navLabel: 'Executive summary', title: 'Executive summary' },
  { id: 'project-feasibility', navLabel: 'Project feasibility', title: 'Project feasibility' },
  { id: 'builder-fit', navLabel: 'Builder fit', title: 'Builder fit' },
  {
    id: 'route-paths',
    navLabel: 'Technical route and practical path',
    title: 'Technical route and practical path',
  },
  {
    id: 'route-comparison',
    navLabel: 'Route comparison',
    title: 'Implementation route comparison',
  },
  { id: 'risk-register', navLabel: 'Risk register', title: 'Risk register' },
  { id: 'cost', navLabel: 'Cost', title: 'Cost' },
  { id: 'timeline', navLabel: 'Timeline', title: 'Timeline' },
  {
    id: 'maturity',
    navLabel: 'Maturity and production readiness',
    title: 'Maturity and production readiness',
  },
  { id: 'source-of-truth', navLabel: 'Source of truth', title: 'Source of truth' },
  { id: 'safeguards', navLabel: 'Human safeguards', title: 'Human safeguards' },
  { id: 'mvp', navLabel: 'MVP recommendation', title: 'MVP recommendation' },
  { id: 'roadmap', navLabel: 'Phased roadmap', title: 'Phased roadmap' },
  {
    id: 'evidence',
    navLabel: 'Evidence and unknowns',
    title: 'Evidence, assumptions, unknowns, and verification needs',
  },
  {
    id: 'final-recommendation',
    navLabel: 'Final recommendation',
    title: 'Final implementation recommendation',
  },
  { id: 'next-actions', navLabel: 'Immediate next actions', title: 'Immediate next actions' },
];
