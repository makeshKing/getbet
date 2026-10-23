import { supabase } from '../lib/supabaseClient';

const BUCKET = 'deposit-proofs';

/**
 * Upload a deposit screenshot to Supabase Storage.
 * Returns the public URL (or signed URL if bucket is private).
 */
export async function uploadDepositScreenshot(
  file: File,
  userId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Get a signed URL valid for 7 days (bucket is private)
  const { data, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (urlError || !data?.signedUrl)
    throw new Error(`Could not get signed URL: ${urlError?.message}`);

  return data.signedUrl;
}

/**
 * Convert a base64 data-URL to a File object (for legacy screenshot uploads).
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
