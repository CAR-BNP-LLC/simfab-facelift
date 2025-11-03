# Region-Specific Settings Implementation Plan

## Overview
This document outlines the implementation plan for adding region-specific settings to the admin dashboard. The system supports two separate companies (US and EU) operating under the SimFab brand, each with their own contact information and configuration.

**Key Requirements:**
- Separate settings for US and EU regions
- Admin email address and phone number per region
- Dynamic display of contact information based on user's selected region
- Settings management in admin dashboard

---

## Phase 1: Database Schema

### 1.1 Create `region_settings` Table

```sql
-- Region-specific settings table
CREATE TABLE IF NOT EXISTS region_settings (
  id SERIAL PRIMARY KEY,
  region VARCHAR(2) NOT NULL CHECK (region IN ('us', 'eu')),
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string' CHECK (
    setting_type IN ('string', 'number', 'boolean', 'json')
  ),
  description TEXT,
  is_public BOOLEAN DEFAULT true, -- Can be accessed by frontend
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region, setting_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_region_settings_region ON region_settings(region);
CREATE INDEX IF NOT EXISTS idx_region_settings_key ON region_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_region_settings_public ON region_settings(is_public) 
  WHERE is_public = true;

-- Trigger for updated_at
CREATE TRIGGER update_region_settings_updated_at
    BEFORE UPDATE ON region_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Default Settings Data

Insert default settings for both regions:

```sql
-- US Region Default Settings
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('us', 'admin_email', 'info@simfab.com', 'string', 'Administrative contact email', true),
  ('us', 'phone_number', '1-888-299-2746', 'string', 'Toll-free phone number', true),
  ('us', 'phone_display', 'Toll free for USA & Canada: 1-888-299-2746', 'string', 'Display text for phone', true),
  ('us', 'company_name', 'SimFab US', 'string', 'Company name for US region', true),
  ('us', 'address', '123 Business St, Miami, FL 33101', 'string', 'Business address', false),
  ('us', 'currency', 'USD', 'string', 'Default currency', true),
  ('us', 'tax_rate', '0.08', 'number', 'Tax rate (8%)', false),
  ('us', 'free_shipping_threshold', '500', 'number', 'Free shipping threshold', true),
  ('us', 'site_name', 'SimFab', 'string', 'Website name', true),

-- EU Region Default Settings
INSERT INTO region_settings (region, setting_key, setting_value, setting_type, description, is_public) VALUES
  ('eu', 'admin_email', 'info@simfab.eu', 'string', 'Administrative contact email', true),
  ('eu', 'phone_number', '+49-XXX-XXXXXXX', 'string', 'Phone number', true),
  ('eu', 'phone_display', 'EU Support: +49-XXX-XXXXXXX', 'string', 'Display text for phone', true),
  ('eu', 'company_name', 'SimFab EU', 'string', 'Company name for EU region', true),
  ('eu', 'address', 'Business Address, City, Country', 'string', 'Business address', false),
  ('eu', 'currency', 'EUR', 'string', 'Default currency', true),
  ('eu', 'tax_rate', '0.19', 'number', 'Tax rate (19% VAT)', false),
  ('eu', 'free_shipping_threshold', '500', 'number', 'Free shipping threshold', true),
  ('eu', 'site_name', 'SimFab', 'string', 'Website name', true)
ON CONFLICT (region, setting_key) DO NOTHING;
```

### 1.3 Migration File

Create migration file: `server/src/migrations/sql/041_create_region_settings.sql`

---

## Phase 2: Backend Implementation

### 2.1 Create RegionSettingsService

**File:** `server/src/services/RegionSettingsService.ts`

**Responsibilities:**
- Fetch settings by region
- Fetch public settings by region (for frontend)
- Update settings
- Validate setting types
- Cache settings for performance

**Key Methods:**
```typescript
class RegionSettingsService {
  async getSettings(region: 'us' | 'eu', publicOnly?: boolean): Promise<Record<string, any>>
  async getSetting(region: 'us' | 'eu', key: string): Promise<any>
  async updateSetting(region: 'us' | 'eu', key: string, value: any, adminId: number): Promise<void>
  async updateSettings(region: 'us' | 'eu', settings: Record<string, any>, adminId: number): Promise<void>
  async getPublicSettings(region: 'us' | 'eu'): Promise<Record<string, any>>
}
```

### 2.2 Create Admin Controller

**File:** `server/src/controllers/adminSettingsController.ts`

**Endpoints:**

```
GET    /api/admin/settings/regions/:region
       - Get all settings for a region (admin only)

GET    /api/admin/settings/regions/:region/public
       - Get public settings for a region (no auth required, for frontend)

