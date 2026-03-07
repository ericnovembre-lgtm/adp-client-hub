import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { useKnockoutRules, type KnockoutRule } from "@/hooks/useKnockoutRules";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Search, Clock, Play, Loader2, CheckCircle, AlertCircle, Sparkles,
  ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion,
} from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const FREQUENCIES = [
  { value: "6h", label: "Every 6 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

function getIntervalMs(freq: string) {
  switch (freq) {
    case "6h": return 6 * 60 * 60 * 1000;
    case "12h": return 12 * 60 * 60 * 1000;
    case "daily": return 24 * 60 * 60 * 1000;
    case "weekly": return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

// --- Client-side knockout check ---

interface LocalKnockoutResult {
  tier: 'prohibited' | 'low_probability' | 'bluefield' | 'clear';
  matchedRules: KnockoutRule[];
  message: string;
}

function checkKnockoutLocal(industry: string | null | undefined, rules: KnockoutRule[]): LocalKnockoutResult {
  if (!industry?.trim() || rules.length === 0) {
    return { tier: 'clear', matchedRules: [], message: '' };
  }

  const searchText = industry.toLowerCase();

  const matched = rules.filter(rule => {
    const keywords = rule.industry_name.toLowerCase().split(/[\s\/,()]+/).filter(w => w.length > 3);
    return keywords.some(keyword => searchText.includes(keyword));
  });

  if (matched.length === 0) {
    return { tier: 'clear', matchedRules: [], message: '' };
  }

  const severity: Record<string, number> = { prohibited: 3, low_probability: 2, bluefield: 1 };
  matched.sort((a, b) => (severity[b.tier] || 0) - (severity[a.tier] || 0));
  const worstTier = matched[0].tier as LocalKnockoutResult['tier'];

  const messages: Record<string, string> = {
    prohibited: `This industry is prohibited by ADP TotalSource.`,
    low_probability: `Low probability of approval (95-99% prohibited).`,
    bluefield: `Conditional approval — ${matched.filter(r => r.conditions).map(r => r.conditions).join('; ') || 'review required'}.`,
  };

  return { tier: worstTier, matchedRules: matched, message: messages[worstTier] || '' };
}

// --- Discovery Knockout Badge ---

function DiscoveryKnockoutBadge({ tier, message }: { tier: LocalKnockoutResult['tier']; message: string }) {
  const config = {
    clear: { label: 'Eligible', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300', icon: ShieldCheck },
    bluefield: { label: 'Conditional', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300', icon: ShieldQuestion },
    low_probability: { label: 'Low Probability', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300', icon: ShieldAlert },
    prohibited: { label: 'Prohibited', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300', icon: ShieldX },
  };
  const c = config[tier];
  const Icon = c.icon;

  if (tier === 'clear') {
    return (
      <Badge variant="outline" className={c.className}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${c.className} cursor-help`}>
            <Icon className="h-3 w-3 mr-1" />
            {c.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AIDiscoveryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { data: knockoutRules = [] } = useKnockoutRules();

  // Manual discovery form state
  const [industry, setIndustry] = useState("");
  const [state, setState] = useState("");
  const [headcountMin, setHeadcountMin] = useState("");
  const [headcountMax, setHeadcountMax] = useState("");

  // Scheduler state
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const schedulerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Discovery results for knockout checking
  const [discoveryResults, setDiscoveryResults] = useState<any[] | null>(null);

  // Load defaults from settings
  useEffect(() => {
    if (settings) {
      if (settings.defaultIndustry && !industry) setIndustry(settings.defaultIndustry);
      if (settings.defaultState && !state) setState(settings.defaultState);
      if (settings.defaultHeadcountMin && !headcountMin) setHeadcountMin(String(settings.defaultHeadcountMin));
      if (settings.defaultHeadcountMax && !headcountMax) setHeadcountMax(String(settings.defaultHeadcountMax));

      const s = settings as any;
      if (s.scheduler_enabled !== undefined) setSchedulerEnabled(s.scheduler_enabled);
      if (s.scheduler_frequency) setFrequency(s.scheduler_frequency);
    }
  }, [settings]);

  // Compute knockout results for discovery results
  const discoveryKnockoutMap = useMemo(() => {
    if (!discoveryResults || knockoutRules.length === 0) return new Map<number, LocalKnockoutResult>();
    const map = new Map<number, LocalKnockoutResult>();
    discoveryResults.forEach((result, idx) => {
      map.set(idx, checkKnockoutLocal(result.industry, knockoutRules));
    });
    return map;
  }, [discoveryResults, knockoutRules]);

  // Manual discovery mutation
  const manualDiscover = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("scheduled-discovery", {
        body: {
          industry: industry || undefined,
          state: state || undefined,
          headcount_min: headcountMin ? Number(headcountMin) : undefined,
          headcount_max: headcountMax ? Number(headcountMax) : undefined,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Discovered ${data.saved} new leads!`);
      qc.invalidateQueries({ queryKey: ["dashboard-leads"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });

  // Scheduler run
  const schedulerRun = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("scheduled-discovery", {
        body: {
          industry: settings?.defaultIndustry || industry || undefined,
          state: settings?.defaultState || state || undefined,
          headcount_min: settings?.defaultHeadcountMin || (headcountMin ? Number(headcountMin) : undefined),
          headcount_max: settings?.defaultHeadcountMax || (headcountMax ? Number(headcountMax) : undefined),
          user_id: user?.id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Auto-discovery found ${data.saved} leads`);
      qc.invalidateQueries({ queryKey: ["user-settings"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      // Update status to error
      if (settings && user) {
        updateSettings.mutate({ ...settings, scheduler_status: "error" } as any);
      }
    },
  });

  // Toggle scheduler
  const handleToggleScheduler = useCallback(async (enabled: boolean) => {
    setSchedulerEnabled(enabled);
    if (user) {
      await updateSettings.mutateAsync({
        ...settings,
        scheduler_enabled: enabled,
        scheduler_frequency: frequency,
      } as any);
    }
  }, [settings, frequency, user, updateSettings]);

  // Save frequency
  const handleFrequencyChange = useCallback(async (freq: string) => {
    setFrequency(freq);
    if (user) {
      await updateSettings.mutateAsync({
        ...settings,
        scheduler_frequency: freq,
      } as any);
    }
  }, [settings, user, updateSettings]);

  // Client-side scheduler timer
  useEffect(() => {
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }

    if (schedulerEnabled && user) {
      const intervalMs = getIntervalMs(frequency);
      // Check if we should run now based on last run
      const lastRun = (settings as any)?.scheduler_last_run;
      if (lastRun) {
        const elapsed = Date.now() - new Date(lastRun).getTime();
        if (elapsed >= intervalMs) {
          schedulerRun.mutate();
        }
      }

      schedulerTimerRef.current = setInterval(() => {
        schedulerRun.mutate();
      }, intervalMs);
    }

    return () => {
      if (schedulerTimerRef.current) clearInterval(schedulerTimerRef.current);
    };
  }, [schedulerEnabled, frequency, user]);

  const lastRun = (settings as any)?.scheduler_last_run;
  const lastCount = (settings as any)?.scheduler_last_count;
  const schedulerStatus = (settings as any)?.scheduler_status;
  const isRunning = manualDiscover.isPending || schedulerRun.isPending;

  const nextRunEstimate = lastRun
    ? new Date(new Date(lastRun).getTime() + getIntervalMs(frequency))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">AI Discovery</h1>
      </div>

      {/* Manual Discovery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Manual Discovery
          </CardTitle>
          <CardDescription>
            Search for potential leads matching your criteria using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g. Healthcare, Construction"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Any state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any state</SelectItem>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hcMin">Min Headcount</Label>
              <Input
                id="hcMin"
                type="number"
                min={0}
                placeholder="5"
                value={headcountMin}
                onChange={(e) => setHeadcountMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hcMax">Max Headcount</Label>
              <Input
                id="hcMax"
                type="number"
                min={0}
                placeholder="100"
                value={headcountMax}
                onChange={(e) => setHeadcountMax(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={() => manualDiscover.mutate()}
            disabled={manualDiscover.isPending}
            className="w-full sm:w-auto"
            aria-label="Discover leads"
          >
            {manualDiscover.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Discovering...</>
            ) : (
              <><Search className="h-4 w-4" /> Discover Leads</>
            )}
          </Button>

          {manualDiscover.isSuccess && manualDiscover.data && (
            <div className="rounded-lg border bg-muted/30 p-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-foreground">
                  Found {manualDiscover.data.found} leads, saved {manualDiscover.data.saved}
                  {manualDiscover.data.errors > 0 && `, ${manualDiscover.data.errors} errors`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Leads have been added to your Leads page with source "auto_discovery"
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-Discovery Scheduler
          </CardTitle>
          <CardDescription>
            Automatically discover new leads on a schedule while the app is open
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto-Discovery</Label>
              <p className="text-xs text-muted-foreground">Runs in the background when the app is open</p>
            </div>
            <Switch
              checked={schedulerEnabled}
              onCheckedChange={handleToggleScheduler}
              aria-label="Toggle auto-discovery scheduler"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange} disabled={!schedulerEnabled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2 h-10">
                {isRunning ? (
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    Running
                  </Badge>
                ) : schedulerStatus === "error" ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" /> Error
                  </Badge>
                ) : schedulerEnabled ? (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" /> Scheduled
                  </Badge>
                ) : (
                  <Badge variant="outline">Idle</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Last run:</span>{" "}
              <span className="font-medium text-foreground">
                {lastRun ? formatDistanceToNow(new Date(lastRun), { addSuffix: true }) : "Never"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Next run:</span>{" "}
              <span className="font-medium text-foreground">
                {schedulerEnabled && nextRunEstimate
                  ? formatDistanceToNow(nextRunEstimate, { addSuffix: true })
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Last found:</span>{" "}
              <span className="font-medium text-foreground">
                {lastCount !== undefined ? `${lastCount} leads` : "—"}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => schedulerRun.mutate()}
            disabled={schedulerRun.isPending}
            aria-label="Run discovery now"
          >
            {schedulerRun.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="h-4 w-4" /> Run Now</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
