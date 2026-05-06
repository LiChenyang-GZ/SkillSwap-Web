import type { Workshop } from '../../../types/workshop';
import { apiCall, enrichWorkshop, toBackendWorkshopId } from '../../../lib/api';

const isAbortError = (error: unknown): boolean => {
  return (error as { name?: string })?.name === 'AbortError';
};

const createAbortError = (): Error & { name: string } => {
  const error = new Error('The operation was aborted.') as Error & { name: string };
  error.name = 'AbortError';
  return error;
};

const withCallerAbort = async <T>(task: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) {
    return task;
  }

  if (signal.aborted) {
    throw createAbortError();
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });
    task
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
  });
};

const workshopDetailInFlight = new Map<string, Promise<Workshop | null>>();

export const workshopQueryService = {
  getAll: async (signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops', { signal });
      return data.map(enrichWorkshop);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.error('Failed to fetch workshops:', error);
      return [];
    }
  },

  getPublic: async (signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/public', { signal });
      return data.map(enrichWorkshop);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.error('Failed to fetch public workshops:', error);
      return [];
    }
  },

  getMine: async (token?: string | null, signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/mine', { signal }, token);
      return data.map(enrichWorkshop);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.error('Failed to fetch my workshops:', error);
      return [];
    }
  },

  getAttending: async (token?: string | null, signal?: AbortSignal): Promise<Workshop[]> => {
    try {
      const data = await apiCall<any[]>('/api/v1/workshops/attending', { signal }, token);
      return data.map(enrichWorkshop);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.error('Failed to fetch attending workshops:', error);
      return [];
    }
  },

  getById: async (id: string, token?: string | null, signal?: AbortSignal): Promise<Workshop | null> => {
    const backendId = toBackendWorkshopId(id);
    const cacheKey = `${token ?? 'anon'}:${backendId}`;
    const existingTask = workshopDetailInFlight.get(cacheKey);
    if (existingTask) {
      return withCallerAbort(existingTask, signal);
    }

    const task = (async () => {
      try {
        const data = await apiCall<any>(`/api/v1/workshops/${backendId}`, {}, token);
        return enrichWorkshop(data);
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        const status = (error as { status?: number })?.status;
        if (status === 404) {
          return null;
        }

        console.warn('Failed to fetch workshop detail', {
          workshopId: id,
          backendId,
          status: status ?? null,
          error,
        });
        throw error;
      } finally {
        workshopDetailInFlight.delete(cacheKey);
      }
    })();

    workshopDetailInFlight.set(cacheKey, task);
    return withCallerAbort(task, signal);
  },
};
