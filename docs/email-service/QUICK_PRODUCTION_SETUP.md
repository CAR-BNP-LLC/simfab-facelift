# Quick Production Setup

**Enable real email sending in 3 steps**

---

## ✅ Step 1: Update `.env` File

Add these lines to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=contact.esaconsult@gmail.com
SMTP_PASS=your-gmail-app-password-here

EMAIL_TEST_MODE=false
EMAIL_FROM_EMAIL=contact.esaconsult@gmail.com
EMAIL_FROM_NAME=SimFab
```

**Important**: Replace `your-gmail-app-password-here` with your actual Gmail App Password.

---

## 🔑 Step 2: Get Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Click **2-Step Verification** → Enable it
3. Click **App passwords** (search if needed)
4. Select:
   - App: **Mail**
   - Device: **Other (Custom name)**
   - Name: `SimFab`
5. Click **Generate**
6. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
7. **Remove spaces** and paste in `.env` as `SMTP_PASS=xxxxxxxxxxxxxxxx`

---

## 🚀 Step 3: Restart Server

```bash
docker-compose restart server
```

---

## ✅ Verify It's Working

After restart, check server logs:
```bash
docker-compose logs server | grep "Email service"
```

**You should see:**
```
📧 Email service initialized for production
   SMTP: smtp.gmail.com:465
   From: SimFab <contact.esaconsult@gmail.com>
```

**Not this (test mode):**
```
📧 Email service initialized in TEST MODE  ❌
```

---

## 🧪 Test It

1. Go to Admin Dashboard → **Emails** tab
2. Select any template
3. Enter your email address
4. Click **"Send Test"**
5. **Check your inbox!** ✉️

---

## 📧 What Works Now

- ✅ **Order created** → Admin receives email
- ✅ **Order status changed** → Customer receives email  
- ✅ **Password reset** → User receives reset email
- ✅ **New account** → Welcome email sent
- ✅ **All emails** → Real emails via Gmail SMTP

---

**That's it! Real emails are now enabled.** 🎉


