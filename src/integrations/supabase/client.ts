import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "https://unhhxjrflgovwsnczynh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaGh4anJmbGdvdndzbmN6eW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjgxMDksImV4cCI6MjA3MjUwNDEwOX0.-EgPYazwoa4LgDbkteC0BR1J_Q49op6KZbycVCjMCTU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});