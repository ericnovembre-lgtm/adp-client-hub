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

function LeadFormDialog({ open, setOpen, onCreate }: { open: boolean; setOpen: (open: boolean) => void; onCreate?: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
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
    }
  });
  const createLead = useCreateLead();

  const onSubmit = async (values: LeadFormValues) => {
    try {
      await createLead.mutateAsync(values);
      toast.success("Lead created successfully");
      reset();
      setOpen(false);
      onCreate?.();
    } catch (error) {
      toast.error("Failed to create lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="company_name" className="text-right">
              Company Name
            </Label>
            <Input id="company_name" className="col-span-3" {...register("company_name")} />
            {errors.company_name && (
              <div className="col-span-4 text-red-500 text-sm">{errors.company_name.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="decision_maker_name" className="text-right">
              Decision Maker
            </Label>
            <Input id="decision_maker_name" className="col-span-3" {...register("decision_maker_name")} />
            {errors.decision_maker_name && (
              <div className="col-span-4 text-red-500 text-sm">{errors.decision_maker_name.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="decision_maker_email" className="text-right">
              Email
            </Label>
            <Input id="decision_maker_email" className="col-span-3" type="email" {...register("decision_maker_email")} />
            {errors.decision_maker_email && (
              <div className="col-span-4 text-red-500 text-sm">{errors.decision_maker_email.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="decision_maker_phone" className="text-right">
              Phone
            </Label>
            <Input id="decision_maker_phone" className="col-span-3" {...register("decision_maker_phone")} />
            {errors.decision_maker_phone && (
              <div className="col-span-4 text-red-500 text-sm">{errors.decision_maker_phone.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="decision_maker_title" className="text-right">
              Title
            </Label>
            <Input id="decision_maker_title" className="col-span-3" {...register("decision_maker_title")} />
            {errors.decision_maker_title && (
              <div className="col-span-4 text-red-500 text-sm">{errors.decision_maker_title.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="headcount" className="text-right">
              Headcount
            </Label>
            <Input id="headcount" className="col-span-3" type="number" {...register("headcount")} />
            {errors.headcount && (
              <div className="col-span-4 text-red-500 text-sm">{errors.headcount.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="industry" className="text-right">
              Industry
            </Label>
            <Input id="industry" className="col-span-3" {...register("industry")} />
            {errors.industry && (
              <div className="col-span-4 text-red-500 text-sm">{errors.industry.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="website" className="text-right">
              Website
            </Label>
            <Input id="website" className="col-span-3" {...register("website")} />
            {errors.website && (
              <div className="col-span-4 text-red-500 text-sm">{errors.website.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="state" className="text-right">
              State
            </Label>
            <Input id="state" className="col-span-3" {...register("state")} />
            {errors.state && (
              <div className="col-span-4 text-red-500 text-sm">{errors.state.message}</div>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="trigger_event" className="text-right">
              Trigger Event
            </Label>
            <Textarea id="trigger_event" className="col-span-3" {...register("trigger_event")} />
            {errors.trigger_event && (
              <div className="col-span-4 text-red-500 text-sm">{errors.trigger_event.message}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  Creating <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLeadDialog({ open, setOpen, lead, onDelete }: { open: boolean; setOpen: (open: boolean) => void; lead: Lead | null; onDelete?: () => void }) {
  const deleteLead = useDeleteLead();

  const onConfirmDelete = async () => {
    if (!lead) return;
    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success("Lead deleted successfully");
      setOpen(false);
      onDelete?.();
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the lead and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmDelete} disabled={deleteLead.isPending}>
            {deleteLead.isPending ? (
              <>
                Deleting <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<keyof Lead>("company_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isDraftEmailDialogOpen, setIsDraftEmailDialogOpen] = useState(false);
  const [leadForDraftEmail, setLeadForDraftEmail] = useState<Lead | null>(null);
  const [isLeadDetailSheetOpen, setIsLeadDetailSheetOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const leads = useLeads({ search, sort, sortDirection, status: statusFilter });
  const { data: knockoutRules } = useKnockoutRules();
  const createCompany = useCreateCompany();
  const createContact = useCreateContact();
  const createDeal = useCreateDeal();
  const createActivity = useCreateActivity();

  const filteredLeads = useMemo(() => {
    if (!leads.data) return [];

    let filtered = [...leads.data];

    // Multi-select filter (AND)
    // if (selectedStatuses.length) {
    //   filtered = filtered.filter(lead => selectedStatuses.includes(lead.status ?? 'new'));
    // }

    return filtered;
  }, [leads.data]);

  const sortedLeads = useMemo(() => {
    const sorted = [...filteredLeads];
    sorted.sort((a, b) => {
      const aValue = a[sort] ?? "";
      const bValue = b[sort] ?? "";

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return 0;
    });
    return sorted;
  }, [filteredLeads, sort, sortDirection]);

  const allLeadsSelected = useMemo(() => {
    return sortedLeads.length > 0 && selectedLeads.length === sortedLeads.length;
  }, [sortedLeads, selectedLeads]);

  const handleSelectAllLeads = useCallback(() => {
    if (allLeadsSelected) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(sortedLeads.map(lead => lead.id));
    }
  }, [allLeadsSelected, sortedLeads, setSelectedLeads]);

  const handleSelectLead = useCallback((leadId: string) => {
    setSelectedLeads(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  }, [setSelectedLeads]);

  const onLeadUpdated = useCallback(() => {
    leads.refetch();
  }, [leads]);

  const onCreateLead = useCallback(() => {
    leads.refetch();
  }, [leads]);

  const onDeleteLead = useCallback(() => {
    leads.refetch();
  }, [leads]);

  const onDraftEmail = useCallback((lead: Lead) => {
    setLeadForDraftEmail(lead);
    setIsDraftEmailDialogOpen(true);
  }, [setLeadForDraftEmail, setIsDraftEmailDialogOpen]);

  const onConvertToDeal = useCallback(async (lead: Lead) => {
    try {
      // 1. Create company
      const company = await createCompany.mutateAsync({ name: lead.company_name, industry: lead.industry, website: lead.website, state: lead.state, headcount: lead.headcount });
      toast.success("Company created");

      // 2. Create contact
      const contact = await createContact.mutateAsync({
        company_id: company.id,
        first_name: lead.decision_maker_name,
        email: lead.decision_maker_email,
        phone: lead.decision_maker_phone,
        title: lead.decision_maker_title,
      });
      toast.success("Contact created");

      // 3. Create deal
      const deal = await createDeal.mutateAsync({
        company_id: company.id,
        contact_id: contact.id,
        name: `Deal for ${lead.company_name}`,
        stage: "new",
      });
      toast.success("Deal created");

      // 4. Create activity
      await createActivity.mutateAsync({
        company_id: company.id,
        contact_id: contact.id,
        deal_id: deal.id,
        type: "note",
        subject: lead.trigger_event ?? "Lead converted to deal",
        body: `Lead converted to deal. Trigger event: ${lead.trigger_event}`,
      });
      toast.success("Activity created");

      // 5. Update lead status to converted
      const updateLead = useUpdateLead();
      await updateLead.mutateAsync({ id: lead.id, status: "converted" });
      toast.success("Lead converted to deal");
      leads.refetch();
    } catch (error) {
      console.error(error);
      toast.error("Failed to convert lead to deal");
    }
  }, [createCompany, createContact, createDeal, createActivity, leads]);

  return (
    <div className="container relative">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          {leads.isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {leads.isError ? <Badge variant="destructive">Error</Badge> : null}
        </div>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={statusFilter ?? "all"} onValueChange={(value) => setStatusFilter(value === "all" ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => exportToCSV(sortedLeads, "leads.csv")} disabled={leads.isLoading || leads.isError}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>
      <div className="py-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allLeadsSelected}
                    onCheckedChange={handleSelectAllLeads}
                    aria-label="Select all leads"
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSort("company_name");
                  setSortDirection(sort === "company_name" && sortDirection === "asc" ? "desc" : "asc");
                }}>
                  Company Name
                  {sort === "company_name" && (sortDirection === "asc" ? " ▲" : " ▼")}
                </TableHead>
                <TableHead>Decision Maker</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  setSort("status");
                  setSortDirection(sort === "status" && sortDirection === "asc" ? "desc" : "asc");
                }}>
                  Status
                  {sort === "status" && (sortDirection === "asc" ? " ▲" : " ▼")}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.isLoading && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium"><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell className="text-right"><Skeleton /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {leads.data?.length === 0 && !leads.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No leads found.</TableCell>
                </TableRow>
              ) : null}
              {sortedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => handleSelectLead(lead.id)}
                      aria-label={`Select lead ${lead.company_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.company_name}</TableCell>
                  <TableCell>
                    {lead.decision_maker_name}
                    {lead.decision_maker_title ? `, ${lead.decision_maker_title}` : null}
                  </TableCell>
                  <TableCell>
                    {lead.decision_maker_email ? (
                      <a href={`mailto:${lead.decision_maker_email}`} className="text-primary hover:underline block">
                        {lead.decision_maker_email}
                      </a>
                    ) : null}
                    {lead.decision_maker_phone ? (
                      <a href={`tel:${lead.decision_maker_phone}`} className="text-primary hover:underline block">
                        {lead.decision_maker_phone}
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status ?? "new"] ?? statusColors.new} variant="outline">
                      {lead.status ?? "new"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedLead(lead); setIsLeadDetailSheetOpen(true); }}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDraftEmail(lead)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Draft Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onConvertToDeal(lead)}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Convert to Deal
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setLeadToDelete(lead); setIsDeleteDialogOpen(true); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <LeadFormDialog open={isCreateDialogOpen} setOpen={setIsCreateDialogOpen} onCreate={onCreateLead} />

      <DeleteLeadDialog
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        lead={leadToDelete}
        onDelete={onDeleteLead}
      />

      <DraftEmailDialog
        open={isDraftEmailDialogOpen}
        setOpen={setIsDraftEmailDialogOpen}
        lead={leadForDraftEmail}
      />

      <LeadDetailSheet
        lead={selectedLead}
        open={isLeadDetailSheetOpen}
        onOpenChange={setIsLeadDetailSheetOpen}
        onLeadUpdated={onLeadUpdated}
        onDraftEmail={onDraftEmail}
        onConvertToDeal={onConvertToDeal}
      />
    </div>
  );
}
