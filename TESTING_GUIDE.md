# 🧪 Frontend-Backend Integration Testing Guide

## Quick Start - Test in 5 Minutes

### Step 1: Set Up Environment Variables

Create a `.env` file in the **project root**:

```bash
# Copy the example
cp .env.example .env
```

The file should contain:
```env
VITE_API_URL=http://localhost:3001
```

---

### Step 2: Start Backend Server

```bash
# Terminal 1 - Backend
cd server

# Make sure database is set up (first time only)
npm run migrate:up

# Start backend
npm run dev
```

✅ Backend should start at: `http://localhost:3001`

---

### Step 3: Start Frontend Server

```bash
# Terminal 2 - Frontend (from project root)
npm run dev
```

✅ Frontend should start at: `http://localhost:5173`

---

## 🎯 Test Scenarios

### Test 1: User Registration ✅

1. **Open**: http://localhost:5173/register

2. **Fill the form**:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john@example.com`
   - Phone: `+1-555-0123` (optional)
   - Password: `Test123!`
   - Confirm Password: `Test123!`
   - ✓ Subscribe to newsletter (optional)

3. **Click**: "Create Account"

4. **Expected Result**:
   - ✅ Green success alert appears
   - ✅ "Account created successfully!" message
   - ✅ Auto-redirects to home page after 2 seconds
   - ✅ Success toast notification

5. **Verify in Backend**:
   ```bash
   # Check backend terminal logs - should show:
   # POST /api/auth/register 201
   ```

6. **Verify in Database**:
   ```bash
   psql simfab_dev
   SELECT id, email, first_name, last_name FROM users;
   ```

---

### Test 2: User Login ✅

1. **Open**: http://localhost:5173/login

2. **Fill the form**:
   - Email: `john@example.com`
   - Password: `Test123!`
   - ✓ Remember me (optional)

3. **Click**: "Sign In"

4. **Expected Result**:
   - ✅ Success toast: "Welcome back! Logged in as john@example.com"
   - ✅ Redirects to home page
   - ✅ User is now authenticated

5. **Verify in Browser Console**:
   ```javascript
   // Open DevTools (F12) -> Console
   // Type:
   localStorage
   
   // Should see session data
   ```

6. **Verify Cookie**:
   - DevTools -> Application -> Cookies
   - Should see `connect.sid` cookie for localhost:3001

---

### Test 3: Failed Login ❌

1. **Open**: http://localhost:5173/login

2. **Fill with wrong password**:
   - Email: `john@example.com`
   - Password: `WrongPassword123!`

3. **Click**: "Sign In"

4. **Expected Result**:
   - ✅ Red error alert appears
   - ✅ "Invalid credentials" or similar error message
   - ✅ Stays on login page

---

### Test 4: Password Validation ❌

1. **Open**: http://localhost:5173/register

2. **Try weak password**:
   - Fill all fields
   - Password: `weak` (too short, no uppercase, no numbers)

3. **Click**: "Create Account"

4. **Expected Result**:
   - ✅ Error: "Password must be at least 8 characters long with uppercase, lowercase, and numbers"

---

### Test 5: Backend Connection Check ✅

**Test backend is running**:

```bash
# Method 1: Health Check
curl http://localhost:3001/health

# Expected: {"success":true,"message":"Server is running",...}

# Method 2: API Info
curl http://localhost:3001/

# Expected: API endpoint documentation
```

**Test from Frontend**:

```javascript
// Browser Console (F12)
fetch('http://localhost:3001/health', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)

// Expected: {success: true, message: "Server is running", ...}
```

---

### Test 6: CORS & Credentials ✅

**Verify CORS is working**:

1. Open browser DevTools (F12) -> Network tab
2. Try to login
3. Check the `/api/auth/login` request:
   - ✅ Status should be `200 OK` (if credentials correct)
   - ✅ Request Headers should include `Cookie` (if logged in before)
   - ✅ Response Headers should include `Set-Cookie`
   - ✅ No CORS errors in console

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to fetch" Error

**Symptom**: Network error when trying to login/register

**Solutions**:
1. ✅ Verify backend is running: `curl http://localhost:3001/health`
2. ✅ Check `.env` has correct URL: `VITE_API_URL=http://localhost:3001`
3. ✅ Restart frontend server after changing `.env`
4. ✅ Check backend terminal for errors

### Issue 2: CORS Error

**Symptom**: "CORS policy" error in browser console

**Solutions**:
1. ✅ Backend already has CORS enabled for all origins (development)
2. ✅ Verify `credentials: 'include'` is in API requests (already set)
3. ✅ Check backend logs for CORS errors

