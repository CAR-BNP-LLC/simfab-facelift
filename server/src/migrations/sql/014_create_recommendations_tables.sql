-- Product recommendation and tracking tables

-- Product views tracking for recommendations
CREATE TABLE IF NOT EXISTS product_views (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  view_count INTEGER DEFAULT 1,
  last_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, user_id),
  UNIQUE(product_id, session_id)
);

-- Product relationships (manually curated or algorithm-generated)
CREATE TABLE IF NOT EXISTS product_relationships (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL,
  score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, related_product_id, relationship_type),
  CONSTRAINT product_relationships_type_check CHECK (
    relationship_type IN ('related', 'frequently_bought_together', 'alternative', 'upgrade', 'accessory')
  ),
  CONSTRAINT product_relationships_self_check CHECK (product_id != related_product_id)
);

-- Search queries for tracking popular searches
CREATE TABLE IF NOT EXISTS search_queries (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_session_id ON product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_product_views_last_viewed ON product_views(last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_relationships_product_id ON product_relationships(product_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_related_id ON product_relationships(related_product_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_type ON product_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_product_relationships_score ON product_relationships(score DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries USING GIN (to_tsvector('english', query));
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);

-- Function to update view count and timestamp
CREATE OR REPLACE FUNCTION update_product_view()
RETURNS TRIGGER AS $$
BEGIN
  NEW.view_count = OLD.view_count + 1;
  NEW.last_viewed_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update view count on conflict
CREATE TRIGGER update_product_view_trigger
  BEFORE UPDATE ON product_views
  FOR EACH ROW
  EXECUTE FUNCTION update_product_view();

COMMENT ON TABLE product_views IS 'Track product views for recommendations';
COMMENT ON TABLE product_relationships IS 'Product relationships for recommendations';
COMMENT ON TABLE search_queries IS 'Search query tracking for analytics';
COMMENT ON COLUMN product_relationships.score IS 'Relationship strength score (0-100)';


