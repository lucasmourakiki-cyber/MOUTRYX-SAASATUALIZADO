import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserRole } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  phone?: string;
  avatarUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  can: (permission: string) => boolean;
  hasRole: (roleOrRoles: UserRole | UserRole[]) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    companyId?: string;
    companyName?: string;
    tradeName?: string;
    cnpj?: string;
    city?: string;
    state?: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const TOKEN_STORAGE_KEY = 'moutryx_active_session_token';

// Security hardening: Client-side storage of authentication tokens is strictly forbidden.
// Authentication is handled exclusively via secure, server-enforced HttpOnly cookies.
export function getStoredClientToken(): string | null {
  return null;
}

export function setStoredClientToken(_token: string | null): void {
  // Purge any legacy token from localStorage / sessionStorage to prevent exposure
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage restriction errors
  }
}

export function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  return headers;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const inFlightCheckAuthRef = useRef<boolean>(false);
  const inFlightAuthActionRef = useRef<boolean>(false);

  const clearError = useCallback(() => setError(null), []);

  // Ensure any legacy token in localStorage or sessionStorage is immediately purged on startup
  useEffect(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Check current session from backend using HttpOnly cookie credentials exclusively (Deduplicated)
  const checkAuth = useCallback(async () => {
    if (inFlightCheckAuthRef.current) {
      return;
    }
    inFlightCheckAuthRef.current = true;
    setIsLoading(true);
    setError(null);

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: reqHeaders,
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const userWithPerms: AuthUser = {
            ...data.user,
            permissions: data.permissions || [],
          };
          setUser(userWithPerms);
          setPermissions(data.permissions || []);
          setToken(null);
        } else {
          setUser(null);
          setToken(null);
          setPermissions([]);
        }
      } else {
        // 401 or non-OK response: set unauthenticated cleanly with NO automatic retry
        setUser(null);
        setToken(null);
        setPermissions([]);
      }
    } catch (err) {
      console.warn('Servidor de autenticação indisponível ou offline:', err);
      setUser(null);
      setToken(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
      inFlightCheckAuthRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Client-side permission helper for UI conditional rendering (backend remains the non-bypassable authority)
  const can = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return permissions.includes(permission);
  }, [user, permissions]);

  // Client-side role checking helper
  const hasRole = useCallback((roleOrRoles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const allowed = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    return allowed.includes(user.role);
  }, [user]);

  // Login handler - Relies exclusively on HttpOnly session cookie with in-flight deduplication
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (inFlightAuthActionRef.current) {
      return { success: false, error: 'Uma solicitação de autenticação já está em andamento.' };
    }
    inFlightAuthActionRef.current = true;
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text().catch(() => '');
        console.error('[MOUTRYX AUTH] Resposta não-JSON ao realizar login:', res.status, text.substring(0, 100));
        const msg = `Erro no servidor (${res.status}). Verifique sua conexão.`;
        setError(msg);
        return { success: false, error: msg };
      }

      if (!res.ok || !data.success) {
        const msg = data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.';
        setError(msg);
        return { success: false, error: msg };
      }

      const userWithPerms: AuthUser = {
        ...data.user,
        permissions: data.permissions || [],
      };
      setUser(userWithPerms);
      setPermissions(data.permissions || []);
      setToken(null);
      // Clean storage
      setStoredClientToken(null);
      return { success: true };
    } catch (err: any) {
      const msg = 'Erro de conexão com o servidor de autenticação.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      inFlightAuthActionRef.current = false;
    }
  };

  // Demo Login handler - Starts safe isolated demonstration session with in-flight deduplication
  const loginDemo = async (): Promise<{ success: boolean; error?: string }> => {
    if (inFlightAuthActionRef.current) {
      return { success: false, error: 'Uma solicitação de autenticação já está em andamento.' };
    }
    inFlightAuthActionRef.current = true;
    setError(null);

    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const msg = `Erro no servidor (${res.status}). Verifique sua conexão.`;
        setError(msg);
        return { success: false, error: msg };
      }

      if (!res.ok || !data.success) {
        const msg = data.error || 'Erro ao iniciar modo demonstração.';
        setError(msg);
        return { success: false, error: msg };
      }

      const userWithPerms: AuthUser = {
        ...data.user,
        permissions: data.permissions || [],
      };
      setUser(userWithPerms);
      setPermissions(data.permissions || []);
      setToken(null);
      setStoredClientToken(null);
      return { success: true };
    } catch (err: any) {
      const msg = 'Erro de conexão ao iniciar o modo de demonstração.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      inFlightAuthActionRef.current = false;
    }
  };

  // Register handler - Relies exclusively on HttpOnly session cookie with in-flight deduplication
  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    companyId?: string;
    companyName?: string;
    tradeName?: string;
    cnpj?: string;
    city?: string;
    state?: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (inFlightAuthActionRef.current) {
      return { success: false, error: 'Uma solicitação de autenticação já está em andamento.' };
    }
    inFlightAuthActionRef.current = true;
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';
      let resData: any = {};
      if (contentType.includes('application/json')) {
        resData = await res.json();
      } else {
        const text = await res.text().catch(() => '');
        console.error('[MOUTRYX AUTH] Resposta não-JSON ao realizar cadastro:', res.status, text.substring(0, 100));
        const msg = `Erro no servidor (${res.status}). Verifique sua conexão.`;
        setError(msg);
        return { success: false, error: msg };
      }

      if (!res.ok || !resData.success) {
        const msg = resData.error || 'Erro ao realizar cadastro.';
        setError(msg);
        return { success: false, error: msg };
      }

      const userWithPerms: AuthUser = {
        ...resData.user,
        permissions: resData.permissions || [],
      };
      setUser(userWithPerms);
      setPermissions(resData.permissions || []);
      setToken(null);
      setStoredClientToken(null);
      return { success: true };
    } catch (err: any) {
      const msg = 'Erro ao comunicar com o servidor de autenticação.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      inFlightAuthActionRef.current = false;
    }
  };

  // Logout handler - Clears HttpOnly cookie on backend and resets React state
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Erro durante logout:', err);
    } finally {
      setStoredClientToken(null);
      setToken(null);
      setUser(null);
      setPermissions([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        error,
        can,
        hasRole,
        login,
        loginDemo,
        register,
        logout,
        clearError,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
