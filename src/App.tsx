import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CheckoutProvider } from "@/contexts/CheckoutContext";
import PayPalProvider from "@/components/PayPalProvider";
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
import CompatibleBrands from "./pages/CompatibleBrands";
import Gallery from "./pages/Gallery";
import Blog from "./pages/Blog";
import TermsConditions from "./pages/TermsConditions";
import Backorders from "./pages/Backorders";
import InternationalShipping from "./pages/InternationalShipping";
import IntellectualProperties from "./pages/IntellectualProperties";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import CookieNotice from "./components/CookieNotice";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <CheckoutProvider>
          <PayPalProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/flight-sim" element={<FlightSim />} />
            <Route path="/sim-racing" element={<SimRacing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
            <Route path="/monitor-stands" element={<MonitorStands />} />
            <Route path="/services" element={<Services />} />
            <Route path="/assembly-manuals" element={<AssemblyManuals />} />
            <Route path="/compatible-brands" element={<CompatibleBrands />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/backorders" element={<Backorders />} />
            <Route path="/international-shipping" element={<InternationalShipping />} />
            <Route path="/intellectual-properties" element={<IntellectualProperties />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/faq" element={<FAQ />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieNotice />
          </BrowserRouter>
          </TooltipProvider>
        </PayPalProvider>
        </CheckoutProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
