import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import {
  LanguageProvider,
} from "./context/LanguageContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import OfflineBanner from "./components/OfflineBanner";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

import FarmerDashboard from "./pages/FarmerDashboard";
import NewListingPage from "./pages/NewListingPage";
import MatchedBuyersPage from "./pages/MatchedBuyersPage";
import FarmerVerificationPage from "./pages/FarmerVerificationPage";

import BuyerDashboard from "./pages/BuyerDashboard";
import BuyerVerificationPage from "./pages/BuyerVerificationPage";

import VerificationStatusPage from "./pages/VerificationStatusPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";

import AdminDashboard from "./pages/AdminDashboard";
import AdminVerificationPage from "./pages/AdminVerificationPage";

import VoiceCallPage from "./pages/VoiceCallPage";
import SmsTestPage from "./pages/SmsTestPage";

function Guard({ roles, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    roles &&
    !roles.includes(user.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Shell() {
  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />

      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={<LandingPage />}
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/signup"
            element={<SignupPage />}
          />

          {/* Farmer */}
          <Route
            path="/farmer"
            element={
              <Guard roles={["farmer"]}>
                <FarmerDashboard />
              </Guard>
            }
          />

          <Route
            path="/farmer/new"
            element={
              <Guard roles={["farmer"]}>
                <NewListingPage />
              </Guard>
            }
          />

          <Route
            path="/farmer/matches/:listingId"
            element={
              <Guard roles={["farmer"]}>
                <MatchedBuyersPage />
              </Guard>
            }
          />

          <Route
            path="/farmer/verify"
            element={
              <Guard roles={["farmer"]}>
                <FarmerVerificationPage />
              </Guard>
            }
          />

          {/* Buyer */}
          <Route
            path="/buyer"
            element={
              <Guard roles={["buyer"]}>
                <BuyerDashboard />
              </Guard>
            }
          />

          <Route
            path="/buyer/verify"
            element={
              <Guard roles={["buyer"]}>
                <BuyerVerificationPage />
              </Guard>
            }
          />

          {/* Shared */}
          <Route
            path="/verification/status"
            element={
              <Guard>
                <VerificationStatusPage />
              </Guard>
            }
          />

          <Route
            path="/orders/:orderId"
            element={
              <Guard>
                <OrderTrackingPage />
              </Guard>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <Guard roles={["admin"]}>
                <AdminDashboard />
              </Guard>
            }
          />

          <Route
            path="/admin/verifications"
            element={
              <Guard roles={["admin"]}>
                <AdminVerificationPage />
              </Guard>
            }
          />

          {/* Voice / SMS */}
          <Route
            path="/voice"
            element={<VoiceCallPage />}
          />

          <Route
            path="/sms"
            element={<SmsTestPage />}
          />

          {/* SPA fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
