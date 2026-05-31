import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute component that redirects to /login if the user is not authenticated.
 * It uses the AuthContext to determine the authentication state.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show nothing or a loading spinner while the auth state is being restored
  if (loading) {
    return null; // Or return <div>Loading...</div>
  }

  // If not authenticated, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes (Outlet)
  return <Outlet />;
};

export default ProtectedRoute;
