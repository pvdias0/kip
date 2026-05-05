import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({
  className,
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = isDark ? "Tema claro" : "Tema escuro";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "sm" : "icon"}
      className={cn(
        "rounded-full border-border/60 bg-background/80 text-foreground shadow-sm backdrop-blur-md hover:bg-accent/80 hover:text-accent-foreground",
        showLabel && "px-4",
        className,
      )}
      aria-label={`Ativar ${label.toLowerCase()}`}
      title={`Ativar ${label.toLowerCase()}`}
      onClick={() => setTheme(nextTheme)}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      {showLabel ? <span>{label}</span> : null}
    </Button>
  );
}
