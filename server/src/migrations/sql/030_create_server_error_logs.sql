-- Create server error logs table for tracking 5xx server errors
-- Comprehensive logging for monitoring, debugging, and analysis

-- Server error logs table
CREATE TABLE IF NOT EXISTS server_error_logs (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  error_code VARCHAR(100),
  error_name VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  http_method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  request_body JSONB,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  request_headers JSONB,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT server_error_logs_status_code_check CHECK (
    status_code >= 500 AND status_code < 600
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_server_error_logs_status_code ON server_error_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_created_at ON server_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_user_id ON server_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_error_code ON server_error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_path ON server_error_logs(path);
CREATE INDEX IF NOT EXISTS idx_server_error_logs_request_id ON server_error_logs(request_id);

-- Comments for documentation
COMMENT ON TABLE server_error_logs IS 'Logs all server errors (HTTP 5xx) for monitoring and debugging';
COMMENT ON COLUMN server_error_logs.request_id IS 'Unique request identifier for tracing';
COMMENT ON COLUMN server_error_logs.status_code IS 'HTTP status code (must be 5xx)';
COMMENT ON COLUMN server_error_logs.error_code IS 'Application-specific error code (e.g., DATABASE_ERROR)';
COMMENT ON COLUMN server_error_logs.query_params IS 'URL query parameters at time of error';
COMMENT ON COLUMN server_error_logs.request_body IS 'Request body payload (sanitized of sensitive data)';
COMMENT ON COLUMN server_error_logs.error_details IS 'Additional error context and metadata';
COMMENT ON COLUMN server_error_logs.request_headers IS 'HTTP request headers (sanitized of sensitive data)';

