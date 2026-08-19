import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getProfile } from '../services/supabaseService';
import { User, Role } from '../types';

// Hardcoded admin logic removed for security

interface AuthContextType {
  session: any | null;
  userProfile: User | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { name?: string, phone?: string, avatarUrl?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      setUserProfile(profile);
    } catch (e) {
      console.error('[AuthContext] Failed to load profile:', e);
      setUserProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // 1. Get existing session on mount
    supabase.auth.getSession().then(({ data: { session: s } }: any) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user?.id) {
        fetchProfile(s.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: any, s: any) => {
        if (!mounted) return;
        setSession(s);
        if (s?.user?.id) {
          // Only show loading spinner for genuine new sign-ins
          // (not for token refreshes which would cause a 401 flash on ProtectedRoute)
          if (event === 'SIGNED_IN') {
            setLoading(true);
          }
          fetchProfile(s.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setSession(null);
    setLoading(false);
  };

  const isAdmin = userProfile?.role === Role.ADMIN;
  const isStaff = userProfile?.role === Role.STAFF;

  const updateProfile = async (updates: { name?: string, phone?: string, avatarUrl?: string }) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { updateUserProfile } = await import('../services/supabaseService');
    await updateUserProfile(session.user.id, updates);
    await refreshProfile();
  };

  const uploadAvatar = async (file: File) => {
    if (!session?.user?.id) throw new Error('Not authenticated');
    const { uploadAvatar } = await import('../services/supabaseService');
    return uploadAvatar(session.user.id, file);
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, isAdmin, isStaff, refreshProfile, signOut, updateProfile, uploadAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
