import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI, User } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { linkSessionToUser } from '@/utils/analytics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasAuthority: (authority: string) => boolean;
  hasAnyAuthority: (...authorities: string[]) => boolean;
  hasAllAuthorities: (...authorities: string[]) => boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let authProviderRenderCount = 0;
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  authProviderRenderCount++;
  if (authProviderRenderCount > 50) {
    console.error('[AuthProvider] INFINITE LOOP! Render count:', authProviderRenderCount);
    throw new Error('AuthProvider infinite loop');
  }
  console.log('[AuthProvider] RENDER #' + authProviderRenderCount);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Start as false to allow immediate render
  const { toast } = useToast();

  const checkAuth = useCallback(async () => {
    console.log('[AuthProvider] checkAuth CALLED');
    try {
      setLoading(true);
      console.log('[AuthProvider] FETCHING PROFILE...');
      const response = await authAPI.getProfile();
      console.log('[AuthProvider] PROFILE FETCHED');
      setUser(response.data.user);
    } catch (error) {
      // User is not logged in
      console.log('Auth check failed:', error);
      console.log('🍪 Cookies after failure:', document.cookie);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user is logged in after initial render (defer to allow UI to render first)
  useEffect(() => {
    console.log('[AuthProvider] useEffect RUN - checkAuth changed');
    // Use setTimeout to defer auth check until after initial render
    const timer = setTimeout(() => {
      console.log('[AuthProvider] setTimeout CALLBACK - calling checkAuth');
      checkAuth();
    }, 0);
    return () => {
      console.log('[AuthProvider] useEffect CLEANUP');
      clearTimeout(timer);
    };
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    try {
      console.log('Attempting login...');
      const response = await authAPI.login({ email, password, rememberMe });
      console.log('Login successful:', response.data.user);
      setUser(response.data.user);
      
      // Link analytics session to user
      try {
        await linkSessionToUser();
      } catch (analyticsError) {
        console.warn('Failed to link analytics session:', analyticsError);
      }
      
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${response.data.user.email}`,
      });
    } catch (error) {
      console.log('Login failed:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const register = useCallback(async (data: any) => {
    try {
      const response = await authAPI.register(data);
      setUser(response.data.user);
      
      // Link analytics session to user
      try {
        await linkSessionToUser();
      } catch (analyticsError) {
        console.warn('Failed to link analytics session:', analyticsError);
      }
      
      toast({
        title: 'Account created!',
        description: response.message || 'Please check your email to verify your account.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: 'Registration failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
      setUser(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [toast]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    }
  }, []);

  // Authority checking methods
  const hasAuthority = useCallback((authority: string): boolean => {
    return user?.authorities?.includes(authority) || false;
  }, [user]);

  const hasAnyAuthority = useCallback((...authorities: string[]): boolean => {
    if (!user?.authorities || authorities.length === 0) return false;
    return authorities.some(authority => user.authorities.includes(authority));
  }, [user]);

  const hasAllAuthorities = useCallback((...authorities: string[]): boolean => {
    if (!user?.authorities || authorities.length === 0) return false;
    return authorities.every(authority => user.authorities.includes(authority));
  }, [user]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    console.log('[AuthProvider] useMemo RUN');
    return {
      user,
      loading,
      isAuthenticated: !!user,
      hasAuthority,
      hasAnyAuthority,
      hasAllAuthorities,
      login,
      register,
      logout,
      refreshUser,
    };
  }, [user, loading, hasAuthority, hasAnyAuthority, hasAllAuthorities, login, register, logout, refreshUser]);

  console.log('[AuthProvider] RETURNING PROVIDER');
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

