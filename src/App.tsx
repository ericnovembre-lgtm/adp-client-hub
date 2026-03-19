import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Route, Switch } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import ContactsPage from "@/pages/ContactsPage";
import CompaniesPage from "@/pages/CompaniesPage";
import DealsPage from "@/pages/DealsPage";
import TasksPage from "@/pages/TasksPage";
import AIDiscoveryPage from "@/pages/AIDiscoveryPage";
import ReportsPage from "@/pages/ReportsPage";
import EmailTemplatesPage from "@/pages/EmailTemplatesPage";
import SettingsPage from "@/pages/SettingsPage";
import MarketIntelligencePage from "@/pages/MarketIntelligencePage";
import QuoteReadinessPage from "@/pages/QuoteReadinessPage";
import RenewalsPage from "@/pages/RenewalsPage";
import NotFound from "@/pages/NotFound";
import AgentPanel from "@/components/AgentPanel";
import { toast } from "sonner";

function handleGlobalError(error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  const msg = err.message?.toLowerCase() ?? "";

  // Auth errors → redirect
  if (msg.includes("jwt") || msg.includes("not authenticated") || msg.includes("401") || msg.includes("invalid claim")) {
    toast.error("Session expired. Please sign in again.");
    window.location.href = "/login";
    return;
  }

  // Rate limit
  if (msg.includes("429") || msg.includes("too many") || msg.includes("rate limit")) {
    toast.error("Too many requests. Please wait a moment.");
    return;
  }

  // Network errors
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch") || msg.includes("connection")) {
    toast.error("Connection lost. Retrying...");
    return;
  }

  // Generic
  toast.error(err.message || "An unexpected error occurred");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const msg = (error instanceof Error ? error.message : "").toLowerCase();
        // Don't retry auth errors
        if (msg.includes("jwt") || msg.includes("401") || msg.includes("not authenticated")) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => handleGlobalError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleGlobalError(error),
  }),
});

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/">{() => <ProtectedPage><DashboardPage /></ProtectedPage>}</Route>
              <Route path="/leads">{() => <ProtectedPage><LeadsPage /></ProtectedPage>}</Route>
              <Route path="/contacts">{() => <ProtectedPage><ContactsPage /></ProtectedPage>}</Route>
              <Route path="/companies">{() => <ProtectedPage><CompaniesPage /></ProtectedPage>}</Route>
              <Route path="/deals">{() => <ProtectedPage><DealsPage /></ProtectedPage>}</Route>
              <Route path="/tasks">{() => <ProtectedPage><TasksPage /></ProtectedPage>}</Route>
              <Route path="/reports">{() => <ProtectedPage><ReportsPage /></ProtectedPage>}</Route>
              <Route path="/ai-discovery">{() => <ProtectedPage><AIDiscoveryPage /></ProtectedPage>}</Route>
              <Route path="/market-intelligence">{() => <ProtectedPage><MarketIntelligencePage /></ProtectedPage>}</Route>
              <Route path="/quote-readiness">{() => <ProtectedPage><QuoteReadinessPage /></ProtectedPage>}</Route>
              <Route path="/renewals">{() => <ProtectedPage><RenewalsPage /></ProtectedPage>}</Route>
              <Route path="/email-templates">{() => <ProtectedPage><EmailTemplatesPage /></ProtectedPage>}</Route>
              <Route path="/settings">{() => <ProtectedPage><SettingsPage /></ProtectedPage>}</Route>
              <Route component={NotFound} />
            </Switch>
            <AgentPanel />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
