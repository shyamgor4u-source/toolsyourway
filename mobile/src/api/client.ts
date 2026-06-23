import Constants from "expo-constants";

// Resolve the backend base URL.
// Priority: EXPO_PUBLIC_API_BASE_URL (dev override) -> app.json extra.apiBaseUrl -> production default.
// Note: on the Android emulator, localhost of the host machine is reachable at 10.0.2.2.
const PROD_DEFAULT = "https://www.toolsyourway.com";

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim().replace(/\/$/, "");

  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (fromExtra && fromExtra.trim().length > 0) return fromExtra.trim().replace(/\/$/, "");

  return PROD_DEFAULT;
}

export const API_BASE_URL = resolveBaseUrl();

export type ApiError = {
  status: number;
  message: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      // Session-cookie auth: the backend uses passport sessions, so we must
      // send/receive cookies. RN's fetch persists cookies for the app session.
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    const err: ApiError = { status: 0, message: "Network error. Check your connection and backend URL." };
    throw err;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const message =
      (isJson && (payload as { message?: string })?.message) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${res.status})`;
    const err: ApiError = { status: res.status, message };
    throw err;
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  baseUrl: API_BASE_URL,
};
