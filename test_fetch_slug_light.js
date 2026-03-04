
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sacpwdfsypuhmducxwev.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3B3ZGZzeXB1aG1kdWN4d2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTMxMzgsImV4cCI6MjA3ODA2OTEzOH0.XkEJD-W8k4BY0-Ub96QDQ7X5iYiRkKiQEhj8JwTcECQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    const slug = 'MIRAMAR-A';
    console.log(`Testing LIGHT fetch for slug: ${slug}...`);
    const start = Date.now();

    try {
        // Select ONLY id and slug to see if it's faster
        const { data, error } = await supabase
            .from('quotations')
            .select('id, slug')
            .eq('slug', slug)
            .single();

        const end = Date.now();
        console.log(`Time taken: ${(end - start)}ms`);

        if (error) {
            console.error('Error fetching:', error);
        } else {
            console.log('Success! Light Data found:', data);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testFetch();
