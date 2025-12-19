import { supabase } from './src/lib/customSupabaseClient.js';

async function testUpload() {
    console.log("Attempting test upload to 'quotation-files'...");

    const fileName = `test_${Date.now()}.txt`;
    const fileContent = new Blob(['Hello World'], { type: 'text/plain' });

    const { data, error } = await supabase.storage
        .from('quotation-files')
        .upload(fileName, fileContent);

    if (error) {
        console.error("Upload failed:", error);
        console.log("Error details:", JSON.stringify(error, null, 2));
    } else {
        console.log("Upload successful:", data);

        // Clean up
        await supabase.storage.from('quotation-files').remove([fileName]);
    }
}

testUpload();
