-- Create app_variables table for advanced data manipulation system
CREATE TABLE public.app_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_project_id UUID NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  variable_type TEXT NOT NULL DEFAULT 'static' CHECK (variable_type IN ('static', 'computed', 'aggregation')),
  data_source JSONB DEFAULT '{}',
  query_config JSONB DEFAULT '{}',
  computation_logic TEXT,
  cache_duration INTEGER DEFAULT 3600, -- seconds
  last_computed_at TIMESTAMP WITH TIME ZONE,
  computed_value JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(app_project_id, name)
);

-- Enable RLS
ALTER TABLE public.app_variables ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage variables for their app projects"
ON public.app_variables
FOR ALL
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_app_variables_updated_at
BEFORE UPDATE ON public.app_variables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_app_variables_project_id ON public.app_variables(app_project_id);
CREATE INDEX idx_app_variables_type ON public.app_variables(variable_type);
CREATE INDEX idx_app_variables_active ON public.app_variables(is_active);

-- Create variable_computations table for tracking computation history
CREATE TABLE public.variable_computations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variable_id UUID NOT NULL REFERENCES app_variables(id) ON DELETE CASCADE,
  computation_time_ms INTEGER,
  result_value JSONB,
  error_message TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.variable_computations ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view computation history for their variables"
ON public.variable_computations
FOR SELECT
USING (variable_id IN (
  SELECT id FROM app_variables WHERE user_id = auth.uid()
));

-- Create index
CREATE INDEX idx_variable_computations_variable_id ON public.variable_computations(variable_id);
CREATE INDEX idx_variable_computations_created_at ON public.variable_computations(created_at);