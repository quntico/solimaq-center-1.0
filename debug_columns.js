import { supabase } from './src/lib/customSupabaseClient.js';

async function checkColumns() {
    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error connecting to Supabase:", error);
    } else if (data && data.length > 0) {
        console.log("Columns found in 'quotations' table:");
        console.log("COLUMNS_START");
        console.log(JSON.stringify(Object.keys(data[0])));
        console.log("COLUMNS_END");
    } else {
        console.log("No records found in 'quotations' table to inspect columns.");
    }
}

checkColumns();
