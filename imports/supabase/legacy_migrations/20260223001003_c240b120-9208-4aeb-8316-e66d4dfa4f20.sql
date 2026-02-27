INSERT INTO storage.buckets (id, name, public)
VALUES ('flow-node-files', 'flow-node-files', false);

CREATE POLICY "Users can upload flow node files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'flow-node-files');

CREATE POLICY "Users can read flow node files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'flow-node-files');

CREATE POLICY "Users can delete flow node files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'flow-node-files');

CREATE POLICY "Users can update flow node files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'flow-node-files');