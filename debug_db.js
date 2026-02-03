import { supabase } from './src/lib/customSupabaseClient.js';

async function checkMiramar() {
    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .ilike('project', '%Miramar%');

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

checkMiramar();
