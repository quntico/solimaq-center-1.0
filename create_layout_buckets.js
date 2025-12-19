
import { supabase } from './src/lib/customSupabaseClient.js';

async function createBuckets() {
    const buckets = ['layout-images', 'logos-bucket'];

    for (const bucketName of buckets) {
        console.log(`Checking/Creating bucket '${bucketName}'...`);

        // Check if exists
        const { data: existingBucket, error: checkError } = await supabase.storage.getBucket(bucketName);

        if (existingBucket) {
            console.log(`Bucket '${bucketName}' already exists. Updating public setting just in case...`);
            const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
                public: true,
                allowedMimeTypes: null // Allow all temporarily or specify
            });
            if (updateError) console.error(`Error updating bucket '${bucketName}':`, updateError);
            else console.log(`Bucket '${bucketName}' updated.`);
        } else {
            console.log(`Creating '${bucketName}'...`);
            const { data, error } = await supabase.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 52428800, // 50MB
                allowedMimeTypes: null // Allow all
            });

            if (error) {
                console.error(`Error creating bucket '${bucketName}':`, error);
            } else {
                console.log(`Bucket '${bucketName}' created successfully.`);
            }
        }
    }
}

createBuckets();
