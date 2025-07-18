import { createClient } from '@supabase/supabase-js';

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  '';

const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

export const supabase = url && key ? createClient(url, key) : null;
