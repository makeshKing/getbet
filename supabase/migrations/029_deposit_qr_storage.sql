-- PredictKit — Migration 029: Deposit method QR image storage
--
-- Acts as the "admin-only upload endpoint" for QR images. Supabase Storage
-- enforces these rules SERVER-SIDE on every upload, independent of the client:
--   * file_size_limit     → max 2 MB
--   * allowed_mime_types  → png / jpeg / webp only
--   * RLS policies        → only ADMIN users may upload / delete
-- The bucket is public so the user-side Manual Deposit modal can display it.

-- 1. Safety: qr_url already exists since 001_schema.sql, keep idempotent.
ALTER TABLE public.deposit_methods ADD COLUMN IF NOT EXISTS qr_url TEXT;

-- 2. Public bucket with server-side size + MIME validation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deposit-qr',
  'deposit-qr',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. RLS on storage.objects for this bucket
--    (public read happens via the public URL; no public SELECT policy is
--    needed, which also prevents anonymous listing of the bucket)
DROP POLICY IF EXISTS "deposit_qr_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "deposit_qr_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "deposit_qr_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "deposit_qr_delete_admin" ON storage.objects;

-- Admin SELECT is required by the Storage API for remove()
CREATE POLICY "deposit_qr_select_admin" ON storage.objects
  FOR SELECT USING (bucket_id = 'deposit-qr' AND public.is_admin());

CREATE POLICY "deposit_qr_insert_admin" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'deposit-qr'
    AND public.is_admin()
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
  );

CREATE POLICY "deposit_qr_update_admin" ON storage.objects
  FOR UPDATE USING (bucket_id = 'deposit-qr' AND public.is_admin());

CREATE POLICY "deposit_qr_delete_admin" ON storage.objects
  FOR DELETE USING (bucket_id = 'deposit-qr' AND public.is_admin());
