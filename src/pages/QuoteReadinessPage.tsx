import QuoteReadinessPanel from "@/components/QuoteReadinessPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function QuoteReadinessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quote Readiness Checker</h1>
        <p className="text-muted-foreground mt-1">
          Check if a prospect is ready for Gallagher quoting submission
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Readiness Check
          </CardTitle>
          <CardDescription>
            Enter prospect details to generate a requirements checklist for quoting submission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuoteReadinessPanel />
        </CardContent>
      </Card>
    </div>
  );
}
