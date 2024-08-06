// src/pages/Login.tsx
import React from "react";
import LoginForm from "../components/auth/LoginForm";

const Login: React.FC = () => {
  return (
    <div className="auth-form">
      <h2>Login to Your Account</h2>
      <LoginForm />
    </div>
  );
};

export default Login;
