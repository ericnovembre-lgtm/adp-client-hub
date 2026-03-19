import { useState } from "react";
import { Check, X, Pencil, Send, User, Building2, Trophy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface OutreachEmail {
  id: string;
  lead_id: string;
  subject: string;
  body: string;
  recipient_name: string | null;
  recipient_email: string | null;
  company_name: string | null;
  competitor_detected: string | null;
  lead_grade: string | null;
  lead_score: number | null;
  email_type: string | null;
  status: string | null;
}

const gradeColors: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  C: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  D: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

export function OutreachReviewCard({
  email,
  onStatusChange,
}: {
  email: OutreachEmail;
  onStatusChange?: (id: string, newStatus: string) => void;
}) {
  const [status, setStatus] = useState(email.status ?? "pending_review");
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(email.subject);
  const [editBody, setEditBody] = useState(email.body);
  const [isSaving, setIsSaving] = useState(false);

  const isActioned = status !== "pending_review";

  const handleApprove = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("outreach_queue")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", email.id);
    setIsSaving(false);
    if (error) {
      toast.error("Failed to approve");
      return;
    }
    setStatus("approved");
    onStatusChange?.(email.id, "approved");
    toast.success("Email approved for sending");
  };

  const handleSkip = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("outreach_queue")
      .update({ status: "skipped" })
      .eq("id", email.id);
    setIsSaving(false);
    if (error) {
      toast.error("Failed to skip");
      return;
    }
    setStatus("skipped");
    onStatusChange?.(email.id, "skipped");
    toast.success("Email skipped");
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("outreach_queue")
      .update({ subject: editSubject, body: editBody })
      .eq("id", email.id);
    setIsSaving(false);
    if (error) {
      toast.error("Failed to save edits");
      return;
    }
    setIsEditing(false);
    toast.success("Email updated");
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm overflow-hidden transition-all",
        isActioned && "opacity-60",
        status === "approved" && "border-l-4 border-l-emerald-500",
        status === "skipped" && "border-l-4 border-l-muted-foreground"
      )}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {email.company_name && (
              <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                {email.company_name}
              </span>
            )}
            {email.recipient_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {email.recipient_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {email.lead_grade && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 font-bold",
                  gradeColors[email.lead_grade] ?? ""
                )}
              >
                {email.lead_grade}
                {email.lead_score != null && ` · ${email.lead_score}`}
              </Badge>
            )}
            {email.competitor_detected && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                vs {email.competitor_detected}
              </Badge>
            )}
            {email.email_type && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {email.email_type.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </div>
        {isActioned && (
          <Badge
            variant={status === "approved" ? "default" : "secondary"}
            className="text-[10px] px-2 py-0.5 shrink-0"
          >
            {status === "approved" ? "Approved ✓" : "Skipped"}
          </Badge>
        )}
      </div>

      {/* Email content */}
      <div className="px-3 pb-2">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="text-xs h-8"
              placeholder="Subject line..."
            />
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="text-xs min-h-[120px] resize-y"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-xs font-semibold text-foreground truncate">
                {email.subject}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-4 whitespace-pre-wrap leading-relaxed">
              {email.body}
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      {!isActioned && (
        <div className="px-3 pb-3 flex items-center gap-1.5">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1 flex-1"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setEditSubject(email.subject);
                  setEditBody(email.body);
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleApprove}
                disabled={isSaving}
              >
                <Send className="h-3 w-3" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setIsEditing(true)}
                disabled={isSaving}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={handleSkip}
                disabled={isSaving}
              >
                <X className="h-3 w-3" />
                Skip
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function OutreachReviewList({ emails }: { emails: OutreachEmail[] }) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const handleStatusChange = (id: string, newStatus: string) => {
    setStatuses((prev) => ({ ...prev, [id]: newStatus }));
  };

  const pending = emails.filter(
    (e) => (statuses[e.id] ?? e.status ?? "pending_review") === "pending_review"
  );
  const actioned = emails.filter(
    (e) => (statuses[e.id] ?? e.status ?? "pending_review") !== "pending_review"
  );

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground px-1">
        {pending.length} pending review · {actioned.length} actioned
      </p>
      {emails.map((email) => (
        <OutreachReviewCard
          key={email.id}
          email={email}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
}
