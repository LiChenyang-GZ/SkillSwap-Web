import { useAuth } from '@clerk/clerk-react';

const CLERK_TOKEN_TEMPLATE = 'signupTemplate';

export function useAuthRetry(sessionToken: string | null) {
  const { getToken } = useAuth();

  return async function withAuthRetry<T>(action: (token: string) => Promise<T>): Promise<T> {
    // Prefer the cached session token for normal calls; refresh from Clerk on 401.
    const initialToken = sessionToken ?? (await getToken({ template: CLERK_TOKEN_TEMPLATE }));
    if (!initialToken) {
      throw new Error('Authentication token unavailable');
    }

    try {
      return await action(initialToken);
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status !== 401) {
        throw error;
      }

      const refreshedToken = await getToken({ template: CLERK_TOKEN_TEMPLATE });
      if (!refreshedToken || refreshedToken === initialToken) {
        throw error;
      }

      return action(refreshedToken);
    }
  };
}
