import type { JwtPayload, Usuario, Perfil } from "@/api/types";

const TOKEN_KEY = "erp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Decodifica o payload do JWT sem validar assinatura (apenas leitura no client).
export function decodeToken(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function tokenExpirado(payload: JwtPayload): boolean {
  // exp vem em segundos (padrão JWT)
  return payload.exp * 1000 <= Date.now();
}

// Monta o usuário atual a partir do token armazenado, se válido.
export function usuarioDoToken(): Usuario | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || tokenExpirado(payload)) {
    clearToken();
    return null;
  }
  return {
    login: payload.sub,
    perfis: payload.perfis.map((p) => p.toLowerCase() as Perfil),
  };
}
