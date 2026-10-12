import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

// Garante que apenas usuários autenticados acessem as rotas internas.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { autenticado } = useAuth();
  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
