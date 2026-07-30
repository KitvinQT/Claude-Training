import { AnnouncerProvider } from '@/components/Announcer';
import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { PrototypeBanner } from '@/components/PrototypeBanner';
import { IntakeProvider, useIntake } from '@/state/IntakeContext';
import { IntakeScreen } from '@/screens/IntakeScreen';
import { ReviewScreen } from '@/screens/ReviewScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import type { IntakeState } from '@/types/intake';

/**
 * Application shell and screen switch.
 *
 * Phase 1 covers the welcome screen, the grouped chat intake, and the review
 * screen. The assessment engine and report arrive in later phases. All state is
 * in memory: there is no router, no storage, and no network access.
 */
export function App({ initialState }: { initialState?: IntakeState } = {}) {
  return (
    <AnnouncerProvider>
      <IntakeProvider {...(initialState ? { initialState } : {})}>
        <div className="shell">
          <a className="skip-link" href="#main">
            Skip to main content
          </a>
          <PrototypeBanner />
          <AppHeader />
          <main className="app-main" id="main" tabIndex={-1}>
            <div className="container">
              <CurrentScreen />
            </div>
          </main>
          <AppFooter />
        </div>
      </IntakeProvider>
    </AnnouncerProvider>
  );
}

function CurrentScreen() {
  const { state } = useIntake();
  switch (state.screen) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'intake':
      return <IntakeScreen />;
    case 'review':
      return <ReviewScreen />;
  }
}
