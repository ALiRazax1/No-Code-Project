/*
# Create avatars storage bucket

## Overview
Creates a public storage bucket named `avatars` for profile picture uploads.

## Changes
1. Insert a row into `storage.buckets` for the `avatars` bucket (public).
2. Add storage policies allowing authenticated users to upload/read their own avatars.

## Security
- Bucket is public-read (avatars are displayable to all users).
- Upload/update/delete restricted to the owner of the object path.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read of avatars
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to avatars
DROP POLICY IF EXISTS "auth_insert_avatars" ON storage.objects;
CREATE POLICY "auth_insert_avatars" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatars
DROP POLICY IF EXISTS "auth_update_avatars" ON storage.objects;
CREATE POLICY "auth_update_avatars" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to delete their own avatars
DROP POLICY IF EXISTS "auth_delete_avatars" ON storage.objects;
CREATE POLICY "auth_delete_avatars" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars');
