import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings, useUpdateUserSettings, type UserSettings } from "@/hooks/useUserSettings";
import { exportToCSV } from "@/lib/exportCSV";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Download, Database, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

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
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [aiChatEnabled, setAiChatEnabled] = useState(true);

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
    setAiModel(settings.aiModel ?? "gpt-4o-mini");
    setAiChatEnabled(settings.aiChatEnabled !== false);
    setDefaultIndustry(settings.defaultIndustry ?? "");
    setDefaultState(settings.defaultState ?? "");
    setHeadcountMin(settings.defaultHeadcountMin ?? "");
    setHeadcountMax(settings.defaultHeadcountMax ?? "");
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
      aiModel,
      aiChatEnabled,
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
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> API keys are configured as backend function secrets
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable AI Chat Widget</Label>
              <p className="text-xs text-muted-foreground">Show the floating chat assistant on all pages</p>
            </div>
            <Switch checked={aiChatEnabled} onCheckedChange={setAiChatEnabled} />
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
              <Input type="number" value={headcountMin} onChange={(e) => setHeadcountMin(e.target.value ? Number(e.target.value) : "")} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label>Max Headcount</Label>
              <Input type="number" value={headcountMax} onChange={(e) => setHeadcountMax(e.target.value ? Number(e.target.value) : "")} placeholder="20" />
            </div>
          </div>
          <Button onClick={saveSettings} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Discovery Defaults
          </Button>
        </CardContent>
      </Card>

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
