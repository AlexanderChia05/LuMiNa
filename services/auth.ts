
import { supabase } from './supabase';

export const AuthService = {
  supabase,

  // Sign Up with Email, Password, Name, Phone, PIN, and Role
  signUp: async (email: string, password: string, name: string, phone: string, pin: string, role: string = 'customer') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          pin, // Pass PIN to metadata for trigger
          role 
        }
      }
    });
    return { data, error };
  },

  // Sign In
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign Out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Forgot Password
  resetPasswordForEmail: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Redirect back to app
    });
    return { data, error };
  },

  // Send Login OTP (for re-authentication or passwordless login)
  sendLoginOtp: async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email
    });
    return { data, error };
  },

  // Verify OTP
  verifyOtp: async (email: string, token: string, type: 'signup' | 'recovery' | 'magiclink' | 'email' = 'signup') => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type as any
    });
    return { data, error };
  },

  // Resend OTP
  resendOtp: async (email: string, type: 'signup' | 'email_change' = 'signup') => {
    const { data, error } = await supabase.auth.resend({
      type,
      email
    });
    return { data, error };
  },

  // Get Current Session
  getSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        // If the refresh token is missing or invalid, we should treat this as no session
        // and sign out to clean up local storage to prevent loops.
        if (error.message && (error.message.includes("Refresh Token") || error.message.includes("refresh_token"))) {
          await supabase.auth.signOut();
        }
        return null;
      }
      return data.session;
    } catch (e) {
      console.error("Session check failed", e);
      return null;
    }
  },

  // Get User Profile from public.users table
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  }
};
