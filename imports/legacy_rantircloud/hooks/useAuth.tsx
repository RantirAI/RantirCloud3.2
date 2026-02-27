
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { activityService } from "@/services/activityService";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent re-initialization if already done
    if (initializedRef.current) return;
    
    // Listen for changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only update state if user actually changed (not just token refresh)
      const newUserId = session?.user?.id ?? null;
      const currentUserId = user?.id ?? null;
      
      // Skip redundant updates for token refreshes
      if (event === 'TOKEN_REFRESHED' && newUserId === currentUserId && initializedRef.current) {
        // Token refreshed but same user - don't trigger state updates
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      initializedRef.current = true;

      // Log login activity when user signs in
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          try {
            await activityService.logActivity({
              type: 'user_login',
              description: 'User logged in',
              metadata: { 
                provider: session.user.app_metadata?.provider || 'email',
                timestamp: new Date().toISOString()
              }
            });
          } catch (error) {
            console.error('Failed to log login activity:', error);
          }
        }, 100);
      }
    });

    // Check for existing session with error handling for invalid refresh tokens
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error.message);
        // If refresh token is invalid, sign out cleanly
        if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
          supabase.auth.signOut().catch(() => {});
        }
      }
      
      if (!initializedRef.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        initializedRef.current = true;
      }
    }).catch((error) => {
      console.error('Failed to get session:', error);
      // Clear state on any session retrieval failure
      if (!initializedRef.current) {
        setSession(null);
        setUser(null);
        setLoading(false);
        initializedRef.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
