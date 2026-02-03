import { supabase } from './src/lib/customSupabaseClient.js';

async function testUpsert() {
    console.log("Testing upsert without theme_key...");
    const { error } = await supabase.from('quotations').upsert({
        slug: 'test-slug-123',
        sections_config: { test: true },
        updated_at: new Date().toISOString()
    }, { onConflict: 'slug' });

    if (error) {
        console.error("Upsert failed:", error.message);
        console.error("Error details:", error);
    } else {
        console.log("Upsert successful!");
    }
}

testUpsert();
