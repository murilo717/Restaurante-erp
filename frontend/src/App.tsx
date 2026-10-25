import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import CadastroPage from "@/pages/CadastroPage";
import DashboardPage from "@/pages/DashboardPage";
import MesasPage from "@/pages/MesasPage";
import PedidosPage from "@/pages/PedidosPage";
import KdsPage from "@/pages/KdsPage";
import ProducaoPage from "@/pages/ProducaoPage";
import EstoquePage from "@/pages/EstoquePage";
import FuncionariosPage from "@/pages/FuncionariosPage";
import PratosPage from "@/pages/PratosPage";
import PagamentosPage from "@/pages/PagamentosPage";
import ModulosPage from "@/pages/ModulosPage";

export default function App() {
  const { autenticado } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={autenticado ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/cadastro"
        element={autenticado ? <Navigate to="/" replace /> : <CadastroPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/mesas" element={<MesasPage />} />
        <Route path="/pedidos" element={<PedidosPage />} />
        <Route path="/cozinha" element={<KdsPage />} />
        <Route path="/producao" element={<ProducaoPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/funcionarios" element={<FuncionariosPage />} />
        <Route path="/pratos" element={<PratosPage />} />
        <Route path="/pagamentos" element={<PagamentosPage />} />
        <Route path="/modulos" element={<ModulosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
