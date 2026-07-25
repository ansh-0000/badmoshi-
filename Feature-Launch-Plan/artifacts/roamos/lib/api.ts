import { NativeModules } from "react-native";
import * as SecureStore from "expo-secure-store";

let backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!backendUrl) {
  if (__DEV__) {
    // Dynamically resolve localhost IP from the bundler's scriptURL
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const host = scriptURL.split('://')[1].split(':')[0];
      backendUrl = `http://${host}:8080`;
    } else {
      backendUrl = "http://localhost:8080";
    }
  } else {
    // Production fallback
    backendUrl = "https://api.steadynest.example.com";
  }
}

export const API_BASE_URL = backendUrl;

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await SecureStore.setItemAsync("access_token", accessToken);
  await SecureStore.setItemAsync("refresh_token", refreshToken);
};

export const getAccessToken = async () => SecureStore.getItemAsync("access_token");
export const getRefreshToken = async () => SecureStore.getItemAsync("refresh_token");

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("refresh_token");
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
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return { data };
  },
  post: async (endpoint: string, body?: any, options?: any) => {
    const res = await apiFetch('/api' + endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return { data };
  }
};

export default api;
