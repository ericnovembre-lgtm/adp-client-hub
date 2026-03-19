import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2, Mail, Phone, Users } from "lucide-react";

const CONTACT_TYPES = [
  { value: "call", label: "Phone Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
] as const;

const DAY_OFFSETS = [0, 3, 7, 10, 14];
const TOUCH_LABELS = [
  "Thank you & recap",
  "Industry insight",
  "Compliance angle",
  "Social proof",
  "Break-up email",
];

export default function FollowUpSequencePanel({ lead_id }: { lead_id: string }) {
  const [contactType, setContactType] = useState<string>("call");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [sequence, setSequence] = useState<string | null>(null);
  const [tasksCreated, setTasksCreated] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setLoading(true);
    setSequence(null);
    setTasksCreated(null);
    try {
      const { data, error } = await supabase.functions.invoke("follow-up-sequence", {
        body: { lead_id, first_contact_type: contactType, notes: notes || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSequence(data.sequence);
      setTasksCreated(data.tasks_created);
      toast.success(`Follow-up sequence generated — ${data.tasks_created} tasks created`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate follow-up sequence");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!sequence && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">First contact type</Label>
            <RadioGroup value={contactType} onValueChange={setContactType} className="flex gap-3">
              {CONTACT_TYPES.map(({ value, label, icon: Icon }) => (
                <div key={value} className="flex items-center gap-1.5">
                  <RadioGroupItem value={value} id={`contact-${value}`} />
                  <Label htmlFor={`contact-${value}`} className="flex items-center gap-1 text-sm cursor-pointer">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Notes from first contact (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key topics discussed, objections raised, next steps mentioned…"
              rows={3}
            />
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating Sequence…" : "Generate Sequence"}
          </Button>
        </>
      )}

      {sequence && (
        <div className="space-y-4">
          {/* Confirmation badge */}
          {tasksCreated != null && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {tasksCreated} follow-up tasks created in your task list
            </div>
          )}

          {/* Timeline */}
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
            {DAY_OFFSETS.map((day, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">Day {day}</Badge>
                  <Badge variant="secondary" className="text-xs">{TOUCH_LABELS[i]}</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Full sequence text */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 text-sm whitespace-pre-wrap leading-relaxed">
              {sequence}
            </CardContent>
          </Card>

          {/* Reset */}
          <Button variant="outline" size="sm" onClick={() => { setSequence(null); setTasksCreated(null); }}>
            Generate Another Sequence
          </Button>
        </div>
      )}
    </div>
  );
}
