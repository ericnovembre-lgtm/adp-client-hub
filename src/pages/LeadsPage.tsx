import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreHorizontal, Phone, Mail, UserCheck, ArrowRightLeft, XCircle, Pencil, Trash2, Download, Loader2, Users } from "lucide-react";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead } from "@/hooks/useLeads";
import { useCreateCompany } from "@/hooks/useCompanies";
import { useCreateContact } from "@/hooks/useContacts";
import { useCreateDeal } from "@/hooks/useDeals";
import { useCreateActivity } from "@/hooks/useActivities";
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
import { toast } from "sonner";

const leadSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  decision_maker_name: z.string().optional(),
  decision_maker_email: z.string().email().optional().or(z.literal("")),
  decision_maker_phone: z.string().optional(),
  decision_maker_title: z.string().optional(),
  headcount: z.coerce.number().int().positive().optional().or(z.literal(0)),
  industry: z.string().optional(),
  website: z.string().optional(),
  state: z.string().optional(),
  trigger_event: z.string().optional(),
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

function LeadFormDialog({
  open,
  onOpenChange,
  editingLead,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingLead: Lead | null;
  onSubmit: (values: LeadFormValues) => void;
  isSubmitting: boolean;
}) {
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

  // Reset form when dialog opens with different lead
  const handleOpenChange = (v: boolean) => {
    if (!v) form.reset();
    onOpenChange(v);
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
              <Input id="industry" {...form.register("industry")} />
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

  const { data, isLoading } = useLeads({ page, limit: 25 });
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createCompany = useCreateCompany();
  const createContact = useCreateContact();
  const createDeal = useCreateDeal();
  const createActivity = useCreateActivity();

  const filteredLeads = useMemo(() => {
    if (!data?.data) return [];
    if (!search.trim()) return data.data;
    const q = search.toLowerCase();
    return data.data.filter(
      (l) =>
        l.company_name.toLowerCase().includes(q) ||
        (l.decision_maker_name ?? "").toLowerCase().includes(q)
    );
  }, [data?.data, search]);

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

  const handleConvert = async () => {
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

      await createDeal.mutateAsync({
        title: `${convertLead.company_name} - ADP TotalSource`,
        value: 0,
        stage: "qualified",
        contact_id: contact.id,
        company_id: company.id,
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

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Decision Maker</TableHead>
              <TableHead className="hidden md:table-cell">Headcount</TableHead>
              <TableHead className="hidden lg:table-cell">Industry</TableHead>
              <TableHead className="hidden lg:table-cell">State</TableHead>
              <TableHead className="hidden xl:table-cell">Trigger Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="font-medium">No leads yet</p>
                      <p className="text-sm mt-1">Start discovering leads to fill your pipeline!</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
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
                      <TableCell>
                        <Badge className={statusColors[lead.status ?? "new"] ?? statusColors.new} variant="outline">
                          {lead.status ?? "new"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
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
                            <DropdownMenuItem onClick={() => setConvertLead(lead)}>
                              <ArrowRightLeft className="h-4 w-4 mr-2" /> Convert to Deal
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
                  ))
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
      />

      {/* Convert Confirmation */}
      <AlertDialog open={!!convertLead} onOpenChange={(v) => !v && setConvertLead(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Lead to Deal</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new Company, Contact, and Deal from "{convertLead?.company_name}". Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvert} disabled={converting}>
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
    </div>
  );
}
