import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import EnrichmentProgress from "@/components/EnrichmentProgress";

type EntityType = "leads" | "contacts" | "companies";

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
}

const FIELD_DEFS: Record<EntityType, FieldDef[]> = {
  leads: [
    { key: "company_name", label: "Company Name", required: true },
    { key: "decision_maker_name", label: "Decision Maker Name" },
    { key: "decision_maker_email", label: "Decision Maker Email" },
    { key: "decision_maker_phone", label: "Decision Maker Phone" },
    { key: "decision_maker_title", label: "Decision Maker Title" },
    { key: "headcount", label: "Headcount" },
    { key: "industry", label: "Industry" },
    { key: "website", label: "Website" },
    { key: "state", label: "State" },
    { key: "trigger_event", label: "Trigger Event" },
    { key: "source", label: "Source" },
  ],
  contacts: [
    { key: "first_name", label: "First Name", required: true },
    { key: "last_name", label: "Last Name", required: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company" },
    { key: "job_title", label: "Job Title" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
    { key: "notes", label: "Notes" },
  ],
  companies: [
    { key: "name", label: "Name", required: true },
    { key: "industry", label: "Industry" },
    { key: "website", label: "Website" },
    { key: "employees", label: "Employees" },
    { key: "revenue", label: "Revenue" },
    { key: "address", label: "Address" },
    { key: "phone", label: "Phone" },
  ],
};

interface Props {
  entityType: EntityType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function CSVImportDialog({ entityType, open, onOpenChange, onImportComplete }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importedLeadIds, setImportedLeadIds] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Step 3 state
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number; skipped: number } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string[]>([]);

  const fields = FIELD_DEFS[entityType];
  const requiredFields = fields.filter((f) => f.required).map((f) => f.key);

  const reset = useCallback(() => {
    setStep(1);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImporting(false);
    setProgress(0);
    setResult(null);
    setDuplicateWarning([]);
  }, []);

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // Auto-map headers to fields
  const autoMap = (csvHeaders: string[]) => {
    const m: Record<string, string> = {};
    for (const h of csvHeaders) {
      const normalized = h.toLowerCase().replace(/[\s_-]+/g, "_").trim();
      const match = fields.find(
        (f) => f.key === normalized || f.label.toLowerCase().replace(/[\s_-]+/g, "_") === normalized
      );
      if (match) m[h] = match.key;
    }
    return m;
  };

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.meta.fields?.length) {
          toast.error("No columns found in CSV");
          return;
        }
        setHeaders(res.meta.fields);
        setRows(res.data);
        setMapping(autoMap(res.meta.fields));
        setStep(2);
      },
      error: (err) => toast.error(`CSV parse error: ${err.message}`),
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
    else toast.error("Please upload a .csv file");
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    setDuplicateWarning([]);

    // Build mapped rows
    const invertedMap: Record<string, string> = {};
    for (const [csvCol, dbField] of Object.entries(mapping)) {
      if (dbField && dbField !== "__skip__") invertedMap[csvCol] = dbField;
    }

    // Check for duplicate leads
    let existingNames = new Set<string>();
    if (entityType === "leads") {
      const { data: existing } = await supabase.from("leads").select("company_name");
      if (existing) {
        existingNames = new Set(existing.map((r) => r.company_name.toLowerCase().trim()));
      }
    }

    // Get current user for user_id scoping
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setImporting(false);
      return;
    }

    const mapped: Record<string, string | number | null>[] = [];
    let skipped = 0;
    const dupes: string[] = [];

    for (const row of rows) {
      const record: Record<string, string | number | null> = {};
      for (const [csvCol, dbField] of Object.entries(invertedMap)) {
        let val = (row[csvCol] ?? "").trim();
        // Convert numeric fields
        if ((dbField === "headcount" || dbField === "employees") && val) {
          const num = parseInt(val, 10);
          record[dbField] = isNaN(num) ? null : num;
        } else {
          record[dbField] = val || null;
        }
      }

      // Check required fields
      const missingRequired = requiredFields.some((f) => !record[f]);
      if (missingRequired) {
        skipped++;
        continue;
      }

      // Duplicate check for leads
      if (entityType === "leads" && record.company_name) {
        const name = String(record.company_name).toLowerCase().trim();
        if (existingNames.has(name)) {
          dupes.push(String(record.company_name));
        }
      }

      mapped.push(record);
    }

    if (dupes.length > 0) {
      setDuplicateWarning([...new Set(dupes)]);
    }

    // Insert in batches of 10
    let success = 0;
    let failed = 0;
    const batchSize = 10;

    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize).map(row => ({ ...row, user_id: user.id }));
      const { error } = await supabase.from(entityType).insert(batch as any);
      if (error) {
        failed += batch.length;
      } else {
        success += batch.length;
      }
      setProgress(Math.round(((i + batch.length) / mapped.length) * 100));
    }

    setResult({ success, failed, skipped });
    setImporting(false);
    setStep(3);

    if (success > 0) {
      qc.invalidateQueries({ queryKey: [entityType] });
    }
  };

  const previewRows = rows.slice(0, 5);
  const mappedFieldKeys = new Set(Object.values(mapping).filter((v) => v && v !== "__skip__"));
  const unmappedRequired = requiredFields.filter((f) => !mappedFieldKeys.has(f));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)} from CSV</DialogTitle>
        </DialogHeader>

        {/* Step 1: File Upload */}
        {step === 1 && (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">Drop a CSV file here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">Only .csv files are accepted</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
          </div>
        )}

        {/* Step 2: Preview & Map */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {rows.length} row(s) found. Map CSV columns to fields below.
            </div>

            {/* Column mapping */}
            <div className="space-y-2">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-40 truncate shrink-0" title={h}>{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={mapping[h] || "__skip__"}
                    onValueChange={(v) => setMapping((prev) => ({ ...prev, [h]: v }))}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">Skip</SelectItem>
                      {fields.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}{f.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {unmappedRequired.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Required field(s) not mapped: {unmappedRequired.map((k) => fields.find((f) => f.key === k)?.label).join(", ")}
              </div>
            )}

            {/* Preview table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((h) => (
                        <TableCell key={h} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                          {row[h] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 5 && (
              <p className="text-xs text-muted-foreground">Showing first 5 of {rows.length} rows</p>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { reset(); }}>Back</Button>
              <Button onClick={handleImport} disabled={unmappedRequired.length > 0}>
                <Upload className="h-4 w-4 mr-1" />Start Import
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <div className="space-y-4">
            {importing ? (
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Importing…</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress}% complete</p>
              </div>
            ) : result ? (
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-foreground">Import Complete</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="secondary" className="text-sm">{result.success} imported</Badge>
                  {result.skipped > 0 && (
                    <Badge variant="outline" className="text-sm">{result.skipped} skipped (missing required)</Badge>
                  )}
                  {result.failed > 0 && (
                    <Badge variant="destructive" className="text-sm">{result.failed} failed</Badge>
                  )}
                </div>
                {duplicateWarning.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Duplicate company names detected:</span>
                    </div>
                    <p className="text-xs">{duplicateWarning.slice(0, 10).join(", ")}{duplicateWarning.length > 10 ? ` and ${duplicateWarning.length - 10} more…` : ""}</p>
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={() => { reset(); onImportComplete(); handleClose(false); }}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
