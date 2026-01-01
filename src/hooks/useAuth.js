import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrate = async (session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true); // 🔒 critical

      const { data: prof, error } = await supabase
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

      if (!mounted) return;

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
    };

    // 1️⃣ Initial load
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data.session);
    });

    // 2️⃣ Auth change listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        hydrate(session);
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
