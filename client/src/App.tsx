import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Leaderboard from "@/pages/Leaderboard";
import AdminPanel from "@/pages/Admin";
import F1Season from "@/pages/F1Season";
import Profile from "@/pages/Profile";
import Paddock from "@/pages/Paddock";
import LobbyDetail from "@/pages/LobbyDetail";
import DraftRoom from "@/pages/DraftRoom";
import { Navigation } from "@/components/Navigation";

function ProtectedRoute({ component: Component, requireAuth = true }: { component: React.ComponentType; requireAuth?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && requireAuth) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation, requireAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && requireAuth) return null;

  return <Component />;
}

function Router() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (user && location === "/auth") {
      setLocation("/");
    }
  }, [user, location, setLocation]);

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/paddock">
        {() => <ProtectedRoute component={Paddock} />}
      </Route>
      <Route path="/lobby/:id">
        {(params) => <ProtectedRoute component={() => <LobbyDetail id={Number(params.id)} />} />}
      </Route>
      <Route path="/draft/:lobbyId/:raceId">
        {(params) => <ProtectedRoute component={() => <DraftRoom lobbyId={Number(params.lobbyId)} raceId={Number(params.raceId)} />} />}
      </Route>
      <Route path="/leaderboard">
        {() => <ProtectedRoute component={Leaderboard} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPanel} />}
      </Route>
      <Route path="/f1-2026">
        {() => <ProtectedRoute component={F1Season} requireAuth={false} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
