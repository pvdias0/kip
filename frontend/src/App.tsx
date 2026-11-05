import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ClarityTracker } from "@/components/analytics/ClarityTracker";
import { EntrySheetProvider } from "@/components/entry/EntrySheetProvider";
import { lazy, Suspense } from "react";
// Landing fica no bundle principal (primeira tela para visitantes / Google).
// As demais paginas sao carregadas sob demanda (code splitting).
import Landing from "./pages/Landing";
const Home = lazy(() => import("./pages/Home"));
const Statement = lazy(() => import("./pages/Statement"));
const Wallet = lazy(() => import("./pages/Wallet"));
const More = lazy(() => import("./pages/More"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Profile = lazy(() => import("./pages/Profile"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const CategoryManagement = lazy(() => import("./pages/CategoryManagement"));
const PaymentMethodManagement = lazy(() => import("./pages/PaymentMethodManagement"));
const LegalConsent = lazy(() => import("./pages/LegalConsent"));
const LegalDocumentPage = lazy(() => import("./pages/LegalDocumentPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    </div>
  );
}

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.has_accepted_legal_documents) {
    return <Navigate to="/legal/consent" replace />;
  }

  return <>{children}</>;
}

// Route for authenticated users (redirects to home if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={user?.has_accepted_legal_documents ? "/" : "/legal/consent"}
        replace
      />
    );
  }

  return <>{children}</>;
}

// Route for landing page (shows dashboard if authenticated, landing page otherwise)
function HomeRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    if (!user?.has_accepted_legal_documents) {
      return <Navigate to="/legal/consent" replace />;
    }
    return <Home />;
  }

  return <Landing />;
}

function LegalConsentRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.has_accepted_legal_documents) {
    return <Navigate to="/" replace />;
  }

  return <LegalConsent />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRoute>
            <Register />
          </AuthRoute>
        }
      />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/privacy-policy"
        element={<LegalDocumentPage documentType="privacy" />}
      />
      <Route
        path="/terms-of-service"
        element={<LegalDocumentPage documentType="terms" />}
      />
      <Route path="/legal/consent" element={<LegalConsentRoute />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <WhatsAppSettings />
          </ProtectedRoute>
        }
      />
      <Route path="/extrato" element={<ProtectedRoute><Statement /></ProtectedRoute>} />
      <Route path="/carteira" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/mais" element={<ProtectedRoute><More /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><CategoryManagement /></ProtectedRoute>} />
      <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethodManagement /></ProtectedRoute>} />
      {/* enderecos antigos */}
      <Route path="/dashboard" element={<Navigate to="/relatorios" replace />} />
      <Route path="/payment-accounts" element={<Navigate to="/carteira" replace />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="kip-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ClarityTracker />
            <EntrySheetProvider>
              <Suspense fallback={<FullScreenLoader />}>
                <AppRoutes />
              </Suspense>
            </EntrySheetProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
