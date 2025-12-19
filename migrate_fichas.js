import { supabase } from './src/lib/customSupabaseClient.js';

async function migrateFichas() {
    console.log("Starting Migration of Fichas...");

    // 1. Fetch Source (INYECTORA YK 1800)
    // We search by exact matching the project name or ID if known, 
    // but based on previous inspection, ID: 5f151331-b6c4-431a-b11d-8a85610b89cc
    const SOURCE_ID = '5f151331-b6c4-431a-b11d-8a85610b89cc';

    // 2. Fetch Target (COEX CTR1300 LDPE)
    // ID: ddfe1f3a-dde4-44a1-b0b1-ae1acadae415
    const TARGET_ID = 'ddfe1f3a-dde4-44a1-b0b1-ae1acadae415';

    const { data: sourceData, error: sourceError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', SOURCE_ID)
        .single();

    if (sourceError || !sourceData) {
        console.error("Error fetching source:", sourceError);
        return;
    }

    const { data: targetData, error: targetError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', TARGET_ID)
        .single();

    if (targetError || !targetData) {
        console.error("Error fetching target:", targetError);
        return;
    }

    console.log(`Source: ${sourceData.project}`);
    console.log(`Target: ${targetData.project}`);

    // Extract Ficha Content from Source
    const sourceFicha = sourceData.sections_config.find(s => s.id === 'ficha');
    if (!sourceFicha || !sourceFicha.content) {
        console.error("No ficha content in source!");
        return;
    }

    // Update Target
    const targetConfig = [...targetData.sections_config];
    const targetFichaIndex = targetConfig.findIndex(s => s.id === 'ficha');

    if (targetFichaIndex === -1) {
        console.log("Target missing ficha section, adding it.");
        targetConfig.push(sourceFicha);
    } else {
        console.log("Updating existing ficha section in target.");
        targetConfig[targetFichaIndex] = {
            ...targetConfig[targetFichaIndex],
            content: sourceFicha.content
        };
    }

    // Save
    const { error: saveError } = await supabase
        .from('quotations')
        .update({ sections_config: targetConfig })
        .eq('id', TARGET_ID);

    if (saveError) {
        console.error("Error saving:", saveError);
    } else {
        console.log("Migration Successful! Fichas copied.");
    }
}

migrateFichas();
