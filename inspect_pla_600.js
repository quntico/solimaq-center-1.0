import { supabase } from './src/lib/customSupabaseClient.js';

async function inspectPla600() {
    console.log("Inspecting 'PLA 600 AUTO'...");

    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('project', 'PLA 600 AUTO')
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`\nFound Project: ${data.project}`);
    console.log(`Description: ${data.description ? data.description.substring(0, 100) : 'None'}`);

    if (data.sections_config) {
        console.log(`\n--- Sections Data ---`);

        const generales = data.sections_config.find(s => s.id === 'generales');
        if (generales && generales.content) {
            console.log(`[Generales]: FOUND`);
            console.log(`  - Title: ${generales.content.specsTitle || 'N/A'}`);
            console.log(`  - Keys: ${Object.keys(generales.content).join(', ')}`);
        } else {
            console.log(`[Generales]: MISSING/EMPTY`);
        }

        const ficha = data.sections_config.find(s => s.id === 'ficha');
        if (ficha && ficha.content && Array.isArray(ficha.content) && ficha.content.length > 0) {
            console.log(`[Ficha]: FOUND ${ficha.content.length} tabs`);
            console.log(`  - Tabs: ${ficha.content.map(t => t.tabTitle).join(', ')}`);
        } else {
            console.log(`[Ficha]: MISSING/EMPTY`);
        }

        const video = data.sections_config.find(s => s.id === 'video');
        if (video && video.content) {
            console.log(`[Video]: FOUND`);
            console.log(`  - URL: ${video.content}`);
        } else {
            console.log(`[Video]: MISSING/EMPTY`);
        }
    }
    console.log(JSON.stringify(data, null, 2));
}

inspectPla600();
