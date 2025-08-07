import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './env';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey); 