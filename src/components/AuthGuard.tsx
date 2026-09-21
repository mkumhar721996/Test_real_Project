import { ReactNode, useEffect } from 'react';

export interface AuthGuardProps {
  isAuthenticated: boolean;
  onUnauthenticated: () => void;
  children: ReactNode;
}

export function AuthGuard({
  isAuthenticated,
  onUnauthenticated,
  children,
}: AuthGuardProps): JSX.Element | null {
  useEffect(() => {
    if (!isAuthenticated) {
      onUnauthenticated();
    }
  }, [isAuthenticated, onUnauthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
