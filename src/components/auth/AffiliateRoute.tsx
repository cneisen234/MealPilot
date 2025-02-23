import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AffiliateRoute = ({ element }: { element: React.ReactElement }) => {
  const { isAffiliateAuthenticated } = useAuth();

  return isAffiliateAuthenticated ? (
    element
  ) : (
    <Navigate to="/affiliate/login" replace />
  );
};

export default AffiliateRoute;
