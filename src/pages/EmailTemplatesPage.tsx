import { useState } from "react";
import { EMAIL_TEMPLATES, fillTemplate, type EmailTemplate } from "@/lib/emailTemplates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Check, Eye, Mail, FileText } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  cold_outreach: "Cold Outreach",
  follow_up: "Follow-Up",
  proposal: "Proposal",
  check_in: "Check-In",
  closed_won: "Onboarding",
};

const CATEGORY_COLORS: Record<string, string> = {
  cold_outreach: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  follow_up: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  proposal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  check_in: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed_won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
};

export default function EmailTemplatesPage() {
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewFields, setPreviewFields] = useState({
    contact_name: "John Smith",
    contact_title: "CEO",
    company_name: "Acme Corp",
    headcount: "15",
  });
  const [copied, setCopied] = useState(false);

  const handleCopy = async (tpl: EmailTemplate) => {
    const filled = `Subject: ${fillTemplate(tpl.subject, previewFields)}\n\n${fillTemplate(tpl.body, previewFields)}`;
    await navigator.clipboard.writeText(filled);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Template copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Pre-built ADP TotalSource sales email templates with merge fields</p>
        </div>
      </div>

      {/* Preview merge fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preview Merge Fields</CardTitle>
          <CardDescription>Customize these values to preview how templates will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Contact Name</Label>
              <Input value={previewFields.contact_name} onChange={(e) => setPreviewFields(p => ({ ...p, contact_name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Title</Label>
              <Input value={previewFields.contact_title} onChange={(e) => setPreviewFields(p => ({ ...p, contact_title: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company Name</Label>
              <Input value={previewFields.company_name} onChange={(e) => setPreviewFields(p => ({ ...p, company_name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Headcount</Label>
              <Input value={previewFields.headcount} onChange={(e) => setPreviewFields(p => ({ ...p, headcount: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EMAIL_TEMPLATES.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <Badge className={CATEGORY_COLORS[tpl.category] ?? ""} variant="outline">
                  {CATEGORY_LABELS[tpl.category]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                {fillTemplate(tpl.subject, previewFields)}
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line">
                {fillTemplate(tpl.body, previewFields).slice(0, 200)}…
              </p>
            </CardContent>
            <div className="p-4 pt-0 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewTemplate(tpl)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> Preview
              </Button>
              <Button size="sm" className="flex-1" onClick={() => handleCopy(tpl)}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                Copy
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Full preview dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(v) => !v && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="text-sm font-medium text-foreground">
                  {fillTemplate(previewTemplate.subject, previewFields)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Body</Label>
                <div className="rounded-md border bg-muted/20 p-4 text-sm whitespace-pre-line text-foreground">
                  {fillTemplate(previewTemplate.body, previewFields)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
            <Button onClick={() => previewTemplate && handleCopy(previewTemplate)}>
              <Copy className="h-4 w-4 mr-1" /> Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
