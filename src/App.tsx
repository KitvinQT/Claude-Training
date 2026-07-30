import { AnnouncerProvider } from '@/components/Announcer';
import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { IntakeProvider, useIntake } from '@/state/IntakeContext';
import { GeneratingScreen } from '@/screens/GeneratingScreen';
import { IntakeScreen } from '@/screens/IntakeScreen';
import { ReportScreen } from '@/screens/ReportScreen';
import { ReviewScreen } from '@/screens/ReviewScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import type { IntakeState } from '@/types/intake';

/**
 * Application shell and screen switch.
 *
 * Screens: welcome, grouped chat intake, review, a short generating state, and
 * the assessment report. All state is in memory: there is no router, no storage,
 * and no network access.
 */
export function App({ initialState }: { initialState?: IntakeState } = {}) {
  return (
    <AnnouncerProvider>
      <IntakeProvider {...(initialState ? { initialState } : {})}>
        <div className="shell">
          <a className="skip-link" href="#main">
            Skip to main content
          </a>
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
    case 'generating':
      return <GeneratingScreen />;
    case 'report':
      return <ReportScreen />;
  }
}
