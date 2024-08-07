import React from "react";
import { Link } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm";

const Login: React.FC = () => {
  return (
    <div className="center-container">
      <div className="content-wrapper">
        <div className="auth-form">
          <h2>Login to Your Account</h2>
          <LoginForm />
          <p style={{ marginTop: "20px", textAlign: "center" }}>
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
