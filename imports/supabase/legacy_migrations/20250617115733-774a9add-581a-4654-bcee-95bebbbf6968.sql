-- Create trigger to automatically add subscription plan field when subscription is enabled
CREATE TRIGGER ensure_subscription_plan_field_trigger
  BEFORE INSERT OR UPDATE ON public.table_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_subscription_plan_field();