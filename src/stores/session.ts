import { create } from 'zustand';

/**
 * Browser session state. Tokens intentionally stay memory-only: a full page reload
 * signs the visitor out instead of putting refresh credentials in web storage.
 * Authorization decisions still come from server-provided capabilities.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface SessionState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  status: 'loading' | 'signedOut' | 'signedIn';
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  signIn: (pair: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  userId: null,
  status: 'loading',
  accessToken: null,
  refreshToken: null,
  setUserId: (userId) => set({ userId }),
  hydrate: async () => {
    if (get().status === 'loading') {
      set({ status: 'signedOut', accessToken: null, refreshToken: null, userId: null });
    }
  },
  signIn: async (pair) => {
    set({ status: 'signedIn', ...pair });
  },
  signOut: async () => {
    set({ status: 'signedOut', accessToken: null, refreshToken: null, userId: null });
  },
}));
