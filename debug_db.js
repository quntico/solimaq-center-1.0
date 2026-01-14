import { supabase } from './src/lib/customSupabaseClient.js';

async function checkState() {
    const { data, error } = await supabase
        .from('quotations')
        .select('theme_key, project, is_home, is_template')
        .or('is_home.eq.true,is_template.eq.true');

    if (error) console.error(error);
    else console.table(data);
}

checkState();
