import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null when the site was built without Supabase settings.
export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
