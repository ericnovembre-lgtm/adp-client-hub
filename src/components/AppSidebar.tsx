import {
  LayoutDashboard,
  Users,
  Contact,
  Building2,
  Handshake,
  CheckSquare,
  Sparkles,
  TrendingUp,
  Mail,
  BarChart3,
  ClipboardCheck,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Leads", path: "/leads", icon: Users },
  { title: "Contacts", path: "/contacts", icon: Contact },
  { title: "Companies", path: "/companies", icon: Building2 },
  { title: "Deals", path: "/deals", icon: Handshake },
  { title: "Tasks", path: "/tasks", icon: CheckSquare },
  { title: "Reports", path: "/reports", icon: BarChart3 },
  { title: "AI Discovery", path: "/ai-discovery", icon: Sparkles },
  { title: "Market Intel", path: "/market-intelligence", icon: TrendingUp },
  { title: "Email Templates", path: "/email-templates", icon: Mail },
  { title: "Settings", path: "/settings", icon: Settings },
];

export default function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 min-h-screen",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        {!collapsed && <span className="font-bold text-lg text-sidebar-primary-foreground">ADP CRM</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-accent text-sidebar-muted hidden md:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path}>
              <span
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.title}</span>}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-muted truncate mb-2 px-1">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </aside>
  );
}
