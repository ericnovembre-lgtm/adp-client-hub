import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Deal } from "@/types/database";
import { useUpdateDeal } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { DEAL_STAGES, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from "@/lib/constants";
import { logActivity } from "@/lib/logActivity";
import ActivityTimeline from "@/components/ActivityTimeline";
import DealCoachPanel from "@/components/DealCoachPanel";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DollarSign, CalendarIcon, Building2, User, FileText,
  Pencil, X, Save, Loader2, Clock, GripVertical, Brain,
} from "lucide-react";
import { Link } from "wouter";

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

export default function DealDetailSheet({
  deal,
  contactName,
  companyName,
  open,
  onOpenChange,
  onDealUpdated,
}: {
  deal: Deal | null;
  contactName?: string;
  companyName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDealUpdated?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Deal>>({});
  const [showCoach, setShowCoach] = useState(false);
  const updateDeal = useUpdateDeal();
  const { data: contactsData } = useContacts({ limit: 200 });
  const { data: companiesData } = useCompanies({ limit: 200 });

  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  if (!deal) return null;

  const contactOptions = (contactsData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.first_name} ${c.last_name}`,
  }));

  const companyOptions = (companiesData?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const startEditing = () => {
    setEditData({ ...deal });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditData({});
    setIsEditing(false);
  };

  const set = (field: keyof Deal, value: string | number | null) =>
    setEditData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      const stageChanged = editData.stage && editData.stage !== deal.stage;
      const isClosed = editData.stage === "closed_won" || editData.stage === "closed_lost";
      const wasClosed = deal.stage === "closed_won" || deal.stage === "closed_lost";
      const updates: Partial<Deal> & { id: string } = {
        id: deal.id,
        title: editData.title ?? deal.title,
        value: editData.value,
        stage: editData.stage,
        contact_id: editData.contact_id,
        company_id: editData.company_id,
        expected_close_date: editData.expected_close_date,
        notes: editData.notes,
      };
      if (stageChanged) {
        if (isClosed && !wasClosed) updates.closed_at = new Date().toISOString();
        else if (!isClosed && wasClosed) updates.closed_at = null;
      }
      await updateDeal.mutateAsync(updates);
      if (stageChanged) {
        await logActivity(
          "stage_change",
          `Deal stage changed from "${DEAL_STAGE_LABELS[deal.stage ?? ""] ?? deal.stage}" to "${DEAL_STAGE_LABELS[editData.stage ?? ""] ?? editData.stage}"`,
          editData.contact_id ?? deal.contact_id,
          deal.id,
        );
      }
      toast.success("Deal updated successfully");
      setIsEditing(false);
      onDealUpdated?.();
    } catch {
      toast.error("Failed to update deal");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            {isEditing ? (
              <Input
                value={editData.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
                className="text-lg font-semibold"
              />
            ) : (
              <SheetTitle>{deal.title}</SheetTitle>
            )}
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={updateDeal.isPending}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSave} disabled={updateDeal.isPending}>
                  {updateDeal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Stage */}
          {isEditing ? (
            <EditRow icon={<GripVertical className="h-4 w-4" />} label="Stage">
              <Select value={editData.stage ?? "lead"} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{DEAL_STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EditRow>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {deal.stage && (
                <Badge className={DEAL_STAGE_COLORS[deal.stage] ?? ""} variant="outline">
                  {DEAL_STAGE_LABELS[deal.stage] ?? deal.stage}
                </Badge>
              )}
            </div>
          )}

          {/* Value */}
          <div className="space-y-3">
            {isEditing ? (
              <EditRow icon={<DollarSign className="h-4 w-4" />} label="Value">
                <Input
                  type="number"
                  step="0.01"
                  value={editData.value ?? ""}
                  onChange={(e) => set("value", e.target.value ? Number(e.target.value) : null)}
                  placeholder="Deal value"
                />
              </EditRow>
            ) : (
              <InfoRow
                icon={<DollarSign className="h-4 w-4" />}
                label="Value"
                value={deal.value != null ? `$${deal.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : null}
              />
            )}

            {/* Contact */}
            {isEditing ? (
              <EditRow icon={<User className="h-4 w-4" />} label="Contact">
                <SearchableSelect
                  options={contactOptions}
                  value={editData.contact_id ?? ""}
                  onValueChange={(v) => set("contact_id", v || null)}
                  placeholder="Select contact…"
                  searchPlaceholder="Search contacts…"
                />
              </EditRow>
            ) : (
              <InfoRow icon={<User className="h-4 w-4" />} label="Contact" value={contactName ? <Link href="/contacts" className="text-primary hover:underline">{contactName}</Link> : undefined} />
            )}

            {/* Company */}
            {isEditing ? (
              <EditRow icon={<Building2 className="h-4 w-4" />} label="Company">
                <SearchableSelect
                  options={companyOptions}
                  value={editData.company_id ?? ""}
                  onValueChange={(v) => set("company_id", v || null)}
                  placeholder="Select company…"
                  searchPlaceholder="Search companies…"
                />
              </EditRow>
            ) : (
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Company" value={companyName ? <Link href="/companies" className="text-primary hover:underline">{companyName}</Link> : undefined} />
            )}

            {/* Expected Close Date */}
            {isEditing ? (
              <EditRow icon={<CalendarIcon className="h-4 w-4" />} label="Expected Close Date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editData.expected_close_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData.expected_close_date
                        ? format(new Date(editData.expected_close_date), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={editData.expected_close_date ? new Date(editData.expected_close_date) : undefined}
                      onSelect={(date) => set("expected_close_date", date ? date.toISOString() : null)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </EditRow>
            ) : (
              <InfoRow
                icon={<CalendarIcon className="h-4 w-4" />}
                label="Expected Close"
                value={deal.expected_close_date ? format(new Date(deal.expected_close_date), "MMM d, yyyy") : null}
              />
            )}

            {/* Closed on (read-only) */}
            {!isEditing && deal.closed_at && (deal.stage === "closed_won" || deal.stage === "closed_lost") && (
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Closed on"
                value={format(new Date(deal.closed_at), "MMM d, yyyy")}
              />
            )}
          </div>

          {/* Notes */}
          {isEditing ? (
            <>
              <Separator />
              <EditRow icon={<FileText className="h-4 w-4" />} label="Notes">
                <Textarea
                  value={editData.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Notes"
                  rows={4}
                />
              </EditRow>
            </>
          ) : deal.notes ? (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">{deal.notes}</p>
            </>
          ) : null}
        </div>

        <Separator className="my-6" />

        <ActivityTimeline entityType="deal" entityId={deal.id} />

        {deal.created_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4">
            <Clock className="h-3 w-3" />
            Created {format(new Date(deal.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
