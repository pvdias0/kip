import Clarity from "@microsoft/clarity";

const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim();
const isBrowser = typeof window !== "undefined";

let isClarityInitialized = false;

export function initializeClarity() {
  if (!isBrowser || !clarityProjectId || isClarityInitialized) {
    return false;
  }

  Clarity.init(clarityProjectId);
  isClarityInitialized = true;

  return true;
}

export function syncClarityContext({
  userId,
  route,
  authState,
}: {
  userId?: string;
  route: string;
  authState: "anonymous" | "authenticated";
}) {
  if (!clarityProjectId) {
    return;
  }

  initializeClarity();

  Clarity.setTag("route", route);
  Clarity.setTag("auth_state", authState);

  if (userId) {
    Clarity.identify(userId, undefined, route);
  }
}
