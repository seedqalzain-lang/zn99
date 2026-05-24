-- Restrict wallets table: remove public read; server functions use service role
DROP POLICY IF EXISTS "public read wallets" ON public.wallets;

-- Storage: lock down writes to 'media' bucket; keep public read
DROP POLICY IF EXISTS "media public read" ON storage.objects;
DROP POLICY IF EXISTS "media block anon writes" ON storage.objects;

CREATE POLICY "media public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- No INSERT/UPDATE/DELETE policies => anon/auth roles cannot write.
-- Server-side uploads use service role (supabaseAdmin) which bypasses RLS.