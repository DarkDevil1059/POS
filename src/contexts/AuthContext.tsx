import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  supabaseClient: SupabaseClient;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, rememberMe: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient>(() => 
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  );
  const [loading, setLoading] = useState(true);

  const initializeSupabaseClient = (rememberMe: boolean) => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: rememberMe ? localStorage : sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
    setSupabaseClient(client);
    return client;
  };
  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting initial session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    const client = initializeSupabaseClient(rememberMe);
    const { error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, rememberMe: boolean) => {
    const client = initializeSupabaseClient(rememberMe);
    const { error } = await client.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabaseClient.auth.signOut();
    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    supabaseClient,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};