import { ShieldAlert } from "lucide-react";
import ObjectionHandler from "@/components/ObjectionHandler";

export default function ObjectionHandlerPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Objection Handler</h1>
          <p className="text-muted-foreground text-sm">Real-time coaching for live calls. Type what the prospect said and get an instant response.</p>
        </div>
      </div>
      <ObjectionHandler />
    </div>
  );
}
