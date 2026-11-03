-- ==============================================================================
-- Supabase Storage Bucket Policies & Cascade Delete Trigger for VetiCare
-- ==============================================================================
-- Run this script in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- Why is this needed?
-- 1. By default, PostgreSQL foreign key cascades only apply to database tables.
--    Files uploaded to Supabase Storage live in `storage.objects` and require either
--    an API deletion or a PostgreSQL trigger to cascade delete.
-- 2. Storage Buckets require RLS policies so users/clients are permitted to upload,
--    read, and delete diagnostic report files.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Step 1: Storage Bucket RLS Policies for 'veti-care'
-- ------------------------------------------------------------------------------

-- Allow anyone / authenticated users to view diagnostic files
DROP POLICY IF EXISTS "Public Read veti-care" ON storage.objects;
CREATE POLICY "Public Read veti-care"
ON storage.objects FOR SELECT
USING (bucket_id = 'veti-care');

-- Allow authenticated and anon users to upload diagnostic files
DROP POLICY IF EXISTS "Allow Upload veti-care" ON storage.objects;
CREATE POLICY "Allow Upload veti-care"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'veti-care');

-- Allow updating diagnostic files
DROP POLICY IF EXISTS "Allow Update veti-care" ON storage.objects;
CREATE POLICY "Allow Update veti-care"
ON storage.objects FOR UPDATE
USING (bucket_id = 'veti-care');

-- Allow deleting diagnostic files from the bucket
DROP POLICY IF EXISTS "Allow Delete veti-care" ON storage.objects;
CREATE POLICY "Allow Delete veti-care"
ON storage.objects FOR DELETE
USING (bucket_id = 'veti-care');


-- ------------------------------------------------------------------------------
-- Step 2: Cascade Delete Trigger on 'treatments' Table
-- ------------------------------------------------------------------------------
-- Automatically removes all associated diagnostic files, lab reports, X-Rays,
-- ECGs, and ultrasound files from Supabase Storage whenever a treatment record
-- is deleted (directly, or cascaded from deleting a pet or owner).

CREATE OR REPLACE FUNCTION delete_treatment_storage_objects()
RETURNS TRIGGER AS $$
DECLARE
    att RECORD;
    file_path TEXT;
BEGIN
    -- Check if OLD.attachments contains data
    IF OLD.attachments IS NOT NULL THEN
        -- Safely handle both JSONB and TEXT column formats
        FOR att IN 
            SELECT value 
            FROM jsonb_array_elements(
                CASE 
                    WHEN pg_typeof(OLD.attachments) = 'jsonb'::regtype THEN OLD.attachments
                    ELSE OLD.attachments::jsonb
                END
            ) 
        LOOP
            file_path := att.value->>'path';

            -- If file_path is valid, delete from storage.objects
            IF file_path IS NOT NULL AND length(trim(file_path)) > 0 THEN
                DELETE FROM storage.objects 
                WHERE name = file_path;
            END IF;
        END LOOP;
    END IF;

    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Graceful degradation: never block the treatment deletion even if the storage object is already gone
        RAISE WARNING 'Notice: Could not delete storage object (%): %', file_path, SQLERRM;
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on treatments table
DROP TRIGGER IF EXISTS tr_delete_treatment_storage_objects ON treatments;
CREATE TRIGGER tr_delete_treatment_storage_objects
AFTER DELETE ON treatments
FOR EACH ROW
EXECUTE FUNCTION delete_treatment_storage_objects();

