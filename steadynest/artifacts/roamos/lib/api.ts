import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { ApiError } from "./errorMessage";

// ── Dev backend host resolution ───────────────────────────────────────────────
// The API host is derived from wherever Metro actually served the bundle from,
// so the same build works on the emulator, a physical phone, and web without
// anyone editing a constant between runs.
//
// The host is read from expo-constants' hostUri, NOT from
// NativeModules.SourceCode.scriptURL. This app runs with newArchEnabled, and
// under the New Architecture (bridgeless) NativeModules.SourceCode is simply
// undefined - the previous implementation therefore resolved nothing and fell
// through to a hardcoded "localhost", which on a physical device points the
// app at *itself* and can never reach the API. getDevServer is kept as a
// fallback for a bridged/older runtime.
//
// The remaining special case is the Android emulator. Metro can report either
// localhost or the host machine's LAN address there, but the local API must
// still use the emulator's fixed 10.0.2.2 alias. Metro's own port survives via
// its forwarding, but our separate API port does not.
//
// The rewrite is gated on actually being an emulator. A physical device needs
// the LAN host, while 10.0.2.2 is only meaningful from an Android AVD.
const ANDROID_EMULATOR_HOST = "10.0.2.2";

function isAndroidEmulator(): boolean {
  if (Platform.OS !== "android") return false;
  const c = (Platform.constants ?? {}) as Record<string, unknown>;
  const probe = [c["Fingerprint"], c["Model"], c["Brand"], c["Manufacturer"]]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  // Covers the standard AVD images (sdk_gphone/sdk_phone/emu64x, goldfish and
  // ranchu kernels) as well as Genymotion's "generic" builds.
  return /generic|emulator|sdk_gphone|sdk_phone|android sdk built for|emu64|goldfish|ranchu/.test(
    probe,
  );
}

/** Strips scheme, port and path from either a "host:port" or a full URL. */
function hostOf(value: string | undefined | null): string | null {
  if (!value) return null;
  const withoutScheme = value.includes("://") ? value.split("://")[1] : value;
  const host = withoutScheme?.split("/")[0]?.split(":")[0];
  return host || null;
}

function devServerHost(): string | null {
  // Primary: works on Expo Go, dev clients, bridgeless and bridged alike.
  const fromConstants = hostOf(
    Constants.expoConfig?.hostUri ?? (Constants as { expoGoConfig?: { debuggerHost?: string } })
      .expoGoConfig?.debuggerHost,
  );
  if (fromConstants) return fromConstants;

  // Fallback for older/bridged runtimes where SourceCode still exists.
  return hostOf(NativeModules.SourceCode?.scriptURL as string | undefined);
}

function resolveDevHost(): string | null {
  const host = devServerHost();
  if (!host) return null;
  return isAndroidEmulator() ? ANDROID_EMULATOR_HOST : host;
}

let backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!backendUrl) {
  if (__DEV__) {
    const host = resolveDevHost();
    backendUrl = host ? `http://${host}:8080` : "http://localhost:8080";
    // Host resolution has silently picked the wrong address more than once
    // (10.0.2.2 hardcoded for every Android device; localhost on an emulator
    // where localhost is the emulator itself). Log the inputs, not just the
    // answer, so the next mismatch is diagnosable from the device log alone.
    console.log("[SteadyNest System] host resolution:", {
      hostUri: Constants.expoConfig?.hostUri,
      scriptURL: NativeModules.SourceCode?.scriptURL,
      platform: Platform.OS,
      isAndroidEmulator: isAndroidEmulator(),
      resolvedHost: host,
    });
  } else {
    // Production fallback
    backendUrl = "https://api.steadynest.example.com";
  }
}

export const API_BASE_URL = backendUrl;

// expo-secure-store wraps a native keychain/keystore module that doesn't
// exist on web. Calling it there throws a raw native-binding error (e.g.
// "ExpoSecureStore.default.getValueWithKeyAsync is not a function") instead
// of returning/storing a value — that error used to leak straight into the
// Tira chat UI as if it were an AI response. Route storage through this
// small platform-aware wrapper instead of calling SecureStore directly.
const isWeb = Platform.OS === "web";

const storageSet = async (key: string, value: string) => {
  if (isWeb) {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const storageGet = async (key: string): Promise<string | null> => {
  if (isWeb) {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
};

const storageDelete = async (key: string) => {
  if (isWeb) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

// SecureStore is the durable source of truth. Keep a process-local copy as
// well: immediately after a native login, a screen can issue its first API
// request before the storage bridge returns the just-written value. The copy
// is never persisted independently and is cleared before the durable values
// on logout.
let accessTokenInMemory: string | null = null;
let refreshTokenInMemory: string | null = null;

export const setTokens = async (accessToken: string, refreshToken: string) => {
  accessTokenInMemory = accessToken;
  refreshTokenInMemory = refreshToken;
  try {
    await storageSet("access_token", accessToken);
    await storageSet("refresh_token", refreshToken);
  } catch (error) {
    accessTokenInMemory = null;
    refreshTokenInMemory = null;
    throw error;
  }
};

export const getAccessToken = async () => {
  if (accessTokenInMemory) return accessTokenInMemory;
  accessTokenInMemory = await storageGet("access_token");
  return accessTokenInMemory;
};

export const getRefreshToken = async () => {
  if (refreshTokenInMemory) return refreshTokenInMemory;
  refreshTokenInMemory = await storageGet("refresh_token");
  return refreshTokenInMemory;
};

export const clearTokens = async () => {
  accessTokenInMemory = null;
  refreshTokenInMemory = null;
  await storageDelete("access_token");
  await storageDelete("refresh_token");
};

// Internal flag to prevent infinite loops during refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  let token = await getAccessToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fetchOptions = { ...options, headers };

  let response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearTokens();
      return response; // No refresh token available, fail normally
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          await setTokens(data.accessToken, data.refreshToken);
          token = data.accessToken;
          onRefreshed(data.accessToken);
        } else {
          await clearTokens();
          token = null;
        }
      } catch (error) {
        await clearTokens();
        token = null;
      } finally {
        isRefreshing = false;
      }
    } else {
      // Wait for the ongoing refresh to complete
      token = await new Promise<string>((resolve) => {
        addRefreshSubscriber(resolve);
      });
    }

    if (token) {
      // Retry the original request
      headers.set("Authorization", `Bearer ${token}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
};

const api = {
  get: async (endpoint: string, options?: any) => {
    let url = endpoint;
    if (options?.params) {
      const qs = new URLSearchParams(options.params as Record<string, string>).toString();
      url += `?${qs}`;
    }
    const res = await apiFetch('/api' + url, {
      ...options,
      method: 'GET',
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'Request failed');
    return { data };
  },
  post: async (endpoint: string, body?: any, options?: any) => {
    const res = await apiFetch('/api' + endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'Request failed');
    return { data };
  }
};

export default api;
