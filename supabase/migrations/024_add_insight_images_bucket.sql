INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('insight-images', 'insight-images', true, 524288)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "insight_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'insight-images');

CREATE POLICY "insight_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'insight-images');
