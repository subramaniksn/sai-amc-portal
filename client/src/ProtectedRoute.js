import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ token, role, children }) => {
  // No token = redirect to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Role check
  if (role) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      // Admin-only routes
      if (role === "Admin") {
        if (user.role !== "Admin") {
          return <Navigate to="/dashboard" replace />;
        }
      }
      // Viewer-only or Viewer+Admin routes - redirect based on role
      else if (role === "Viewer") {
        if (!["Viewer", "Admin"].includes(user.role)) {
          return <Navigate to="/dashboard" replace />;
        }
      }
    } catch {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
