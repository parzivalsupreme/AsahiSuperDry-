'use client';

import { supabase, useSession } from '../../lib/supabase';

export default function SignOut() {
  const session = useSession();
  if (!session) return null;
  return (
    <button className="fn-key" onClick={() => supabase.auth.signOut()}>
      <span className="num">3)</span>Sign out
    </button>
  );
}
