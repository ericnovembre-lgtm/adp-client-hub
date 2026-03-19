import { useState, useEffect, useMemo } from "react";
import CallPrepPanel from "@/components/CallPrepPanel";
import FollowUpSequencePanel from "@/components/FollowUpSequencePanel";
import QuoteReadinessPanel from "@/components/QuoteReadinessPanel";
import BattlecardPanel from "@/components/BattlecardPanel";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import type { Lead } from "@/types/database";
import { useUpdateLead } from "@/hooks/useLeads";
import { useKnockoutRules } from "@/hooks/useKnockoutRules";
import { checkKnockoutLocal } from "@/lib/checkKnockoutFromRules";
import { LEAD_STATUS_COLORS_DETAIL, HEADCOUNT_MIN, HEADCOUNT_MAX } from "@/lib/constants";
import EligibilityBadge from "@/components/EligibilityBadge";
import ActivityTimeline from "@/components/ActivityTimeline";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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
  Zap, Clock, Sparkles, Tag, Pencil, X, Save, Loader2, FileText, ArrowRightLeft, Target,
  RefreshCw, CheckCircle2, AlertTriangle, SearchCheck, ListChecks, ClipboardCheck, Swords,
} from "lucide-react";
import { useLeadScore, type ScoreFactor } from "@/hooks/useLeadScores";
import { Progress } from "@/components/ui/progress";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  B: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  D: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function LeadScoreSection({ leadId, lead }: { leadId: string; lead: Lead }) {
  const { score } = useLeadScore(leadId);
  const status = lead.status ?? "new";
  const isPreQualified = ["new", "contacted"].includes(status);

  const handleRescore = () => {
    window.dispatchEvent(new CustomEvent("agent-panel-message", {
      detail: { message: `Re-score the lead ${lead.company_name} and update the results` }
    }));
  };

  return (
    <>
      <Separator />
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            Lead Score
          </h3>
          {score && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleRescore}>
              <RefreshCw className="h-3 w-3" />
              Re-score
            </Button>
          )}
        </div>
        {score ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-foreground">{score.score}<span className="text-lg text-muted-foreground font-normal">/100</span></span>
              <Badge variant="outline" className={GRADE_COLORS[score.grade] ?? ""}>{score.grade}</Badge>
            </div>
            {/* Qualification banners */}
            {isPreQualified && score.score >= 60 && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                This lead qualifies for outreach — Grade {score.grade} with a score of {score.score}/100
              </div>
            )}
            {isPreQualified && score.score < 40 && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-3 text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Low priority — review scoring factors before investing time
              </div>
            )}
            {score.factors.length > 0 && (
              <div className="space-y-2">
                {score.factors.map((f: ScoreFactor, i: number) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{f.factor}</span>
                      <span className="text-muted-foreground">{f.points}/{f.max}</span>
                    </div>
                    <Progress value={f.max > 0 ? (f.points / f.max) * 100 : 0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-0.5">{f.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">No score available yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("agent-panel-message", {
                  detail: { message: `Score the lead ${lead.company_name} — evaluate headcount fit, industry knockout rules, trigger event quality, decision maker seniority, and contact completeness` }
                }));
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Score This Lead
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

const statusColors = LEAD_STATUS_COLORS_DETAIL;

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
  const [isEnriching, setIsEnriching] = useState(false);
  const [deepEnrichResult, setDeepEnrichResult] = useState<any>(null);
  const [showCallPrep, setShowCallPrep] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showQuoteReadiness, setShowQuoteReadiness] = useState(false);
  const [showBattlecard, setShowBattlecard] = useState(false);
  const updateLead = useUpdateLead();
  const _queryClient = useQueryClient();
  const { data: knockoutRules = [] } = useKnockoutRules();

  const knockoutResult = useMemo(() => {
    if (!lead) return null;
    return checkKnockoutLocal(lead.industry, knockoutRules);
  }, [lead?.industry, knockoutRules]);

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

  const needsEnrichment = !lead.headcount || !lead.decision_maker_email;

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead", {
        body: { lead_id: lead.id },
      });
      if (error) throw error;
      if (data?.error === "apollo_not_configured") {
        toast.error("Apollo API key is not configured. Go to Settings to add it.");
        return;
      }
      if (data?.error) throw new Error(data.error);
      if (data.enriched_count > 0) {
        toast.success(`Enriched: ${data.enriched_fields.join(", ")}`);
        onLeadUpdated?.();
      } else {
        toast.info("No additional data found in Apollo for this lead.");
      }
    } catch {
      toast.error("Failed to enrich lead");
    } finally {
      setIsEnriching(false);
    }
  };

  const editHeadcount = editData.headcount;
  const headcountOutOfTerritory = isEditing && editHeadcount != null && editHeadcount > 0 &&
    (editHeadcount < HEADCOUNT_MIN || editHeadcount > HEADCOUNT_MAX);

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
              {knockoutResult && <EligibilityBadge tier={knockoutResult.tier} message={knockoutResult.message} />}
            </div>
          )}

          {/* Knockout Warning */}
          {!isEditing && knockoutResult && knockoutResult.tier !== 'clear' && (
            <div className={`rounded-md border p-3 text-xs ${
              knockoutResult.tier === 'prohibited' ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300' :
              knockoutResult.tier === 'low_probability' ? 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300' :
              'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              {knockoutResult.message}
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
                  {headcountOutOfTerritory && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      ⚠️ This headcount is outside your down market territory ({HEADCOUNT_MIN}–{HEADCOUNT_MAX} employees)
                    </p>
                  )}
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

          {/* Lead Score */}
          <LeadScoreSection leadId={lead.id} lead={lead} />

          {/* Action Buttons */}
          {!isEditing && (
            <>
              <Separator />
              <div className="flex gap-2 flex-wrap">
                {needsEnrichment && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleEnrich}
                    disabled={isEnriching}
                  >
                    {isEnriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SearchCheck className="h-4 w-4 mr-2" />}
                    {isEnriching ? "Enriching…" : "Enrich Lead"}
                  </Button>
                )}
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCallPrep((v) => !v)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {showCallPrep ? "Hide Prep" : "Prep Call"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowFollowUp((v) => !v)}
                >
                  <ListChecks className="h-4 w-4 mr-2" />
                  {showFollowUp ? "Hide Sequence" : "Follow-Up Sequence"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQuoteReadiness((v) => !v)}
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  {showQuoteReadiness ? "Hide Readiness" : "Quote Readiness"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowBattlecard((v) => !v)}
                >
                  <Swords className="h-4 w-4 mr-2" />
                  {showBattlecard ? "Hide Battlecard" : "Battlecard"}
                </Button>
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

          {/* Call Prep Panel */}
          {showFollowUp && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Follow-Up Sequence
                </h3>
                <FollowUpSequencePanel lead_id={lead.id} />
              </div>
            </>
          )}

          {showCallPrep && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-primary" />
                  Call Prep Briefing
                </h3>
                <CallPrepPanel lead_id={lead.id} />
              </div>
            </>
          )}

          {showQuoteReadiness && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Quote Readiness Check
                </h3>
                <QuoteReadinessPanel
                  lead_id={lead.id}
                  defaultState={lead.state}
                  defaultHeadcount={lead.headcount}
                />
              </div>
            </>
          )}

          {showBattlecard && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <Swords className="h-4 w-4 text-primary" />
                  Competitive Battlecard
                </h3>
                <BattlecardPanel
                  lead_id={lead.id}
                  defaultCompetitor={
                    lead.trigger_event
                      ? ["Rippling", "TriNet", "Paychex", "Insperity", "Justworks", "VensureHR", "Gusto", "BambooHR"].find(
                          (c) => lead.trigger_event!.toLowerCase().includes(c.toLowerCase())
                        ) ?? ""
                      : ""
                  }
                  defaultIndustry={lead.industry ?? ""}
                  defaultHeadcount={lead.headcount ?? undefined}
                  defaultState={lead.state ?? ""}
                />
              </div>
            </>
          )}

          {/* Activity Timeline */}
          <Separator />
          <ActivityTimeline entityType="lead" entityId={lead.id} showAddForm />

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
