import { useState, useEffect, useCallback } from "react";
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Company } from "@/types/database";
import { exportToCSV } from "@/lib/exportCSV";
import { supabase } from "@/integrations/supabase/client";
import CompanyDetailSheet from "@/components/CompanyDetailSheet";
import CSVImportDialog from "@/components/CSVImportDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, Users, Globe, Phone, DollarSign, Download, Upload, Loader2, X } from "lucide-react";

/* ── Company Form Schema ─────────────────────────── */

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200, "Max 200 characters"),
  industry: z.string().max(200).optional().or(z.literal("")),
  website: z.string().max(500).optional().or(z.literal("")),
  employees: z.coerce.number().int().min(0, "Must be 0 or more").optional().or(z.literal("")),
  revenue: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof companySchema>;

/* ── Company Form Dialog ─────────────────────────── */

function CompanyFormDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}) {
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const isEdit = !!company;

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name ?? "",
      industry: company?.industry ?? "",
      website: company?.website ?? "",
      employees: company?.employees ?? undefined,
      revenue: company?.revenue ?? "",
      address: company?.address ?? "",
      phone: company?.phone ?? "",
    },
  });

  const onSubmit = async (values: CompanyFormValues) => {
    try {
      const payload = {
        name: values.name,
        industry: (values.industry as string) || null,
        website: (values.website as string) || null,
        employees: typeof values.employees === "number" ? values.employees : null,
        revenue: (values.revenue as string) || null,
        address: (values.address as string) || null,
        phone: (values.phone as string) || null,
      };
      if (isEdit) {
        await updateCompany.mutateAsync({ id: company.id, ...payload });
        toast.success("Company updated");
      } else {
        await createCompany.mutateAsync(payload);
        toast.success("Company created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="industry" render={({ field }) => (
                <FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="employees" render={({ field }) => (
                <FormItem><FormLabel>Employees</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="revenue" render={({ field }) => (
                <FormItem><FormLabel>Revenue</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="website" render={({ field }) => (
              <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending}>
                {isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ── CSV Column Definitions ──────────────────────── */

const CSV_COLUMNS = [
  { header: "Name", accessor: (r: Company) => r.name },
  { header: "Industry", accessor: (r: Company) => r.industry },
  { header: "Website", accessor: (r: Company) => r.website },
  { header: "Employees", accessor: (r: Company) => r.employees },
  { header: "Revenue", accessor: (r: Company) => r.revenue },
  { header: "Address", accessor: (r: Company) => r.address },
  { header: "Phone", accessor: (r: Company) => r.phone },
  { header: "Created Date", accessor: (r: Company) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
];

/* ── Main Page ───────────────────────────────────── */

export default function CompaniesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailCompany, setDetailCompany] = useState<Company | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Bulk selection
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

  // Clear selection on page change
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  const { data, isLoading } = useCompanies({ page, limit: 24, search: debouncedSearch });
  const deleteCompany = useDeleteCompany();

  const filtered = data?.data ?? [];

  // Selection helpers
  const allVisibleSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }, [allVisibleSelected, filtered]);

  // Single delete
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCompany.mutateAsync(deleteId);
      toast.success("Company deleted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
    setDeleteId(null);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkActionPending(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteCompany.mutateAsync(id)));
      toast.success(`${selectedIds.size} company(ies) deleted`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Bulk delete failed");
    }
    setBulkActionPending(false);
    setBulkDeleteOpen(false);
  };

  // Bulk export
  const handleBulkExport = () => {
    const selected = filtered.filter((c) => selectedIds.has(c.id));
    exportToCSV(selected, "companies-selected", CSV_COLUMNS);
    toast.success(`Exported ${selected.length} companies`);
  };

  // Full export
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: all, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      exportToCSV(all ?? [], "companies", CSV_COLUMNS);
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
    setExporting(false);
  };

  const openEdit = (c: Company) => { setEditingCompany(c); setDialogOpen(true); };
  const openAdd = () => { setEditingCompany(null); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          {filtered.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search companies…" className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />Import CSV
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}Export CSV
          </Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Company</Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={handleBulkExport}>
            <Download className="h-4 w-4 mr-1" />Export Selected
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        </div>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium">No companies yet</p>
          <p className="text-sm mt-1 max-w-md mx-auto">Companies are automatically created when you convert leads, or add them manually.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />Add Company
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="transition-shadow hover:shadow-lg hover:border-primary/20 cursor-pointer"
              onClick={() => setDetailCompany(c)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Checkbox
                    checked={selectedIds.has(c.id)}
                    onCheckedChange={() => toggleSelect(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${c.name}`}
                    className="mt-1"
                  />
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base truncate flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {c.name}
                    </CardTitle>
                    {c.industry && <Badge variant="secondary" className="text-xs">{c.industry}</Badge>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {c.employees != null && (
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{c.employees.toLocaleString()} employees</div>
                )}
                {c.revenue && (
                  <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" />{c.revenue}</div>
                )}
                {c.website && (
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <a
                      href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.website}
                    </a>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} companies)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      {dialogOpen && (
        <CompanyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} company={editingCompany} />
      )}

      {/* Detail Sheet */}
      <CompanyDetailSheet
        company={detailCompany}
        open={!!detailCompany}
        onOpenChange={(open) => { if (!open) setDetailCompany(null); }}
        onCompanyUpdated={() => setDetailCompany(null)}
      />

      {/* Single Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCompany.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteCompany.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Companies</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {selectedIds.size} company(ies). This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkActionPending}>
              {bulkActionPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete {selectedIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CSVImportDialog
        entityType="companies"
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => setImportOpen(false)}
      />
    </div>
  );
}
