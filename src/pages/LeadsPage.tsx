import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreHorizontal, Phone, UserCheck, ArrowRightLeft, XCircle, Pencil, Trash2, Download, Loader2, Users, FileText, X, CheckSquare } from "lucide-react";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
import { useCreateCompany } from "@/hooks/useCompanies";
import { useCreateContact } from "@/hooks/useContacts";
import { useCreateDeal } from "@/hooks/useDeals";
import { useCreateActivity } from "@/hooks/useActivities";
import { useKnockoutRules, type KnockoutRule } from "@/hooks/useKnockoutRules";
import { exportToCSV } from "@/lib/exportCSV";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import DraftEmailDialog from "@/components/DraftEmailDialog";
import LeadDetailSheet from "@/components/LeadDetailSheet";
import { checkKnockoutLocal, type LocalKnockoutResult } from "@/lib/knockoutLocal";
import EligibilityBadge from "@/components/EligibilityBadge";

const leadSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required").max(200, "Max 200 characters"),
  decision_maker_name: z.string().max(200).optional(),
  decision_maker_email: z.string().trim().email("Invalid email format").max(255).optional().or(z.literal("")),
  decision_maker_phone: z.string().max(30).optional(),
  decision_maker_title: z.string().max(200).optional(),
  headcount: z.coerce.number().int().min(0, "Must be 0 or more").optional().or(z.literal(0)),
  industry: z.string().max(200).optional(),
  website: z.string().max(500).optional(),
  state: z.string().max(50).optional(),
  trigger_event: z.string().max(2000).optional(),
  status: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

// --- Lead Form Dialog with industry onBlur knockout warning ---

