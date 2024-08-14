import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Interests from "./pages/Interests";
import Chatbot from "./pages/Chatbot";
import Friends from "./pages/Friends";
import Recommendations from "./pages/Recommendations";
import Upgrade from "./pages/Upgrade";
import Header from "./components/common/Header";
import SideNavbar from "./components/common/SideNavbar";
import Footer from "./components/common/Footer";
import "./styles/main.css";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Onboarding from "./components/Onboarding";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import ContactUs from "./pages/ContactUs";
import CloseAccount from "./components/profile/CloseAccount";
import ComingSoon from "./pages/ComingSoon";
import { TutorialProvider } from "./context/TutorialContext";
import NewUserTutorial from "./components/NewUserTutorial";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import AnimatedTechIcon from "./components/animatedTechIcon";

const AppContent: React.FC = () => {
  const { isAuthenticated, checkAuthStatus } = useAuth();
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const isOnboardingRoute = location.pathname === "/onboarding";
  const stripePromise = loadStripe(
    process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!
  );

  return (
    <div
      className="app"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {isAuthenticated && !isOnboardingRoute && <Header />}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {isAuthenticated && !isOnboardingRoute && <SideNavbar />}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: isOnboardingRoute ? 0 : "20px",
          }}>
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/profile" replace /> : <Home />
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/profile" replace /> : <Login />
              }
            />
            <Route
              path="/signup"
              element={
                isAuthenticated ? (
                  <Navigate to="/onboarding" replace />
                ) : (
                  <Signup />
                )
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/close-account" element={<CloseAccount />} />
            <Route
              path="/onboarding"
              element={<PrivateRoute element={<Onboarding />} />}
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute
                  element={
                    <Elements stripe={stripePromise}>
                      <Profile />
                    </Elements>
                  }
                />
              }
            />
            <Route
              path="/interests"
              element={<PrivateRoute element={<Interests />} />}
            />
            <Route
              path="/chatbot"
              element={<PrivateRoute element={<Chatbot />} />}
            />
            <Route
              path="/friends"
              element={<PrivateRoute element={<Friends />} />}
            />
            <Route
              path="/recommendations"
              element={<PrivateRoute element={<Recommendations />} />}
            />
            <Route
              path="/upgrade"
              element={
                <PrivateRoute
                  element={
                    <Elements stripe={stripePromise}>
                      <Upgrade />
                    </Elements>
                  }
                />
              }
            />
            <Route path="/coming-soon" element={<ComingSoon />} />
          </Routes>
        </main>
      </div>
      {isAuthenticated && !isOnboardingRoute && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <TutorialProvider>
          <AppContent />
          <NewUserTutorial />
        </TutorialProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
