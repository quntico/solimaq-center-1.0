
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sacpwdfsypuhmducxwev.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3B3ZGZzeXB1aG1kdWN4d2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTMxMzgsImV4cCI6MjA3ODA2OTEzOH0.XkEJD-W8k4BY0-Ub96QDQ7X5iYiRkKiQEhj8JwTcECQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false // Disable persistence to avoid the warning/error in node
    }
});

async function checkSize() {
    const slug = 'MIRAMAR-A';
    console.log(`Checking data size for slug: ${slug}...`);
    const start = Date.now();

    try {
        // 1. Light check
        console.log("Attempting light fetch (ID only)...");
        const light = await supabase
            .from('quotations')
            .select('id')
            .eq('slug', slug)
            .single();

        console.log("Light fetch result:", light.error ? "Error" : "Success");
        if (light.error) console.error(light.error);

        // 2. Heavy check
        console.log("Attempting heavy fetch (*)...");
        const { data, error } = await supabase
            .from('quotations')
            .select('*')
            .eq('slug', slug)
            .single();

        const end = Date.now();
        console.log(`Time taken: ${(end - start)}ms`);

        if (error) {
            console.error('Error fetching:', error);
        } else if (data) {
            const jsonString = JSON.stringify(data);
            const sizeBytes = new Blob([jsonString]).size;
            const sizeMB = sizeBytes / (1024 * 1024);

            console.log(`Total Record Size: ${sizeMB.toFixed(2)} MB`);
            console.log('--- Column Breakdown (Approx chars) ---');
            for (const [key, value] of Object.entries(data)) {
                const valStr = JSON.stringify(value);
                if (valStr && valStr.length > 1000) {
                    console.log(`${key}: ${(valStr.length / 1024).toFixed(2)} KB`);
                }
            }
        } else {
            console.log("No data found.");
        }

    } catch (err) {
        console.error('Unexpected error:', err.message);
    }
}

checkSize();
