# Production Email Setup

**Enable real email sending (disable test mode)**

---

## 🚀 Quick Setup

### 1. Add to `.env` file:

```env
# Gmail SMTP (Production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=contact.esaconsult@gmail.com
SMTP_PASS=your-gmail-app-password

# Disable Test Mode
EMAIL_TEST_MODE=false

# From Settings
EMAIL_FROM_EMAIL=contact.esaconsult@gmail.com
EMAIL_FROM_NAME=SimFab
```

### 2. Get Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate password for "Mail"
5. Copy 16-character password
6. Paste in `SMTP_PASS=` (remove spaces)

### 3. Restart Server

```bash
docker-compose restart server
```

---

## ✅ Verification

### Check Server Logs

After restart, you should see:
```
📧 Email service initialized for production
   SMTP: smtp.gmail.com:465
   From: SimFab <contact.esaconsult@gmail.com>
```

**Not this:**
```
📧 Email service initialized in TEST MODE  ❌
```

---

## 🧪 Test Real Email

1. Go to Admin Dashboard → Emails tab
2. Select any template
3. Enter your real email address
4. Click "Send Test"
5. **Check your inbox** - email should arrive!

---

## 📧 What Happens Now

- ✅ **Real emails sent** via Gmail SMTP
- ✅ **Order creation** → Admin gets email at info@simfab.com
- ✅ **Order status changes** → Customer gets email
- ✅ **Password reset** → User gets email with reset link
- ✅ **New accounts** → Welcome email sent

All emails logged in `email_logs` table for tracking.

---

## 🔒 Security Checklist

- [x] SMTP credentials in `.env` only
- [x] `.env` file in `.gitignore`
- [x] Using App Password (not regular password)
- [x] Test mode disabled
- [x] Email service enabled

---

**You're ready to send real emails!** 🎉


