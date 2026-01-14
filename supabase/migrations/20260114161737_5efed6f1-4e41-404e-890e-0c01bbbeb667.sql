-- Create og-images storage bucket for dynamic OG images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('og-images', 'og-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to og-images
CREATE POLICY "Public read access for og-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'og-images');

-- Allow authenticated users to upload og images (for edge function with service role)
CREATE POLICY "Service role can upload og-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'og-images');