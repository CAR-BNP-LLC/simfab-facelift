# Phase 2: API Endpoints

**Goal**: Create REST API for email management  
**Time**: 1-2 hours  
**Priority**: HIGH

---

## 📋 Tasks

- [ ] Create `adminEmailController.ts` in `server/src/controllers/`
- [ ] Create routes `routes/admin/email-templates.ts`
- [ ] Register routes in `server/src/index.ts`
- [ ] Test endpoints with Postman/curl

---

## 🎯 API Endpoints

### GET `/api/admin/email-templates`
List all email templates

**Response:**
```json
[
  {
    "id": 1,
    "type": "new_order_admin",
    "name": "New Order (Admin)",
    "description": "Sent to admin when a new order is placed",
    "subject": "New Order #{{order_number}}",
    "html_body": "<p>New order...</p>",
    "is_active": true
  }
]
```

### GET `/api/admin/email-templates/:type`
Get single template by type

### PUT `/api/admin/email-templates/:type`
Update email template

**Body:**
```json
{
  "subject": "Updated Subject",
  "html_body": "<p>Updated body</p>",
  "is_active": true
}
```

### POST `/api/admin/email-templates/:type/test`
Send test email

**Body:**
```json
{
  "recipientEmail": "test@example.com"
}
```

### GET `/api/admin/email-logs`
Get email logs (optional)

**Query Params:**
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset
- `status`: Filter by status (`sent`, `failed`, `pending`)
- `template_type`: Filter by template type

---

## 💻 Implementation

### Controller: `server/src/controllers/adminEmailController.ts`

```typescript
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { EmailService } from '../services/EmailService';

export class AdminEmailController {
  private emailService: EmailService;

  constructor(private pool: Pool) {
    this.emailService = new EmailService(pool);
  }

  /**
   * Get all email templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    const result = await this.pool.query(
      'SELECT * FROM email_templates ORDER BY type'
    );
    res.json(result.rows);
  }

  /**
   * Get template by type
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    const result = await this.pool.query(
      'SELECT * FROM email_templates WHERE type = $1',
      [type]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(result.rows[0]);
  }

  /**
   * Update email template
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    const { subject, html_body, is_active } = req.body;
    const userId = (req as any).user?.id;
    
    const result = await this.pool.query(
      `UPDATE email_templates 
       SET subject = $1, html_body = $2, is_active = $3, 
           updated_by = $4, updated_at = NOW()
       WHERE type = $5
       RETURNING *`,
      [subject, html_body, is_active, userId, type]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(result.rows[0]);
  }

  /**
   * Send test email
   */
  async sendTestEmail(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    const { recipientEmail } = req.body;
    
    const result = await this.emailService.sendEmail({
      templateType: type,
      recipientEmail: recipientEmail || 'test@example.com',
      variables: {
        order_number: 'SF-TEST-12345',
        customer_name: 'Test User',
        order_total: '$199.99'
      }
    });
    
    res.json(result);
  }
}
```

---

### Routes: `server/src/routes/admin/email-templates.ts`

```typescript
import { Router } from 'express';
import { AdminEmailController } from '../../controllers/adminEmailController';
import { authenticateAdmin } from '../../middleware/auth';
import { Pool } from 'pg';

export function createEmailTemplateRoutes(pool: Pool): Router {
  const router = Router();
  const controller = new AdminEmailController(pool);

  router.get('/email-templates', authenticateAdmin, controller.getTemplates.bind(controller));
  router.get('/email-templates/:type', authenticateAdmin, controller.getTemplate.bind(controller));
  router.put('/email-templates/:type', authenticateAdmin, controller.updateTemplate.bind(controller));
  router.post('/email-templates/:type/test', authenticateAdmin, controller.sendTestEmail.bind(controller));

  return router;
}
```

---

### Register in `server/src/index.ts`

```typescript
import { createEmailTemplateRoutes } from './routes/admin/email-templates';

// Add email template routes
app.use('/api/admin', createEmailTemplateRoutes(pool));
```

---

## ✅ Success Criteria

- [x] All CRUD operations work
- [x] Authentication enforced (admin only)
- [x] Test email endpoint works
- [x] Can update templates via API
- [x] API returns correct JSON

---

## 🧪 Testing

Test endpoints:

```bash
# Get all templates (requires auth)
curl -X GET http://localhost:3001/api/admin/email-templates \
  -H "Cookie: session=..."

# Get single template
curl -X GET http://localhost:3001/api/admin/email-templates/new_order_admin \
  -H "Cookie: session=..."

# Update template
curl -X PUT http://localhost:3001/api/admin/email-templates/new_order_admin \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"subject": "New Subject", "html_body": "<p>New body</p>", "is_active": true}'

# Send test email
curl -X POST http://localhost:3001/api/admin/email-templates/new_order_admin/test \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"recipientEmail": "test@example.com"}'
```

---

**Next Phase**: [Phase 3: Admin UI](./PHASE_3_ADMIN_UI.md)

