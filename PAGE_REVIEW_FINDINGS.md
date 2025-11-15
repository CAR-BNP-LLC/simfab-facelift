# Page Review Findings - Missing Products & Incomplete Features

## 🔴 CRITICAL ISSUES - Missing Pages/Routes

### 1. **RACING & FLIGHT SEATS** - No Dedicated Page
- **Status**: ❌ Missing
- **Location**: Navbar item exists but no route/page
- **Issue**: 
  - Navbar has "RACING & FLIGHT SEATS" in main navigation
  - Mobile menu shows it but button has no onClick handler
  - Desktop navigation has no click handler
  - No route defined in `App.tsx`
  - No page component exists
- **Products**: Category exists in database (`racing-flight-seats`)
- **Fix Needed**: Create `/racing-flight-seats` route and page component

### 2. **ACCESSORIES** - No Dedicated Page
- **Status**: ❌ Missing
- **Location**: Navbar item exists but no route/page
- **Issue**:
  - Navbar has "ACCESSORIES" in main navigation
  - Mobile menu shows it but button has no onClick handler
  - Desktop navigation has no click handler
  - No route defined in `App.tsx`
  - No page component exists
- **Products**: Category exists in database (`accessories`)
- **Fix Needed**: Create `/accessories` route and page component

### 3. **REFURBISHED** - No Dedicated Page
- **Status**: ❌ Missing
- **Location**: Navbar item exists but no route/page
- **Issue**:
  - Navbar has "REFURBISHED" in main navigation
  - Mobile menu shows "REFURBISHED STOCK" but button has no onClick handler
  - Desktop navigation has no click handler
  - No route defined in `App.tsx`
  - No page component exists
- **Products**: Category exists in database (`refurbished`)
- **Fix Needed**: Create `/refurbished` route and page component

---

## 🟡 INCOMPLETE FEATURES

### 4. **Home Page Product Images - Placeholder Boxes**
- **Status**: ⚠️ Incomplete
- **Location**: 
  - `src/components/FlightSimSection.tsx` (lines 83-84)
  - `src/components/SimRacingSection.tsx` (lines 83-84)
  - `src/components/MonitorStandsSection.tsx` (lines 80-81)
- **Issue**: Products are fetched from API but display gray placeholder boxes instead of actual product images
- **Code**: 
  ```tsx
  <div className="h-48 bg-secondary/50 rounded-lg mb-4 flex items-center justify-center">
    <div className="w-16 h-16 bg-muted-foreground/20 rounded"></div>
  </div>
  ```
- **Fix Needed**: Replace placeholder with actual product images from API

### 5. **Services Page - Placeholder Images**
- **Status**: ⚠️ Incomplete
- **Location**: `src/pages/Services.tsx` (line 64-65)
- **Issue**: Service cards show placeholder text "Service Image" instead of actual images
- **Code**:
  ```tsx
  <div className="aspect-square bg-muted rounded-lg mb-4 sm:mb-6 flex items-center justify-center">
    <span className="text-muted-foreground text-sm">Service Image</span>
  </div>
  ```
- **Fix Needed**: Add actual service images or remove placeholder

### 6. **Home Page "See More" Buttons - No Navigation**
- **Status**: ⚠️ Incomplete
- **Location**: 
  - `src/components/FlightSimSection.tsx` (line 51-53)
  - `src/components/SimRacingSection.tsx` (line 51-53)
  - `src/components/MonitorStandsSection.tsx` (line 48-50)
- **Issue**: "see more" buttons don't navigate anywhere
- **Fix Needed**: Add navigation to respective pages (`/flight-sim`, `/sim-racing`, `/monitor-stands`)

### 7. **Trainer Station "Buy Now" Button - No Link**
- **Status**: ⚠️ Incomplete
- **Location**: 
  - `src/components/TrainerStation.tsx` (line 40-42)
  - `src/pages/FlightSim.tsx` (line 496-498)
- **Issue**: "buy now" button doesn't link to product page
- **Fix Needed**: Add product slug/link or route to trainer station product

