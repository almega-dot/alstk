import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('getSession error', error);
        if (mounted) setLoading(false);
        return;
      }

      const session = data.session;
      const currentUser = session?.user ?? null;

      if (mounted) setUser(currentUser);

      if (!currentUser) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      // ✅ FIXED: profile + plant JOIN
      const { data: prof, error: profErr } = await supabase
        .from('user_profile')
        .select(`
          user_id,
          role_code,
          plant_id,
          is_active,
          plants (
            plant_id,
            plant_code,
            plant_name
          )
        `)
        .eq('user_id', currentUser.id)
        .maybeSingle();
        console.log('DEBUG auth user:', currentUser);
console.log('DEBUG profile result:', prof, profErr);

      if (profErr) {
        console.warn('profile fetch warning:', profErr.message);
      }

      if (mounted) {
        setProfile(
          prof
            ? {
                ...prof,
                plant_code: prof.plants?.plant_code || null,
                plant_name: prof.plants?.plant_name || null,
              }
            : null
        );
        setLoading(false);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role_code === 'ADMIN',
  };
}
