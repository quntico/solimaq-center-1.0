import { supabase } from './src/lib/customSupabaseClient.js';

async function checkRecent() {
    console.log("Checking 5 most recently updated projects...");

    const { data, error } = await supabase
        .from('quotations')
        .select('id, project, updated_at, description')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    data.forEach(p => {
        console.log(`[${p.updated_at}] ${p.project} - ${p.description ? p.description.substring(0, 50) : 'No desc'}`);
    });
}
checkRecent();
