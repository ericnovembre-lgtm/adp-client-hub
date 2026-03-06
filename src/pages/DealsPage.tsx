import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal } from "@/hooks/useDeals";
import { useCreateActivity } from "@/hooks/useActivities";
import { logActivity } from "@/lib/logActivity";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Deal, Contact, Company } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, MoreHorizontal, CalendarIcon, Check, ChevronsUpDown, DollarSign, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import DealDetailSheet from "@/components/DealDetailSheet";

// ── Constants ──
const STAGES = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const STAGE_BADGE_COLORS: Record<Stage, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  proposal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  negotiation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  closed_won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const STAGE_HEADER_COLORS: Record<string, string> = {
  closed_won: "border-t-emerald-500",
  closed_lost: "border-t-red-500",
};

const fmtCurrency = (v: number | null) => (v != null ? `$${v.toLocaleString()}` : "—");

// ── Hooks for lookups ──
function useAllContacts() {
  return useQuery({
    queryKey: ["contacts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, first_name, last_name").order("first_name");
      if (error) throw error;
      return data as Pick<Contact, "id" | "first_name" | "last_name">[];
    },
  });
}

function useAllCompanies() {
  return useQuery({
    queryKey: ["companies", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data as Pick<Company, "id" | "name">[];
    },
  });
}

function useAllDeals() {
  return useQuery({
    queryKey: ["deals", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Deal[];
    },
  });
}

// ── Schema ──
const dealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  value: z.coerce.number().min(0).optional().or(z.literal("")),
  stage: z.string().optional(),
  contact_id: z.string().optional().or(z.literal("")),
  company_id: z.string().optional().or(z.literal("")),
  expected_close_date: z.date().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});
type DealFormValues = z.infer<typeof dealSchema>;

