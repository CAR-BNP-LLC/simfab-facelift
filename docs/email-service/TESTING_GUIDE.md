# Email Service - Testing Guide

**Quick guide to test all email service features**

---

## 🧪 What Can Be Tested

### ✅ Currently Testable (Test Mode)

1. **Admin Dashboard - Email Templates Tab**
   - View all 13 templates
   - Edit template content
   - Send test emails

2. **Order Flow**
   - Create an order → Admin email logged
   - Change order status → Customer email logged

3. **Authentication**
   - Password reset → Email logged
   - New account → Welcome email logged

4. **API Endpoints**
   - List templates
   - Get template by type
   - Update template
   - Send test email
   - View email logs

### ⚠️ Not Yet Testable

- Actual email delivery (requires production SMTP setup)
- Real email templates in inbox
- HTML rendering in email clients

---

## 🎯 Testing Instructions

### Test 1: Access Admin Email Templates

**Steps**:
1. Open browser: `http://localhost:5173`
2. Login as admin (or go to `/admin` directly)
3. Click "Emails" tab
4. Should see list of 13 templates

**Expected**: List of email templates displayed

---

### Test 2: View Template Details

**Steps**:
1. Click on any template (e.g., "New Order (Admin)")
2. Should see template editor on right

**Expected**:
- Subject line shown
- HTML body shown
- Variables displayed as `{{variable}}`
- Active/Inactive status

---

### Test 3: Edit and Save Template

**Steps**:
1. Select a template
2. Edit the subject line
3. Edit the HTML body
4. Click "Save Template"

**Expected**:
- Success message shown
- Changes saved to database
- Template updated

---

### Test 4: Send Test Email

**Steps**:
1. Select any template
2. Enter your email in "Test Email" field
3. Click "Send Test"
4. Check browser console or server logs

**Expected**:
```
📧 [TEST MODE] Email would be sent:
{
  to: 'your-email@example.com',
  subject: '...',
  template: 'new_order_admin',
  variables: { ... }
}
```

---

### Test 5: Order Creation Email

**Steps**:
1. Go to website shop
2. Add items to cart
3. Complete checkout and create order
4. Check server logs

**Expected in Server Logs**:
```
📧 [TEST MODE] Email would be sent: New Order #SF-...
```

**Check Logs**:
```bash
docker-compose logs --tail=100 -f server | grep "Email"
```

---

### Test 6: Order Status Change Email

**Steps**:
1. Go to `/admin`
2. Click "Orders" tab
3. Find any order
4. Change status to "processing"
5. Check server logs

**Expected in Logs**:
```
📧 Email would be sent: Your Order #SF-... is Being Processed
```

---

### Test 7: Password Reset Email

**Steps**:
1. Go to login page
2. Click "Forgot Password"
3. Enter your email
4. Request reset
5. Check server logs

**Expected in Logs**:
```
📧 Email would be sent: Reset Your Password
Password reset code: xxx
```

---

### Test 8: New Account Welcome Email

**Steps**:
1. Register a new account
2. Complete registration
3. Check server logs

**Expected in Logs**:
```
📧 Email would be sent: Welcome to SimFab!
```

---

### Test 9: API Endpoints

**List Templates**:
```bash
curl http://localhost:3001/api/admin/email-templates
```

**Get Single Template**:
```bash
curl http://localhost:3001/api/admin/email-templates/new_order_admin
```

**Send Test Email via API**:
```bash
curl -X POST http://localhost:3001/api/admin/email-templates/new_order_admin/test \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail": "test@example.com"}'
```

---

### Test 10: Email Logs

**Steps**:
1. After sending test emails
2. Run:
```bash
docker-compose exec postgres psql -U postgres -d simfab_dev -c \
  "SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5;"
```

**Expected**: List of recent email attempts

---

## 📊 Checklist

Run through these to verify everything:

- [ ] Can access Admin → Emails tab
- [ ] Can see all 13 templates
- [ ] Can select a template
- [ ] Can edit subject and HTML
- [ ] Can save template changes
- [ ] Can send test email
- [ ] Test email shows in console logs
- [ ] Order creation triggers admin email
- [ ] Status change triggers customer email
- [ ] Password reset sends email
- [ ] New account sends welcome email
- [ ] API endpoints respond
- [ ] Email logs are created

---

## 🐛 Troubleshooting

### Templates Not Loading?
- Check database migration ran
- Check server is running
- Verify admin authentication

### Test Email Not Sending?
- Check console for errors
- Verify email service initialized
- Check server logs

### No Logs Showing?
- Verify test mode is enabled
- Check server running
- Try: `docker-compose logs server`

---

## 🎯 Success Indicators

✅ **Everything Working If**:
- Can view templates in admin dashboard
- Can edit and save templates
- Test emails logged to console
- Order events trigger emails
- Auth events trigger emails
- API endpoints respond
- No TypeScript errors
- Server running smoothly

---

## 🚀 Next Steps

Once testing is complete:

1. **Enhance Templates**: Customize HTML to be more professional
2. **Add More Templates**: Create new email types as needed
3. **Production Setup**: Configure SMTP for real emails
4. **Monitor Logs**: Track email delivery in production
5. **Analytics**: Add email open/click tracking (future)

---

**Happy Testing!** 🧪

