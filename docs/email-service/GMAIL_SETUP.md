# Gmail SMTP Setup Guide

**Quick guide for setting up Gmail SMTP with port 465**

---

## 🔐 Step 1: Get Gmail App Password

1. Go to [Google Account](https://myaccount.google.com/)
2. Click **Security** in the left menu
3. Enable **2-Step Verification** (if not already enabled)
4. Click **2-Step Verification**
5. Scroll down and click **App passwords**
6. Select **Mail** as app type
7. Select **Other (Custom name)** as device
8. Enter "SimFab Email Service"
9. Click **Generate**
10. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

---

## ⚙️ Step 2: Configure `.env` File

Add to your `.env` file:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=contact.esaconsult@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Your 16-character app password

# Optional: Email settings
EMAIL_TEST_MODE=false           # Set false to send real emails
EMAIL_FROM_EMAIL=contact.esaconsult@gmail.com
EMAIL_FROM_NAME=SimFab
```

**Important**: 
- Remove spaces from app password if present: `xxxxxxxxxxxxxxxx`
- Don't use your regular Gmail password
- Use the App Password from Step 1

---

## ✅ Step 3: Verify

### Check Server Logs

After restarting server, you should see:
```
📧 Email service initialized for production
   SMTP: smtp.gmail.com:465
   From: SimFab <contact.esaconsult@gmail.com>
```

If you see "TEST MODE" instead, check:
- `SMTP_PASS` is set correctly
- `EMAIL_TEST_MODE=false` (if you want production mode)

---

## 🧪 Test Email

1. Go to Admin Dashboard → Emails tab
2. Select any template
3. Enter your email address
4. Click "Send Test"
5. Check your inbox!

---

## ⚠️ Troubleshooting

### "Invalid login"
- Make sure you're using **App Password**, not regular password
- Remove spaces from app password
- Verify 2-Step Verification is enabled

### "Connection timeout"
- Check firewall/network allows port 465
- Gmail requires port 465 (SSL) or 587 (TLS)
- Port 465 is configured correctly

### "Authentication failed"
- Double-check `SMTP_USER` and `SMTP_PASS`
- Make sure App Password was generated correctly
- Wait a few minutes after generating new app password

---

## 🔒 Security Notes

- ✅ App Password is safer than regular password
- ✅ Can revoke App Password anytime from Google Account
- ✅ `.env` file should never be committed to git
- ✅ Each app gets its own password

---

**Your Gmail SMTP is ready!** 🎉


