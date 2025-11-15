import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { authAPI, User } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { linkSessionToUser } from '@/utils/analytics';
import { initFacebookPixel } from '@/utils/facebookPixel';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Start as false to allow immediate render
  const { toast } = useToast();
  // Use ref to track user state without causing callback recreation
  const userRef = useRef<User | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      const currentUser = response.data.user;
      setUser(currentUser);
      
      // Reinitialize Facebook Pixel with user data for advanced matching
      try {
        await initFacebookPixel({
          email: currentUser.email,
          phone: currentUser.phone,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          externalId: currentUser.id?.toString(),
        });
      } catch (pixelError) {
        console.warn('Failed to initialize Facebook Pixel with user data:', pixelError);
      }
    } catch (error) {
      // Only clear user if it's an actual authentication error (401)
      // Don't clear on network errors or other issues
      const errorCode = (error as any)?.code;
      if (errorCode === 'UNAUTHORIZED') {
        // Only log if we had a user before - this indicates a session issue
        if (userRef.current) {
          console.warn('⚠️ Session lost: User was authenticated but session is now invalid', {
            previousUserId: userRef.current.id,
            previousEmail: userRef.current.email
          });
        }
        setUser(null);
      } else {
        // For other errors (network, timeout, etc.), keep existing user state
        // This prevents logging out users due to temporary network issues
        console.warn('Authentication check error (non-auth):', error);
        // Only clear if we don't have a user (first load)
        if (!userRef.current) {
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user is logged in after initial render (defer to allow UI to render first)
  useEffect(() => {
    // Use setTimeout to defer auth check until after initial render
    const timer = setTimeout(() => {
      checkAuth();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    try {
      console.log('Attempting login...');
      const response = await authAPI.login({ email, password, rememberMe });
      console.log('Login successful:', response.data.user);
      const loggedInUser = response.data.user;
      setUser(loggedInUser);
      
      // Link analytics session to user
      try {
        await linkSessionToUser();
      } catch (analyticsError) {
        console.warn('Failed to link analytics session:', analyticsError);
      }
      
      // Reinitialize Facebook Pixel with user data for advanced matching
      try {
        await initFacebookPixel({
          email: loggedInUser.email,
          phone: loggedInUser.phone,
          firstName: loggedInUser.firstName,
          lastName: loggedInUser.lastName,
          externalId: loggedInUser.id?.toString(),
        });
      } catch (pixelError) {
        console.warn('Failed to initialize Facebook Pixel with user data:', pixelError);
      }
      
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${loggedInUser.email}`,
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
      const newUser = response.data.user;
      setUser(newUser);
      
      // Link analytics session to user
      try {
        await linkSessionToUser();
      } catch (analyticsError) {
        console.warn('Failed to link analytics session:', analyticsError);
      }
      
      // Reinitialize Facebook Pixel with user data for advanced matching
      try {
        await initFacebookPixel({
          email: newUser.email,
          phone: newUser.phone,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          externalId: newUser.id?.toString(),
        });
      } catch (pixelError) {
        console.warn('Failed to initialize Facebook Pixel with user data:', pixelError);
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

