import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

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

export default function TopBar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const title = pageTitles[location] || "Page";
  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-card">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
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
