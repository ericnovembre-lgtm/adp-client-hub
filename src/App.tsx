import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Route, Switch } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
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
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
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
            <Route path="/ai-discovery">{() => <ProtectedPage><AIDiscoveryPage /></ProtectedPage>}</Route>
            <Route path="/settings">{() => <ProtectedPage><SettingsPage /></ProtectedPage>}</Route>
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
