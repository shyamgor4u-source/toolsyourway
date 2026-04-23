import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import React, { lazy, Suspense } from "react";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import UserDashboard from "@/pages/dashboard";
import AiChat from "@/components/ai-chat";

// Lazy-load heavy pages to reduce initial bundle size
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin-analytics"));
const BotDetailPage = lazy(() => import("@/pages/bot-detail"));
const PricingPage = lazy(() => import("@/pages/pricing-page"));
const OutreachPage = lazy(() => import("@/pages/outreach-page"));
const FoundersPage = lazy(() => import("@/pages/founders-page"));
const InfluencersPage = lazy(() => import("@/pages/influencers-page"));

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen" data-testid="loading-spinner">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!user) return <Redirect to="/auth" />;
  return (
    <Suspense fallback={<PageSpinner />}>
      <Component />
    </Suspense>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (!user) return <Redirect to="/auth" />;
  if (user.role !== "admin") return <Redirect to="/dashboard" />;
  return (
    <Suspense fallback={<PageSpinner />}>
      <Component />
    </Suspense>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/pricing">
        <Suspense fallback={<PageSpinner />}>
          <PricingPage />
        </Suspense>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={UserDashboard} />
      </Route>
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/analytics">
        <AdminRoute component={AdminAnalyticsPage} />
      </Route>
      <Route path="/bot/:botType">
        <ProtectedRoute component={BotDetailPage} />
      </Route>
      <Route path="/outreach">
        <ProtectedRoute component={OutreachPage} />
      </Route>
      <Route path="/founders">
        <ProtectedRoute component={FoundersPage} />
      </Route>
      <Route path="/influencers">
        <ProtectedRoute component={InfluencersPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <I18nProvider>
            <Router hook={useHashLocation}>
              <AppRouter />
              <AiChat />
            </Router>
          </I18nProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
