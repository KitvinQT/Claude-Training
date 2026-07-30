import { BANNER_TEXT } from '@/content/disclaimers';

/**
 * Always-visible statement that this is a prototype. Rendered above the header
 * on every screen and retained in the print view.
 */
export function PrototypeBanner() {
  return (
    <div aria-label="Prototype notice" className="proto-banner" role="note">
      <div className="container proto-banner__inner">
        <span className="proto-banner__tag">Prototype</span>
        <p className="proto-banner__text">{BANNER_TEXT}</p>
      </div>
    </div>
  );
}
