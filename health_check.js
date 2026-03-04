
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sacpwdfsypuhmducxwev.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3B3ZGZzeXB1aG1kdWN4d2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTMxMzgsImV4cCI6MjA3ODA2OTEzOH0.XkEJD-W8k4BY0-Ub96QDQ7X5iYiRkKiQEhj8JwTcECQ';

console.log("---------------------------------------------------");
console.log("   S U P A B A S E   H E A L T H   C H E C K       ");
console.log("---------------------------------------------------");
console.log(`Target URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
});

async function runDiagnostics() {
    try {
        // Test 1: Simple Connection (List buckets or basic query)
        console.log("\n[Test 1] Checking connectivity (Storage Buckets)...");
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

        if (bucketError) {
            console.error("❌ FAILED: Could not list buckets.");
            console.error("   Error:", bucketError.message);
            console.error("   Hint: Project might be PAUSED or API Key invalid.");
        } else {
            console.log("✅ SUCCESS: Connected to Storage.");
            console.log(`   Buckets found: ${buckets.length}`);
        }

        // Test 2: Database Read (Quotations Table)
        console.log("\n[Test 2] Checking Database Read (Quotations)...");
        const { count, error: countError } = await supabase
            .from('quotations')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error("❌ FAILED: Could not read 'quotations' table.");
            console.error("   Error:", countError.message);
            console.error("   Code:", countError.code);
        } else {
            console.log("✅ SUCCESS: Database is readable.");
            console.log(`   Current record count: ${count}`);
        }

        // Test 3: Specific Slug Fetch (MIRAMAR-A)
        console.log("\n[Test 3] Fetching specific record 'MIRAMAR-A'...");
        const { data: project, error: projectError } = await supabase
            .from('quotations')
            .select('id, slug, project')
            .eq('slug', 'MIRAMAR-A')
            .single();

        if (projectError) {
            console.error("⚠️ WARNING: Could not fetch 'MIRAMAR-A'.");
            console.error("   Error:", projectError.message);
        } else if (project) {
            console.log("✅ SUCCESS: Found project 'MIRAMAR-A'.");
            console.log("   ID:", project.id);
            console.log("   Name:", project.project);
        } else {
            console.log("❓ NOTE: 'MIRAMAR-A' not found (no error, just empty).");
        }

    } catch (err) {
        console.error("\n💥 CRITICAL: Unexpected script error.");
        console.error(err);
    }
}

runDiagnostics();
