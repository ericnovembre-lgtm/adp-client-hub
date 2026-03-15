import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings, useUpdateUserSettings, type UserSettings } from "@/hooks/useUserSettings";
import { useKnockoutRules, useCreateKnockoutRule, useUpdateKnockoutRule, useDeleteKnockoutRule, type KnockoutRule } from "@/hooks/useKnockoutRules";
import { exportToCSV } from "@/lib/exportCSV";
import { KNOWLEDGE_VERSION } from "@/lib/adpProductKnowledge";
import { HEADCOUNT_MIN, HEADCOUNT_MAX, HEADCOUNT_LABEL } from "@/lib/constants";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Save, Download, Database, Info, Plus, Search, Pencil, Trash2, ShieldX, Bot, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const tierBadge: Record<string, { label: string; className: string }> = {
  prohibited: { label: "Prohibited", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300" },
  low_probability: { label: "Low Probability", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300" },
  bluefield: { label: "Bluefield", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300" },
};

// --- Knockout Rule Form Dialog ---

function KnockoutRuleDialog({
  open,
  onOpenChange,
  editingRule,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingRule: KnockoutRule | null;
  onSubmit: (values: { industry_name: string; tier: string; wc_codes: string; conditions: string }) => void;
  isSubmitting: boolean;
}) {
  const [industryName, setIndustryName] = useState("");
  const [tier, setTier] = useState("prohibited");
  const [wcCodes, setWcCodes] = useState("");
  const [conditions, setConditions] = useState("");

  useEffect(() => {
    if (editingRule) {
      setIndustryName(editingRule.industry_name);
      setTier(editingRule.tier);
      setWcCodes(editingRule.wc_codes ?? "");
      setConditions(editingRule.conditions ?? "");
    } else {
      setIndustryName("");
      setTier("prohibited");
      setWcCodes("");
      setConditions("");
    }
  }, [editingRule, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industryName.trim()) {
      toast.error("Industry name is required");
      return;
    }
    onSubmit({ industry_name: industryName.trim(), tier, wc_codes: wcCodes.trim(), conditions: conditions.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingRule ? "Edit Knockout Rule" : "Add Knockout Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Industry Name *</Label>
            <Input value={industryName} onChange={(e) => setIndustryName(e.target.value)} placeholder="e.g. Roofing" />
          </div>
          <div className="grid gap-2">
            <Label>Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prohibited">Prohibited</SelectItem>
                <SelectItem value="low_probability">Low Probability</SelectItem>
                <SelectItem value="bluefield">Bluefield</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>WC Codes (optional)</Label>
            <Input value={wcCodes} onChange={(e) => setWcCodes(e.target.value)} placeholder="e.g. 5551,9403" />
          </div>
          <div className="grid gap-2">
            <Label>Conditions (optional)</Label>
            <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Specific conditions or notes" rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Knockout Rules Admin Section ---

function KnockoutRulesSection() {
  const { data: allRules = [], isLoading } = useKnockoutRules();
  const createRule = useCreateKnockoutRule();
  const updateRule = useUpdateKnockoutRule();
  const deleteRule = useDeleteKnockoutRule();

  const [tierFilter, setTierFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<KnockoutRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const tierCounts = useMemo(() => {
    const counts = { prohibited: 0, low_probability: 0, bluefield: 0 };
    for (const r of allRules) {
      if (r.tier in counts) counts[r.tier as keyof typeof counts]++;
    }
    return counts;
  }, [allRules]);

  const filteredRules = useMemo(() => {
    let rules = allRules;
    if (tierFilter !== "all") {
      rules = rules.filter(r => r.tier === tierFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rules = rules.filter(r => r.industry_name.toLowerCase().includes(q));
    }
    return rules;
  }, [allRules, tierFilter, search]);

  const handleSave = async (values: { industry_name: string; tier: string; wc_codes: string; conditions: string }) => {
    try {
      const payload = {
        industry_name: values.industry_name,
        tier: values.tier,
        wc_codes: values.wc_codes || null,
        conditions: values.conditions || null,
      };
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, ...payload });
        toast.success("Rule updated");
      } else {
        await createRule.mutateAsync(payload);
        toast.success("Rule created");
      }
      setDialogOpen(false);
      setEditingRule(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save rule");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRule.mutateAsync(deleteId);
      toast.success("Rule deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete rule");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldX className="h-5 w-5" />
          Industry Knockout Rules
        </CardTitle>
        <CardDescription>
          Manage ADP TotalSource WC underwriting industry restrictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier counts */}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="text-red-600 dark:text-red-400 font-medium">{tierCounts.prohibited} Prohibited</span>
          <span>·</span>
          <span className="text-orange-600 dark:text-orange-400 font-medium">{tierCounts.low_probability} Low Probability</span>
          <span>·</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">{tierCounts.bluefield} Bluefield</span>
        </div>

        {/* Filter + search + add */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-1">
            {["all", "prohibited", "low_probability", "bluefield"].map(t => (
              <Button
                key={t}
                variant={tierFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTierFilter(t)}
              >
                {t === "all" ? "All" : t === "low_probability" ? "Low Prob" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search industries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Rule
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Industry Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="hidden md:table-cell">WC Codes</TableHead>
                <TableHead className="hidden lg:table-cell">Conditions</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No knockout rules found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map((rule) => {
                  const badge = tierBadge[rule.tier] ?? { label: rule.tier, className: "" };
                  return (
                    <TableRow
                      key={rule.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => { setEditingRule(rule); setDialogOpen(true); }}
                    >
                      <TableCell className="font-medium">{rule.industry_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {rule.wc_codes || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs max-w-[250px] truncate">
                        {rule.conditions || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); setEditingRule(rule); setDialogOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(rule.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add/Edit Dialog */}
        <KnockoutRuleDialog
          open={dialogOpen}
          onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingRule(null); }}
          editingRule={editingRule}
          onSubmit={handleSave}
          isSubmitting={createRule.isPending || updateRule.isPending}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Knockout Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this knockout rule? The industry will become eligible for prospecting.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteRule.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleteRule.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteRule.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// --- Agent Activity Log Section ---

function relativeTime(dateStr: string | null) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatAgentToolName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLatency(ms: number | null) {
  if (!ms) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

const riskBadgeMap: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300" },
  med: { label: "Med", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300" },
  medium: { label: "Med", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300" },
  high: { label: "High", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300" },
};

function AgentActivitySection() {
  const { data: agentActions = [], isLoading } = useQuery({
    queryKey: ["agent-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_actions")
        .select("id, tool_name, risk_level, input_params, output_result, tokens_used, latency_ms, error, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Activity Log
        </CardTitle>
        <CardDescription>Recent AI agent tool executions and audit trail</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : agentActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No agent activity yet. Start a conversation with the AI Agent to see tool executions here.
                  </TableCell>
                </TableRow>
              ) : (
                agentActions.map((action) => {
                  const risk = riskBadgeMap[action.risk_level] ?? { label: action.risk_level, className: "" };
                  const hasError = !!action.error;
                  return (
                    <TableRow key={action.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {relativeTime(action.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {formatAgentToolName(action.tool_name)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={risk.className}>{risk.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {hasError ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <XCircle className="h-4 w-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{action.error}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {action.tokens_used ? action.tokens_used : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatLatency(action.latency_ms)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing the most recent 50 actions. Agent actions are logged automatically for audit purposes.
        </p>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // AI
  
  const [aiChatEnabled, setAiChatEnabled] = useState(true);
  const [autoQualifyThreshold, setAutoQualifyThreshold] = useState(60);
  const [apolloKeyConfigured, setApolloKeyConfigured] = useState(false);
  const [testingApollo, setTestingApollo] = useState(false);

  // Discovery
  const [defaultIndustry, setDefaultIndustry] = useState("");
  const [defaultState, setDefaultState] = useState("");
  const [headcountMin, setHeadcountMin] = useState<number | "">("");
  const [headcountMax, setHeadcountMax] = useState<number | "">("");

  // Load profile from users table
  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.name ?? "");
        setEmail(data.email ?? user.email ?? "");
        setAvatar(data.avatar ?? "");
      } else {
        setEmail(user.email ?? "");
      }
    });
  }, [user]);

  // Load settings
  useEffect(() => {
    if (!settings) return;
    
    setAiChatEnabled(settings.aiChatEnabled !== false);
    setAutoQualifyThreshold(settings.auto_qualify_threshold ?? 60);
    setDefaultIndustry(settings.defaultIndustry ?? "");
    setDefaultState(settings.defaultState ?? "");
    setHeadcountMin(settings.defaultHeadcountMin ?? "");
    setHeadcountMax(settings.defaultHeadcountMax ?? "");
    setApolloKeyConfigured(settings.apollo_api_key_configured ?? false);
  }, [settings]);

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const { error } = await supabase.from("users").upsert({
        id: user.id,
        username: user.email ?? "user",
        name,
        email,
        avatar,
      }, { onConflict: "id" });
      if (error) throw error;
      toast.success("Profile saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save profile");
    }
    setProfileSaving(false);
  };

  const saveSettings = async () => {
    const s: UserSettings = {
      aiChatEnabled,
      auto_qualify_threshold: autoQualifyThreshold,
      defaultIndustry: defaultIndustry || undefined,
      defaultState: defaultState || undefined,
      defaultHeadcountMin: headcountMin === "" ? undefined : Number(headcountMin),
      defaultHeadcountMax: headcountMax === "" ? undefined : Number(headcountMax),
    };
    try {
      await updateSettings.mutateAsync(s);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save settings");
    }
  };

  // Data counts
  const { data: counts } = useQuery({
    queryKey: ["settings-data-counts"],
    queryFn: async () => {
      const [contacts, companies, deals, leads, tasks, activities] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("deals").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("activities").select("id", { count: "exact", head: true }),
      ]);
      return {
        contacts: contacts.count ?? 0,
        companies: companies.count ?? 0,
        deals: deals.count ?? 0,
        leads: leads.count ?? 0,
        tasks: tasks.count ?? 0,
        activities: activities.count ?? 0,
      };
    },
  });

  const [exporting, setExporting] = useState(false);
  const handleExportAll = async () => {
    setExporting(true);
    try {
      const [c, co, d, l, t, a] = await Promise.all([
        supabase.from("contacts").select("*"),
        supabase.from("companies").select("*"),
        supabase.from("deals").select("*"),
        supabase.from("leads").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("activities").select("*"),
      ]);
      exportToCSV(c.data ?? [], "contacts", [
        { header: "First Name", accessor: (r) => r.first_name },
        { header: "Last Name", accessor: (r) => r.last_name },
        { header: "Email", accessor: (r) => r.email },
        { header: "Phone", accessor: (r) => r.phone },
        { header: "Company", accessor: (r) => r.company },
        { header: "Status", accessor: (r) => r.status },
      ]);
      exportToCSV(co.data ?? [], "companies", [
        { header: "Name", accessor: (r) => r.name },
        { header: "Industry", accessor: (r) => r.industry },
        { header: "Employees", accessor: (r) => r.employees },
      ]);
      exportToCSV(d.data ?? [], "deals", [
        { header: "Title", accessor: (r) => r.title },
        { header: "Value", accessor: (r) => r.value },
        { header: "Stage", accessor: (r) => r.stage },
      ]);
      exportToCSV(l.data ?? [], "leads", [
        { header: "Company", accessor: (r) => r.company_name },
        { header: "Decision Maker", accessor: (r) => r.decision_maker_name },
        { header: "Status", accessor: (r) => r.status },
      ]);
      exportToCSV(t.data ?? [], "tasks", [
        { header: "Title", accessor: (r) => r.title },
        { header: "Status", accessor: (r) => r.status },
        { header: "Priority", accessor: (r) => r.priority },
      ]);
      exportToCSV(a.data ?? [], "activities", [
        { header: "Type", accessor: (r) => r.type },
        { header: "Description", accessor: (r) => r.description },
        { header: "Created", accessor: (r) => r.created_at },
      ]);
      toast.success("All data exported as separate CSV files");
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    }
    setExporting(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Manage your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Username (read-only)</Label>
            <Input value={user?.email ?? ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Avatar URL</Label>
            <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Configuration</CardTitle>
          <CardDescription>Configure AI assistant behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI Model</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Gemini 2.5 Flash</Badge>
              <span className="text-xs text-muted-foreground">via Lovable AI Gateway</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable AI Chat Widget</Label>
              <p className="text-xs text-muted-foreground">Show the floating chat assistant on all pages</p>
            </div>
            <Switch checked={aiChatEnabled} onCheckedChange={setAiChatEnabled} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Auto-Qualify Threshold</Label>
            <Input
              type="number"
              min={40}
              max={100}
              step={5}
              value={autoQualifyThreshold}
              onChange={(e) => setAutoQualifyThreshold(Math.max(40, Math.min(100, Number(e.target.value) || 60)))}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Leads scoring at or above this threshold automatically move to "qualified" status when scored by the AI agent.
            </p>
          </div>
          <Button onClick={saveSettings} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save AI Settings
          </Button>
        </CardContent>
      </Card>

      {/* Discovery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discovery Defaults</CardTitle>
          <CardDescription>Pre-populate the AI Discovery page form with these defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold">{HEADCOUNT_LABEL}</Badge>
            <span className="text-xs text-muted-foreground">Your assigned territory</span>
          </div>
          <div className="space-y-2">
            <Label>Default Industry</Label>
            <Input value={defaultIndustry} onChange={(e) => setDefaultIndustry(e.target.value)} placeholder="e.g. Construction" />
          </div>
          <div className="space-y-2">
            <Label>Default State</Label>
            <Select value={defaultState} onValueChange={setDefaultState}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Headcount</Label>
              <Input
                type="number"
                min={HEADCOUNT_MIN}
                max={HEADCOUNT_MAX}
                value={headcountMin}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : "";
                  setHeadcountMin(v === "" ? "" : Math.max(HEADCOUNT_MIN, Math.min(HEADCOUNT_MAX, v)));
                }}
                placeholder={String(HEADCOUNT_MIN)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Headcount</Label>
              <Input
                type="number"
                min={HEADCOUNT_MIN}
                max={HEADCOUNT_MAX}
                value={headcountMax}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : "";
                  setHeadcountMax(v === "" ? "" : Math.max(HEADCOUNT_MIN, Math.min(HEADCOUNT_MAX, v)));
                }}
                placeholder={String(HEADCOUNT_MAX)}
              />
            </div>
          </div>
          <Button onClick={saveSettings} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Discovery Defaults
          </Button>
        </CardContent>
      </Card>

      {/* Product Knowledge Version */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Product Knowledge
          </CardTitle>
          <CardDescription>ADP TotalSource knowledge base version used by AI features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Frontend version:</span>
            <Badge variant="secondary" className="font-mono">{KNOWLEDGE_VERSION}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Backend functions (AI Chat &amp; Scheduled Discovery) should display the same version. If they differ, update the <code className="bg-muted px-1 rounded">KNOWLEDGE_VERSION</code> constant in all three locations.
          </p>
        </CardContent>
      </Card>

      {/* Knockout Rules Admin */}
      <KnockoutRulesSection />

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Management</CardTitle>
          <CardDescription>View data counts and export all CRM data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Contacts", count: counts?.contacts },
              { label: "Companies", count: counts?.companies },
              { label: "Deals", count: counts?.deals },
              { label: "Leads", count: counts?.leads },
              { label: "Tasks", count: counts?.tasks },
              { label: "Activities", count: counts?.activities },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 p-3 rounded-md bg-muted">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.count ?? "–"}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <Button variant="outline" onClick={handleExportAll} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            Export All Data (CSVs)
          </Button>
        </CardContent>
      </Card>

      {/* Agent Activity Log */}
      <AgentActivitySection />

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">SavePlus24 CRM</p>
          <p className="text-muted-foreground">Version 2.0.0</p>
          <p className="text-muted-foreground">Powered by ADP TotalSource</p>
        </CardContent>
      </Card>
    </div>
  );
}
