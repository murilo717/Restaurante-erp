import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Perfil, Usuario } from "@/api/types";
import { login as loginRequest } from "@/api/services";
import {
  clearToken,
  setToken,
  usuarioDoToken,
} from "@/auth/token";

interface AuthContextValue {
  usuario: Usuario | null;
  autenticado: boolean;
  entrar: (login: string, senha: string) => Promise<void>;
  sair: () => void;
  temPerfil: (...perfis: Perfil[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Perfis que sempre têm acesso, espelhando SEMPRE_PERMITIDOS no backend.
const SEMPRE_PERMITIDOS: Perfil[] = ["ceo", "dba"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => usuarioDoToken());

  const entrar = useCallback(async (loginUser: string, senha: string) => {
    const { access_token } = await loginRequest(loginUser, senha);
    setToken(access_token);
    setUsuario(usuarioDoToken());
  }, []);

  const sair = useCallback(() => {
    clearToken();
    setUsuario(null);
  }, []);

  const temPerfil = useCallback(
    (...perfis: Perfil[]) => {
      if (!usuario) return false;
      const aceitos = new Set<Perfil>([...perfis, ...SEMPRE_PERMITIDOS]);
      return usuario.perfis.some((p) => aceitos.has(p));
    },
    [usuario],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      autenticado: usuario !== null,
      entrar,
      sair,
      temPerfil,
    }),
    [usuario, entrar, sair, temPerfil],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
