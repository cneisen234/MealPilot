import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Interests from "./pages/Interests";
import Chatbot from "./pages/Chatbot";
import Friends from "./pages/Friends";
import Upgrade from "./pages/Upgrade";
import Header from "./components/common/Header";
import SideNavbar from "./components/common/SideNavbar";
import Footer from "./components/common/Footer";
import "./styles/main.css";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div
          className="app"
          style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <Header />
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <SideNavbar />
            <main style={{ flex: 1, overflow: "auto", padding: "20px" }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute
                      element={<Profile userId={1} isOwnProfile={true} />}
                    />
                  }
                />
                <Route
                  path="/profile/:userId"
                  element={<Profile userId={0} isOwnProfile={false} />}
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
                  path="/upgrade"
                  element={<PrivateRoute element={<Upgrade />} />}
                />
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
