import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import ObjectionHandler from "@/components/ObjectionHandler";

export default function ObjectionHandlerFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-24 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
        aria-label="Objection Handler"
      >
        <ShieldAlert className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Objection Handler
            </SheetTitle>
            <SheetDescription>Type the objection you just heard for an instant coaching response.</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <ObjectionHandler />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
