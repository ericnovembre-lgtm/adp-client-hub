import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { HEADCOUNT_MIN, HEADCOUNT_MAX, HEADCOUNT_LABEL } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Search, Clock, Play, Loader2, CheckCircle, AlertCircle, Sparkles, Zap, MapPin, Building2, TrendingUp,
} from "lucide-react";
import IntentDiscoveryTab from "@/components/discovery/IntentDiscoveryTab";
import YelpDiscoveryTab from "@/components/discovery/YelpDiscoveryTab";
import RegistryDiscoveryTab from "@/components/discovery/RegistryDiscoveryTab";
import GrowthSignalsPanel from "@/components/GrowthSignalsPanel";

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

export default function AIDiscoveryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  // Manual discovery form state
  const [industry, setIndustry] = useState("");
  const [state, setState] = useState("");
  const [headcountMin, setHeadcountMin] = useState(String(HEADCOUNT_MIN));
  const [headcountMax, setHeadcountMax] = useState(String(HEADCOUNT_MAX));

  // Scheduler state
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const schedulerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load defaults from settings
  useEffect(() => {
    if (settings) {
      if (settings.defaultIndustry && !industry) setIndustry(settings.defaultIndustry);
      if (settings.defaultState && !state) setState(settings.defaultState);
      if (settings.defaultHeadcountMin != null) setHeadcountMin(String(Math.max(HEADCOUNT_MIN, settings.defaultHeadcountMin)));
      if (settings.defaultHeadcountMax != null) setHeadcountMax(String(Math.min(HEADCOUNT_MAX, settings.defaultHeadcountMax)));
      if (settings.scheduler_enabled !== undefined) setSchedulerEnabled(settings.scheduler_enabled);
      if (settings.scheduler_frequency) setFrequency(settings.scheduler_frequency);
    }
  }, [settings]);

  // Manual discovery mutation
  const manualDiscover = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("scheduled-discovery", {
        body: {
          industry: industry || undefined,
          state: state || undefined,
          headcount_min: headcountMin ? Number(headcountMin) : HEADCOUNT_MIN,
          headcount_max: headcountMax ? Number(headcountMax) : HEADCOUNT_MAX,
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
          headcount_min: settings?.defaultHeadcountMin || (headcountMin ? Number(headcountMin) : HEADCOUNT_MIN),
          headcount_max: settings?.defaultHeadcountMax || (headcountMax ? Number(headcountMax) : HEADCOUNT_MAX),
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
      if (settings && user) {
        updateSettings.mutate({ ...settings, scheduler_status: "error" });
      }
    },
  });

  const handleToggleScheduler = useCallback(async (enabled: boolean) => {
    setSchedulerEnabled(enabled);
    if (user) {
      await updateSettings.mutateAsync({
        ...settings,
        scheduler_enabled: enabled,
        scheduler_frequency: frequency,
      });
    }
  }, [settings, frequency, user, updateSettings]);

  const handleFrequencyChange = useCallback(async (freq: string) => {
    setFrequency(freq);
    if (user) {
      await updateSettings.mutateAsync({
        ...settings,
        scheduler_frequency: freq,
      });
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
      const lastRun = settings?.scheduler_last_run;
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

  const lastRun = settings?.scheduler_last_run;
  const lastCount = settings?.scheduler_last_count;
  const schedulerStatus = settings?.scheduler_status;
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

      <Tabs defaultValue="ai-generated">
        <TabsList>
          <TabsTrigger value="ai-generated" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> AI Generated
          </TabsTrigger>
          <TabsTrigger value="intent-based" className="gap-1.5">
            <Zap className="h-4 w-4" /> Intent-Based
          </TabsTrigger>
          <TabsTrigger value="new-businesses" className="gap-1.5">
            <Building2 className="h-4 w-4" /> New Businesses
          </TabsTrigger>
          <TabsTrigger value="local-businesses" className="gap-1.5">
            <MapPin className="h-4 w-4" /> Local Businesses
          </TabsTrigger>
          <TabsTrigger value="growth-signals" className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> Growth Signals
          </TabsTrigger>
        </TabsList>

        {/* AI Generated Tab — existing functionality */}
        <TabsContent value="ai-generated" className="space-y-6">
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
                  <Input id="industry" placeholder="e.g. Healthcare, Construction" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state"><SelectValue placeholder="Any state" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any state</SelectItem>
                      {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hcMin">Min Headcount</Label>
                  <Input id="hcMin" type="number" min={HEADCOUNT_MIN} max={HEADCOUNT_MAX} placeholder={String(HEADCOUNT_MIN)} value={headcountMin} onChange={(e) => { const v = Number(e.target.value); setHeadcountMin(String(Math.max(HEADCOUNT_MIN, Math.min(HEADCOUNT_MAX, v || HEADCOUNT_MIN)))); }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hcMax">Max Headcount</Label>
                  <Input id="hcMax" type="number" min={HEADCOUNT_MIN} max={HEADCOUNT_MAX} placeholder={String(HEADCOUNT_MAX)} value={headcountMax} onChange={(e) => { const v = Number(e.target.value); setHeadcountMax(String(Math.max(HEADCOUNT_MIN, Math.min(HEADCOUNT_MAX, v || HEADCOUNT_MAX)))); }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Your territory: {HEADCOUNT_LABEL}</p>
              <Button onClick={() => manualDiscover.mutate()} disabled={manualDiscover.isPending} className="w-full sm:w-auto">
                {manualDiscover.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Discovering...</> : <><Search className="h-4 w-4" /> Discover Leads</>}
              </Button>
              {manualDiscover.isIdle && (
                <div className="rounded-lg border bg-muted/30 p-6 mt-4 text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No AI-discovered leads yet</p>
                  <p className="text-sm mt-1 max-w-md mx-auto">Set your target criteria above and click "Discover Leads" to find companies that match the ADP TotalSource ideal client profile.</p>
                </div>
              )}
              {manualDiscover.isSuccess && manualDiscover.data && (
                <div className="rounded-lg border bg-muted/30 p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-foreground">
                      Found {manualDiscover.data.found} leads, saved {manualDiscover.data.saved}
                      {manualDiscover.data.skipped > 0 && `, ${manualDiscover.data.skipped} duplicates skipped`}
                      {manualDiscover.data.errors > 0 && `, ${manualDiscover.data.errors} errors`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Leads have been added to your Leads page with source "auto_discovery"</p>
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
              <CardDescription>Automatically discover new leads on a schedule while the app is open</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto-Discovery</Label>
                  <p className="text-xs text-muted-foreground">Runs in the background when the app is open</p>
                </div>
                <Switch checked={schedulerEnabled} onCheckedChange={handleToggleScheduler} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={handleFrequencyChange} disabled={!schedulerEnabled}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
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
                      <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>
                    ) : schedulerEnabled ? (
                      <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Scheduled</Badge>
                    ) : (
                      <Badge variant="outline">Idle</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Last run:</span>{" "}
                  <span className="font-medium text-foreground">{lastRun ? formatDistanceToNow(new Date(lastRun), { addSuffix: true }) : "Never"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Next run:</span>{" "}
                  <span className="font-medium text-foreground">{schedulerEnabled && nextRunEstimate ? formatDistanceToNow(nextRunEstimate, { addSuffix: true }) : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last found:</span>{" "}
                  <span className="font-medium text-foreground">{lastCount !== undefined ? `${lastCount} leads` : "—"}</span>
                </div>
              </div>
              <Button variant="outline" onClick={() => schedulerRun.mutate()} disabled={schedulerRun.isPending}>
                {schedulerRun.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Running...</> : <><Play className="h-4 w-4" /> Run Now</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intent-Based Tab */}
        <TabsContent value="intent-based">
          <IntentDiscoveryTab />
        </TabsContent>

        {/* New Businesses Tab */}
        <TabsContent value="new-businesses">
          <RegistryDiscoveryTab />
        </TabsContent>

        {/* Local Businesses Tab */}
        <TabsContent value="local-businesses">
          <YelpDiscoveryTab />
        </TabsContent>

        {/* Growth Signals Tab */}
        <TabsContent value="growth-signals">
          <GrowthSignalsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
