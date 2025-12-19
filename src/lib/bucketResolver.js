import { supabase } from '@/lib/customSupabaseClient';

const PREFERRED_BUCKET = "quotation-files";
const FALLBACK_BUCKETS = ["quotation-files", "layout-images", "quotation-pdfs", "public", "logos-bucket", "logos", "images", "avatars", "storage"];

let resolvedBucket = null;

async function listBuckets() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Error listing buckets:", error);
      return [];
    }
    return data.map(b => b.name);
  } catch (e) {
    console.error("Exception listing buckets:", e);
    return [];
  }
}

async function bucketExists(name) {
  try {
    const { data, error } = await supabase.storage.from(name).list('', { limit: 1 });
    if (error && error.message && error.message.includes("Bucket not found")) {
      return false;
    }
    // If error is something else (like permission denied), we might still want to try? 
    // But usually 'Bucket not found' is the specific one.
    // If data is null and error is present, assume false.
    if (error) return false;

    return true;
  } catch (e) {
    console.warn(`Bucket check failed for ${name}:`, e);
    return false;
  }
}

export async function getActiveBucket() {
  if (resolvedBucket) {
    return resolvedBucket;
  }

  // 1. Try preferred bucket
  if (await bucketExists(PREFERRED_BUCKET)) {
    resolvedBucket = PREFERRED_BUCKET;
    console.log(`Using preferred bucket: ${resolvedBucket}`);
    return resolvedBucket;
  }

  // 2. Try fallbacks
  for (const bucket of FALLBACK_BUCKETS) {
    if (await bucketExists(bucket)) {
      resolvedBucket = bucket;
      console.log(`Using fallback bucket: ${resolvedBucket}`);
      return resolvedBucket;
    }
  }

  // 3. Try listing ALL buckets and picking the first one
  console.log("Specific buckets not found. Listing all buckets...");
  const allBuckets = await listBuckets();
  if (allBuckets.length > 0) {
    resolvedBucket = allBuckets[0];
    console.log(`Using first available bucket from list: ${resolvedBucket}`);
    return resolvedBucket;
  }

  // 4. Default to preferred if nothing found (hoping for the best or creation)
  console.warn(`No accessible buckets found. Defaulting to '${PREFERRED_BUCKET}'.`);
  return PREFERRED_BUCKET;
}