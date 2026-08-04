import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

/**
 * The app's single QueryClient and its AsyncStorage persister.
 *
 * These used to be module-locals inside app/_layout.tsx, which meant nothing
 * outside that file could reach them — in particular `logout()` in
 * context/AppContext.tsx could not clear the cache on sign-out. The result was
 * a cross-user data leak: sign out, sign in as a different account, and the
 * new user was served the previous user's Stays results, chat threads and
 * Connect profiles until each query happened to refetch.
 *
 * The leak was worse than an in-memory cache would have been, because the
 * client is wrapped in PersistQueryClientProvider: the cache is written to
 * AsyncStorage and rehydrated on launch, so the previous user's data survived
 * killing the app entirely.
 *
 * Both objects are exported so `clearAllCaches()` below can be called from the
 * auth layer. Keep them here rather than re-creating them anywhere else — two
 * QueryClients would silently split the cache.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours caching
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 mins
      retry: 2, // Retry failed requests twice
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

/**
 * Wipes every trace of the signed-in user's cached API data.
 *
 * Both calls are required and neither substitutes for the other:
 *   - `queryClient.clear()` empties the in-memory cache for this session.
 *   - `removeClient()` deletes the serialized snapshot in AsyncStorage. Without
 *     it, the next launch rehydrates the previous user's data from disk even
 *     though memory was clean.
 *
 * Failures are swallowed deliberately: sign-out must always complete. A user
 * tapping "Sign out" on a device with a full disk must still end up signed
 * out, not stuck on their profile screen with an error.
 */
export async function clearAllCaches(): Promise<void> {
  try {
    await asyncStoragePersister.removeClient();
  } catch {
    // best-effort
  }
  queryClient.clear();
}
