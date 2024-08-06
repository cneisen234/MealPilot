// src/pages/Signup.tsx
import React from "react";
import SignupForm from "../components/auth/SignupForm";

const Signup: React.FC = () => {
  return (
    <div className="auth-form">
      <h2>Create Your Account</h2>
      <SignupForm />
    </div>
  );
};

export default Signup;
