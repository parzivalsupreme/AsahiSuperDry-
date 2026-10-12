'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null when the site was built without Supabase settings.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// The journal has a single account: the key is the email's local part,
// or type the account's full email address.
export const keyToEmail = (key) => {
  const k = key.trim().toLowerCase();
  return k.includes('@') ? k : `${k}@example.com`;
};

// undefined while loading, null when signed out, otherwise the session.
export function useSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
