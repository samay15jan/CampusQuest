import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { user, loading, accountLoading } = useAuth();

  if (loading || (user && accountLoading)) return null;
  return user ? children : <Navigate to="/login" replace />;
}