### 8. **Mobile Menu Sub-Items - No Click Handlers**
- **Status**: ⚠️ Incomplete
- **Location**: `src/components/Header.tsx`
- **Issues**:
  - FLIGHT SIM → "ADD-ONS" button (line 674) - no onClick
  - FLIGHT SIM → "ACCESSORIES" button (line 677) - no onClick
  - SIM RACING → "CONVERSION KITS" button (line 704) - no onClick
  - SIM RACING → "INDIVIDUAL PARTS" button (line 707) - no onClick
  - MONITOR STANDS → "SINGLE MONITOR STAND" button (line 750) - no onClick
  - MONITOR STANDS → "TRIPLE MONITOR STAND" button (line 753) - no onClick
- **Fix Needed**: Add navigation to appropriate shop filters or category pages

### 9. **Mega Menu Category Buttons - No Links**
- **Status**: ⚠️ Incomplete
- **Location**: `src/components/Header.tsx` (lines 506-514)
- **Issue**: Category buttons in mega menu (e.g., "FLIGHT SIM ADD-ON MODULES", "FLIGHT SIM ACCESSORIES") don't navigate anywhere
- **Fix Needed**: Add links to shop with category filters

### 10. **Flight Sim Page - "See Add-ons" Button**
- **Status**: ⚠️ Incomplete
- **Location**: `src/pages/FlightSim.tsx` (line 555-557)
- **Issue**: "see add-ons" button doesn't navigate anywhere
- **Fix Needed**: Add link to shop filtered by flight sim add-ons

### 11. **Sim Racing Page - "Conversion Kits" Button**
- **Status**: ⚠️ Incomplete
- **Location**: `src/pages/SimRacing.tsx` (line 322-324)
- **Issue**: "conversion kits" button doesn't navigate anywhere
- **Fix Needed**: Add link to shop filtered by conversion kits

---

## 🟢 MINOR ISSUES

### 12. **Product Categories Component - No Links**
- **Status**: ℹ️ Minor
- **Location**: `src/components/ProductCategories.tsx`
- **Issue**: Category cards are clickable (cursor-pointer) but don't navigate anywhere
- **Fix Needed**: Add navigation to respective category pages

### 13. **Services Page - "Contact Us" Button**
- **Status**: ℹ️ Minor
- **Location**: `src/pages/Services.tsx` (line 94)
- **Issue**: "Contact Us for Custom Work" button doesn't have action
- **Fix Needed**: Add mailto link or contact form navigation

### 14. **Services Page - "BUY NOW" Buttons**
- **Status**: ℹ️ Minor
- **Location**: `src/pages/Services.tsx` (line 73)
- **Issue**: Service "BUY NOW" buttons don't link to actual products
- **Fix Needed**: Create service products in database or link to contact form

---

## 📊 SUMMARY

### Missing Pages: 3
1. RACING & FLIGHT SEATS (`/racing-flight-seats`)
2. ACCESSORIES (`/accessories`)
3. REFURBISHED (`/refurbished`)

### Incomplete Features: 11
1. Home page product images (placeholders)
2. Services page images (placeholders)
3. Home page "see more" buttons (no navigation)
4. Trainer Station "buy now" (no link)
5. Mobile menu sub-items (no click handlers) - 6 items
6. Mega menu category buttons (no links)
7. Flight Sim "see add-ons" button (no link)
8. Sim Racing "conversion kits" button (no link)

### Minor Issues: 3
1. Product categories component (no links)
2. Services "Contact Us" button (no action)
3. Services "BUY NOW" buttons (no product links)

---

## 🎯 PRIORITY FIXES

### High Priority
1. ✅ Create missing page routes and components for RACING & FLIGHT SEATS, ACCESSORIES, REFURBISHED
2. ✅ Fix home page product images (replace placeholders with actual images)
3. ✅ Add navigation to all "see more" and category buttons

### Medium Priority
4. ✅ Fix mobile menu sub-item navigation
5. ✅ Fix mega menu category button links
6. ✅ Add product links to Trainer Station buttons

### Low Priority
7. ✅ Fix Services page placeholders and buttons
8. ✅ Add links to Product Categories component

