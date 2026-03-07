import { mockFeaturedAlbums } from '@/mocks/aggregate-handler';
import { mockAlbums } from '@/mocks/album-handler';
import { mockTravelRecords } from '@/mocks/travel-records-handler';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { vi } from 'vitest';
import { ref } from 'vue';

type QueryOptions = {
  queryKey: (string | string[] | undefined)[];
  queryFn: () => Promise<any>;
  enabled?: boolean | undefined;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

export const createBaseMockQueryReturn = <T>(data: T, useQuery?: any) => {
  const defaultQueryState = {
    data: ref(data),
    isError: ref(false),
    isFetching: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  };

  // Merge defaults with overrides, prioritizing override values
  return {
    ...defaultQueryState,
    ...useQuery,
    // Ensure ref values are preserved or updated correctly
    data: useQuery?.data ?? defaultQueryState.data,
    isError: useQuery?.isError ?? defaultQueryState.isError,
    isFetching: useQuery?.isFetching ?? defaultQueryState.isFetching,
    error: useQuery?.error ?? defaultQueryState.error,
    refetch: useQuery?.refetch ?? defaultQueryState.refetch,
  } as any;
};

export const setupQueryMocks = (overrides: { useQuery?: any; useQueryClient?: any } = {}) => {
  vi.mocked(useQuery).mockImplementation((options: QueryOptions | any) => {
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
  });

  vi.mocked(useMutation).mockImplementation((options: any) => {
    const isPending = ref(false);
    const isError = ref(false);
    const isSuccess = ref(false);
    const error = ref(null);

    const executeMutation = async (...args: any[]) => {
      isPending.value = true;
      isError.value = false;
      isSuccess.value = false;
      error.value = null;
      try {
        const result = await options.mutationFn(...args);
        isSuccess.value = true;
        if (options.onSuccess) await options.onSuccess(result);
        return result;
      } catch (err: any) {
        isError.value = true;
        error.value = err;
        if (options.onError) await options.onError(err);
        throw err;
      } finally {
        isPending.value = false;
      }
    };

    const mutate = (...args: any[]) => {
      void executeMutation(...args).catch(() => undefined);
    };

    return {
      mutate,
      mutateAsync: executeMutation,
      isPending,
      isError,
      isSuccess,
      error,
    } as any;
  });

  vi.mocked(useQueryClient).mockReturnValue(
    overrides.useQueryClient || {
      invalidateQueries: vi.fn(),
      removeQueries: vi.fn(),
    },
  );
};
