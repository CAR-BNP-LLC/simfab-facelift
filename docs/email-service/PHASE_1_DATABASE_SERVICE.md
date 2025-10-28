# Phase 1: Database & Service

**Goal**: Set up database schema and basic email service  
**Time**: 2-3 hours  
**Priority**: HIGH  

---

## 📋 Tasks

- [ ] Create migration file `029_create_email_service_tables.sql`
- [ ] Run migration
- [ ] Install nodemailer package
- [ ] Create TypeScript types `server/src/types/email.ts`
- [ ] Create `EmailTemplateEngine.ts` in `server/src/utils/`
- [ ] Create `EmailService.ts` in `server/src/services/`
- [ ] Initialize email service in `server/src/index.ts`

---

## 🗄️ Database Schema

### File: `server/src/migrations/sql/029_create_email_service_tables.sql`

```sql
-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  default_recipients TEXT[],
  recipient_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

-- Email logs for tracking
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  template_type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(500),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email settings
CREATE TABLE IF NOT EXISTS email_settings (
  id SERIAL PRIMARY KEY,
  smtp_host VARCHAR(255),
  smtp_port INTEGER DEFAULT 587,
  smtp_user VARCHAR(255),
  smtp_password VARCHAR(255),
  smtp_from_email VARCHAR(255),
  smtp_from_name VARCHAR(255),
  test_mode BOOLEAN DEFAULT true,
  test_email VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (type, name, description, subject, html_body, recipient_type, default_recipients) VALUES
  ('new_order_admin', 'New Order (Admin)', 'Sent to admin when a new order is placed', 'New Order #{{order_number}}', '<p>New order received from {{customer_name}}</p><p>Order total: {{order_total}}</p>', 'admin', ARRAY['info@simfab.com']),
  ('order_processing', 'Order Processing', 'Sent to customer when order starts processing', 'Your Order #{{order_number}} is Being Processed', '<p>Your order is being processed...</p>', 'customer', ARRAY[]),
  ('order_completed', 'Order Completed', 'Sent to customer when order is completed', 'Your Order #{{order_number}} is Complete!', '<p>Your order has been completed...</p>', 'customer', ARRAY[]),
  ('reset_password', 'Reset Password', 'Sent when customer requests password reset', 'Reset Your Password', '<p>Click here to reset your password: {{reset_url}}</p>', 'customer', ARRAY[]),
  ('new_account', 'New Account', 'Welcome email for new accounts', 'Welcome to SimFab!', '<p>Thanks for creating an account, {{customer_name}}!</p>', 'customer', ARRAY[])
ON CONFLICT (type) DO NOTHING;

COMMENT ON TABLE email_templates IS 'Email templates for all system emails';
COMMENT ON TABLE email_logs IS 'Audit trail of all sent emails';
```

---

## 📝 TypeScript Types

### File: `server/src/types/email.ts`

```typescript
export interface EmailTemplate {
  id: number;
  type: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  text_body?: string;
  default_recipients: string[];
  recipient_type: 'admin' | 'customer' | 'both';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
}

export interface EmailLog {
  id: number;
  template_type: string;
  recipient_email: string;
  recipient_name?: string;
  subject?: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  metadata: Record<string, any>;
  sent_at?: Date;
  created_at: Date;
}

export interface EmailSettings {
  id?: number;
  smtp_host?: string;
  smtp_port: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email: string;
  smtp_from_name: string;
  test_mode: boolean;
  test_email?: string;
  enabled: boolean;
  updated_at: Date;
}

export interface SendEmailOptions {
  templateType: string;
  recipientEmail: string;
  recipientName?: string;
  variables: Record<string, any>;
  adminCopy?: boolean;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: number;
}
```

---

## 🛠️ Installation

```bash
cd server
npm install nodemailer
npm install -D @types/nodemailer
```

---

## ✅ Success Criteria

- [x] Database migration runs successfully
- [x] All templates inserted into database
- [x] EmailService can be instantiated
- [x] Template engine can replace variables
- [x] No TypeScript errors
- [x] Can log emails to database

---

## 🧪 Testing

Test the email service setup:

```typescript
const emailService = new EmailService(pool);
await emailService.initialize();
console.log('Email service initialized');
```

---

**Next Phase**: [Phase 2: API Endpoints](./PHASE_2_API_ENDPOINTS.md)

