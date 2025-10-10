-- Enhanced newsletter subscriptions with verification

-- Add verification fields to newsletter_subscriptions if table exists
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'newsletter_subscriptions') THEN
    ALTER TABLE newsletter_subscriptions
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'website',
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
    
    -- Add status constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_subscriptions_status_check'
    ) THEN
      ALTER TABLE newsletter_subscriptions ADD CONSTRAINT newsletter_subscriptions_status_check 
      CHECK (status IN ('pending', 'active', 'unsubscribed', 'bounced'));
    END IF;
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_verified ON newsletter_subscriptions(verified_at);
  ELSE
    -- Create table if it doesn't exist
    CREATE TABLE newsletter_subscriptions (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      verification_token VARCHAR(255),
      verified_at TIMESTAMP,
      status VARCHAR(20) DEFAULT 'pending',
      source VARCHAR(50) DEFAULT 'website',
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT newsletter_subscriptions_status_check CHECK (
        status IN ('pending', 'active', 'unsubscribed', 'bounced')
      )
    );
    
    CREATE INDEX idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
    CREATE INDEX idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
    CREATE INDEX idx_newsletter_subscriptions_verified ON newsletter_subscriptions(verified_at);
    
    CREATE TRIGGER update_newsletter_subscriptions_updated_at
      BEFORE UPDATE ON newsletter_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Newsletter campaigns table
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  template_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT newsletter_campaigns_status_check CHECK (
    status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')
  )
);

-- Newsletter campaign tracking
CREATE TABLE IF NOT EXISTS newsletter_tracking (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscriptions(id) ON DELETE CASCADE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  unsubscribed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_scheduled ON newsletter_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_tracking_campaign_id ON newsletter_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_tracking_subscriber_id ON newsletter_tracking(subscriber_id);

-- Trigger for campaigns updated_at
CREATE TRIGGER update_newsletter_campaigns_updated_at
    BEFORE UPDATE ON newsletter_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE newsletter_campaigns IS 'Email marketing campaigns';
COMMENT ON TABLE newsletter_tracking IS 'Track email opens, clicks, and unsubscribes';


