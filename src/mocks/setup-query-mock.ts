import { mockFeaturedAlbums } from '@/mocks/aggregate-handler';
import { mockAlbums } from '@/mocks/album-handler';
import { mockTravelRecords } from '@/mocks/travel-records-handler';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query';
import { vi } from 'vitest';
import { ref } from 'vue';

interface QueryOptions {
  queryKey: (string | string[] | undefined)[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean | undefined;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

interface MutationOptions {
  mutationFn?: (...args: unknown[]) => Promise<unknown>;
  onSuccess?: (result: unknown) => Promise<void>;
  onError?: (err: unknown) => Promise<void>;
}

type QueryReturnOverrides = Partial<Record<string, unknown>>;

export const createBaseMockQueryReturn = <T>(data: T, overrides?: QueryReturnOverrides) => {
  const defaultQueryState = {
    data: ref(data),
    isError: ref(false),
    isFetching: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  };

  return {
    ...defaultQueryState,
    ...overrides,
    data: overrides?.data ?? defaultQueryState.data,
    isError: overrides?.isError ?? defaultQueryState.isError,
    isFetching: overrides?.isFetching ?? defaultQueryState.isFetching,
    error: overrides?.error ?? defaultQueryState.error,
    refetch: overrides?.refetch ?? defaultQueryState.refetch,
  } as ReturnType<typeof useQuery>;
};

export const setupQueryMocks = (
  overrides: {
    useQuery?: QueryReturnOverrides;
    useQueryClient?: Partial<QueryClient>;
  } = {},
) => {
  vi.mocked(useQuery).mockImplementation(((options: QueryOptions) => {
    const queryKey = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
    switch (queryKey) {
      case 'fetchAlbumsByYears':
        return createBaseMockQueryReturn(mockAlbums, overrides.useQuery);
      case 'featured-albums':
        return createBaseMockQueryReturn(mockFeaturedAlbums, overrides.useQuery);
      case 'getTravelRecords':
        return createBaseMockQueryReturn(mockTravelRecords, overrides.useQuery);
      default:
        return createBaseMockQueryReturn(null);
    }
  }) as unknown as typeof useQuery);

  vi.mocked(useMutation).mockImplementation(((options: MutationOptions) => {
    const isPending = ref(false);
    const isError = ref(false);
    const isSuccess = ref(false);
    const error = ref(null);

    const executeMutation = async (...args: unknown[]) => {
      isPending.value = true;
      isError.value = false;
      isSuccess.value = false;
      error.value = null;
      try {
        const result = options.mutationFn ? await options.mutationFn(...args) : undefined;
        isSuccess.value = true;
        if (options.onSuccess) await options.onSuccess(result);
        return result;
      } catch (err: unknown) {
        isError.value = true;
        error.value = err as null;
        if (options.onError) await options.onError(err);
        throw err;
      } finally {
        isPending.value = false;
      }
    };

    const mutate = (...args: unknown[]) => {
      void executeMutation(...args).catch(() => undefined);
    };

    return {
      mutate,
      mutateAsync: executeMutation,
      isPending,
      isError,
      isSuccess,
      error,
    } as ReturnType<typeof useMutation>;
  }) as unknown as typeof useMutation);

  vi.mocked(useQueryClient).mockReturnValue(
    (overrides.useQueryClient || {
      invalidateQueries: vi.fn(),
      removeQueries: vi.fn(),
    }) as QueryClient,
  );
};
