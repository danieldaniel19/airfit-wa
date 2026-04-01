import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Activate from "@/pages/activate";
import ConnectStrava from "@/pages/connect-strava";
import Onboarding from "@/pages/onboarding";
import Program from "@/pages/program";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/signup" component={Home} />
      <Route path="/activate" component={Activate} />
      <Route path="/connect-strava" component={ConnectStrava} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/program" component={Program} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
