# How to Use the Email Service

**Quick start guide for using the email service**

---

## 🎯 What You Can Test Right Now

### ✅ Ready to Test (Test Mode Active)

The email service is **fully functional** in test mode. You can test:

1. **Admin Dashboard Interface**
   - Access: `http://localhost:5173/admin`
   - Click "Emails" tab
   - View all 13 email templates
   - Edit templates
   - Send test emails

2. **Email Sending**
   - Automatic emails sent on events
   - Emails logged to console (not actually sent)
   - All variables populated correctly

3. **API Endpoints**
   - List templates: `GET /api/admin/email-templates`
   - Get template: `GET /api/admin/email-templates/new_order_admin`
   - Send test: `POST /api/admin/email-templates/new_order_admin/test`

---

## 🧪 Step-by-Step Testing

### Test 1: Admin Dashboard (5 min)

**Go to Admin Dashboard**:
```
1. Open: http://localhost:5173/admin
2. Click "Emails" tab (4th tab)
3. See list of 13 templates
4. Click any template to view details
```

**What you'll see**:
- List of 13 email templates on the left
- Template editor on the right
- Subject line and HTML body editable
- Variables like `{{order_number}}` visible

---

### Test 2: Send a Test Email (2 min)

**In Admin Dashboard**:
```
1. Select template (e.g., "New Order (Admin)")
2. Enter your email in "Test Email" field
3. Click "Send Test" button
4. Check browser console or server logs
```

**Expected output in logs**:
```
📧 [TEST MODE] Email would be sent:
{
  to: 'your-email@example.com',
  subject: 'New Order #{{order_number}}',
  template: 'new_order_admin',
  variables: { order_number: 'SF-TEST-12345', ... }
}
```

---

### Test 3: Create an Order (5 min)

**Create Order**:
```
1. Go to http://localhost:5173
2. Add items to cart
3. Complete checkout
4. Check server logs for admin email
```

**Watch logs**:
```bash
docker-compose logs --tail=50 -f server | grep "Email"
```

**What happens**:
- Admin email logged to console
- Contains order details
- Variables populated from order

---

### Test 4: Change Order Status (2 min)

**In Admin Dashboard**:
```
1. Click "Orders" tab
2. Find any order
3. Change status dropdown to "Processing"
4. Submit
5. Check logs for customer email
```

**Expected in logs**:
```
📧 Email would be sent: Your Order #SF-... is Being Processed
```

---

### Test 5: Password Reset (2 min)

**Request Reset**:
```
1. Go to login page
2. Click "Forgot Password"
3. Enter your email
4. Request reset
5. Check logs
```

**Expected in logs**:
```
📧 Email would be sent: Reset Your Password
Password reset code: xxx
```

---

### Test 6: Register New Account (2 min)

**Register**:
```
1. Register new account
2. Complete registration
3. Check logs for welcome email
```

**Expected in logs**:
```
📧 Email would be sent: Welcome to SimFab!
```

---

## 📊 Quick Verification Checklist

Run this to verify everything:
```bash
# Check templates
curl http://localhost:3001/api/admin/email-templates | jq .length

# Check server
curl http://localhost:3001/health

# Check database
docker-compose exec postgres psql -U postgres -d simfab_dev -c \
  "SELECT type, name FROM email_templates LIMIT 5;"
```

---

## 🎨 Customize Templates

**To make templates professional**:

1. Go to Admin → Emails
2. Select a template
3. Edit the HTML body
4. Use this structure:
```html
<h2>Title</h2>
<p>Message with {{variable}}</p>
<p>More content...</p>
```
5. Click "Save Template"
6. Test with "Send Test"

---

## 🚀 Production Setup (Later)

When ready for real emails:

### Option 1: Gmail SMTP
```sql
UPDATE email_settings SET
  test_mode = false,
  smtp_host = 'smtp.gmail.com',
  smtp_port = 587,
  smtp_user = 'your-email@gmail.com',
  smtp_password = 'your-app-password',
  smtp_from_email = 'info@simfab.com',
  smtp_from_name = 'SimFab';
```

### Option 2: SendGrid
```sql
UPDATE email_settings SET
  test_mode = false,
  smtp_host = 'smtp.sendgrid.net',
  smtp_port = 587,
  smtp_user = 'apikey',
  smtp_password = 'your-sendgrid-api-key';
```

---

## 📝 What's Working

✅ **Fully Working**:
- Admin email templates UI
- Template editing
- Test email sending
- Email logging
- Variable replacement
- Order event emails
- Auth event emails
- API endpoints
- Database integration

✅ **Test Mode**:
- All emails logged to console
- No actual emails sent
- Safe for development

---

## 🎯 Next Actions

**For You to Try**:
1. ✅ Open `/admin` → Emails tab
2. ✅ View templates
3. ✅ Edit a template
4. ✅ Send test email
5. ✅ Create an order (watch logs)
6. ✅ Change order status (watch logs)

**All email events will be logged to the server console!**

---

**Email Service Ready to Use!** 🎉

