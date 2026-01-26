/*
  # Fix RLS policy for settings table and storage bucket

  1. Changes
    - Drop and recreate the RLS policy for the `settings` table
    - Create storage bucket for shop assets if it doesn't exist
    - Add RLS policies for storage bucket to allow authenticated uploads
    - This ensures the policy is correctly applied and refreshes the schema cache

  2. Security
    - Re-establishes the user-isolated policy for settings
    - Allows authenticated users to upload to shop-assets bucket
*/

-- Drop existing policy for settings table
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.settings;

-- Recreate the policy for settings table
CREATE POLICY "Users can manage their own settings"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for shop assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to shop-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to shop-assets" ON storage.objects;

-- Create policy to allow authenticated users to upload to shop-assets bucket
CREATE POLICY "Allow authenticated uploads to shop-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'shop-assets');

-- Create policy to allow authenticated users to update their own files in shop-assets bucket
CREATE POLICY "Allow authenticated updates to shop-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow authenticated users to delete their own files in shop-assets bucket
CREATE POLICY "Allow authenticated deletes from shop-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'shop-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow public read access to shop-assets bucket (for displaying logos)
CREATE POLICY "Allow public access to shop-assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'shop-assets');

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';