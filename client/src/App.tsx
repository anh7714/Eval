import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/layout/header";
import Home from "@/pages/home";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminEvaluators from "@/pages/admin/evaluators";
import AdminCandidates from "@/pages/admin/candidates";
import AdminEvaluationItems from "@/pages/admin/evaluation-items";
import AdminResults from "@/pages/admin/results";
import AdminSettings from "@/pages/admin/settings";
import EvaluatorLogin from "@/pages/evaluator/login";
import EvaluatorDashboard from "@/pages/evaluator/dashboard";
import EvaluationForm from "@/pages/evaluator/evaluation-form";
import Results from "@/pages/results";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/evaluators" component={AdminEvaluators} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route path="/admin/evaluation-items" component={AdminEvaluationItems} />
      <Route path="/admin/results" component={AdminResults} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/evaluator/login" component={EvaluatorLogin} />
      <Route path="/evaluator/dashboard" component={EvaluatorDashboard} />
      <Route path="/evaluator/evaluation/:candidateId" component={EvaluationForm} />
      <Route path="/evaluation-management" component={EvaluatorDashboard} />
      <Route path="/results" component={Results} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-slate-50 font-sans">
          <Header />
          <Router />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
