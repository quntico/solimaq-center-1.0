
import { supabase } from './src/lib/customSupabaseClient.js';

async function inspectJulio() {
    console.log("Searching for 'JULIO' or 'LOPEZ' in quotes...");

    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .or('project.ilike.%JULIO%,project.ilike.%LOPEZ%,project.ilike.%PLA600%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No matching quotes found.");
        return;
    }

    console.log(`\nFound ${data.length} matching quotes:`);
    data.forEach(q => {
        console.log(`\n------------------------------------------------`);
        console.log(`ID: ${q.id}`);
        console.log(`Project Name: ${q.project}`);
        console.log(`Last Updated: ${q.updated_at}`);
        console.log(`Description: ${q.description ? q.description.substring(0, 100) : 'None'}`);
        // Check for specific data structure if needed
        if (q.sections_config) {
            const count = q.sections_config.length;
            console.log(`Sections count: ${count}`);
            const video = q.sections_config.find(s => s.id === 'video');
            console.log(`Video Section: ${video ? 'Present' : 'Missing'}`);
        }
    });
}

inspectJulio();
