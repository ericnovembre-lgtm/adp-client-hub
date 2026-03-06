import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/contacts": "Contacts",
  "/companies": "Companies",
  "/deals": "Deals",
  "/tasks": "Tasks",
  "/ai-discovery": "AI Discovery",
  "/settings": "Settings",
};

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const title = pageTitles[location] || "Page";
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 md:px-6 bg-card">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
        </div>
      </div>
    </header>
  );
}
