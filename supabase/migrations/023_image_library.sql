-- PredictKit — Migration 023: Image Library
-- 1. Create "market-images" storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('market-images', 'market-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage RLS for "market-images"
CREATE POLICY "Market images are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'market-images');

CREATE POLICY "Admins can insert market images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'market-images' AND public.is_admin());

CREATE POLICY "Admins can update market images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'market-images' AND public.is_admin());

CREATE POLICY "Admins can delete market images" ON storage.objects
  FOR DELETE USING (bucket_id = 'market-images' AND public.is_admin());

-- 3. Create image_library table
CREATE TABLE IF NOT EXISTS public.image_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  storage_path text NOT NULL,
  name text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS and setup policies for image_library
ALTER TABLE public.image_library ENABLE ROW LEVEL SECURITY;

-- Select is public (needed for users viewing markets)
CREATE POLICY "image_library_select_public" ON public.image_library
  FOR SELECT USING (TRUE);

-- Admin can write (insert, update, delete)
CREATE POLICY "image_library_write_admin" ON public.image_library
  FOR ALL USING (public.is_admin());
