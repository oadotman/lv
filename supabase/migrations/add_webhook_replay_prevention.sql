-- =====================================================
-- WEBHOOK REPLAY PREVENTION
-- Creates table to track processed webhooks and prevent replays
-- =====================================================

-- Create processed_webhooks table
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('paddle', 'assemblyai', 'inngest')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_webhook_id ON processed_webhooks(webhook_id);
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_source ON processed_webhooks(source);
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at ON processed_webhooks(processed_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_source_id ON processed_webhooks(source, webhook_id);

-- Add comments
COMMENT ON TABLE processed_webhooks IS 'Tracks processed webhooks to prevent replay attacks';
COMMENT ON COLUMN processed_webhooks.webhook_id IS 'Unique identifier for the webhook (format: source:id)';
COMMENT ON COLUMN processed_webhooks.source IS 'Webhook source (paddle, assemblyai, inngest)';
COMMENT ON COLUMN processed_webhooks.processed_at IS 'When the webhook was processed';
COMMENT ON COLUMN processed_webhooks.metadata IS 'Additional webhook metadata (event type, etc)';

-- Create function to auto-delete old webhook records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhooks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhooks
  WHERE processed_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (adjust based on your RLS policies)
-- This table doesn't need RLS as it's only accessed by server-side code

GRANT SELECT, INSERT, DELETE ON processed_webhooks TO authenticated;
GRANT SELECT, INSERT, DELETE ON processed_webhooks TO service_role;