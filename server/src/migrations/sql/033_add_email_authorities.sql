-- Add email management authorities to the RBAC system
-- This ensures existing systems have the email permissions

-- Insert email authorities if they don't exist
INSERT INTO authorities (resource, action, description)
VALUES 
  ('emails', 'view', 'View email templates and logs'),
  ('emails', 'manage', 'Create, edit, and manage email templates')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign email authorities to admin role
INSERT INTO role_authorities (role_id, authority_id)
SELECT r.id, a.id
FROM roles r
CROSS JOIN authorities a
WHERE r.name = 'admin' 
  AND a.resource = 'emails'
  AND (a.action = 'view' OR a.action = 'manage')
ON CONFLICT (role_id, authority_id) DO NOTHING;

-- Assign emails:view to staff role (staff can view but not manage)
INSERT INTO role_authorities (role_id, authority_id)
SELECT r.id, a.id
FROM roles r
CROSS JOIN authorities a
WHERE r.name = 'staff' 
  AND a.resource = 'emails'
  AND a.action = 'view'
ON CONFLICT (role_id, authority_id) DO NOTHING;

