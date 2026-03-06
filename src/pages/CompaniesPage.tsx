import { useState, useMemo } from "react";
import { useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Company } from "@/types/database";
import { exportToCSV } from "@/lib/exportCSV";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, Users, Globe, Phone, DollarSign, Download, Loader2 } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  employees: z.coerce.number().int().positive().optional().or(z.literal("")),
  revenue: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof companySchema>;

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
      employees: company?.employees ?? ("" as any),
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

export default function CompaniesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useCompanies({ page, limit: 24 });
  const deleteCompany = useDeleteCompany();

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    if (!search.trim()) return data.data;
    const q = search.toLowerCase();
    return data.data.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.industry?.toLowerCase().includes(q))
    );
  }, [data?.data, search]);

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

  const openEdit = (c: Company) => { setEditingCompany(c); setDialogOpen(true); };
  const openAdd = () => { setEditingCompany(null); setDialogOpen(true); };
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: all, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      exportToCSV(all ?? [], "companies", [
        { header: "Name", accessor: (r) => r.name },
        { header: "Industry", accessor: (r) => r.industry },
        { header: "Website", accessor: (r) => r.website },
        { header: "Employees", accessor: (r) => r.employees },
        { header: "Revenue", accessor: (r) => r.revenue },
        { header: "Address", accessor: (r) => r.address },
        { header: "Phone", accessor: (r) => r.phone },
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
        <h1 className="text-2xl font-bold text-foreground">Companies</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search companies…" className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}Export CSV
          </Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Company</Button>
        </div>
      </div>

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
          <p className="text-sm mt-1">Add your first company to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="transition-shadow hover:shadow-lg hover:border-primary/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-base truncate flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {c.name}
                  </CardTitle>
                  {c.industry && <Badge variant="secondary" className="text-xs">{c.industry}</Badge>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
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
                  <div className="flex items-center gap-2 truncate"><Globe className="h-3.5 w-3.5 shrink-0" /><a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{c.website}</a></div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} companies)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {dialogOpen && (
        <CompanyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} company={editingCompany} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
