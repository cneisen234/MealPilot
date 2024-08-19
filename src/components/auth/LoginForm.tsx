// src/components/auth/LoginForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const { login: authLogin, checkAuthStatus } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login({ email, password });
      localStorage.setItem("token", response.data.token);
      authLogin(response.data.token);
      setTimeout(() => {
        checkAuthStatus();
        navigate("/profile");
      }, 100);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="email"
          className="form-control"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <input
          type="password"
          className="form-control"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: "100%" }}>
        Login
      </button>
    </form>
  );
};

export default LoginForm;
