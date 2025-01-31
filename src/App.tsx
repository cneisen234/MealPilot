import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Recipe from "./pages/Recipe";
import Header from "./components/layout/Header";
import SideNavbar from "./components/layout/SideNavbar";
import "./styles/main.css";
import PrivateRoute from "./components/auth/PrivateRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import BubbleBackground from "./BubbleBackground";
import MyRecipes from "./pages/MyRecipes";
import RecipeDetail from "./components/myrecipes/RecipeDetail";
import CreateRecipe from "./components/myrecipes/CreateRecipe";
import MealPlan from "./pages/MealPlan";
import Inventory from "./pages/Inventory";
import ShoppingList from "./pages/shoppingList";
import ShareableListPage from "./components/shoppingList/SharableListPage";
import AccountSettings from "./pages/AccountSettings";
import ReferralProgram from "./pages/ReferralProgram";
import ContactUs from "./pages/ContactUs";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ToastContainer } from "./components/common/Toast";
import { ToastProvider } from "./context/ToastContext";
import PaywallGuard from "./components/paywall/PaywallGuard";

const AppContent: React.FC = () => {
  const { isAuthenticated, checkAuthStatus } = useAuth();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const stripePromise = loadStripe(
    process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!
  );

  return (
    <div
      className="app"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {isAuthenticated && <Header />}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {isAuthenticated && <SideNavbar />}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: "10px",
          }}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/recipe" replace /> : <Home />
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/recipe" replace /> : <Login />
              }
            />
            <Route
              path="/signup"
              element={
                isAuthenticated ? <Navigate to="/recipe" replace /> : <Signup />
              }
            />
            <Route
              path="/signup/:referralCode"
              element={
                isAuthenticated ? <Navigate to="/recipe" replace /> : <Signup />
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route
              path="/share/shopping-list/:id"
              element={<ShareableListPage />}
            />

            {/* is accessible without paywall */}
            <Route
              path="/account-settings"
              element={
                <PrivateRoute
                  element={
                    <Elements stripe={stripePromise}>
                      <AccountSettings />
                    </Elements>
                  }
                />
              }
            />

            <Route
              path="/contact-us"
              element={<PrivateRoute element={<ContactUs />} />}
            />

            {/* Protected routes behind paywall */}
            <Route
              path="/recipe"
              element={
                <PrivateRoute element={<PaywallGuard element={<Recipe />} />} />
              }
            />
            <Route
              path="/myrecipes"
              element={
                <PrivateRoute
                  element={<PaywallGuard element={<MyRecipes />} />}
                />
              }
            />
            <Route
              path="/myrecipes/:id"
              element={
                <PrivateRoute
                  element={<PaywallGuard element={<RecipeDetail />} />}
                />
              }
            />
            <Route
              path="/recipe/create"
              element={
                <PrivateRoute
                  element={<PaywallGuard element={<CreateRecipe />} />}
                />
              }
            />
            <Route
              path="/mealplan"
              element={
                <PrivateRoute
                  element={<PaywallGuard element={<MealPlan />} />}
                />
              }
            />
            <Route
              path="/inventory"
              element={
                <PrivateRoute
                  element={<PaywallGuard element={<Inventory />} />}
                />
              }
            />
            <Route
              path="/shopping-list"
              element={
                <PrivateRoute
                  element={<PaywallGuard element={<ShoppingList />} />}
                />
              }
            />
            <Route
              path="/referral-program"
              element={
                <PrivateRoute
                  element={<PaywallGuard element={<ReferralProgram />} />}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <div
          style={{
            position: "relative",
            minHeight: "100vh",
            overflow: "hidden",
          }}>
          <BubbleBackground />
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </div>
        <ToastContainer />
      </ToastProvider>
    </Router>
  );
};

export default App;
