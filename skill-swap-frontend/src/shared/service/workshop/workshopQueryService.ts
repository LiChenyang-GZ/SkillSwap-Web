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

interface DetailTaskEntry {
  controller: AbortController;
  task: Promise<Workshop | null>;
  subscribers: number;
}

const workshopDetailInFlight = new Map<string, DetailTaskEntry>();

const withCallerAbort = async <T>(
  entry: DetailTaskEntry,
  release: () => void,
  signal?: AbortSignal
): Promise<T> => {
  let settled = false;
  const releaseOnce = () => {
    if (settled) {
      return;
    }
    settled = true;
    release();
  };

  if (!signal) {
    try {
      return (await entry.task) as T;
    } finally {
      releaseOnce();
    }
  }

  if (signal.aborted) {
    releaseOnce();
    throw createAbortError();
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      releaseOnce();
      reject(createAbortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });
    entry.task
      .then((value) => {
        releaseOnce();
        resolve(value as T);
      })
      .catch((error) => {
        releaseOnce();
        reject(error);
      })
      .finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
  });
};

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
    const existingEntry = workshopDetailInFlight.get(cacheKey);
    if (existingEntry) {
      existingEntry.subscribers += 1;
      return withCallerAbort<Workshop | null>(existingEntry, () => {
        existingEntry.subscribers -= 1;
        if (existingEntry.subscribers <= 0) {
          existingEntry.controller.abort();
        }
      }, signal);
    }

    const controller = new AbortController();
    const entry: DetailTaskEntry = {
      controller,
      task: Promise.resolve(null),
      subscribers: 1,
    };

    const task = (async () => {
      try {
        const data = await apiCall<any>(`/api/v1/workshops/${backendId}`, { signal: controller.signal }, token);
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

    entry.task = task;
    workshopDetailInFlight.set(cacheKey, entry);
    return withCallerAbort<Workshop | null>(entry, () => {
      entry.subscribers -= 1;
      if (entry.subscribers <= 0) {
        entry.controller.abort();
      }
    }, signal);
  },
};
