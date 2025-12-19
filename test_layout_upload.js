
import { supabase } from './src/lib/customSupabaseClient.js';

async function testUpload() {
    console.log("Testing upload to 'logos-bucket'...");

    // Create a dummy buffer (fake png header)
    const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const fileName = `test_layout_${Date.now()}.png`;
    const filePath = `layout-lateral/${fileName}`;

    console.log(`Uploading to ${filePath}...`);

    const { data, error } = await supabase.storage
        .from('logos-bucket')
        .upload(filePath, buffer, {
            contentType: 'image/png'
        });

    if (error) {
        console.error("Upload FAILED:", error);
        return;
    }

    console.log("Upload SUCCESS:", data);

    const { data: { publicUrl } } = supabase.storage
        .from('logos-bucket')
        .getPublicUrl(filePath);

    console.log("Public URL:", publicUrl);

    // Validate if URL is accessible (fetch it)
    console.log("Verifying accessibility...");
    try {
        const res = await fetch(publicUrl);
        console.log(`Fetch status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const text = await res.text();
            console.log("Content:", text);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testUpload();
