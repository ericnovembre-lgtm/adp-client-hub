import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/exportCSV";
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
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";

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
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, MoreHorizontal, CalendarIcon, DollarSign, ArrowRight, Download, Loader2, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import DealDetailSheet from "@/components/DealDetailSheet";

import { DEAL_STAGES, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, STAGE_HEADER_COLORS, type DealStage } from "@/lib/constants";

const STAGES = DEAL_STAGES;
type Stage = DealStage;
const STAGE_LABELS = DEAL_STAGE_LABELS as Record<Stage, string>;
const STAGE_BADGE_COLORS = DEAL_STAGE_COLORS as Record<Stage, string>;

const fmtCurrency = (v: number | null) => (v != null ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "—");

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
  title: z.string().trim().min(1, "Title is required").max(200, "Max 200 characters"),
  value: z.coerce.number().min(0, "Value must be 0 or more").optional().or(z.literal("")),
  stage: z.string().optional(),
  contact_id: z.string().optional().or(z.literal("")),
  company_id: z.string().optional().or(z.literal("")),
  expected_close_date: z.date().optional().nullable(),
  notes: z.string().max(5000).optional().or(z.literal("")),
});
type DealFormValues = z.infer<typeof dealSchema>;



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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Deal" : "Add Deal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem><FormLabel>Value ($)</FormLabel><FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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
                <SearchableSelect options={contactItems} value={field.value ?? ""} onValueChange={field.onChange} placeholder="Select contact" searchPlaceholder="Search contacts…" />
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="company_id" render={({ field }) => (
              <FormItem><FormLabel>Company</FormLabel><FormControl>
                <SearchableSelect options={companyItems} value={field.value ?? ""} onValueChange={field.onChange} placeholder="Select company" searchPlaceholder="Search companies…" />
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

// ── Droppable Column ──
function DroppableColumn({ stage, children }: { stage: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={cn("transition-all duration-150", isOver && "ring-2 ring-primary/40 bg-primary/5 rounded-lg")}>
      {children}
    </div>
  );
}

// ── Draggable Card ──
function DraggableCard({ deal, children }: { deal: Deal; children: (dragHandleProps: { listeners: any; attributes: any }) => React.ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: CSS.Transform.toString(transform) } : undefined;
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      {children({ listeners, attributes })}
    </div>
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
  const isMobile = useIsMobile();
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
  const dealMap = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);

  const activeDeal = activeDealId ? dealMap.get(activeDealId) ?? null : null;

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;
    const deal = dealMap.get(String(active.id));
    const targetStage = String(over.id) as Stage;
    if (deal && STAGES.includes(targetStage)) {
      moveDeal(deal, targetStage);
    }
  };

  const renderDealCard = (deal: Deal, stage: Stage, dragHandleProps?: { listeners: any; attributes: any }) => (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-1.5 min-w-0 flex-1">
            {!isMobile && dragHandleProps && (
              <button
                {...dragHandleProps.listeners}
                {...dragHandleProps.attributes}
                className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => onClickDeal(deal)} className="font-medium text-sm leading-tight text-primary hover:underline text-left">{deal.title}</button>
          </div>
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
            <DollarSign className="h-3.5 w-3.5" />{deal.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        )}
        <div className="space-y-1 text-xs text-muted-foreground">
          {deal.company_id && companyMap.has(deal.company_id) && <p><Link href="/companies" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{companyMap.get(deal.company_id)}</Link></p>}
          {deal.contact_id && contactMap.has(deal.contact_id) && <p><Link href="/contacts" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{contactMap.get(deal.contact_id)}</Link></p>}
          {deal.expected_close_date && <p>Close: {format(new Date(deal.expected_close_date), "MMM d, yyyy")}</p>}
        </div>
      </CardContent>
    </Card>
  );

  const renderColumns = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageDeals = grouped[stage];
        const totalValue = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
        return (
          <DroppableColumn key={stage} stage={stage}>
            <div className={cn("flex-shrink-0 w-72 rounded-lg border bg-muted/30 border-t-4", STAGE_HEADER_COLORS[stage] ?? "border-t-border")}>
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{STAGE_LABELS[stage]}</h3>
                  <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{fmtCurrency(totalValue)} total</p>
              </div>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="p-2 space-y-2">
                  {stageDeals.map((deal) =>
                    isMobile ? (
                      <div key={deal.id}>{renderDealCard(deal, stage)}</div>
                    ) : (
                      <DraggableCard key={deal.id} deal={deal}>
                        {(dragHandleProps) => renderDealCard(deal, stage, dragHandleProps)}
                      </DraggableCard>
                    )
                  )}
                  {stageDeals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No deals</p>}
                </div>
              </ScrollArea>
            </div>
          </DroppableColumn>
        );
      })}
    </div>
  );

  if (isMobile) {
    return renderColumns();
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {renderColumns()}
      <DragOverlay>
        {activeDeal ? (
          <Card className="w-72 shadow-lg border-primary/50">
            <CardContent className="p-3 space-y-1">
              <p className="font-medium text-sm">{activeDeal.title}</p>
              {activeDeal.value != null && (
                <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <DollarSign className="h-3.5 w-3.5" />{activeDeal.value.toLocaleString("en-US")}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
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
  onAdd,
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
  onAdd: () => void;
}) {
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`])), [contacts]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
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
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">No deals yet</p>
                <p className="text-sm mt-1 max-w-md mx-auto">Convert a qualified lead to start tracking your ADP TotalSource pipeline.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
                  <Plus className="h-4 w-4 mr-1" />Add Deal
                </Button>
              </TableCell></TableRow>
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
                  <TableCell>{d.contact_id && contactMap.has(d.contact_id) ? <Link href="/contacts" className="text-primary hover:underline">{contactMap.get(d.contact_id)}</Link> : "—"}</TableCell>
                  <TableCell>{d.company_id && companyMap.has(d.company_id) ? <Link href="/companies" className="text-primary hover:underline">{companyMap.get(d.company_id)}</Link> : "—"}</TableCell>
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
  const [exporting, setExporting] = useState(false);
  const contactMap = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, `${c.first_name} ${c.last_name}`])), [contacts]);
  const companyMap = useMemo(() => new Map((companies ?? []).map((c) => [c.id, c.name])), [companies]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: all, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      exportToCSV(all ?? [], "deals", [
        { header: "Title", accessor: (r) => r.title },
        { header: "Value", accessor: (r) => r.value },
        { header: "Stage", accessor: (r) => r.stage },
        { header: "Contact", accessor: (r) => r.contact_id ? contactMap.get(r.contact_id) ?? "" : "" },
        { header: "Company", accessor: (r) => r.company_id ? companyMap.get(r.company_id) ?? "" : "" },
        { header: "Expected Close Date", accessor: (r) => r.expected_close_date ? new Date(r.expected_close_date).toLocaleDateString() : "" },
        { header: "Created Date", accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
      ]);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
    setExporting(false);
  };

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
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}Export CSV
          </Button>
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
            <AlertDialogCancel disabled={deleteDeal.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteDeal.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteDeal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
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
