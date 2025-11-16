import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { RegionProvider } from "@/contexts/RegionContext";
import { RegionSettingsProvider } from "@/contexts/RegionSettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CheckoutProvider } from "@/contexts/CheckoutContext";
import PayPalProvider from "@/components/PayPalProvider";
import CookieNotice from "./components/CookieNotice";
import { AnalyticsTracker } from "./components/AnalyticsTracker";

// Lazy load routes to reduce initial bundle size and prevent stack overflow on iOS
const Index = lazy(() => import("./pages/Index"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const FlightSim = lazy(() => import("./pages/FlightSim"));
const SimRacing = lazy(() => import("./pages/SimRacing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const MonitorStands = lazy(() => import("./pages/MonitorStands"));
const Services = lazy(() => import("./pages/Services"));
const AssemblyManuals = lazy(() => import("./pages/AssemblyManuals"));
const ManualView = lazy(() => import("./pages/ManualView"));
const CompatibleBrands = lazy(() => import("./pages/CompatibleBrands"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Blog = lazy(() => import("./pages/Blog"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const Backorders = lazy(() => import("./pages/Backorders"));
const InternationalShipping = lazy(() => import("./pages/InternationalShipping"));
const IntellectualProperties = lazy(() => import("./pages/IntellectualProperties"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const RacingFlightSeats = lazy(() => import("./pages/RacingFlightSeats"));
const Accessories = lazy(() => import("./pages/Accessories"));
const BStock = lazy(() => import("./pages/BStock"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <RegionProvider>
      <RegionSettingsProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <CheckoutProvider>
                <PayPalProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <AnalyticsTracker />
                      <Suspense fallback={<LoadingFallback />}>
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
                          <Route path="/racing-flight-seats" element={<RacingFlightSeats />} />
                          <Route path="/accessories" element={<Accessories />} />
                          <Route path="/b-stock" element={<BStock />} />
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
                      </Suspense>
                      <CookieNotice />
                    </BrowserRouter>
                  </TooltipProvider>
                </PayPalProvider>
              </CheckoutProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </RegionSettingsProvider>
    </RegionProvider>
  </QueryClientProvider>
  );
};

export default App;
