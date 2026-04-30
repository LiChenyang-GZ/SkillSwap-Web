import { useAuth } from '@clerk/clerk-react';

export function useAuthRetry(sessionToken: string | null) {
  const { getToken } = useAuth();

  return async function withAuthRetry<T>(action: (token: string) => Promise<T>): Promise<T> {
    const initialToken = sessionToken ?? (await getToken({ template: 'signupTemplate' }));
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

      const refreshedToken = await getToken({ template: 'signupTemplate' });
      if (!refreshedToken || refreshedToken === initialToken) {
        throw error;
      }

      return action(refreshedToken);
    }
  };
}
