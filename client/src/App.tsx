import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/Home";
import Rankings from "@/pages/Rankings";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import PaymentPending from "@/pages/PaymentPending";
import PaymentCancelled from "@/pages/PaymentCancelled";
import PaymentFailed from "@/pages/PaymentFailed";
import AdminOrders from "@/pages/AdminOrders";
import AdminPackages from "@/pages/AdminPackages";
import AdminRankings from "@/pages/AdminRankings";
import AdminGallery from "@/pages/AdminGallery";
import AdminHero from "@/pages/AdminHero";
import AdminCoupons from "@/pages/AdminCoupons";
import AdminSettings from "@/pages/AdminSettings";
import AdminLogin from "@/pages/AdminLogin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rankings" component={Rankings} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders" component={Orders} />
      <Route path="/payment/pending" component={PaymentPending} />
      <Route path="/payment/cancelled" component={PaymentCancelled} />
      <Route path="/payment/failed" component={PaymentFailed} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/packages" component={AdminPackages} />
      <Route path="/admin/rankings" component={AdminRankings} />
      <Route path="/admin/gallery" component={AdminGallery} />
      <Route path="/admin/hero" component={AdminHero} />
      <Route path="/admin/coupons" component={AdminCoupons} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
