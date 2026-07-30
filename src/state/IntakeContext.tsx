import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import { initialIntakeState, intakeReducer, type IntakeAction } from '@/state/intakeReducer';
import type { IntakeState } from '@/types/intake';

interface IntakeContextValue {
  readonly state: IntakeState;
  readonly dispatch: Dispatch<IntakeAction>;
}

const IntakeContext = createContext<IntakeContextValue | null>(null);

export function IntakeProvider({
  children,
  initialState = initialIntakeState,
}: {
  children: ReactNode;
  initialState?: IntakeState;
}) {
  const [state, dispatch] = useReducer(intakeReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake(): IntakeContextValue {
  const value = useContext(IntakeContext);
  if (!value) {
    throw new Error('useIntake must be used inside an IntakeProvider');
  }
  return value;
}
