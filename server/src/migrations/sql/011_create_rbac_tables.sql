-- Create RBAC (Role-Based Access Control) tables
-- This migration creates the roles, authorities, and relationship tables for fine-grained authorization

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create authorities table
CREATE TABLE IF NOT EXISTS authorities (
  id SERIAL PRIMARY KEY,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resource, action)
);

-- Create role_authorities junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS role_authorities (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  authority_id INTEGER NOT NULL REFERENCES authorities(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, authority_id)
);

-- Create user_roles junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_authorities_role_id ON role_authorities(role_id);
CREATE INDEX IF NOT EXISTS idx_role_authorities_authority_id ON role_authorities(authority_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_authorities_resource_action ON authorities(resource, action);

-- Add comments for documentation
COMMENT ON TABLE roles IS 'User roles for RBAC system';
COMMENT ON TABLE authorities IS 'Individual permissions/authorities';
COMMENT ON TABLE role_authorities IS 'Many-to-many relationship between roles and authorities';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles';

COMMENT ON COLUMN roles.name IS 'Role name (e.g., admin, staff, customer)';
COMMENT ON COLUMN authorities.resource IS 'Resource being accessed (e.g., products, orders)';
COMMENT ON COLUMN authorities.action IS 'Action being performed (e.g., view, create, edit, delete)';
