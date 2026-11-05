import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Container que revela os filhos marcados com `reveal-item` quando entra na
 * tela (fade + slide, com escalonamento via `revealDelay`). Substitui o
 * framer-motion na landing para tira-lo do bundle principal. Os estilos ficam
 * em index.css (.reveal-item).
 */
export function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -100px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal="" data-visible={visible ? "" : undefined} className={className}>
      {children}
    </div>
  );
}

/** Atraso escalonado do item (0, 1, 2...) dentro de um <Reveal>. */
export const revealDelay = (index: number): CSSProperties =>
  ({ "--reveal-i": index }) as CSSProperties;

export const revealItem = (className?: string) => cn("reveal-item", className);
