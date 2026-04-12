const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

export const API_BASE_URL = trimTrailingSlash(
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : "/api",
);

export const SOCKET_URL =
  configuredSocketUrl && configuredSocketUrl.length > 0
    ? trimTrailingSlash(configuredSocketUrl)
    : window.location.origin;

export const buildApiUrl = (endpoint: string) => {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};
