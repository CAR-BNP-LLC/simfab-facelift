# Email Service - Quick Reference

**For developers implementing the email service**

---

## 🚀 Quick Start

1. **Read**: [README.md](./README.md) - Overview
2. **Follow**: [Phase 1](./PHASE_1_DATABASE_SERVICE.md) - Database setup
3. **Build**: Continue through phases sequentially
4. **Test**: Use [Phase 6](./PHASE_6_TESTING_DOCUMENTATION.md) for testing

---

## 📋 Implementation Order (Recommended)

```
Phase 1: Database & Service (2-3 hrs)
  ↓
Phase 2: API Endpoints (1-2 hrs)
  ↓
Phase 4: Integration (2-3 hrs)  ← MVP reached!
  ↓
Phase 3: Admin UI (2-3 hrs)
  ↓
Phase 5: Email Templates (2-3 hrs)
  ↓
Phase 6: Testing (1-2 hrs)
```

**Total Time: 10-16 hours**

---

## 🎯 MVP vs Full Implementation

### MVP (8-10 hours)
Complete **Phases 1, 2, 4**
- Emails automatically sent on events
- No admin customization yet

### Full System (12-16 hours)
Complete **All Phases**
- Full admin dashboard
- Beautiful templates
- Template management

---

## 📧 Email Types Summary

| Type | Trigger | Recipient |
|------|---------|-----------|
| new_order_admin | Order created | info@simfab.com |
| order_processing | Status → processing | Customer |
| order_completed | Status → completed | Customer |
| order_cancelled_customer | Status → cancelled | Customer |
| order_failed_customer | Payment fails | Customer |
| reset_password | Password reset requested | Customer |
| new_account | Account created | Customer |

**Full list in**: [README.md](./README.md)

---

## 🔧 Common Commands

```bash
# Run migration
npm run migrate

# Test email sending (in console)
node -e "console.log('Email test')"

# View email logs
psql -d simfab -c "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;"

# Update email settings
psql -d simfab -c "UPDATE email_settings SET test_mode = false;"
```

---

## 🐛 Troubleshooting

### Emails not sending?

1. Check test mode: `SELECT * FROM email_settings;`
2. Check logs: `SELECT * FROM email_logs WHERE status = 'failed';`
3. Check template: `SELECT * FROM email_templates WHERE type = 'template_name';`

### Template not found?

```sql
-- List all templates
SELECT type, name FROM email_templates;

-- Check if template is active
SELECT * FROM email_templates WHERE type = 'template_type';
```

### Admin can't edit?

1. Check authentication
2. Check admin permissions
3. Check API endpoint: `GET /api/admin/email-templates`

---

## 📊 Database Schema

Key tables:
- `email_templates` - All email templates
- `email_logs` - Audit trail
- `email_settings` - SMTP configuration

**Details in**: [Phase 1](./PHASE_1_DATABASE_SERVICE.md)

---

## 🔗 Integration Points

Main integration files:
- `orderController.ts` - Order emails
- `paymentController.ts` - Payment emails
- `authController.ts` - Account emails
- `adminOrderController.ts` - Status change emails

**Details in**: [Phase 4](./PHASE_4_INTEGRATION.md)

---

## 📞 Need Help?

1. Check the phase-specific documentation
2. Review the implementation checklist
3. Test individual components
4. Check email logs for errors

---

**Last Updated**: 2024

