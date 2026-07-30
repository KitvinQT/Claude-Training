import { PALETTE_NOTE, PROTOTYPE_STATEMENTS } from '@/content/disclaimers';

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="container">
        <h2 className="app-footer__heading">About this prototype</h2>
        <ul className="app-footer__list">
          {PROTOTYPE_STATEMENTS.map((statement) => (
            <li key={statement}>{statement}</li>
          ))}
        </ul>
        <p className="app-footer__note text-sm">{PALETTE_NOTE}</p>
      </div>
    </footer>
  );
}
