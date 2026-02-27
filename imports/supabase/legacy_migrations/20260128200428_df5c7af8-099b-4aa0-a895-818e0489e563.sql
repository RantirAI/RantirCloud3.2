-- Clean up stale is_published flags - only keep the latest version per flow_project published
WITH latest_published AS (
  SELECT DISTINCT ON (flow_project_id)
    id,
    flow_project_id,
    version
  FROM flow_data
  WHERE is_published = true
  ORDER BY flow_project_id, version DESC
)
UPDATE flow_data fd
SET is_published = false
WHERE fd.is_published = true
  AND fd.id NOT IN (SELECT id FROM latest_published);