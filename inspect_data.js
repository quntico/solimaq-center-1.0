import { supabase } from './src/lib/customSupabaseClient.js';

async function inspectData() {
    console.log("Scanning ALL projects for missing Fichas...");

    // Select all projects
    const { data: allData, error } = await supabase
        .from('quotations')
        .select('id, project, sections_config');

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    console.log(`Found ${allData.length} projects.`);

    let foundAny = false;

    allData.forEach(q => {
        if (!q.sections_config) return;

        // Find 'ficha' section in the config array
        const fichaSection = q.sections_config.find(s => s.id === 'ficha');

        if (fichaSection && fichaSection.content && Array.isArray(fichaSection.content)) {
            const tabNames = fichaSection.content.map(t => t.tabTitle).join(', ');
            console.log(`\nProject: ${q.project} (ID: ${q.id})`);
            console.log(`  Tabs: ${tabNames}`);

            // Check for specific keywords related to the missing data
            if (tabNames.toLowerCase().includes('cabezal') || tabNames.toLowerCase().includes('extrusores')) {
                console.log("  !!! FOUND MATCHING TABS HERE !!!");
                foundAny = true;
            }
        }
    });

    if (!foundAny) {
        console.log("\nNo projects found with 'Cabezal' or 'Extrusores' tabs.");
    }
}

inspectData();
