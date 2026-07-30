import { PROTOTYPE_NAME, PROTOTYPE_TAGLINE } from '@/content/disclaimers';

/**
 * Application header. The screen navigation added in Phase 1 will slot into the
 * nav region below the title.
 */
export function AppHeader() {
  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <div className="app-header__brand">
          <span aria-hidden="true" className="app-header__mark">
            FA
          </span>
          <div>
            <p className="app-header__title">{PROTOTYPE_NAME}</p>
            <p className="app-header__tagline">{PROTOTYPE_TAGLINE}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
