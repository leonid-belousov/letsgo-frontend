import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/api/client';
import type { components } from '@/api/schema';
import { useSession, type TokenPair } from '@/stores/session';

export const ME_KEY = ['me'] as const;

export function useMe() {
  const status = useSession((state) => state.status);
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiRequest<components['schemas']['OwnerProfileDto']>('/v1/me'),
    enabled: status === 'signedIn',
    retry: false,
  });
}

function splitIdentifier(identifier: string): { email: string } | { phone: string } {
  const value = identifier.trim();
  return value.includes('@') ? { email: value } : { phone: value.replace(/[\s()-]/g, '') };
}

export interface Credentials {
  identifier: string;
  password: string;
}

export function useCredentialsAuth(mode: 'sign-in' | 'sign-up') {
  const signIn = useSession((state) => state.signIn);
  return useMutation({
    mutationFn: async (values: Credentials) => {
      const endpoint = mode === 'sign-in' ? '/v1/auth/login' : '/v1/auth/register';
      const pair = await apiRequest<TokenPair>(endpoint, {
        method: 'POST',
        body: { ...splitIdentifier(values.identifier), password: values.password, deviceName: 'Let’sGo web' },
      });
      await signIn({
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        userId: pair.userId,
      });
      return pair;
    },
  });
}
