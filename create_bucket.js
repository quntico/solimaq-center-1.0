import { supabase } from './src/lib/customSupabaseClient.js';

async function createBucket() {
    console.log("Attempting to create bucket 'quotation-files'...");
    const { data, error } = await supabase.storage.createBucket('quotation-files', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    });

    if (error) {
        console.error("Error creating bucket:", error);
    } else {
        console.log("Bucket created successfully:", data);
    }
}

createBucket();
