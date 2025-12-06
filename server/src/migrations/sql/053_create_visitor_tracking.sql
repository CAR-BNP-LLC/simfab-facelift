-- Migration 053: Create visitor tracking tables
-- Tracks visitors, page views, and custom events for analytics

-- Visitor sessions table
-- Tracks unique sessions with ability to link anonymous sessions to authenticated users
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  first_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  authenticated_at TIMESTAMP,
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  screen_width INTEGER,
  screen_height INTEGER,
  is_mobile BOOLEAN DEFAULT FALSE,
  is_tablet BOOLEAN DEFAULT FALSE,
  is_desktop BOOLEAN DEFAULT FALSE,
  ip_address INET,
  country_code VARCHAR(2),
  city VARCHAR(100),
  page_views_count INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  is_returning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page views table
-- Tracks individual page views per session
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES visitor_sessions(session_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  query_string TEXT,
  load_time INTEGER, -- milliseconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visitor events table
-- Tracks custom events like cart_add, checkout_start, etc.
CREATE TABLE IF NOT EXISTS visitor_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES visitor_sessions(session_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  page_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for visitor_sessions
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_id ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_user_id ON visitor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_first_visit ON visitor_sessions(first_visit_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_visit ON visitor_sessions(last_visit_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_authenticated_at ON visitor_sessions(authenticated_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_utm_source ON visitor_sessions(utm_source);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_utm_campaign ON visitor_sessions(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_is_returning ON visitor_sessions(is_returning);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at DESC);

-- Indexes for page_views
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session_created ON page_views(session_id, created_at DESC);

-- Indexes for visitor_events
CREATE INDEX IF NOT EXISTS idx_visitor_events_session_id ON visitor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_user_id ON visitor_events(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_event_type ON visitor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON visitor_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_events_session_type ON visitor_events(session_id, event_type);

-- Function to update visitor_sessions timestamps
CREATE OR REPLACE FUNCTION update_visitor_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_visitor_sessions_timestamp_trigger'
  ) THEN
    CREATE TRIGGER update_visitor_sessions_timestamp_trigger
      BEFORE UPDATE ON visitor_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_visitor_sessions_timestamp();
  END IF;
END $$;

-- Function to update page_views_count in visitor_sessions
CREATE OR REPLACE FUNCTION update_visitor_session_page_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitor_sessions
  SET page_views_count = page_views_count + 1,
      last_visit_at = CURRENT_TIMESTAMP
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update page views count
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_visitor_session_page_views_trigger'
  ) THEN
    CREATE TRIGGER update_visitor_session_page_views_trigger
      AFTER INSERT ON page_views
      FOR EACH ROW
      EXECUTE FUNCTION update_visitor_session_page_views();
  END IF;
END $$;

-- Function to update events_count in visitor_sessions
CREATE OR REPLACE FUNCTION update_visitor_session_events()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitor_sessions
  SET events_count = events_count + 1
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update events count
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_visitor_session_events_trigger'
  ) THEN
    CREATE TRIGGER update_visitor_session_events_trigger
      AFTER INSERT ON visitor_events
      FOR EACH ROW
      EXECUTE FUNCTION update_visitor_session_events();
  END IF;
END $$;

-- Comments
COMMENT ON TABLE visitor_sessions IS 'Tracks unique visitor sessions, supports linking anonymous sessions to authenticated users';
COMMENT ON TABLE page_views IS 'Tracks individual page views per session';
COMMENT ON TABLE visitor_events IS 'Tracks custom events like cart_add, checkout_start, etc.';
COMMENT ON COLUMN visitor_sessions.session_id IS 'Unique session identifier (cookie-based)';
COMMENT ON COLUMN visitor_sessions.user_id IS 'Linked user ID when session becomes authenticated (NULL for anonymous)';
COMMENT ON COLUMN visitor_sessions.authenticated_at IS 'Timestamp when anonymous session was linked to user_id';
COMMENT ON COLUMN visitor_sessions.is_returning IS 'True if user_id or session_id has previous sessions';