// ── Searchable Combobox ──
function SearchableSelect({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 pointer-events-auto" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                None
              </CommandItem>
              {items.map((item) => (
                <CommandItem key={item.value} value={item.label} onSelect={() => { onChange(item.value); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")} />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Deal Form Dialog ──
function DealFormDialog({
  open,
  onOpenChange,
  deal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
}) {
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const { data: contacts } = useAllContacts();
  const { data: companies } = useAllCompanies();
  const isEdit = !!deal;

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: deal?.title ?? "",
      value: deal?.value ?? ("" as any),
      stage: deal?.stage ?? "lead",
      contact_id: deal?.contact_id ?? "",
      company_id: deal?.company_id ?? "",
      expected_close_date: deal?.expected_close_date ? new Date(deal.expected_close_date) : null,
      notes: deal?.notes ?? "",
    },
  });

  const onSubmit = async (values: DealFormValues) => {
    try {
      const payload = {
        title: values.title,
        value: typeof values.value === "number" ? values.value : null,
        stage: (values.stage as string) || null,
        contact_id: (values.contact_id as string) || null,
        company_id: (values.company_id as string) || null,
        expected_close_date: values.expected_close_date ? values.expected_close_date.toISOString() : null,
        notes: (values.notes as string) || null,
      };
      if (isEdit) {
        await updateDeal.mutateAsync({ id: deal.id, ...payload });
        toast.success("Deal updated");
      } else {
        const created = await createDeal.mutateAsync(payload);
        await logActivity("note", `Deal created: ${payload.title}`, payload.contact_id, created.id);
        toast.success("Deal created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    }
  };

  const contactItems = (contacts ?? []).map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }));
  const companyItems = (companies ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Deal" : "Add Deal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel>Value ($)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="stage" render={({ field }) => (
                <FormItem><FormLabel>Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="contact_id" render={({ field }) => (
              <FormItem><FormLabel>Contact</FormLabel><FormControl>
                <SearchableSelect items={contactItems} value={field.value ?? ""} onChange={field.onChange} placeholder="Select contact" searchPlaceholder="Search contacts…" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="company_id" render={({ field }) => (
              <FormItem><FormLabel>Company</FormLabel><FormControl>
                <SearchableSelect items={companyItems} value={field.value ?? ""} onChange={field.onChange} placeholder="Select company" searchPlaceholder="Search companies…" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="expected_close_date" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Expected Close Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createDeal.isPending || updateDeal.isPending}>{isEdit ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Kanban View ──
function KanbanView({
  deals,
  contacts,
  companies,
  onEdit,
  onDelete,
  onClickDeal,
}: {
  deals: Deal[];
  contacts: Pick<Contact, "id" | "first_name" | "last_name">[];
  companies: Pick<Company, "id" | "name">[];
  onEdit: (d: Deal) => void;
  onDelete: (id: string) => void;
  onClickDeal: (d: Deal) => void;
}) {
  const updateDeal = useUpdateDeal();
  const createActivity = useCreateActivity();

  const grouped = useMemo(() => {
    const map: Record<Stage, Deal[]> = { lead: [], qualified: [], proposal: [], negotiation: [], closed_won: [], closed_lost: [] };
    deals.forEach((d) => {
      const stage = (d.stage as Stage) || "lead";
      if (map[stage]) map[stage].push(d);
      else map.lead.push(d);
    });
    return map;
  }, [deals]);

  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`])), [contacts]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const moveDeal = async (deal: Deal, newStage: Stage) => {
    const oldStage = deal.stage ?? "lead";
    if (oldStage === newStage) return;
    try {
      await updateDeal.mutateAsync({ id: deal.id, stage: newStage });
      await createActivity.mutateAsync({
        type: "stage_change",
        description: `Deal "${deal.title}" moved from ${STAGE_LABELS[oldStage as Stage] ?? oldStage} to ${STAGE_LABELS[newStage]}`,
        deal_id: deal.id,
      });
      toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to move deal");
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageDeals = grouped[stage];
        const totalValue = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
        return (
          <div key={stage} className={cn("flex-shrink-0 w-72 rounded-lg border bg-muted/30 border-t-4", STAGE_HEADER_COLORS[stage] ?? "border-t-border")}>
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{STAGE_LABELS[stage]}</h3>
                <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{fmtCurrency(totalValue)} total</p>
            </div>
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-2 space-y-2">
                {stageDeals.map((deal) => (
                  <Card key={deal.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <button onClick={() => onClickDeal(deal)} className="font-medium text-sm leading-tight text-primary hover:underline text-left">{deal.title}</button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger><ArrowRight className="h-4 w-4 mr-2" />Move to</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {STAGES.filter((s) => s !== stage).map((s) => (
                                  <DropdownMenuItem key={s} onClick={() => moveDeal(deal, s)}>{STAGE_LABELS[s]}</DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(deal)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(deal.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {deal.value != null && (
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                          <DollarSign className="h-3.5 w-3.5" />{deal.value.toLocaleString()}
                        </div>
                      )}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {deal.company_id && companyMap.has(deal.company_id) && <p>{companyMap.get(deal.company_id)}</p>}
                        {deal.contact_id && contactMap.has(deal.contact_id) && <p>{contactMap.get(deal.contact_id)}</p>}
                        {deal.expected_close_date && <p>Close: {format(new Date(deal.expected_close_date), "MMM d, yyyy")}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageDeals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No deals</p>}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

// ── List View ──
function ListView({
  deals,
  contacts,
  companies,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
  onEdit,
  onDelete,
  onClickDeal,
}: {
  deals: Deal[];
  contacts: Pick<Contact, "id" | "first_name" | "last_name">[];
  companies: Pick<Company, "id" | "name">[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
  onEdit: (d: Deal) => void;
  onDelete: (id: string) => void;
  onClickDeal: (d: Deal) => void;
}) {
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`])), [contacts]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Expected Close</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : deals.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No deals found</TableCell></TableRow>
            ) : (
              deals.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <button onClick={() => onClickDeal(d)} className="text-primary hover:underline text-left">{d.title}</button>
                  </TableCell>
                  <TableCell>{fmtCurrency(d.value)}</TableCell>
                  <TableCell>
                    {d.stage && <Badge className={STAGE_BADGE_COLORS[d.stage as Stage] ?? ""} variant="outline">{STAGE_LABELS[d.stage as Stage] ?? d.stage}</Badge>}
                  </TableCell>
                  <TableCell>{d.contact_id && contactMap.has(d.contact_id) ? contactMap.get(d.contact_id) : "—"}</TableCell>
                  <TableCell>{d.company_id && companyMap.has(d.company_id) ? companyMap.get(d.company_id) : "—"}</TableCell>
                  <TableCell>{d.expected_close_date ? format(new Date(d.expected_close_date), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>{d.created_at ? format(new Date(d.created_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} deals)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Page ──
export default function DealsPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);

  // Kanban uses all deals; list uses paginated
  const allDealsQuery = useAllDeals();
  const paginatedDealsQuery = useDeals({ page, limit: 25 });
  const deleteDeal = useDeleteDeal();
  const { data: contacts } = useAllContacts();
  const { data: companies } = useAllCompanies();

  // Client-side search
  const filterDeals = (deals: Deal[]) => {
    if (!search.trim()) return deals;
    const q = search.toLowerCase();
    return deals.filter((d) => d.title.toLowerCase().includes(q));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDeal.mutateAsync(deleteId);
      toast.success("Deal deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
    setDeleteId(null);
  };

  const openEdit = (d: Deal) => { setEditingDeal(d); setDialogOpen(true); };
  const openAdd = () => { setEditingDeal(null); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Deals</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search deals…" className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Deal</Button>
        </div>
      </div>

      {/* Views */}
      {view === "kanban" ? (
        allDealsQuery.isLoading ? (
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-72 shrink-0 space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <KanbanView
            deals={filterDeals(allDealsQuery.data ?? [])}
            contacts={contacts ?? []}
            companies={companies ?? []}
            onEdit={openEdit}
            onDelete={(id) => setDeleteId(id)}
            onClickDeal={(d) => setDetailDeal(d)}
          />
        )
      ) : (
        <ListView
          deals={filterDeals(paginatedDealsQuery.data?.data ?? [])}
          contacts={contacts ?? []}
          companies={companies ?? []}
          isLoading={paginatedDealsQuery.isLoading}
          page={paginatedDealsQuery.data?.page ?? 1}
          totalPages={paginatedDealsQuery.data?.totalPages ?? 1}
          total={paginatedDealsQuery.data?.total ?? 0}
          onPageChange={setPage}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
          onClickDeal={(d) => setDetailDeal(d)}
        />
      )}

      {/* Dialog */}
      {dialogOpen && <DealFormDialog open={dialogOpen} onOpenChange={setDialogOpen} deal={editingDeal} />}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DealDetailSheet
        deal={detailDeal}
        contactName={detailDeal?.contact_id ? (contacts ?? []).find(c => c.id === detailDeal.contact_id) ? `${(contacts ?? []).find(c => c.id === detailDeal.contact_id)!.first_name} ${(contacts ?? []).find(c => c.id === detailDeal.contact_id)!.last_name}` : undefined : undefined}
        companyName={detailDeal?.company_id ? (companies ?? []).find(c => c.id === detailDeal.company_id)?.name : undefined}
        open={!!detailDeal}
        onOpenChange={(open) => { if (!open) setDetailDeal(null); }}
      />
    </div>
  );
}
