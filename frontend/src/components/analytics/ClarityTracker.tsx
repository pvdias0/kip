import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { initializeClarity, syncClarityContext } from "@/lib/clarity";

export function ClarityTracker() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    initializeClarity();
  }, []);

  useEffect(() => {
    syncClarityContext({
      userId: user?.id ? String(user.id) : undefined,
      route: `${location.pathname}${location.search}${location.hash}`,
      authState: isAuthenticated ? "authenticated" : "anonymous",
    });
  }, [
    isAuthenticated,
    location.hash,
    location.pathname,
    location.search,
    user?.id,
  ]);

  return null;
}
