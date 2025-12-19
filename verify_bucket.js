import { supabase } from './src/lib/customSupabaseClient.js';

async function verifyBucket() {
    const bucketName = 'quotation-files';
    console.log(`Verifying access to bucket: ${bucketName}...`);

    const { data, error } = await supabase.storage.from(bucketName).list();

    if (error) {
        console.error("Error accessing bucket:", error);
    } else {
        console.log("Success! Bucket is accessible.");
        console.log("Files in bucket:", data.length);
    }
}

verifyBucket();