PUT    /api/admin/settings/regions/:region
       - Update settings for a region (requires rbac:manage)
       Body: { settings: { key: value, ... } }

PUT    /api/admin/settings/regions/:region/:key
       - Update single setting (requires rbac:manage)
       Body: { value: any, type?: string }
```

### 2.3 Add Routes

**File:** `server/src/routes/adminRoutes.ts`

Add routes:
```typescript
router.get('/settings/regions/:region', adminAuth, adminSettingsController.getRegionSettings);
router.get('/settings/regions/:region/public', adminSettingsController.getPublicRegionSettings);
router.put('/settings/regions/:region', adminAuth, requireAuthority('rbac:manage'), adminSettingsController.updateRegionSettings);
router.put('/settings/regions/:region/:key', adminAuth, requireAuthority('rbac:manage'), adminSettingsController.updateRegionSetting);
```

### 2.4 Add Public API Endpoint

**File:** `server/src/routes/publicRoutes.ts` (or create if needed)

```typescript
GET /api/settings/:region/contact
    - Returns contact info (email, phone) for a region
    Response: { email: string, phone: string, phone_display: string }
```

---

## Phase 3: Frontend - Settings Context & Hooks

### 3.1 Create RegionSettingsContext

**File:** `src/contexts/RegionSettingsContext.tsx`

**Purpose:** Provide region-specific settings to all components

**Features:**
- Fetch settings based on current region
- Cache settings
- Auto-refresh when region changes
- Provide loading states

**Usage:**
```typescript
const { settings, loading, contactInfo } = useRegionSettings();
// contactInfo contains: { email, phone, phoneDisplay }
```

### 3.2 Create API Service

**File:** `src/services/api.ts` (add to existing)

```typescript
// Get public settings for region
export const regionSettingsAPI = {
  getPublicSettings: (region: 'us' | 'eu') => 
    apiRequest<{ settings: Record<string, any> }>(`/api/admin/settings/regions/${region}/public`),
    
  getContactInfo: (region: 'us' | 'eu') =>
    apiRequest<{ email: string; phone: string; phone_display: string }>(
      `/api/settings/${region}/contact`
    ),
};
```

---

## Phase 4: Admin Dashboard UI

### 4.1 Create SettingsTab Component

**File:** `src/components/admin/SettingsTab.tsx`

**Features:**
- Tab interface with "US Settings" and "EU Settings" tabs
- Form to edit settings for each region
- Save/cancel functionality
- Validation
- Success/error messages

**UI Structure:**
```
Settings Tab
├── Tabs (US | EU)
└── Settings Form
    ├── Contact Information Section
    │   ├── Admin Email
    │   ├── Phone Number
    │   └── Phone Display Text
    ├── Business Information Section
    │   ├── Company Name
    │   ├── Address
    │   └── Site Name
    ├── E-commerce Settings
    │   ├── Currency
    │   ├── Tax Rate
    │   └── Free Shipping Threshold
    └── Save Button
