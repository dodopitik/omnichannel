import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  status: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    immer((set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        set((state) => {
          state.user = user;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
        });
      },

      setTokens: (accessToken, refreshToken) => {
        set((state) => {
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
        });
      },

      setUser: (user) => {
        set((state) => {
          state.user = user;
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      logout: () => {
        set((state) => {
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
        });
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.roles.includes('super_admin')) return true;
        return user.permissions.includes(permission);
      },

      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        return user.roles.includes(role);
      },

      isSuperAdmin: () => {
        const { user } = get();
        return user?.roles.includes('super_admin') ?? false;
      },
    })),
    {
      name: 'omnichannel-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
