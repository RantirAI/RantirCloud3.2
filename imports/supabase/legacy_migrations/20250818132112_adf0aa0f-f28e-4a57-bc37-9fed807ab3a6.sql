-- Allow authenticated users to update integration status
CREATE POLICY "Authenticated users can update integration status" 
ON integrations 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);