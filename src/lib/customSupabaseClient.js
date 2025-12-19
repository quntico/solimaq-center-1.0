import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sacpwdfsypuhmducxwev.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3B3ZGZzeXB1aG1kdWN4d2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTMxMzgsImV4cCI6MjA3ODA2OTEzOH0.XkEJD-W8k4BY0-Ub96QDQ7X5iYiRkKiQEhj8JwTcECQ';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
