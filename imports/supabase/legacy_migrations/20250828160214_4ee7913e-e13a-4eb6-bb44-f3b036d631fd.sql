-- Mark Salesforce node as implemented
INSERT INTO public.node_implementation_status (
  node_type,
  is_implemented,
  implemented_at,
  implemented_by
) VALUES (
  'salesforce',
  true,
  now(),
  auth.uid()
) ON CONFLICT (node_type) DO UPDATE SET
  is_implemented = true,
  implemented_at = now(),
  implemented_by = auth.uid(),
  updated_at = now();