-- Fix linter WARN: Function Search Path Mutable
ALTER FUNCTION public.update_ai_conversations_timestamp() SET search_path = public, extensions;