```

### 4.2 Update Admin.tsx

- Add SettingsTab to Settings TabsContent
- Ensure proper permissions (rbac:manage)
- Handle tab switching

---

## Phase 5: Update Components to Use Region Settings

### 5.1 Header Component

**File:** `src/components/Header.tsx`

**Changes:**
- Replace hardcoded phone number with dynamic setting
- Replace hardcoded email link with dynamic setting
- Use `useRegionSettings()` hook

**Current hardcoded:**
```tsx
<a href="tel:1-888-299-2746">1-888-299-2746</a>
<a href="mailto:info@simfab.com">info@simfab.com</a>
```

**New:**
```tsx
const { contactInfo } = useRegionSettings();
<a href={`tel:${contactInfo.phone}`}>{contactInfo.phoneDisplay}</a>
<a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
```

### 5.2 Footer Component

**File:** `src/components/Footer.tsx`

**Changes:**
- Replace hardcoded contact info
- Use `useRegionSettings()` hook

**Current hardcoded:**
```tsx
<p>Email: info@simfab.com</p>
<p>Toll free for USA and Canada:</p>
<p>1-888-299-2746</p>
```

**New:**
```tsx
const { contactInfo } = useRegionSettings();
<p>Email: <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a></p>
<p>{contactInfo.phoneDisplay}</p>
```

### 5.3 Checkout Page

**File:** `src/pages/Checkout.tsx`

**Changes:**
- Display region-specific contact info if customer support is needed

### 5.4 Contact Pages

**Find all contact pages/components and update:**
- Contact form pre-filled email
- Support email display
- Phone number display

---

## Phase 6: Testing

### 6.1 Unit Tests

- RegionSettingsService methods
- Admin controller endpoints
- RegionSettingsContext

### 6.2 Integration Tests

- Settings update flow
- Region switching updates contact info
- Public API endpoints

### 6.3 Manual Testing Checklist

- [ ] Admin can view US settings
- [ ] Admin can view EU settings
- [ ] Admin can update US settings
- [ ] Admin can update EU settings
- [ ] Changes persist after refresh
- [ ] Switching region updates contact info in Header
- [ ] Switching region updates contact info in Footer
- [ ] Contact info correct for US region
- [ ] Contact info correct for EU region
- [ ] Phone number links work
- [ ] Email links work
- [ ] Mobile menu shows correct contact info
- [ ] Settings require proper permissions

---

## Phase 7: Additional Settings (Future Enhancements)

### 7.1 Additional Settings to Consider

**Business Information:**
- Business hours
- Timezone
- Support hours

**Legal:**
- Terms & Conditions URL (per region)
- Privacy Policy URL (per region)
- Cookie Policy URL (per region)

**Shipping:**
- Shipping policy text
- Return policy text
- Shipping zones

**Social Media:**
- Facebook URL (could be different per region)
- Instagram URL
- YouTube URL

**Email Configuration:**
- Order confirmation email (from address per region)
- Support email addresses (different departments)

---

## Implementation Steps

### Step 1: Database Migration
1. Create migration file
2. Run migration
3. Verify table creation
4. Verify default data insertion

### Step 2: Backend Service
1. Create RegionSettingsService
2. Implement all methods
3. Add error handling
4. Add logging

### Step 3: Backend API
1. Create adminSettingsController
2. Add routes
3. Add public contact info endpoint
4. Test endpoints with Postman/curl

### Step 4: Frontend Context
1. Create RegionSettingsContext
2. Add API integration
3. Add error handling
4. Test context provider

### Step 5: Admin UI
1. Create SettingsTab component
2. Build form UI
3. Add form validation
4. Add save functionality
5. Integrate into Admin.tsx

### Step 6: Update Components
1. Update Header.tsx
2. Update Footer.tsx
3. Update other contact pages
4. Test region switching

### Step 7: Testing & Polish
1. Run all tests
2. Manual testing
3. Fix any issues
4. Documentation

---

## Security Considerations

1. **Permissions:** Settings updates require `rbac:manage` authority
2. **Validation:** Validate all input types and values
3. **Sanitization:** Sanitize setting values before storing
4. **Audit Trail:** Log all settings changes (use admin_activity_logs table)
5. **Public Settings:** Only expose `is_public=true` settings to frontend

---

## Performance Considerations

1. **Caching:** Cache settings in RegionSettingsService (in-memory cache, 5-minute TTL)
2. **Frontend Caching:** Cache settings in RegionSettingsContext (until region changes)
3. **Lazy Loading:** Only fetch settings when needed
4. **Database Indexes:** Ensure indexes on `region` and `setting_key`

---

## Database Migration File Location

Create: `server/src/migrations/sql/041_create_region_settings.sql`

---

## Files to Create/Modify

### New Files:
1. `server/src/migrations/sql/041_create_region_settings.sql`
2. `server/src/services/RegionSettingsService.ts`
3. `server/src/controllers/adminSettingsController.ts`
4. `src/contexts/RegionSettingsContext.tsx`
5. `src/components/admin/SettingsTab.tsx`

### Modified Files:
1. `server/src/routes/adminRoutes.ts` - Add settings routes
2. `server/src/routes/publicRoutes.ts` or create new - Add public contact endpoint
3. `src/pages/Admin.tsx` - Integrate SettingsTab
4. `src/components/Header.tsx` - Use dynamic settings
5. `src/components/Footer.tsx` - Use dynamic settings
6. `src/services/api.ts` - Add region settings API calls

---

## Example Usage in Components

```tsx
import { useRegionSettings } from '@/contexts/RegionSettingsContext';

const MyComponent = () => {
  const { contactInfo, loading } = useRegionSettings();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
      <a href={`tel:${contactInfo.phone}`}>{contactInfo.phoneDisplay}</a>
    </div>
  );
};
```

---

## Success Criteria

✅ Admin can manage separate settings for US and EU regions
✅ Contact information updates dynamically when region changes
✅ All contact information displays correctly throughout the website
✅ Settings persist after page refresh
✅ Settings are properly secured (RBAC)
✅ Settings are cached for performance
✅ Both Header and Footer show region-appropriate contact info
✅ Mobile menu shows correct contact info

---

## Notes

- Settings are region-specific, so US and EU can have completely different values
- Public settings (is_public=true) are accessible without authentication for frontend use
- Private settings (is_public=false) are only accessible via admin API with proper permissions
- Contact info (email, phone) should always be public
- Settings changes are logged in admin_activity_logs for audit trail

