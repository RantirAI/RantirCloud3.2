-- Create table for tracking node implementation status
CREATE TABLE public.node_implementation_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_type TEXT NOT NULL UNIQUE,
  is_implemented BOOLEAN NOT NULL DEFAULT false,
  implemented_by UUID REFERENCES auth.users,
  implemented_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.node_implementation_status ENABLE ROW LEVEL SECURITY;

-- Create policies for node implementation status
CREATE POLICY "Anyone can view node implementation status" 
ON public.node_implementation_status 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can update implementation status" 
ON public.node_implementation_status 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_node_implementation_status_updated_at
BEFORE UPDATE ON public.node_implementation_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();