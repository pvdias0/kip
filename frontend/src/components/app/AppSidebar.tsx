import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  Landmark,
  LogOut,
  MessageCircle,
  Settings2,
  UserRound,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { KipLogo } from "@/components/ui/KipLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  onLogoutRequest: () => void;
};

const navigationItems = [
  {
    label: "Transacoes",
    href: "/",
    icon: Wallet,
    isActive: (pathname: string) => pathname === "/",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    isActive: (pathname: string) => pathname === "/dashboard",
  },
  {
    label: "Categorias",
    href: "/categories",
    icon: Settings2,
    isActive: (pathname: string) => pathname.startsWith("/categories"),
  },
  {
    label: "Pagamentos",
    href: "/payment-methods",
    icon: CreditCard,
    isActive: (pathname: string) => pathname.startsWith("/payment-methods"),
  },
  {
    label: "Contas",
    href: "/payment-accounts",
    icon: Landmark,
    isActive: (pathname: string) => pathname.startsWith("/payment-accounts"),
  },
  {
    label: "WhatsApp",
    href: "/whatsapp",
    icon: MessageCircle,
    isActive: (pathname: string) => pathname.startsWith("/whatsapp"),
  },
  {
    label: "Perfil",
    href: "/profile",
    icon: UserRound,
    isActive: (pathname: string) => pathname.startsWith("/profile"),
  },
];

function getInitials(name?: string) {
  if (!name) {
    return "KP";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function AppSidebar({ onLogoutRequest }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const { user } = useAuth();

  const collapsed = state === "collapsed";
  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border/70 pb-4">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent/70",
            collapsed && "justify-center px-0",
          )}
        >
          <KipLogo size="sm" showText={!collapsed} animated={false} />
        </Link>

        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/35 px-3 py-3",
            collapsed && "justify-center border-transparent bg-transparent px-0 py-0",
          )}
        >
          <Avatar className="h-10 w-10 border border-sidebar-border/80">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {user?.name || "Usuario"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {user?.email || "sem email"}
              </p>
            </div>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive(pathname)}
                  tooltip={item.label}
                  size="lg"
                  className={cn(collapsed && "justify-center")}
                >
                  <Link to={item.href}>
                    <item.icon />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 pt-4">
        <ThemeToggle
          showLabel={!collapsed}
          className={cn(
            "rounded-xl border-sidebar-border/70 bg-sidebar-accent/35 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "mx-auto h-8 w-8 justify-center p-0" : "w-full justify-start",
          )}
        />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={onLogoutRequest}
              tooltip="Sair"
              size="lg"
              className={cn(
                "text-destructive hover:bg-destructive/10 hover:text-destructive data-[active=true]:text-destructive",
                collapsed && "justify-center",
              )}
            >
              <LogOut />
              {!collapsed ? <span>Sair</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