### Issue 3: "Unauthorized" / Session Not Persisting

**Symptom**: Login works but user is lost on refresh

**Solutions**:
1. ✅ Check browser cookies - should have `connect.sid` cookie
2. ✅ Verify cookie domain matches (both localhost)
3. ✅ Check session store: `SELECT * FROM user_sessions;` in PostgreSQL
4. ✅ Make sure `credentials: 'include'` is in all API calls

### Issue 4: Validation Errors

**Symptom**: Backend rejects registration with validation error

**Solutions**:
1. ✅ Password must be 8+ chars with uppercase, lowercase, and numbers
2. ✅ Email must be valid format
3. ✅ firstName and lastName are required
4. ✅ confirmPassword must match password

### Issue 5: Database Connection Failed

**Symptom**: Backend shows "Database connection failed"

**Solutions**:
1. ✅ Verify PostgreSQL is running: `pg_isready`
2. ✅ Check `server/.env` has correct `DATABASE_URL`
3. ✅ Run migrations: `cd server && npm run migrate:up`
4. ✅ Test connection: `cd server && npm run db:test`

---

## 📊 Verification Checklist

Use this checklist to verify everything is working:

### Backend
- [ ] PostgreSQL is running
- [ ] Database `simfab_dev` exists
- [ ] Migrations completed (35 tables created)
- [ ] Backend server running on port 3001
- [ ] Health endpoint works: `curl http://localhost:3001/health`
- [ ] API info endpoint works: `curl http://localhost:3001/`

### Frontend
- [ ] `.env` file exists with `VITE_API_URL=http://localhost:3001`
- [ ] Frontend server running on port 5173
- [ ] No console errors on load
- [ ] Can access `/register` page
- [ ] Can access `/login` page

### Integration
- [ ] Can register a new user
- [ ] Registration shows success message
- [ ] Can login with created user
- [ ] Login shows success toast
- [ ] Login redirects to home
- [ ] Cookie is set after login
- [ ] User data persists on page refresh
- [ ] Can logout successfully
- [ ] Logout clears session

### Database
- [ ] User is created in `users` table
- [ ] Session is created in `user_sessions` table
- [ ] Password is hashed (not plain text)

---

## 🔍 Debug Mode

### View All Network Requests

1. Open DevTools (F12) -> Network tab
2. Filter by "Fetch/XHR"
3. Try login/register
4. Inspect each request:
   - Request URL
   - Request Method
   - Request Headers (should include Cookie if logged in)
   - Request Body
   - Response Status
   - Response Headers (should include Set-Cookie for login)
   - Response Body

### View Console Logs

Backend logs show:
```
POST /api/auth/register 201  - Registration successful
POST /api/auth/login 200     - Login successful
POST /api/auth/logout 200    - Logout successful
GET  /api/auth/profile 200   - Profile fetch successful
```

### View Database State

```bash
# Connect to database
psql simfab_dev

# Check users
SELECT id, email, first_name, last_name, role, email_verified, created_at 
FROM users;

# Check sessions
SELECT sess, expire FROM user_sessions;

# Exit
\q
```

---

## ✅ Success Indicators

You'll know integration is working when:

1. **Registration**: 
   - ✅ Success message appears
   - ✅ User created in database
   - ✅ Backend logs show `POST /api/auth/register 201`

2. **Login**:
   - ✅ Success toast appears
   - ✅ Redirects to home page
   - ✅ Cookie is set in browser
   - ✅ Backend logs show `POST /api/auth/login 200`

3. **Session Persistence**:
   - ✅ Refresh page and still logged in
   - ✅ Cookie persists
   - ✅ Session exists in database

---

## 📝 Test Data

Use this data for testing:

### Valid User
```
First Name: John
Last Name: Doe
Email: john@example.com
Phone: +1-555-0123
Password: Test123!
```

### Another Valid User
```
First Name: Jane
Last Name: Smith
Email: jane@example.com
Phone: +1-555-9999
Password: Pass123!
```

### Invalid Passwords (should fail)
```
weak          - Too short
password123   - No uppercase
PASSWORD123   - No lowercase
Password      - No numbers
Pass1         - Too short
```

---

## 🎯 Next Integration Steps

After confirming auth works:

1. **Update Header** - Show user name and logout button
2. **Connect Shop** - Load products from backend
3. **Add Protected Routes** - Require login for certain pages
4. **Implement Cart** - Once backend cart API is ready
5. **Implement Orders** - Once backend order API is ready

---

**Ready to test! 🚀**

Start both servers and follow the test scenarios above.

