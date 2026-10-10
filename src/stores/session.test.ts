import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from './session';

beforeEach(() => {
  useSession.setState({ status: 'loading', accessToken: null, refreshToken: null, userId: null });
});

describe('web session', () => {
  it('hydrates to signed out without reading persistent storage', async () => {
    await useSession.getState().hydrate();
    expect(useSession.getState()).toMatchObject({
      status: 'signedOut',
      accessToken: null,
      refreshToken: null,
      userId: null,
    });
  });

  it('keeps access and refresh tokens in memory for the signed-in session', async () => {
    await useSession.getState().signIn({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      userId: 'user-1',
    });
    expect(useSession.getState()).toMatchObject({
      status: 'signedIn',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      userId: 'user-1',
    });
  });

  it('clears all credentials on sign out', async () => {
    await useSession.getState().signIn({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      userId: 'user-1',
    });
    await useSession.getState().signOut();
    expect(useSession.getState()).toMatchObject({
      status: 'signedOut',
      accessToken: null,
      refreshToken: null,
      userId: null,
    });
  });
});
