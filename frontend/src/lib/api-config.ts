const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const isBrowser = typeof window !== "undefined";

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || import.meta.env.VITE_API_URL?.trim();
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

const isLocalHostname = (hostname: string) => LOCAL_HOSTNAMES.has(hostname.toLowerCase());

function resolveConfiguredUrl(value: string | undefined, fallback: string) {
  if (!value || value.length === 0) {
    return fallback;
  }

  if (value.startsWith("/")) {
    return trimTrailingSlash(value);
  }

  try {
    const parsedUrl = new URL(value, isBrowser ? window.location.origin : "http://localhost");

    if (isBrowser) {
      const currentUrl = new URL(window.location.origin);
      const configuredTargetsLocalhost = !isLocalHostname(currentUrl.hostname) &&
        isLocalHostname(parsedUrl.hostname);

      if (configuredTargetsLocalhost) {
        return fallback;
      }
    }

    return trimTrailingSlash(parsedUrl.toString());
  } catch {
    return fallback;
  }
}

function deriveSocketFallback(apiBaseUrl: string) {
  if (!isBrowser) {
    return "";
  }

  if (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")) {
    try {
      const parsedUrl = new URL(apiBaseUrl);
      return trimTrailingSlash(parsedUrl.origin);
    } catch {
      return window.location.origin;
    }
  }

  return window.location.origin;
}

export const API_BASE_URL = resolveConfiguredUrl(configuredApiBaseUrl, "/api");

export const SOCKET_URL = resolveConfiguredUrl(
  configuredSocketUrl,
  deriveSocketFallback(API_BASE_URL),
);

export const buildApiUrl = (endpoint: string) => {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};
