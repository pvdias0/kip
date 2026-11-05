import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { initializeClarity, syncClarityContext } from "@/lib/clarity";

export function ClarityTracker() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const [ready, setReady] = useState(false);

  // Clarity so inicia depois do carregamento da pagina, quando o navegador
  // estiver ocioso, para nao disputar banda/CPU com o conteudo principal (LCP).
  useEffect(() => {
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      const run = () => {
        initializeClarity();
        setReady(true);
      };
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(run, { timeout: 3000 });
      } else {
        timeoutId = setTimeout(run, 1500);
      }
    };

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      window.removeEventListener("load", start);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    syncClarityContext({
      userId: user?.id ? String(user.id) : undefined,
      route: `${location.pathname}${location.search}${location.hash}`,
      authState: isAuthenticated ? "authenticated" : "anonymous",
    });
  }, [
    ready,
    isAuthenticated,
    location.hash,
    location.pathname,
    location.search,
    user?.id,
  ]);

  return null;
}
