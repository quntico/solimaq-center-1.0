import { supabase } from './src/lib/customSupabaseClient.js';

async function checkPlastiteja() {
    console.log("Searching for ALL 'Plastiteja' projects...");

    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .ilike('project', '%Plastiteja%');

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    console.log(`Found ${data.length} matching project(s).`);

    data.forEach((project, index) => {
        console.log(`\n=== MATCH #${index + 1} ===`);
        console.log(`Project Name: ${project.project}`);
        console.log(`ID: ${project.id}`);
        console.log(`Theme Key: ${project.theme_key}`);
        console.log(`Updated At: ${project.updated_at}`);
        console.log(`Description: ${project.description ? project.description.substring(0, 150) + "..." : "EMPTY"}`);

        console.log(`--- Sections ---`);
        if (project.sections_config) {
            const generals = project.sections_config.find(s => s.id === 'generales');
            if (generals && generals.content) {
                console.log(`Generales Keys: ${Object.keys(generals.content).join(', ')}`);
                if (generals.content.specsTitle) console.log(`Generales Title: ${generals.content.specsTitle}`);
            } else {
                console.log("Generales: Empty/Missing content");
            }

            const ficha = project.sections_config.find(s => s.id === 'ficha');
            if (ficha && ficha.content && Array.isArray(ficha.content)) {
                console.log(`Ficha Tabs: ${ficha.content.map(t => t.tabTitle).join(', ')}`);
            } else {
                console.log("Ficha: Empty/Missing content");
            }
        } else {
            console.log("Sections Config: NULL");
        }
    });
}

checkPlastiteja();
