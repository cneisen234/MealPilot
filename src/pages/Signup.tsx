import React from "react";
import { Link } from "react-router-dom";
import SignupForm from "../components/auth/SignupForm";

const Signup: React.FC = () => {
  return (
    <div className="center-container">
      <div className="content-wrapper">
        <div className="auth-form">
          <SignupForm />
          <p style={{ marginTop: "20px", textAlign: "center" }}>
            <Link to="/login" className="auth-link">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
