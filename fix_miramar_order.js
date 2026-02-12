
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sacpwdfsypuhmducxwev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3B3ZGZzeXB1aG1kdWN4d2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTMxMzgsImV4cCI6MjA3ODA2OTEzOH0.XkEJD-W8k4BY0-Ub96QDQ7X5iYiRkKiQEhj8JwTcECQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMiramarOrdering() {
    console.log("Fixing Miramar Ordering (Sending Master Plan to End)...");

    // 1. Fetch the record
    const { data: record, error: fetchError } = await supabase
        .from('quotations')
        .select('*')
        .eq('slug', 'MIRAMAR-A')
        .single();

    if (fetchError || !record) {
        console.error("Could not find record:", fetchError);
        return;
    }

    // 2. Define the desired order of IDs
    const desiredOrder = [
        'portada',
        'descripcion',
        'ventajas', // Usually hidden
        'normatividad',
        'ficha',
        'ficha_dinamica',
        'cronograma',
        'servicios',
        'layout',
        'video',
        'proceso',
        'calculadora_prod',
        'pdf',
        'analiticas', // Admin only
        'ajustes', // Admin only
        'propuesta',
        'condiciones',
        'generales',
        'exclusiones',
        'ia',
        'extra_resources',
        'export_resources',
        'master_plan' // Sent to end as requested
    ];

    let currentConfig = record.sections_config || [];

    // Ensure it's an array
    if (!Array.isArray(currentConfig)) {
        console.log("Converting config to array...");
        currentConfig = [];
    }

    // 3. Reconstruct the array based on Desired Order
    const newConfig = [];
    const processedIds = new Set();

    // First, add sections in the desired order if they exist in currentConfig OR if we need to create them
    desiredOrder.forEach(id => {
        let section = currentConfig.find(s => s.id === id);

        const defaultVisible = ['descripcion', 'normatividad', 'master_plan', 'ficha', 'cronograma', 'servicios', 'layout', 'video', 'proceso', 'pdf', 'propuesta'];

        if (!section) {
            // Create stub
            section = {
                id: id,
                label: id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' '), // Simple label
                isVisible: defaultVisible.includes(id),
                component: id,
                content: {}
            };
            if (id === 'portada') { section.icon = 'Home'; section.isVisible = false; }
            if (id === 'descripcion') { section.icon = 'FileText'; section.isVisible = true; }
            if (id === 'master_plan') { section.icon = 'Target'; section.isVisible = true; }
        }

        // Preserve existing content/props if it existed
        newConfig.push(section);
        processedIds.add(id);
    });

    // 4. Add any remaining sections that were in currentConfig but not in desiredOrder (custom sections?)
    currentConfig.forEach(s => {
        if (!processedIds.has(s.id)) {
            newConfig.push(s);
        }
    });

    // 5. Update DB
    const { error: updateError } = await supabase
        .from('quotations')
        .update({ sections_config: newConfig, updated_at: new Date().toISOString() })
        .eq('id', record.id);

    if (updateError) {
        console.error("Update failed:", updateError);
    } else {
        console.log("SUCCESS! Sections re-ordered with Master Plan at the end.");
    }
}

fixMiramarOrdering();
