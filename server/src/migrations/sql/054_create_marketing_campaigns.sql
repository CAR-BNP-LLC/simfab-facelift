-- Migration 054: Create marketing campaigns tables
-- Allows admins to send marketing emails to registered users with GDPR-compliant unsubscribe functionality

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT marketing_campaigns_status_check CHECK (
    status IN ('draft', 'sending', 'sent', 'cancelled')
  )
);

-- Marketing campaign recipients table
-- Tracks individual email sends, opens, clicks, and unsubscribes
CREATE TABLE IF NOT EXISTS marketing_campaign_recipients (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  unsubscribed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON marketing_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_recipients_campaign_id ON marketing_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_recipients_user_id ON marketing_campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_recipients_email ON marketing_campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_recipients_unsubscribe_token ON marketing_campaign_recipients(unsubscribe_token);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_marketing_campaigns_updated_at'
  ) THEN
    CREATE TRIGGER update_marketing_campaigns_updated_at
      BEFORE UPDATE ON marketing_campaigns
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Comments
COMMENT ON TABLE marketing_campaigns IS 'Marketing email campaigns created by admins';
COMMENT ON TABLE marketing_campaign_recipients IS 'Tracks individual email sends, opens, clicks, and unsubscribes for GDPR compliance';

