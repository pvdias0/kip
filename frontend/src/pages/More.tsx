import { Link } from "react-router-dom";
import { ChevronRight, LogOut } from "lucide-react";

import { AppShell, requestLogout } from "@/components/app/AppShell";
import { mainNavigation, settingsNavigation } from "@/components/app/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const groups = [
  { title: "Análises", items: mainNavigation.filter((item) => item.href === "/relatorios") },
  { title: "Configurações", items: settingsNavigation },
];

/** Tela "Mais" do celular: tudo que nao cabe na barra inferior. */
const More = () => (
  <AppShell title="Mais" subtitle="Relatórios e configurações" hideNewEntry>
    <main className="container-app flex-1 space-y-5 py-4">
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h2>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link to={item.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50">
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    {item.description ? <span className="block text-xs text-muted-foreground">{item.description}</span> : null}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="space-y-2">
        <ThemeToggle showLabel className="h-12 w-full justify-start rounded-2xl" />
        <button
          type="button"
          onClick={requestLogout}
          className="flex h-12 w-full items-center gap-3 rounded-2xl border border-destructive/30 px-4 text-sm font-medium text-destructive hover:bg-destructive/5"
        >
          <LogOut className="h-5 w-5" /> Sair
        </button>
      </section>
    </main>
  </AppShell>
);

export default More;
