// Auth Context - Manages authentication state
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { storage, decodeToken } from '@/shared/lib';
import { authApi } from '@/shared/api';
import type { AuthUser, LoginRequest, RegisterRequest, DecodedToken, RoleCode } from '@/shared/types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: RoleCode[];
}

interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  hasRole: (role: RoleCode) => boolean;
  hasAnyRole: (roles: RoleCode[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    roles: [],
  });

  // Initialize auth state from stored token
  const initializeAuth = useCallback(async () => {
    const token = storage.getAccessToken();

    if (!token) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        roles: [],
      });
      return;
    }

    // Decode token to get roles
    const decoded = decodeToken<DecodedToken>(token);
    if (!decoded) {
      storage.clearAuth();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        roles: [],
      });
      return;
    }

    try {
      // Fetch full user profile
      const user = await authApi.getProfile();
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        roles: decoded.roles,
      });
    } catch {
      // Token invalid or expired
      storage.clearAuth();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        roles: [],
      });
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data);
    storage.setAccessToken(response.accessToken);

    const decoded = decodeToken<DecodedToken>(response.accessToken);
    const roles = decoded?.roles || [];

    setState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
      roles,
    });

    // Redirect based on role
    if (roles.includes('ADMIN')) {
      navigate('/admin');
    } else if (roles.includes('TEACHER')) {
      navigate('/teacher');
    } else {
      navigate('/student');
    }
  }, [navigate]);

  const register = useCallback(async (data: RegisterRequest) => {
    // Register doesn't return a token - user needs to login after
    await authApi.register(data);
    // Redirect to login with success message
    navigate('/login?registered=true');
  }, [navigate]);

  const logout = useCallback(() => {
    storage.clearAuth();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      roles: [],
    });
    navigate('/login');
  }, [navigate]);

  const hasRole = useCallback((role: RoleCode) => {
    return state.roles.includes(role);
  }, [state.roles]);

  const hasAnyRole = useCallback((roles: RoleCode[]) => {
    return roles.some((role) => state.roles.includes(role));
  }, [state.roles]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getProfile();
      setState((prev) => ({ ...prev, user }));
    } catch {
      // Ignore errors
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    register,
    logout,
    hasRole,
    hasAnyRole,
    refreshUser,
  }), [state, login, register, logout, hasRole, hasAnyRole, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
