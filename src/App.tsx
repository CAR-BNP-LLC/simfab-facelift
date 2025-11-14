import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RegionProvider } from "@/contexts/RegionContext";
import PayPalProvider from "@/components/PayPalProvider";
import { DeferredProviders } from "@/components/DeferredProviders";
import { CheckoutRouteWrapper } from "@/components/CheckoutRouteWrapper";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import FlightSim from "./pages/FlightSim";
import SimRacing from "./pages/SimRacing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import MonitorStands from "./pages/MonitorStands";
import Services from "./pages/Services";
import AssemblyManuals from "./pages/AssemblyManuals";
import ManualView from "./pages/ManualView";
import CompatibleBrands from "./pages/CompatibleBrands";
import Gallery from "./pages/Gallery";
import Blog from "./pages/Blog";
import TermsConditions from "./pages/TermsConditions";
import Backorders from "./pages/Backorders";
import InternationalShipping from "./pages/InternationalShipping";
import IntellectualProperties from "./pages/IntellectualProperties";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FAQ from "./pages/FAQ";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Wishlist from "./pages/Wishlist";
import CookieNotice from "./components/CookieNotice";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

const queryClient = new QueryClient();

// Track render count to detect infinite loops
let renderCount = 0;
const MAX_RENDERS = 50;

const App = () => {
  renderCount++;
  if (renderCount > MAX_RENDERS) {
    console.error('[App] INFINITE LOOP DETECTED! Render count:', renderCount);
    throw new Error('Infinite render loop detected');
  }
  console.log('[App] RENDER #' + renderCount);
  return (
  <QueryClientProvider client={queryClient}>
    <RegionProvider>
      <DeferredProviders>
        <CheckoutRouteWrapper>
          <PayPalProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AnalyticsTracker />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/share/:code" element={<ProductDetail />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/flight-sim" element={<FlightSim />} />
                  <Route path="/sim-racing" element={<SimRacing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
                  <Route path="/orders/:orderNumber" element={<OrderConfirmation />} />
                  <Route path="/monitor-stands" element={<MonitorStands />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/assembly-manuals" element={<AssemblyManuals />} />
                  <Route path="/manuals/:id" element={<ManualView />} />
                  <Route path="/compatible-brands" element={<CompatibleBrands />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/terms-conditions" element={<TermsConditions />} />
                  <Route path="/backorders" element={<Backorders />} />
                  <Route path="/international-shipping" element={<InternationalShipping />} />
                  <Route path="/intellectual-properties" element={<IntellectualProperties />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CookieNotice />
              </BrowserRouter>
            </TooltipProvider>
          </PayPalProvider>
        </CheckoutRouteWrapper>
      </DeferredProviders>
    </RegionProvider>
  </QueryClientProvider>
  );
};

export default App;
