import { supabase } from './src/lib/customSupabaseClient.js';

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets:", error);
    } else {
        console.log("Available buckets:", data.map(b => b.name));
    }
}

checkBuckets();
