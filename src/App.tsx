import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Landing from "./pages/Landing";
import Scan from "./pages/Scan";
import Results from "./pages/Results";
import History from "./pages/History";
import Settings from "./pages/Settings";
import About from "./pages/About";
import NavBar from "./components/NavBar";
import OnboardingModal from "./components/OnboardingModal";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const userData = useQuery(api.users.getCurrentUser);
  const showOnboarding =
    userData !== undefined &&
    userData !== null &&
    userData.profile !== null &&
    userData.profile?.onboardingComplete === false;

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
      {showOnboarding && <OnboardingModal />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing / login */}
        <Route path="/" element={<Landing />} />

        {/* Protected routes */}
        <Route
          path="/scan"
          element={
            <AuthGuard>
              <AppShell>
                <Scan />
              </AppShell>
            </AuthGuard>
          }
        />
        <Route
          path="/scan/:scanId"
          element={
            <AuthGuard>
              <AppShell>
                <Results />
              </AppShell>
            </AuthGuard>
          }
        />
        <Route
          path="/history"
          element={
            <AuthGuard>
              <AppShell>
                <History />
              </AppShell>
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <AppShell>
                <Settings />
              </AppShell>
            </AuthGuard>
          }
        />
        <Route
          path="/about"
          element={
            <AuthGuard>
              <AppShell>
                <About />
              </AppShell>
            </AuthGuard>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
