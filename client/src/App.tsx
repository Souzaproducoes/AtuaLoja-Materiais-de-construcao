import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
const Portal = lazy(() => import("./pages/Portal"));
const Admin = lazy(() => import("./pages/Admin"));
const CatalogAdmin = lazy(() => import("./pages/CatalogAdmin"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Operations = lazy(() => import("./pages/Operations"));
const CRM = lazy(() => import("./pages/CRM"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Driver = lazy(() => import("@/pages/Driver"));
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DeliveryTracking from "./pages/DeliveryTracking";

function Router() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#f8f5ee] text-sm text-[#214d39]">A carregar módulo...</div>}>
      <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/acompanhar-entrega"} component={DeliveryTracking} />
      <Route path="/gestao" component={Portal} />
      <Route path="/gestao/admin" component={Admin} />
      <Route path="/gestao/catalogo" component={CatalogAdmin} />
      <Route path="/assistente" component={Assistant} />
      <Route path="/gestao/operacao" component={Operations} />
      <Route path="/gestao/crm" component={CRM} />
      <Route path="/gestao/relatorios" component={Reports} />
      <Route path="/gestao/configuracoes" component={Settings} />
      <Route path="/motorista" component={Driver} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
