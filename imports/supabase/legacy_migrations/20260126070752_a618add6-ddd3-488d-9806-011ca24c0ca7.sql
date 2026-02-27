-- Only update integrations that contain HTML tags
UPDATE public.integrations 
SET description = TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(description, '<[^>]+>', '', 'g'),
    '&nbsp;', ' ', 'g'
  )
)
WHERE description LIKE '%<%';