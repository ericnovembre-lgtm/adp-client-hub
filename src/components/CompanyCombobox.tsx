import { useState, useEffect, useRef } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyComboboxProps {
  value: string; // display name
  companyId: string | null;
  onChange: (company: string, companyId: string | null) => void;
}

export default function CompanyCombobox({ value, companyId, onChange }: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const { data } = useCompanies({ page: 1, limit: 10, search: debouncedSearch });
  const companies = data?.data ?? [];

  const handleSelect = (id: string, name: string) => {
    setSearch(name);
    onChange(name, id);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setSearch(val);
    onChange(val, null); // free-text clears company_id
    if (!open && val.length > 0) setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (search.length > 0) setOpen(true); }}
            placeholder="Search or type company…"
            className="pl-9"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandList>
            {companies.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                {search.trim() ? "No matching companies — name will be saved as text" : "Type to search companies"}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {companies.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => handleSelect(c.id, c.name)}
                    className="flex items-center gap-2"
                  >
                    <Check className={cn("h-4 w-4", companyId === c.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      {c.industry && <p className="text-xs text-muted-foreground truncate">{c.industry}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
