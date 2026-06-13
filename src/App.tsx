import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingV2 from "./pages/LandingV2";
import StudioDashboard from "./pages/StudioDashboard";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import AdminLogin from "./pages/AdminLogin";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import RefundPolicy from "./pages/RefundPolicy";
import NotFound from "./pages/NotFound";
import ClientPortal from "./pages/ClientPortal";
import Profile from "./pages/Profile";
import AcceptInvite from "./pages/AcceptInvite";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingV2 />} />
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            {/* Unified authenticated dashboard (CRM + Studio chrome merged at /studio) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/studio" element={<StudioDashboard />} />
              <Route path="/studio/:section" element={<StudioDashboard />} />
            </Route>
            {/* Legacy / courtesy redirects (kept so old links keep working) */}
            <Route path="/v2" element={<Navigate to="/" replace />} />
            <Route path="/app" element={<Navigate to="/studio/overview" replace />} />
            <Route path="/app/*" element={<Navigate to="/studio/overview" replace />} />
            <Route path="/admin" element={<Navigate to="/studio/overview" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/studio/overview" replace />} />
            <Route path="/team" element={<Navigate to="/login" replace />} />
            {/* Public */}
            <Route path="/client/:token" element={<ClientPortal />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
