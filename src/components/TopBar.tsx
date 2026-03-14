import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandPalette from "@/components/CommandPalette";

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
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <>
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
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex items-center gap-2 text-muted-foreground"
            onClick={() => setCmdOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search…</span>
            <kbd className="pointer-events-none ml-1 inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setCmdOpen(true)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          </div>
        </div>
      </header>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
