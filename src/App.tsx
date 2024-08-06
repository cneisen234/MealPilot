// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Interests from "./pages/Interests";
import Recommendations from "./pages/Recommendations";
import Chatbot from "./pages/Chatbot";
import Friends from "./pages/Friends";
import Upgrade from "./pages/Upgrade";
import Header from "./components/common/Header";
import SideNavbar from "./components/common/SideNavbar";
import Footer from "./components/common/Footer";
import "./styles/main.css";

const App: React.FC = () => {
  return (
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
              <Route path="/profile" element={<Profile />} />
              <Route path="/interests" element={<Interests />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/chatbot" element={<Chatbot />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/upgrade" element={<Upgrade />} />
            </Routes>
          </main>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
