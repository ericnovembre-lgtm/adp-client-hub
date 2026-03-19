import { useState, useEffect } from "react";
import { EMAIL_TEMPLATES, fillTemplate, type EmailTemplate } from "@/lib/emailTemplates";
import { logActivity } from "@/lib/logActivity";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Sparkles, Loader2, Check, Send } from "lucide-react";

interface MergeFields {
  contact_name: string;
  contact_title: string;
  company_name: string;
  headcount?: string;
}

interface DraftEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mergeFields: MergeFields;
  contactId?: string | null;
  contactEmail?: string | null;
  competitorTemplate?: { subject: string; body: string } | null;
}

export default function DraftEmailDialog({ open, onOpenChange, mergeFields, contactId, contactEmail, competitorTemplate }: DraftEmailDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(EMAIL_TEMPLATES[0].id);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const allFields: Record<string, string> = {
    contact_name: mergeFields.contact_name,
    contact_title: mergeFields.contact_title,
    company_name: mergeFields.company_name,
    headcount: mergeFields.headcount ?? "",
  };

  const applyTemplate = (templateId: string) => {
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setSubject(fillTemplate(tpl.subject, allFields));
    setBody(fillTemplate(tpl.body, allFields));
  };

  useEffect(() => {
    if (open) {
      applyTemplate(EMAIL_TEMPLATES[0].id);
      setCopied(false);
    }
  }, [open]);

  const handleCustomizeWithAI = async () => {
    setAiLoading(true);
    try {
      const resp = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `Personalize this sales email for ${mergeFields.company_name} (${mergeFields.contact_name}, ${mergeFields.contact_title}). Keep it professional and concise. Keep the same structure but make it feel more personal and relevant. Return only the email body, no subject line.\n\nCurrent email:\n${body}`,
            },
          ],
        },
      });

      if (resp.error) throw resp.error;

      if (resp.data instanceof ReadableStream) {
        const reader = resp.data.getReader();
        const decoder = new TextDecoder();
        let result = "";
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) result += content;
              } catch {}
            }
          }
        }
        if (result.trim()) setBody(result.trim());
      } else if (typeof resp.data === "string") {
        setBody(resp.data);
      }

      toast.success("Email customized with AI");
    } catch (e: any) {
      toast.error(e.message ?? "AI customization failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = async () => {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Email copied to clipboard");
    await logActivity("email", `Email drafted for ${mergeFields.contact_name}: ${subject}`, contactId);
  };

  const handleSend = async () => {
    if (!contactEmail) {
      toast.error("Contact has no email address");
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to send emails");
        return;
      }

      const resp = await supabase.functions.invoke("send-crm-email", {
        body: {
          to: contactEmail,
          subject,
          body,
          contact_id: contactId,
        },
      });

      if (resp.error) throw resp.error;

      const result = resp.data;
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Email sent to ${contactEmail}`);
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle>Draft Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contactEmail && (
            <div className="space-y-2">
              <Label>To</Label>
              <Input value={contactEmail} disabled className="text-muted-foreground" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomizeWithAI}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Customizing...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1" /> Customize with AI</>
                )}
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="font-mono text-sm"
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Merge Fields:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(allFields).map(([key, val]) => (
                <span key={key} className="inline-flex items-center gap-1 bg-background rounded px-2 py-0.5 border">
                  <span className="font-mono">{`{{${key}}}`}</span>
                  <span className="text-foreground">{val || "—"}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <><Check className="h-4 w-4 mr-1" /> Copied!</>
            ) : (
              <><Copy className="h-4 w-4 mr-1" /> Copy to Clipboard</>
            )}
          </Button>
          {contactEmail && (
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-1" /> Send Email</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
