import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AnnouncerValue {
  readonly announce: (message: string) => void;
}

const AnnouncerContext = createContext<AnnouncerValue | null>(null);

/**
 * Single polite live region for the whole application. Used to announce a new
 * intake step opening and any answer change, so screen-reader users are told
 * about changes that happen away from the focused control.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');

  const announce = useCallback((next: string) => {
    // Re-announce identical text by briefly clearing the region first.
    setMessage((current) => (current === next ? `${next} ` : next));
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="vh" data-testid="announcer" role="status">
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): AnnouncerValue {
  const value = useContext(AnnouncerContext);
  if (!value) {
    throw new Error('useAnnouncer must be used inside an AnnouncerProvider');
  }
  return value;
}
