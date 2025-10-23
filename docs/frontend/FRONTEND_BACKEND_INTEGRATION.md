# Frontend-Backend Integration Guide

## 🎯 Overview

This document describes how to connect the SimFab frontend (React/Vite) with the Express backend (Node.js/PostgreSQL).

---

## ✅ What's Been Integrated

### 1. API Service Layer (`src/services/api.ts`)
Created a complete API client with:
- ✅ **Authentication API** - register, login, logout, profile, password reset
- ✅ **Products API** - get all, get by ID, create, upload CSV
- ✅ **Health API** - server health check
- ✅ Error handling and formatting
- ✅ TypeScript types for all endpoints

### 2. Authentication Context (`src/contexts/AuthContext.tsx`)
- ✅ Global auth state management
- ✅ Login/logout/register functions
- ✅ User profile storage
- ✅ Automatic auth check on app load
- ✅ Toast notifications for auth actions

### 3. Updated Pages
- ✅ **Login Page** - Now connects to `/api/auth/login`
  - Added "Remember Me" checkbox
  - Real error handling from backend
  - Redirects to home on success
  
- ✅ **Register Page** - Now connects to `/api/auth/register`
  - Added First Name, Last Name, Phone fields
  - Matches backend validation (8+ chars, uppercase, lowercase, numbers)
  - Real error handling from backend
  - Auto-redirect after successful registration

### 4. App Wrapper
- ✅ **AuthProvider** wraps entire app
- ✅ Auth context available to all components

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3001
```

**Important**: The frontend runs on `http://localhost:5173` and backend on `http://localhost:3001` by default.

---

## 🚀 How to Test

### Step 1: Start the Backend Server

```bash
cd server

# Make sure PostgreSQL is running and migrations are complete
npm run migrate:up

# Start the backend server
npm run dev
```

Backend should be running on: `http://localhost:3001`

### Step 2: Start the Frontend

```bash
# From project root
npm run dev
```

Frontend should be running on: `http://localhost:5173`

### Step 3: Test Authentication

#### Test Registration
1. Go to `http://localhost:5173/register`
2. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Phone: +1-555-0123 (optional)
   - Password: Test123! (must have uppercase, lowercase, numbers)
   - Confirm Password: Test123!
   - Check "Subscribe to newsletter" (optional)
3. Click "Create Account"
4. Should see success message and redirect to home
5. Check backend logs to confirm registration

#### Test Login
1. Go to `http://localhost:5173/login`
2. Enter credentials:
   - Email: john@example.com
   - Password: Test123!
   - Check "Remember me" (optional)
3. Click "Sign In"
4. Should see success toast and redirect to home
5. User info should be stored in auth context

#### Check Auth State
Open browser console and type:
```javascript
// This should show the logged-in user
localStorage
```

---

## 📡 Available API Endpoints (Frontend)

### Authentication

```typescript
import { authAPI } from '@/services/api';

// Register
await authAPI.register({
  email: 'user@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-0123',
  subscribeNewsletter: true
});

// Login
await authAPI.login({
  email: 'user@example.com',
  password: 'Password123!',
  rememberMe: true
});

// Get Profile
const profile = await authAPI.getProfile();

// Logout
await authAPI.logout();

// Password Reset
await authAPI.requestPasswordReset('user@example.com');
await authAPI.resetPassword(token, newPassword, confirmPassword);

// Newsletter
await authAPI.subscribeNewsletter('user@example.com');
await authAPI.unsubscribeNewsletter('user@example.com');
```

### Products

```typescript
import { productsAPI } from '@/services/api';

// Get all products
const products = await productsAPI.getAll();

// Get product by ID
const product = await productsAPI.getById(1);

// Create product
const newProduct = await productsAPI.create({
  sku: 'PROD-001',
  name: 'Product Name',
  regular_price: 99.99
});

// Upload CSV
const file = document.querySelector('input[type="file"]').files[0];
await productsAPI.uploadCSV(file);
```

### Using Auth Context (in Components)

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome {user?.firstName}!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
}
```

---

## 🔍 Testing Checklist

- [ ] Backend server is running (`http://localhost:3001`)
- [ ] Frontend server is running (`http://localhost:5173`)
- [ ] Database migrations are complete
- [ ] `.env` file has correct `VITE_API_URL`
- [ ] Can register a new user
- [ ] Registration shows success message
- [ ] Can login with registered credentials
- [ ] Login shows success toast
- [ ] Login redirects to home page
- [ ] Can see user data in browser console
- [ ] Can logout successfully
- [ ] Logout clears user data

---

## 🐛 Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
1. Check that backend is running
2. Verify `credentials: 'include'` is in API requests (already set)
3. Check backend CORS configuration in `server/src/index.ts`

### Network Errors
If you see "Failed to fetch" or network errors:
1. Verify backend server is running: `curl http://localhost:3001/health`
2. Check `VITE_API_URL` in `.env`
3. Make sure you're using `http://` not `https://` for local development

### Authentication Not Persisting
If login works but user is lost on refresh:
1. Check browser cookies - there should be a `connect.sid` cookie
2. Verify session store is working in PostgreSQL: `SELECT * FROM user_sessions;`
3. Check `credentials: 'include'` is set in API calls

### Backend Validation Errors
If you get validation errors:
- **Password**: Must be 8+ characters with uppercase, lowercase, and numbers
- **Email**: Must be valid email format
- **Required fields**: firstName, lastName, email, password, confirmPassword

---

## 📝 Next Steps to Complete Integration

### 1. Update Header Component
Add user menu with login/logout:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <header>
      {isAuthenticated ? (
        <div>
          <span>Hello, {user?.firstName}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </header>
  );
}
```

### 2. Update Shop Page
Connect to products API:

```typescript
import { useEffect, useState } from 'react';
import { productsAPI, Product } from '@/services/api';

function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const result = await productsAPI.getAll();
        setProducts(result.data);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Render products...
}
```

### 3. Add Protected Routes
For pages that require authentication:

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

// Use in routes:
<Route path="/profile" element={
  <ProtectedRoute>
    <ProfilePage />
  </ProtectedRoute>
} />
```

### 4. Add Backend Connection Indicator
Show if backend is online/offline:

```typescript
import { useState, useEffect } from 'react';
import { checkBackendConnection } from '@/services/api';

function BackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const isOnline = await checkBackendConnection();
      setOnline(isOnline);
    }
    check();
    const interval = setInterval(check, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (online === null) return null;

  return (
    <div>
      Backend: {online ? '✅ Online' : '❌ Offline'}
    </div>
  );
}
```

---

## 🎯 Current Status

### ✅ Completed
- API service layer
- Authentication context
- Login page integration
- Register page integration
- Error handling
- Toast notifications
- Session management

### 🔜 Pending
- Products display in Shop page
- User menu in Header
- Protected routes
- Cart functionality (when backend is ready)
- Orders functionality (when backend is ready)
- Profile page

---

## 📚 API Documentation

Full backend API documentation:
- `server/PHASE_1_COMPLETE.md` - Complete endpoint documentation
- `API_QUICK_REFERENCE.md` - Quick endpoint reference
- `BACKEND_IMPLEMENTATION_SPEC.md` - Detailed API specs

---

**Ready to test! Start both servers and try registering/logging in.** 🚀

