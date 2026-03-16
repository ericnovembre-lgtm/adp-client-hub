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

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: "industry_name", label: "Industry Name", required: true },
  { key: "tier", label: "Tier", required: true },
  { key: "wc_codes", label: "WC Codes" },
  { key: "conditions", label: "Conditions" },
];

const VALID_TIERS = ["prohibited", "low_probability", "bluefield"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KnockoutCSVImportDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; failed: number; skipped: number; duplicates: number } | null>(null);

  const requiredKeys = FIELDS.filter((f) => f.required).map((f) => f.key);

  const reset = useCallback(() => {
    setStep(1);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setImporting(false);
    setProgress(0);
    setResult(null);
  }, []);

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const autoMap = (csvHeaders: string[]) => {
    const m: Record<string, string> = {};
    for (const h of csvHeaders) {
      const normalized = h.toLowerCase().replace(/[\s_-]+/g, "_").trim();
      const match = FIELDS.find(
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

  const normalizeTier = (val: string): string | null => {
    const v = val.toLowerCase().trim().replace(/[\s-]+/g, "_");
    if (VALID_TIERS.includes(v)) return v;
    // Common aliases
    if (v === "low_prob" || v === "low" || v === "lowprobability") return "low_probability";
    if (v === "blue" || v === "blue_field") return "bluefield";
    if (v === "prohib" || v === "block" || v === "blocked") return "prohibited";
    return null;
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    const invertedMap: Record<string, string> = {};
    for (const [csvCol, dbField] of Object.entries(mapping)) {
      if (dbField && dbField !== "__skip__") invertedMap[csvCol] = dbField;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setImporting(false);
      return;
    }

    // Fetch existing rules for duplicate detection
    const { data: existing } = await supabase.from("knockout_rules").select("industry_name, tier");
    const existingSet = new Set(
      (existing ?? []).map((r) => `${r.industry_name.toLowerCase().trim()}|${r.tier}`)
    );

    const mapped: Record<string, string | null>[] = [];
    let skipped = 0;
    let duplicates = 0;

    for (const row of rows) {
      const record: Record<string, string | null> = {};
      for (const [csvCol, dbField] of Object.entries(invertedMap)) {
        record[dbField] = (row[csvCol] ?? "").trim() || null;
      }

      // Validate required
      if (!record.industry_name?.trim()) { skipped++; continue; }

      // Normalize tier
      const rawTier = record.tier ?? "";
      const normalizedTier = normalizeTier(rawTier);
      if (!normalizedTier) { skipped++; continue; }
      record.tier = normalizedTier;

      // Duplicate check
      const key = `${record.industry_name.toLowerCase().trim()}|${normalizedTier}`;
      if (existingSet.has(key)) {
        duplicates++;
        continue;
      }
      existingSet.add(key); // prevent intra-batch duplicates

      mapped.push(record);
    }

    // Insert in batches
    let success = 0;
    let failed = 0;
    const batchSize = 10;

    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize).map((row) => ({
        industry_name: row.industry_name!,
        tier: row.tier!,
        wc_codes: row.wc_codes || null,
        conditions: row.conditions || null,
        user_id: user.id,
      }));
      const { error } = await supabase.from("knockout_rules").insert(batch);
      if (error) {
        failed += batch.length;
      } else {
        success += batch.length;
      }
      setProgress(mapped.length > 0 ? Math.round(((i + batch.length) / mapped.length) * 100) : 100);
    }

    setResult({ success, failed, skipped, duplicates });
    setImporting(false);
    setStep(3);

    if (success > 0) {
      qc.invalidateQueries({ queryKey: ["knockout-rules"] });
    }
  };

  const previewRows = rows.slice(0, 5);
  const mappedFieldKeys = new Set(Object.values(mapping).filter((v) => v && v !== "__skip__"));
  const unmappedRequired = requiredKeys.filter((f) => !mappedFieldKeys.has(f));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Knockout Rules from CSV</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
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
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Expected columns:</p>
              <p><code>industry_name</code> (required), <code>tier</code> (required: prohibited, low_probability, bluefield), <code>wc_codes</code>, <code>conditions</code></p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {rows.length} row(s) found. Map CSV columns to fields below.
            </div>

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
                      {FIELDS.map((f) => (
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
                Required field(s) not mapped: {unmappedRequired.map((k) => FIELDS.find((f) => f.key === k)?.label).join(", ")}
              </div>
            )}

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
              <Button variant="outline" onClick={() => reset()}>Back</Button>
              <Button onClick={handleImport} disabled={unmappedRequired.length > 0}>
                <Upload className="h-4 w-4 mr-1" />Start Import
              </Button>
            </DialogFooter>
          </div>
        )}

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
                  {result.duplicates > 0 && (
                    <Badge variant="outline" className="text-sm">{result.duplicates} duplicates skipped</Badge>
                  )}
                  {result.skipped > 0 && (
                    <Badge variant="outline" className="text-sm">{result.skipped} skipped (invalid/missing)</Badge>
                  )}
                  {result.failed > 0 && (
                    <Badge variant="destructive" className="text-sm">{result.failed} failed</Badge>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={() => { reset(); handleClose(false); }}>
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
