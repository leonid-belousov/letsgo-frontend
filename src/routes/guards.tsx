import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ApiRequestError, userMessageFor } from '@/api/errors';
import { useMe } from '@/features/auth/hooks';
import { ErrorState, LoadingState } from '@/design/ui';
import { useSession } from '@/stores/session';
import { paths } from './routes';

export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const hydrate = useSession((state) => state.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return children;
}

export function RequireAuth() {
  const status = useSession((state) => state.status);
  const location = useLocation();
  const me = useMe();
  if (status === 'loading') return <LoadingState label="Loading session" />;
  if (status === 'signedOut') {
    return <Navigate to={paths.signIn} replace state={{ from: location }} />;
  }
  if (me.isPending) return <LoadingState label="Loading profile" />;
  if (me.isError) {
    if (me.error instanceof ApiRequestError && me.error.code === 'UNAUTHENTICATED') {
      return <Navigate to={paths.signIn} replace state={{ from: location }} />;
    }
    return (
      <ErrorState
        title={me.error instanceof ApiRequestError ? userMessageFor(me.error.code) : undefined}
        onRetry={() => void me.refetch()}
      />
    );
  }
  if (location.pathname !== paths.completeProfile && me.data && !me.data.profileComplete) {
    return <Navigate to={paths.completeProfile} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const status = useSession((state) => state.status);
  if (status === 'loading') return <LoadingState label="Loading session" />;
  return status === 'signedIn' ? <Navigate to={paths.home} replace /> : <Outlet />;
}
