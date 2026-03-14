import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Company, Contact, Deal } from "@/types/database";
import { useUpdateCompany } from "@/hooks/useCompanies";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Globe, Phone, MapPin, Users, DollarSign,
  Pencil, X, Save, Loader2, Briefcase, Clock, UserCircle,
} from "lucide-react";

/* ── Linked data hooks ────────────────────────────── */

function useLinkedContacts(company: Company | null) {
  return useQuery({
    queryKey: ["company-linked-contacts", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, job_title, company_id, company")
        .or(`company_id.eq.${company!.id},company.ilike.${company!.name}`)
        .order("first_name")
        .limit(20);
      if (error) throw error;
      return data as Pick<Contact, "id" | "first_name" | "last_name" | "email" | "job_title" | "company_id" | "company">[];
    },
    enabled: !!company,
  });
}

function useLinkedDeals(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-linked-deals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, stage")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Pick<Deal, "id" | "title" | "value" | "stage">[];
    },
    enabled: !!companyId,
  });
}

/* ── Helpers ──────────────────────────────────────── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}

function EditRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-1.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

const stageColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  proposal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  closed_won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

/* ── Main Component ───────────────────────────────── */

export default function CompanyDetailSheet({
  company,
  open,
  onOpenChange,
  onCompanyUpdated,
}: {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyUpdated?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Company>>({});
  const updateCompany = useUpdateCompany();
  const queryClient = useQueryClient();

  const { data: linkedContacts, isLoading: contactsLoading } = useLinkedContacts(company);
  const { data: linkedDeals, isLoading: dealsLoading } = useLinkedDeals(company?.id);

  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  if (!company) return null;

  const startEditing = () => {
    setEditData({ ...company });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        name: editData.name ?? company.name,
        industry: editData.industry ?? null,
        employees: editData.employees ?? null,
        revenue: editData.revenue ?? null,
        website: editData.website ?? null,
        phone: editData.phone ?? null,
        address: editData.address ?? null,
      });
      toast.success("Company updated successfully");
      setIsEditing(false);
      onCompanyUpdated?.();
    } catch {
      toast.error("Failed to update company");
    }
  };

  const set = (field: keyof Company, value: string | number | null) =>
    setEditData((prev) => ({ ...prev, [field]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            {isEditing ? (
              <Input
                value={editData.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                className="text-lg font-semibold"
              />
            ) : (
              <SheetTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                {company.name}
              </SheetTitle>
            )}
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={updateCompany.isPending}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSave} disabled={updateCompany.isPending}>
                  {updateCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Industry badge */}
          {!isEditing && company.industry && (
            <Badge variant="secondary">{company.industry}</Badge>
          )}

          {/* Company Fields */}
          <div className="space-y-3">
            {isEditing ? (
              <>
                <EditRow icon={<Building2 className="h-4 w-4" />} label="Industry">
                  <Input value={editData.industry ?? ""} onChange={(e) => set("industry", e.target.value)} placeholder="Industry" />
                </EditRow>
                <EditRow icon={<Users className="h-4 w-4" />} label="Employees">
                  <Input type="number" value={editData.employees ?? ""} onChange={(e) => set("employees", e.target.value ? Number(e.target.value) : null)} placeholder="Employees" />
                </EditRow>
                <EditRow icon={<DollarSign className="h-4 w-4" />} label="Revenue">
                  <Input value={editData.revenue ?? ""} onChange={(e) => set("revenue", e.target.value)} placeholder="Revenue" />
                </EditRow>
                <EditRow icon={<Globe className="h-4 w-4" />} label="Website">
                  <Input value={editData.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="Website" />
                </EditRow>
                <EditRow icon={<Phone className="h-4 w-4" />} label="Phone">
                  <Input value={editData.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="Phone" />
                </EditRow>
                <EditRow icon={<MapPin className="h-4 w-4" />} label="Address">
                  <Input value={editData.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Address" />
                </EditRow>
              </>
            ) : (
              <>
                <InfoRow icon={<Users className="h-4 w-4" />} label="Employees" value={company.employees?.toLocaleString()} />
                <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={company.revenue} />
                <InfoRow
                  icon={<Globe className="h-4 w-4" />}
                  label="Website"
                  value={
                    company.website ? (
                      <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {company.website}
                      </a>
                    ) : null
                  }
                />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={company.phone} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={company.address} />
              </>
            )}
          </div>

          {/* Created date */}
          {!isEditing && company.created_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Created {format(new Date(company.created_at), "MMM d, yyyy")} ({formatDistanceToNow(new Date(company.created_at), { addSuffix: true })})
            </div>
          )}

          {/* Linked Contacts */}
          <Separator />
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              Linked Contacts
            </h3>
            {contactsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !linkedContacts?.length ? (
              <p className="text-xs text-muted-foreground">No linked contacts</p>
            ) : (
              <div className="space-y-2">
                {linkedContacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm rounded-md border border-border p-2">
                    <div>
                      <span className="font-medium">{c.first_name} {c.last_name}</span>
                      {c.job_title && <span className="text-muted-foreground ml-1.5 text-xs">· {c.job_title}</span>}
                    </div>
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline truncate max-w-[140px]">
                        {c.email}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Deals */}
          <Separator />
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Linked Deals
            </h3>
            {dealsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !linkedDeals?.length ? (
              <p className="text-xs text-muted-foreground">No linked deals</p>
            ) : (
              <div className="space-y-2">
                {linkedDeals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm rounded-md border border-border p-2">
                    <span className="font-medium truncate">{d.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.value != null && (
                        <span className="text-xs text-muted-foreground">${Number(d.value).toLocaleString()}</span>
                      )}
                      {d.stage && (
                        <Badge variant="outline" className={`text-xs ${stageColors[d.stage] ?? ""}`}>
                          {d.stage}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline (placeholder) */}
          <Separator />
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Activity
            </h3>
            <p className="text-xs text-muted-foreground">No activity yet</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
