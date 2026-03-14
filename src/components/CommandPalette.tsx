import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Target, Users, Building2, Handshake, Plus } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResults {
  leads: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
  companies: { id: string; label: string }[];
  deals: { id: string; label: string }[];
}

const empty: SearchResults = { leads: [], contacts: [], companies: [], deals: [] };

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(empty);
  const [loading, setLoading] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(empty);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const q = `%${query.trim()}%`;
      const [leadsRes, contactsRes, companiesRes, dealsRes] = await Promise.all([
        supabase.from("leads").select("id, company_name, decision_maker_name").or(`company_name.ilike.${q},decision_maker_name.ilike.${q}`).limit(5),
        supabase.from("contacts").select("id, first_name, last_name, email").or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`).limit(5),
        supabase.from("companies").select("id, name, industry").or(`name.ilike.${q},industry.ilike.${q}`).limit(5),
        supabase.from("deals").select("id, title").ilike("title", q).limit(5),
      ]);
      setResults({
        leads: (leadsRes.data ?? []).map(l => ({ id: l.id, label: `${l.company_name}${l.decision_maker_name ? ` — ${l.decision_maker_name}` : ""}` })),
        contacts: (contactsRes.data ?? []).map(c => ({ id: c.id, label: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ""}` })),
        companies: (companiesRes.data ?? []).map(c => ({ id: c.id, label: `${c.name}${c.industry ? ` · ${c.industry}` : ""}` })),
        deals: (dealsRes.data ?? []).map(d => ({ id: d.id, label: d.title })),
      });
      setLoading(false);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  const go = useCallback((path: string) => {
    onOpenChange(false);
    setQuery("");
    navigate(path);
  }, [navigate, onOpenChange]);

  const hasResults = results.leads.length + results.contacts.length + results.companies.length + results.deals.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery(""); }}>
      <CommandInput placeholder="Search leads, contacts, companies, deals…" value={query} onValueChange={setQuery} />
      <CommandList>
        {query.trim() && !loading && !hasResults && <CommandEmpty>No results found.</CommandEmpty>}

        {results.leads.length > 0 && (
          <CommandGroup heading="Leads">
            {results.leads.map(r => (
              <CommandItem key={r.id} onSelect={() => go("/leads")} className="gap-2">
                <Target className="h-4 w-4 text-muted-foreground" /> {r.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {results.contacts.map(r => (
              <CommandItem key={r.id} onSelect={() => go("/contacts")} className="gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> {r.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.companies.length > 0 && (
          <CommandGroup heading="Companies">
            {results.companies.map(r => (
              <CommandItem key={r.id} onSelect={() => go("/companies")} className="gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> {r.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.deals.length > 0 && (
          <CommandGroup heading="Deals">
            {results.deals.map(r => (
              <CommandItem key={r.id} onSelect={() => go("/deals")} className="gap-2">
                <Handshake className="h-4 w-4 text-muted-foreground" /> {r.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go("/leads")} className="gap-2"><Plus className="h-4 w-4" /> New Lead</CommandItem>
          <CommandItem onSelect={() => go("/contacts")} className="gap-2"><Plus className="h-4 w-4" /> New Contact</CommandItem>
          <CommandItem onSelect={() => go("/companies")} className="gap-2"><Plus className="h-4 w-4" /> New Company</CommandItem>
          <CommandItem onSelect={() => go("/deals")} className="gap-2"><Plus className="h-4 w-4" /> New Deal</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
