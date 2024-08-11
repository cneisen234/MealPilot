import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup, login } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const Signup: React.FC = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Signup
      const signupResponse = await signup({ name, username, email, password });
      console.log("Signup successful", signupResponse.data);

      // Login
      const loginResponse = await login({ email, password });
      console.log("Login successful", loginResponse.data);

      // Store the token
      localStorage.setItem("token", loginResponse.data.token);

      // Update auth status
      await checkAuthStatus();

      // Redirect to onboarding page
      navigate("/onboarding");
    } catch (error) {
      console.error("Signup error", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <input
          type="text"
          className="form-control"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
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
        Sign Up
      </button>
    </form>
  );
};

export default Signup;
