import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import type { Lead } from "@/types/database";
import { useUpdateLead } from "@/hooks/useLeads";
import { useKnockoutRules } from "@/hooks/useKnockoutRules";
import { checkKnockoutLocal } from "@/lib/knockoutLocal";
import EligibilityBadge from "@/components/EligibilityBadge";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, User, Mail, Phone, Globe, MapPin, Users, Briefcase,
  Zap, Clock, Sparkles, Tag, Pencil, X, Save, Loader2, FileText, ArrowRightLeft,
} from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  dismissed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const STATUS_OPTIONS = ["new", "contacted", "qualified", "converted", "dismissed"];
const TRIGGER_TYPE_OPTIONS = ["latent_need", "active_trigger"];

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

export default function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onLeadUpdated,
  onDraftEmail,
  onConvertToDeal,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated?: () => void;
  onDraftEmail?: (lead: Lead) => void;
  onConvertToDeal?: (lead: Lead) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const updateLead = useUpdateLead();

  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  if (!lead) return null;

  const startEditing = () => {
    setEditData({ ...lead });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        company_name: editData.company_name ?? lead.company_name,
        status: editData.status,
        source: editData.source,
        industry: editData.industry,
        headcount: editData.headcount,
        state: editData.state,
        website: editData.website,
        decision_maker_name: editData.decision_maker_name,
        decision_maker_title: editData.decision_maker_title,
        decision_maker_email: editData.decision_maker_email,
        decision_maker_phone: editData.decision_maker_phone,
        trigger_type: editData.trigger_type,
        trigger_event: editData.trigger_event,
        ai_pitch_summary: editData.ai_pitch_summary,
      });
      toast.success("Lead updated successfully");
      setIsEditing(false);
      onLeadUpdated?.();
    } catch {
      toast.error("Failed to update lead");
    }
  };

  const set = (field: keyof Lead, value: string | number | null) =>
    setEditData((prev) => ({ ...prev, [field]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            {isEditing ? (
              <Input
                value={editData.company_name ?? ""}
                onChange={(e) => set("company_name", e.target.value)}
                className="text-lg font-semibold"
              />
            ) : (
              <SheetTitle>{lead.company_name}</SheetTitle>
            )}
            {!isEditing ? (
              <Button variant="ghost" size="icon" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={updateLead.isPending}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSave} disabled={updateLead.isPending}>
                  {updateLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Status & Source */}
          {isEditing ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <Select value={editData.status ?? "new"} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <span className="text-xs text-muted-foreground">Source</span>
                <Input value={editData.source ?? ""} onChange={(e) => set("source", e.target.value)} placeholder="Source" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColors[lead.status ?? "new"] ?? statusColors.new} variant="outline">
                {lead.status ?? "new"}
              </Badge>
              {lead.source && <Badge variant="secondary">{lead.source}</Badge>}
            </div>
          )}

          {/* Company Info */}
          <div className="space-y-3">
            {isEditing ? (
              <>
                <EditRow icon={<Building2 className="h-4 w-4" />} label="Industry">
                  <Input value={editData.industry ?? ""} onChange={(e) => set("industry", e.target.value)} placeholder="Industry" />
                </EditRow>
                <EditRow icon={<Users className="h-4 w-4" />} label="Headcount">
                  <Input type="number" value={editData.headcount ?? ""} onChange={(e) => set("headcount", e.target.value ? Number(e.target.value) : null)} placeholder="Headcount" />
                </EditRow>
                <EditRow icon={<MapPin className="h-4 w-4" />} label="State">
                  <Input value={editData.state ?? ""} onChange={(e) => set("state", e.target.value)} placeholder="State" />
                </EditRow>
                <EditRow icon={<Globe className="h-4 w-4" />} label="Website">
                  <Input value={editData.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="Website" />
                </EditRow>
              </>
            ) : (
              <>
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Industry" value={lead.industry} />
                <InfoRow icon={<Users className="h-4 w-4" />} label="Headcount" value={lead.headcount?.toLocaleString()} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="State" value={lead.state} />
                <InfoRow
                  icon={<Globe className="h-4 w-4" />}
                  label="Website"
                  value={
                    lead.website ? (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {lead.website}
                      </a>
                    ) : null
                  }
                />
              </>
            )}
          </div>

          <Separator />

          {/* Decision Maker */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Decision Maker</h3>
            <div className="space-y-3">
              {isEditing ? (
                <>
                  <EditRow icon={<User className="h-4 w-4" />} label="Name">
                    <Input value={editData.decision_maker_name ?? ""} onChange={(e) => set("decision_maker_name", e.target.value)} placeholder="Name" />
                  </EditRow>
                  <EditRow icon={<Briefcase className="h-4 w-4" />} label="Title">
                    <Input value={editData.decision_maker_title ?? ""} onChange={(e) => set("decision_maker_title", e.target.value)} placeholder="Title" />
                  </EditRow>
                  <EditRow icon={<Mail className="h-4 w-4" />} label="Email">
                    <Input type="email" value={editData.decision_maker_email ?? ""} onChange={(e) => set("decision_maker_email", e.target.value)} placeholder="Email" />
                  </EditRow>
                  <EditRow icon={<Phone className="h-4 w-4" />} label="Phone">
                    <Input value={editData.decision_maker_phone ?? ""} onChange={(e) => set("decision_maker_phone", e.target.value)} placeholder="Phone" />
                  </EditRow>
                </>
              ) : (
                <>
                  <InfoRow icon={<User className="h-4 w-4" />} label="Name" value={lead.decision_maker_name} />
                  <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Title" value={lead.decision_maker_title} />
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={
                      lead.decision_maker_email ? (
                        <a href={`mailto:${lead.decision_maker_email}`} className="text-primary hover:underline">
                          {lead.decision_maker_email}
                        </a>
                      ) : null
                    }
                  />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.decision_maker_phone} />
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Trigger */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Trigger Event</h3>
            <div className="space-y-3">
              {isEditing ? (
                <>
                  <EditRow icon={<Tag className="h-4 w-4" />} label="Type">
                    <Select value={editData.trigger_type ?? "latent_need"} onValueChange={(v) => set("trigger_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </EditRow>
                  <EditRow icon={<Zap className="h-4 w-4" />} label="Event">
                    <Textarea value={editData.trigger_event ?? ""} onChange={(e) => set("trigger_event", e.target.value)} placeholder="Trigger event" rows={2} />
                  </EditRow>
                </>
              ) : (
                <>
                  <InfoRow icon={<Tag className="h-4 w-4" />} label="Type" value={lead.trigger_type} />
                  <InfoRow icon={<Zap className="h-4 w-4" />} label="Event" value={lead.trigger_event} />
                </>
              )}
            </div>
          </div>

          {/* AI Pitch Summary */}
          {(lead.ai_pitch_summary || isEditing) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Pitch Summary
                </h3>
                {isEditing ? (
                  <Textarea
                    value={editData.ai_pitch_summary ?? ""}
                    onChange={(e) => set("ai_pitch_summary", e.target.value)}
                    placeholder="AI pitch summary"
                    rows={5}
                  />
                ) : (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 text-sm whitespace-pre-wrap leading-relaxed">
                      {lead.ai_pitch_summary}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          {!isEditing && (onDraftEmail || onConvertToDeal) && (
            <>
              <Separator />
              <div className="flex gap-2">
                {onDraftEmail && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { onDraftEmail(lead); onOpenChange(false); }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Draft Email
                  </Button>
                )}
                {onConvertToDeal && lead.status !== "converted" && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { onConvertToDeal(lead); onOpenChange(false); }}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Convert to Deal
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Created date */}
          {lead.created_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Clock className="h-3 w-3" />
              Created {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
