# Email Service Setup Guide

**Secure SMTP configuration via environment variables**

---

## 🔒 Security

**Important**: Email credentials are stored in `.env` file only, never exposed in:
- ❌ Admin dashboard
- ❌ Database (for production)
- ❌ API responses
- ✅ Environment variables only

---

## ⚙️ Configuration

### Step 1: Update `.env` File

Create or edit `.env` file in project root:

```bash
# Email Service Configuration
EMAIL_USE_ENV=true
EMAIL_TEST_MODE=true              # Set to false for production
EMAIL_ENABLED=true

# SMTP Server Settings
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password

# Email From Settings
EMAIL_FROM_EMAIL=noreply@simfab.com
EMAIL_FROM_NAME=SimFab

# Optional: Test Mode Redirect
EMAIL_TEST_EMAIL=test@example.com

# Rate Limiting
EMAIL_DAILY_LIMIT=1000
EMAIL_RATE_LIMIT=10
```

---

## 📧 Gmail Setup

### Option 1: Gmail App Password (Recommended)

1. Go to Google Account Settings
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate new app password for "Mail"
5. Use that password in `EMAIL_SMTP_PASSWORD`

```
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App password
EMAIL_FROM_EMAIL=your-email@gmail.com
```

### Option 2: Gmail SMTP (Less Secure - Not Recommended)

- Use OAuth2 or App Password instead
- Regular passwords may not work

---

## 🌐 SendGrid Setup

```
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASSWORD=SG.your-sendgrid-api-key
EMAIL_FROM_EMAIL=info@simfab.com
```

---

## ☁️ AWS SES Setup

```
EMAIL_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-smtp-username
EMAIL_SMTP_PASSWORD=your-smtp-password
EMAIL_FROM_EMAIL=info@simfab.com
```

---

## 🧪 Test Mode vs Production

### Test Mode (Default)
```env
EMAIL_TEST_MODE=true
```
- Emails logged to console
- No actual emails sent
- Safe for development
- No SMTP credentials needed

### Production Mode
```env
EMAIL_TEST_MODE=false
EMAIL_SMTP_HOST=smtp.your-provider.com
EMAIL_SMTP_USER=your-email@domain.com
EMAIL_SMTP_PASSWORD=your-password
EMAIL_FROM_EMAIL=info@simfab.com
```
- Real emails sent via SMTP
- Requires SMTP credentials

---

## ✅ Verification

### Check if Email Service is Running

Look for these in server logs:
```
📧 Email service initialized in TEST MODE
```
or
```
📧 Email service initialized for production
   SMTP: smtp.gmail.com:587
   From: SimFab <info@simfab.com>
```

### Test Email Sending

1. Go to Admin Dashboard → Emails tab
2. Select a template
3. Enter test email address
4. Click "Send Test"
5. Check server logs or inbox

---

## 🔐 Security Best Practices

1. ✅ **Never commit `.env` file** to git
2. ✅ **Use App Passwords** (Gmail) instead of regular passwords
3. ✅ **Rotate passwords** regularly
4. ✅ **Use environment variables** only (not database)
5. ✅ **Restrict SMTP access** to production servers
6. ✅ **Monitor email logs** for suspicious activity

---

## 🚨 Troubleshooting

### "SMTP credentials missing"
- Check `.env` file exists
- Verify `EMAIL_SMTP_HOST`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD` are set
- Restart server after updating `.env`

### "Authentication failed"
- Gmail: Make sure you're using App Password, not regular password
- Check SMTP port (587 for TLS, 465 for SSL)
- Verify credentials are correct

### "Emails not sending"
- Check `EMAIL_ENABLED=true`
- Verify `EMAIL_TEST_MODE=false` for production
- Check server logs for errors
- Test SMTP connection manually

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_USE_ENV` | No | `true` | Use env vars instead of database |
| `EMAIL_TEST_MODE` | No | `true` | Enable test mode (log only) |
| `EMAIL_ENABLED` | No | `true` | Enable/disable email service |
| `EMAIL_SMTP_HOST` | Yes* | - | SMTP server hostname |
| `EMAIL_SMTP_PORT` | No | `587` | SMTP port (587 or 465) |
| `EMAIL_SMTP_USER` | Yes* | - | SMTP username |
| `EMAIL_SMTP_PASSWORD` | Yes* | - | SMTP password |
| `EMAIL_FROM_EMAIL` | No | `noreply@simfab.com` | From email address |
| `EMAIL_FROM_NAME` | No | `SimFab` | From name |
| `EMAIL_TEST_EMAIL` | No | - | Test mode redirect address |
| `EMAIL_DAILY_LIMIT` | No | `1000` | Max emails per day |
| `EMAIL_RATE_LIMIT` | No | `10` | Max emails per minute |

*Required for production mode only

---

**Email service ready! Configure `.env` file and restart server.**


