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
import CloseAccount from "./components/profile/CloseAccount";
import BubbleBackground from "./BubbleBackground";
import MyRecipes from "./pages/MyRecipes";
import RecipeDetail from "./components/myrecipes/RecipeDetail";
import CreateRecipe from "./components/myrecipes/CreateRecipe";
import MealPlan from "./pages/MealPlan";
import Inventory from "./pages/Inventory";
import ShoppingList from "./pages/shoppingList";
import ShareableListPage from "./components/shoppingList/SharableListPage";
import { ToastContainer } from "./components/common/Toast";
import { ToastProvider } from "./context/ToastContext";

const AppContent: React.FC = () => {
  const { isAuthenticated, checkAuthStatus } = useAuth();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/close-account" element={<CloseAccount />} />
            <Route
              path="/recipe"
              element={<PrivateRoute element={<Recipe />} />}
            />
            <Route path="/myrecipes" element={<MyRecipes />} />
            <Route
              path="/myrecipes/:id"
              element={<PrivateRoute element={<RecipeDetail />} />}
            />
            <Route
              path="/recipe/create"
              element={<PrivateRoute element={<CreateRecipe />} />}
            />
            <Route
              path="/mealplan"
              element={<PrivateRoute element={<MealPlan />} />}
            />
            <Route
              path="/inventory"
              element={<PrivateRoute element={<Inventory />} />}
            />
            <Route
              path="/shopping-list"
              element={<PrivateRoute element={<ShoppingList />} />}
            />
            <Route
              path="/share/shopping-list/:id"
              element={<ShareableListPage />}
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
