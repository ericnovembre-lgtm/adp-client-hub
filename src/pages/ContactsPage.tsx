import { useState, useEffect } from "react";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from "@/hooks/useContacts";
import { logActivity } from "@/lib/logActivity";
import { exportToCSV } from "@/lib/exportCSV";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/types/database";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Pencil, Trash2, Download, Upload, Loader2, UserPlus, Mail, CheckSquare, X } from "lucide-react";
import ContactDetailSheet from "@/components/ContactDetailSheet";
import DraftEmailDialog from "@/components/DraftEmailDialog";
import CompanyCombobox from "@/components/CompanyCombobox";
import CSVImportDialog from "@/components/CSVImportDialog";

const contactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100, "Max 100 characters"),
  last_name: z.string().trim().min(1, "Last name is required").max(100, "Max 100 characters"),
  email: z.string().trim().email("Invalid email format").max(255).optional().or(z.literal("")),
  phone: z.string().max(30, "Max 30 characters").optional().or(z.literal("")),
  company: z.string().max(200).optional().or(z.literal("")),
  company_id: z.string().uuid().nullable().optional(),
  job_title: z.string().max(200).optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  source: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const statusColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  prospect: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  customer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

function ContactFormDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}) {
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const isEdit = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: contact?.first_name ?? "",
      last_name: contact?.last_name ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      company: contact?.company ?? "",
      company_id: contact?.company_id ?? null,
      job_title: contact?.job_title ?? "",
      status: contact?.status ?? "lead",
      source: contact?.source ?? "",
      notes: contact?.notes ?? "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    try {
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone || null,
        company: values.company || null,
        company_id: values.company_id || null,
        job_title: values.job_title || null,
        status: values.status || null,
        source: values.source || null,
        notes: values.notes || null,
      };
      if (isEdit) {
        await updateContact.mutateAsync({ id: contact.id, ...payload });
        toast.success("Contact updated");
      } else {
        const created = await createContact.mutateAsync(payload);
        await logActivity("note", `Contact created: ${payload.first_name} ${payload.last_name}`, created.id);
        toast.success("Contact created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormItem className="col-span-1">
                <FormLabel>Company</FormLabel>
                <CompanyCombobox
                  value={form.watch("company") ?? ""}
                  companyId={form.watch("company_id") ?? null}
                  onChange={(name, id) => {
                    form.setValue("company", name);
                    form.setValue("company_id", id);
                  }}
                />
                <FormMessage />
              </FormItem>
              <FormField control={form.control} name="job_title" render={({ field }) => (
                <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem><FormLabel>Source</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createContact.isPending || updateContact.isPending}>
                {isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkActionPending, setBulkActionPending] = useState(false);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, isLoading } = useContacts({ page, limit: 25, search: debouncedSearch });
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();

  const filtered = data?.data ?? [];

  // Clear selection on page change
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    setBulkActionPending(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateContact.mutateAsync({ id, status }))
      );
      toast.success(`${selectedIds.size} contact(s) updated to ${status}`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Bulk status update failed");
    }
    setBulkActionPending(false);
  };

  const handleBulkDelete = async () => {
    setBulkActionPending(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteContact.mutateAsync(id)));
      toast.success(`${selectedIds.size} contact(s) deleted`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Bulk delete failed");
    }
    setBulkDeleteOpen(false);
    setBulkActionPending(false);
  };

  const handleBulkExport = () => {
    const selected = filtered.filter(c => selectedIds.has(c.id));
    exportToCSV(selected, "contacts_selected", [
      { header: "First Name", accessor: (r) => r.first_name },
      { header: "Last Name", accessor: (r) => r.last_name },
      { header: "Email", accessor: (r) => r.email },
      { header: "Phone", accessor: (r) => r.phone },
      { header: "Company", accessor: (r) => r.company },
      { header: "Job Title", accessor: (r) => r.job_title },
      { header: "Status", accessor: (r) => r.status },
      { header: "Source", accessor: (r) => r.source },
      { header: "Created Date", accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
    ]);
    toast.success(`Exported ${selected.length} contact(s)`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteContact.mutateAsync(deleteId);
      toast.success("Contact deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
    setDeleteId(null);
  };

  const openEdit = (c: Contact) => { setEditingContact(c); setDialogOpen(true); };
  const openAdd = () => { setEditingContact(null); setDialogOpen(true); };
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: all, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      exportToCSV(all ?? [], "contacts", [
        { header: "First Name", accessor: (r) => r.first_name },
        { header: "Last Name", accessor: (r) => r.last_name },
        { header: "Email", accessor: (r) => r.email },
        { header: "Phone", accessor: (r) => r.phone },
        { header: "Company", accessor: (r) => r.company },
        { header: "Job Title", accessor: (r) => r.job_title },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts…" className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />Import CSV
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}Export CSV
          </Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Contact</Button>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <CheckSquare className="h-4 w-4" /> {selectedIds.size} selected
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={bulkActionPending}>
                {bulkActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Update Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {["lead", "prospect", "customer", "inactive"].map(s => (
                <DropdownMenuItem key={s} onClick={() => handleBulkStatusUpdate(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleBulkExport} disabled={bulkActionPending}>
            <Download className="h-4 w-4 mr-1" /> Export Selected
          </Button>

          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} disabled={bulkActionPending}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} disabled={bulkActionPending}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                <UserPlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">No contacts yet</p>
                <p className="text-sm mt-1">Add your first contact to get started!</p>
              </TableCell></TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id} data-state={selectedIds.has(c.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                      aria-label={`Select ${c.first_name} ${c.last_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <button onClick={() => setDetailContact(c)} className="text-primary hover:underline text-left">
                      {c.first_name} {c.last_name}
                    </button>
                  </TableCell>
                  <TableCell>{c.email ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a> : "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.company ?? "—"}</TableCell>
                  <TableCell>{c.job_title ?? "—"}</TableCell>
                  <TableCell>
                    {c.status ? <Badge className={statusColors[c.status] ?? ""} variant="outline">{c.status}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEmailContact(c)} aria-label="Draft email"><Mail className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} contacts)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {dialogOpen && (
        <ContactFormDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editingContact} />
      )}

      {/* Single delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteContact.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteContact.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteContact.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Contact(s)</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected contact(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactDetailSheet contact={detailContact} open={!!detailContact} onOpenChange={(open) => { if (!open) setDetailContact(null); }} />

      {emailContact && (
        <DraftEmailDialog
          open={!!emailContact}
          onOpenChange={(v) => { if (!v) setEmailContact(null); }}
          mergeFields={{
            contact_name: `${emailContact.first_name} ${emailContact.last_name}`,
            contact_title: emailContact.job_title ?? "",
            company_name: emailContact.company ?? "",
          }}
          contactId={emailContact.id}
        />
      )}

      <CSVImportDialog
        entityType="contacts"
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => setImportOpen(false)}
      />
    </div>
  );
}
