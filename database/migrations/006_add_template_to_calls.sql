-- =====================================================
-- ADD TEMPLATE SUPPORT TO CALLS
-- Links calls to the template selected during upload
-- =====================================================
-- Version: 1.0
-- Date: December 2024
-- =====================================================

-- Add template_id column to calls table to track which template was selected during upload
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES custom_templates(id) ON DELETE SET NULL;

-- Add index for better query performance when filtering calls by template
CREATE INDEX IF NOT EXISTS idx_calls_template ON calls(template_id) WHERE template_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN calls.template_id IS 'The template selected during upload for field extraction. NULL means default extraction (all core fields).';

-- Update existing calls to have NULL template_id (default behavior)
-- This ensures backward compatibility
UPDATE calls SET template_id = NULL WHERE template_id IS NULL;

-- Function to get calls using a specific template
CREATE OR REPLACE FUNCTION get_template_usage_stats(p_template_id UUID)
RETURNS TABLE (
  total_calls BIGINT,
  last_used TIMESTAMPTZ,
  users_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id) as total_calls,
    MAX(c.created_at) as last_used,
    COUNT(DISTINCT c.user_id) as users_count
  FROM calls c
  WHERE c.template_id = p_template_id
    AND c.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update template usage stats when a call is processed
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE custom_templates
    SET
      usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update template usage stats
DROP TRIGGER IF EXISTS update_template_usage_on_call_complete ON calls;
CREATE TRIGGER update_template_usage_on_call_complete
  AFTER UPDATE OF status ON calls
  FOR EACH ROW
  WHEN (OLD.status <> 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION update_template_usage();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_template_usage_stats TO authenticated;

-- Verification query to confirm the migration
SELECT
  CASE
    WHEN column_name IS NOT NULL THEN '✅ template_id column added to calls table'
    ELSE '❌ Failed to add template_id column'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calls'
  AND column_name = 'template_id';

-- Show current template usage (should be empty initially)
SELECT
  'Template usage stats:' as info,
  COUNT(*) FILTER (WHERE template_id IS NOT NULL) as calls_with_templates,
  COUNT(*) FILTER (WHERE template_id IS NULL) as calls_without_templates,
  COUNT(DISTINCT template_id) as unique_templates_used
FROM calls;

-- Success message
SELECT '🎉 Template support added to calls table! Calls can now track which template was used for extraction.' as message;