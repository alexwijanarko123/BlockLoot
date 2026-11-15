import { Navigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

/**
 * Route wrapper that redirects unauthenticated users to /.
 * Optionally checks that the user holds one of the required roles.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>             — any authenticated user
 *   <Route element={<ProtectedRoute roles={["SELLER","ADMIN"]} />}>
 */
export default function ProtectedRoute({ children, roles }) {
  const { token, role } = useWeb3();

  if (!token) return <Navigate to="/" replace />;

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