function LeadFormDialog({
  open,
  onOpenChange,
  editingLead,
  onSubmit,
  isSubmitting,
  knockoutRules,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingLead: Lead | null;
  onSubmit: (values: LeadFormValues) => void;
  isSubmitting: boolean;
  knockoutRules: KnockoutRule[];
}) {
  const [industryWarning, setIndustryWarning] = useState<LocalKnockoutResult | null>(null);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: editingLead
      ? {
          company_name: editingLead.company_name,
          decision_maker_name: editingLead.decision_maker_name ?? "",
          decision_maker_email: editingLead.decision_maker_email ?? "",
          decision_maker_phone: editingLead.decision_maker_phone ?? "",
          decision_maker_title: editingLead.decision_maker_title ?? "",
          headcount: editingLead.headcount ?? 0,
          industry: editingLead.industry ?? "",
          website: editingLead.website ?? "",
          state: editingLead.state ?? "",
          trigger_event: editingLead.trigger_event ?? "",
          status: editingLead.status ?? "new",
        }
      : {
          company_name: "",
          decision_maker_name: "",
          decision_maker_email: "",
          decision_maker_phone: "",
          decision_maker_title: "",
          headcount: 0,
          industry: "",
          website: "",
          state: "",
          trigger_event: "",
          status: "new",
        },
  });

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      form.reset();
      setIndustryWarning(null);
    }
    onOpenChange(v);
  };

  const handleIndustryBlur = () => {
    const val = form.getValues("industry");
    if (val && knockoutRules.length > 0) {
      const result = checkKnockoutLocal(val, knockoutRules);
      setIndustryWarning(result.tier !== 'clear' ? result : null);
    } else {
      setIndustryWarning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle>{editingLead ? "Edit Lead" : "Add Lead"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 py-2"
        >
          <div className="grid gap-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input id="company_name" {...form.register("company_name")} />
            {form.formState.errors.company_name && (
              <p className="text-sm text-destructive">{form.formState.errors.company_name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="decision_maker_name">Decision Maker</Label>
              <Input id="decision_maker_name" {...form.register("decision_maker_name")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="decision_maker_title">Title</Label>
              <Input id="decision_maker_title" {...form.register("decision_maker_title")} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="decision_maker_email">Email</Label>
              <Input id="decision_maker_email" type="email" {...form.register("decision_maker_email")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="decision_maker_phone">Phone</Label>
              <Input id="decision_maker_phone" {...form.register("decision_maker_phone")} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="headcount">Headcount</Label>
              <Input id="headcount" type="number" {...form.register("headcount")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                {...form.register("industry")}
                onBlur={handleIndustryBlur}
              />
              {industryWarning && (
                <p className={`text-xs mt-1 ${
                  industryWarning.tier === 'prohibited' ? 'text-red-600 dark:text-red-400' :
                  industryWarning.tier === 'low_probability' ? 'text-orange-600 dark:text-orange-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>
                  {industryWarning.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...form.register("website")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...form.register("state")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trigger_event">Trigger Event</Label>
            <Textarea id="trigger_event" {...form.register("trigger_event")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch("status") || "new"}
              onValueChange={(v) => form.setValue("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editingLead ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [bulkActionPending, setBulkActionPending] = useState(false);

  // Knockout dialog state
  const [knockoutDialogType, setKnockoutDialogType] = useState<'prohibited' | 'low_probability' | 'bluefield' | null>(null);
  const [knockoutDialogResult, setKnockoutDialogResult] = useState<LocalKnockoutResult | null>(null);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, isLoading } = useLeads({ page, limit: 25, search: debouncedSearch });
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createCompany = useCreateCompany();
  const createContact = useCreateContact();
  const createDeal = useCreateDeal();
  const createActivity = useCreateActivity();
  const { data: knockoutRules = [] } = useKnockoutRules();

  const leads = data?.data ?? [];

  // Pre-compute knockout results for all visible leads
  const knockoutMap = useMemo(() => {
    const map = new Map<string, LocalKnockoutResult>();
    if (knockoutRules.length === 0) return map;
    for (const lead of leads) {
      map.set(lead.id, checkKnockoutLocal(lead.industry, knockoutRules));
    }
    return map;
  }, [leads, knockoutRules]);

  // Clear selection on page change
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  // Bulk selection helpers
  const allVisibleSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Bulk status update
  const handleBulkStatus = async (newStatus: string) => {
    setBulkActionPending(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          updateLead.mutateAsync({ id, status: newStatus })
        )
      );
      await Promise.all(
        Array.from(selectedIds).map(id => {
          const lead = leads.find(l => l.id === id);
          return createActivity.mutateAsync({
            type: "status_change",
            description: `Lead "${lead?.company_name ?? 'Unknown'}" bulk-updated to ${newStatus}`,
          });
        })
      );
      toast.success(`${selectedIds.size} lead(s) updated to ${newStatus}`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message || "Bulk status update failed");
    } finally {
      setBulkActionPending(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkActionPending(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteLead.mutateAsync(id)));
      toast.success(`${selectedIds.size} lead(s) deleted`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message || "Bulk delete failed");
    } finally {
      setBulkActionPending(false);
      setBulkDeleteOpen(false);
    }
  };

  // Bulk export selected
  const handleBulkExport = () => {
    const selected = leads.filter(l => selectedIds.has(l.id));
    exportToCSV(selected, "leads-selected", [
      { header: "Company Name", accessor: (r) => r.company_name },
      { header: "Decision Maker", accessor: (r) => r.decision_maker_name },
      { header: "Email", accessor: (r) => r.decision_maker_email },
      { header: "Phone", accessor: (r) => r.decision_maker_phone },
      { header: "Title", accessor: (r) => r.decision_maker_title },
      { header: "Headcount", accessor: (r) => r.headcount },
      { header: "Industry", accessor: (r) => r.industry },
      { header: "State", accessor: (r) => r.state },
      { header: "Trigger Event", accessor: (r) => r.trigger_event },
      { header: "Status", accessor: (r) => r.status },
      { header: "Source", accessor: (r) => r.source },
      { header: "AI Pitch Summary", accessor: (r) => r.ai_pitch_summary },
      { header: "Created Date", accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
    ]);
    toast.success(`Exported ${selected.length} lead(s)`);
  };

  const handleFormSubmit = async (values: LeadFormValues) => {
    try {
      const payload = {
        company_name: values.company_name,
        decision_maker_name: values.decision_maker_name || null,
        decision_maker_email: values.decision_maker_email || null,
        decision_maker_phone: values.decision_maker_phone || null,
        decision_maker_title: values.decision_maker_title || null,
        headcount: values.headcount || null,
        industry: values.industry || null,
        website: values.website || null,
        state: values.state || null,
        trigger_event: values.trigger_event || null,
        status: values.status || "new",
      };
      if (editingLead) {
        await updateLead.mutateAsync({ id: editingLead.id, ...payload });
        toast.success("Lead updated");
      } else {
        await createLead.mutateAsync(payload);
        toast.success("Lead created");
      }
      setDialogOpen(false);
      setEditingLead(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save lead");
    }
  };

  const handleStatusAction = async (lead: Lead, newStatus: string, activityType: string, activityDesc: string) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, status: newStatus });
      await createActivity.mutateAsync({ type: activityType, description: activityDesc });
      toast.success(`Lead marked as ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  // Initiate conversion — check knockout first
  const initiateConvert = useCallback((lead: Lead) => {
    const result = checkKnockoutLocal(lead.industry, knockoutRules);
    if (result.tier === 'clear') {
      setConvertLead(lead);
      setKnockoutDialogType(null);
      setKnockoutDialogResult(null);
    } else {
      setConvertLead(lead);
      setKnockoutDialogType(result.tier);
      setKnockoutDialogResult(result);
    }
  }, [knockoutRules]);

  const handleConvert = async (addConditionsToNotes = false) => {
    if (!convertLead) return;
    setConverting(true);
    try {
      const company = await createCompany.mutateAsync({
        name: convertLead.company_name,
        industry: convertLead.industry,
        website: convertLead.website,
        employees: convertLead.headcount,
      });

      const nameParts = (convertLead.decision_maker_name ?? "").split(" ");
      const contact = await createContact.mutateAsync({
        first_name: nameParts[0] || convertLead.company_name,
        last_name: nameParts.slice(1).join(" ") || "-",
        email: convertLead.decision_maker_email,
        phone: convertLead.decision_maker_phone,
        job_title: convertLead.decision_maker_title,
        company: convertLead.company_name,
      });

      let dealNotes: string | undefined;
      if (addConditionsToNotes && knockoutDialogResult) {
        const conditionNotes = knockoutDialogResult.matchedRules
          .filter(r => r.conditions)
          .map(r => `${r.industry_name}: ${r.conditions}`)
          .join('\n');
        dealNotes = conditionNotes ? `BLUEFIELD CONDITIONS:\n${conditionNotes}` : undefined;
      }

      await createDeal.mutateAsync({
        title: `${convertLead.company_name} - ADP TotalSource`,
        value: 0,
        stage: "qualified",
        contact_id: contact.id,
        company_id: company.id,
        notes: dealNotes,
      });

      await updateLead.mutateAsync({ id: convertLead.id, status: "converted" });
      await createActivity.mutateAsync({
        type: "conversion",
        description: `Lead converted to deal: ${convertLead.company_name}`,
      });

      toast.success("Lead converted to deal successfully");
    } catch (e: any) {
      toast.error(e.message || "Conversion failed");
    } finally {
      setConverting(false);
      setConvertLead(null);
      setKnockoutDialogType(null);
      setKnockoutDialogResult(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLead.mutateAsync(deleteId);
      toast.success("Lead deleted");
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingLead(null);
    setDialogOpen(true);
  };
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: all, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      exportToCSV(all ?? [], "leads", [
        { header: "Company Name", accessor: (r) => r.company_name },
        { header: "Decision Maker", accessor: (r) => r.decision_maker_name },
        { header: "Email", accessor: (r) => r.decision_maker_email },
        { header: "Phone", accessor: (r) => r.decision_maker_phone },
        { header: "Title", accessor: (r) => r.decision_maker_title },
        { header: "Headcount", accessor: (r) => r.headcount },
        { header: "Industry", accessor: (r) => r.industry },
        { header: "State", accessor: (r) => r.state },
        { header: "Trigger Event", accessor: (r) => r.trigger_event },
        { header: "Status", accessor: (r) => r.status },
        { header: "Source", accessor: (r) => r.source },
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Leads</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}Export CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkActionPending}>
                {bulkActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Update Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkStatus("new")}>New</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("contacted")}>Contacted</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("qualified")}>Qualified</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("dismissed")}>Dismissed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleBulkExport} disabled={bulkActionPending}>
            <Download className="h-4 w-4 mr-1" />Export Selected
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} disabled={bulkActionPending}>
            <Trash2 className="h-4 w-4 mr-1" />Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={bulkActionPending}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Decision Maker</TableHead>
              <TableHead className="hidden md:table-cell">Headcount</TableHead>
              <TableHead className="hidden lg:table-cell">Industry</TableHead>
              <TableHead className="hidden lg:table-cell">State</TableHead>
              <TableHead className="hidden xl:table-cell">Trigger Event</TableHead>
              <TableHead className="hidden xl:table-cell">AI Pitch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="font-medium">No leads yet</p>
                      <p className="text-sm mt-1">Start discovering leads to fill your pipeline!</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const ko = knockoutMap.get(lead.id) ?? { tier: 'clear' as const, matchedRules: [], message: '' };
                    return (
                      <TableRow key={lead.id} data-state={selectedIds.has(lead.id) ? "selected" : undefined} className="cursor-pointer" onClick={() => setDetailLead(lead)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                            aria-label={`Select ${lead.company_name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lead.company_name}</TableCell>
                        <TableCell>
                          <div>{lead.decision_maker_name ?? "—"}</div>
                          {lead.decision_maker_title && (
                            <div className="text-xs text-muted-foreground">{lead.decision_maker_title}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{lead.headcount ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.industry ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{lead.state ?? "—"}</TableCell>
                        <TableCell className="hidden xl:table-cell max-w-[200px] truncate">
                          {lead.trigger_event ? (lead.trigger_event.length > 50 ? lead.trigger_event.slice(0, 50) + "…" : lead.trigger_event) : "—"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell max-w-[200px]">
                          {lead.ai_pitch_summary ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate cursor-help">{lead.ai_pitch_summary.length > 80 ? lead.ai_pitch_summary.slice(0, 80) + "…" : lead.ai_pitch_summary}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm text-xs whitespace-pre-wrap">
                                  <p>{lead.ai_pitch_summary}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[lead.status ?? "new"] ?? statusColors.new} variant="outline">
                            {lead.status ?? "new"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <EligibilityBadge tier={ko.tier} message={ko.message} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusAction(lead, "contacted", "status_change", `Lead "${lead.company_name}" marked as contacted`)}>
                                <Phone className="h-4 w-4 mr-2" /> Mark Contacted
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusAction(lead, "qualified", "status_change", `Lead "${lead.company_name}" qualified`)}>
                                <UserCheck className="h-4 w-4 mr-2" /> Qualify
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => initiateConvert(lead)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" /> Convert to Deal
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEmailLead(lead)}>
                                <FileText className="h-4 w-4 mr-2" /> Draft Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusAction(lead, "dismissed", "status_change", `Lead "${lead.company_name}" dismissed`)}>
                                <XCircle className="h-4 w-4 mr-2" /> Dismiss
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(lead)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(lead.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages} ({data.total} leads)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <LeadFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditingLead(null);
        }}
        editingLead={editingLead}
        onSubmit={handleFormSubmit}
        isSubmitting={createLead.isPending || updateLead.isPending}
        knockoutRules={knockoutRules}
      />

      {/* Convert Confirmation — Prohibited */}
      <AlertDialog
        open={!!convertLead && knockoutDialogType === 'prohibited'}
        onOpenChange={(v) => { if (!v) { setConvertLead(null); setKnockoutDialogType(null); setKnockoutDialogResult(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⛔ Industry Prohibited</AlertDialogTitle>
            <AlertDialogDescription>
              This industry is PROHIBITED by ADP TotalSource WC underwriting guidelines. This lead cannot be converted to a deal.
              {knockoutDialogResult && (
                <span className="block mt-2 text-xs text-muted-foreground">
                  Matched: {knockoutDialogResult.matchedRules.map(r => r.industry_name).join(', ')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setConvertLead(null); setKnockoutDialogType(null); setKnockoutDialogResult(null); }}>
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Confirmation — Low Probability */}
      <AlertDialog
        open={!!convertLead && knockoutDialogType === 'low_probability'}
        onOpenChange={(v) => { if (!v) { setConvertLead(null); setKnockoutDialogType(null); setKnockoutDialogResult(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Low Probability Industry</AlertDialogTitle>
            <AlertDialogDescription>
              This industry has a LOW PROBABILITY of approval (95-99% prohibited). Only best-in-class prospects are considered. Are you sure you want to convert?
              {knockoutDialogResult && (
                <span className="block mt-2 text-xs text-muted-foreground">
                  Matched: {knockoutDialogResult.matchedRules.map(r => r.industry_name).join(', ')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConvert()} disabled={converting}>
              {converting ? "Converting…" : "Convert Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Confirmation — Bluefield */}
      <AlertDialog
        open={!!convertLead && knockoutDialogType === 'bluefield'}
        onOpenChange={(v) => { if (!v) { setConvertLead(null); setKnockoutDialogType(null); setKnockoutDialogResult(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🔵 Bluefield Review Required</AlertDialogTitle>
            <AlertDialogDescription>
              This industry requires BLUEFIELD review with specific conditions:
              {knockoutDialogResult && (
                <span className="block mt-2 font-medium">
                  {knockoutDialogResult.matchedRules
                    .filter(r => r.conditions)
                    .map(r => `${r.industry_name}: ${r.conditions}`)
                    .join('\n') || 'No specific conditions listed.'}
                </span>
              )}
              <span className="block mt-2">Proceed with conversion?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConvert(true)} disabled={converting}>
              {converting ? "Converting…" : "Convert with Conditions"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Confirmation — Clear (normal) */}
      <AlertDialog
        open={!!convertLead && knockoutDialogType === null}
        onOpenChange={(v) => !v && setConvertLead(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Lead to Deal</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new Company, Contact, and Deal from "{convertLead?.company_name}". Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConvert()} disabled={converting}>
              {converting ? "Converting…" : "Convert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Lead(s)</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected lead(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkActionPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkActionPending ? "Deleting…" : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailLead && (
        <DraftEmailDialog
          open={!!emailLead}
          onOpenChange={(v) => { if (!v) setEmailLead(null); }}
          mergeFields={{
            contact_name: emailLead.decision_maker_name ?? emailLead.company_name,
            contact_title: emailLead.decision_maker_title ?? "",
            company_name: emailLead.company_name,
            headcount: emailLead.headcount ? String(emailLead.headcount) : "",
          }}
        />
      )}

      <LeadDetailSheet
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(v) => { if (!v) setDetailLead(null); }}
        onLeadUpdated={() => setDetailLead(null)}
        onDraftEmail={(lead) => { setDetailLead(null); setEmailLead(lead); }}
        onConvertToDeal={(lead) => { setDetailLead(null); initiateConvert(lead); }}
      />
    </div>
  );
}
