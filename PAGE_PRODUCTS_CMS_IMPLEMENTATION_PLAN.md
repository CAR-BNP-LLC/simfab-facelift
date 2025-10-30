# Page Products CMS Implementation Plan

**Goal**: Create an admin dashboard tab for managing featured products and categories displayed on specific pages, replacing hardcoded product arrays.

---

## 📋 Current Situation Analysis

### Pages with Hardcoded Product Cards

#### 1. **Sim Racing Page** (`/sim-racing`)
- **File**: `src/pages/SimRacing.tsx`
- **Section**: "SIM RACING BASE MODELS"
- **Data**: `baseModels` array (2 products)
- **Products**:
  - GEN3 Modular Racing Sim Cockpit ($399)
  - DD Modular Racing Sim Cockpit ($598)

#### 2. **Flight Sim Page** (`/flight-sim`)
- **File**: `src/pages/FlightSim.tsx`
- **Section**: "FLIGHT SIM BASE MODELS"
- **Data**: `baseModels` array (4 products)
- **Products**:
  - DCS Flight Sim Modular Cockpit ($599)
  - MSFS Flight Sim Modular Cockpit ($599)
  - Hybrid Flight Sim Modular Cockpit ($499)
  - Rotorcraft Flight Sim Modular Cockpit (from $589)

#### 3. **Monitor Stands Page** (`/monitor-stands`)
- **File**: `src/pages/MonitorStands.tsx`
- **Sections**: 
  - "MONITORS & TV STANDS" - `products` array (3 products)
  - "Monitor Stand Add-Ons" - `addOns` array (6 products)
- **Products**:
  - Single Monitor Mount Stand ($219)
  - Triple Monitor Mount Stand ($599)
  - Overhead or Sub-mount Monitor Mount Bracket Kit ($129)
- **Add-ons**:
  - VESA Bracket Kit For Single Monitor 7 ($69.00)
  - Triple Monitor Stand Long Swing Arm ($89.99)
  - Monitor & TV Stands Height Adjustment ($69.00 – $129.00)
  - TV Mount System Bracket Kit ($59.00)
  - Monitor Mount System Vesa Adapter ($69.00)
  - Front Surround Speaker Tray Kit Monitor ($79.99)

### Homepage Components with Hardcoded Products

#### 4. **Homepage - Sim Racing Section**
- **File**: `src/components/SimRacingSection.tsx`
- **Section**: "Sim Racing Base Models"
- **Data**: `racingModels` array (2 products)

#### 5. **Homepage - Flight Sim Section**
- **File**: `src/components/FlightSimSection.tsx`
- **Section**: "Flight Sim Base Models"
- **Data**: `baseModels` array (4 products)

#### 6. **Homepage - Monitor Stands Section**
- **File**: `src/components/MonitorStandsSection.tsx`
- **Section**: "Monitor Stand Models"
- **Data**: `monitorModels` array (3 products)

---

## 🎯 Solution: Page Products CMS

### Overview
Create an admin dashboard tab that allows admins to:
1. View all pages that display products/categories
2. Manage which products are featured on each page
3. Control product display order
4. Assign products to specific page sections
5. Use categories as an alternative to individual product selection

---

## 🏗️ Database Schema

### New Table: `page_products`
```sql
CREATE TABLE page_products (
  id SERIAL PRIMARY KEY,
  page_route VARCHAR(255) NOT NULL,           -- e.g., '/sim-racing', '/flight-sim'
  page_section VARCHAR(255) NOT NULL,        -- e.g., 'base-models', 'add-ons', 'main-products'
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  category_id VARCHAR(255) NULL,             -- Alternative to product_id (if using category)
  display_order INTEGER DEFAULT 0,            -- Order of products on page
  is_active BOOLEAN DEFAULT true,              -- Enable/disable this assignment
  display_type VARCHAR(50) DEFAULT 'products', -- 'products' or 'category'
  max_items INTEGER DEFAULT 10,                -- Max products to show (for category mode)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure each product appears only once per section
  UNIQUE(page_route, page_section, product_id),
  
  -- Index for queries
  INDEX idx_page_products_route_section (page_route, page_section),
  INDEX idx_page_products_product (product_id)
);
```

### Alternative: Use Product Meta Fields
If we want to avoid a new table, we can extend the existing `products` table:
```sql
ALTER TABLE products ADD COLUMN page_contexts JSONB DEFAULT '[]'::jsonb;
-- Structure: [{"page_route": "/sim-racing", "section": "base-models", "order": 1}, ...]
```

**Recommendation**: Use the `page_products` table for better query performance and cleaner data structure.

---

## 🔌 Backend API Endpoints

### Page Products Management

#### 1. List All Page Configurations
```
GET /api/admin/page-products
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "pageRoute": "/sim-racing",
      "pageName": "Sim Racing",
      "sections": [
        {
          "sectionKey": "base-models",
          "sectionName": "Base Models",
          "products": [...],
          "displayType": "products",
          "productCount": 2
        }
      ]
    },
    ...
  ]
}
```

#### 2. Get Products for Specific Page/Section
```
GET /api/admin/page-products/:pageRoute/:section
```
Response:
```json
{
  "success": true,
  "data": {
    "pageRoute": "/sim-racing",
    "section": "base-models",
    "products": [
      {
        "productId": 123,
        "product": {...full product object...},
        "displayOrder": 1,
        "isActive": true
      },
      ...
    ]
  }
}
```

#### 3. Add Product to Page Section
```
POST /api/admin/page-products
```
Body:
```json
{
  "pageRoute": "/sim-racing",
  "pageSection": "base-models",
  "productId": 123,
  "displayOrder": 1
}
```

#### 4. Update Product Order/Status
```
PUT /api/admin/page-products/:id
```
Body:
```json
{
  "displayOrder": 2,
  "isActive": true
}
```

#### 5. Remove Product from Page Section
```
DELETE /api/admin/page-products/:id
```

#### 6. Bulk Update Page Products
```
PUT /api/admin/page-products/bulk
```
Body:
```json
{
  "pageRoute": "/sim-racing",
  "pageSection": "base-models",
  "products": [
    {"productId": 123, "displayOrder": 1, "isActive": true},
    {"productId": 456, "displayOrder": 2, "isActive": true}
  ]
}
```

#### 7. Set Category for Page Section (Alternative)
```
POST /api/admin/page-products/category
```
Body:
```json
{
  "pageRoute": "/sim-racing",
  "pageSection": "base-models",
  "categoryId": "sim-racing-base",
  "maxItems": 10,
  "displayType": "category"
}
```

#### 8. Get Public Page Products (for frontend)
```
GET /api/page-products/:pageRoute/:section
```
Response:
```json
{
  "success": true,
  "data": {
    "products": [...],  // Only active products, sorted by displayOrder
    "displayType": "products",
    "section": "base-models"
  }
}
```

---

## 🎨 Frontend: Admin Dashboard Tab

### Tab Structure
Add new tab in `src/pages/Admin.tsx`:
```typescript
<TabsTrigger value="page-products">
  <LayoutGrid className="h-4 w-4" />
  <span className="hidden sm:inline">Page Products</span>
</TabsTrigger>
```

### Page Products Tab UI

#### Layout
```
┌─────────────────────────────────────────────────────────┐
│ Page Products CMS                    [+ Add Assignment] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Filter: [All Pages ▼]  Search: [________]             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📄 /sim-racing (Sim Racing)                      │  │
│  │    └─ Base Models (2 products)     [Edit] [View] │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 📄 /flight-sim (Flight Sim)                      │  │
│  │    └─ Base Models (4 products)     [Edit] [View] │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 📄 /monitor-stands (Monitor Stands)              │  │
│  │    ├─ Main Products (3 products)   [Edit] [View] │  │
│  │    └─ Add-Ons (6 products)        [Edit] [View] │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 🏠 Homepage Sections                             │  │
│  │    ├─ Sim Racing Section (2 products)  [Edit]   │  │
│  │    ├─ Flight Sim Section (4 products)  [Edit]   │  │
│  │    └─ Monitor Stands Section (3 products)[Edit] │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Edit Dialog/Modal
When clicking "Edit" for a page section:

```
┌──────────────────────────────────────────────────────┐
│ Edit Products: /sim-racing > Base Models    [X]      │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Display Type: ○ Products  ○ Category                 │
│                                                       │
│ ┌─ Products Mode ──────────────────────────────────┐ │
│ │                                                 │ │
│ │ Current Products:                              │ │
│ │ ┌─────────────────────────────────────────┐   │ │
│ │ │ [⋮⋮] 1. GEN3 Modular Racing Sim        │ │   │
│ │ │      Cockpit - $399               [X]  │ │   │
│ │ ├─────────────────────────────────────────┤   │ │
│ │ │ [⋮⋮] 2. DD Modular Racing Sim          │ │   │
│ │ │      Cockpit - $598               [X]  │ │   │
│ │ └─────────────────────────────────────────┘   │ │
│ │                                                 │ │
│ │ [+ Add Product]                                │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─ Product Search ─────────────────────────────────┐ │
│ │ Search: [________________]                       │ │
│ │                                                   │ │
│ │ ☐ Product A - $299        [Add to List]        │ │
│ │ ☐ Product B - $399        [Add to List]        │ │
│ │ ☐ Product C - $599        [Add to List]        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│            [Cancel]              [Save Changes]       │
└──────────────────────────────────────────────────────┘
```

### Key Features
1. **Drag & Drop Reordering** - Use react-beautiful-dnd or dnd-kit
2. **Product Search/Select** - Search products by name/SKU
3. **Quick Preview** - See how products will look on frontend
4. **Category Mode** - Option to show products from a category instead
5. **Bulk Operations** - Select multiple products at once
6. **View Live Page** - Button to view the actual page

---

## 📝 Implementation Steps

### Phase 1: Database & Backend (Week 1)

#### Step 1.1: Database Migration
- [ ] Create `page_products` table
- [ ] Add indexes
- [ ] Create migration file: `server/src/migrations/XXXX_create_page_products.sql`

#### Step 1.2: Backend Types
- [ ] Create `server/src/types/pageProducts.ts`:
  ```typescript
  export interface PageProduct {
    id: number;
    page_route: string;
    page_section: string;
    product_id: number;
    category_id: string | null;
    display_order: number;
    is_active: boolean;
    display_type: 'products' | 'category';
    max_items: number;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface CreatePageProductDto {
    page_route: string;
    page_section: string;
    product_id: number;
    display_order?: number;
  }
  
  export interface BulkPageProductDto {
    page_route: string;
    page_section: string;
    products: Array<{
      product_id: number;
      display_order: number;
      is_active: boolean;
    }>;
  }
  ```

#### Step 1.3: Backend Service
- [ ] Create `server/src/services/PageProductService.ts`
  - Methods:
    - `getAllPagesConfig()`
    - `getPageSectionProducts(pageRoute, section)`
    - `addProductToSection(dto)`
    - `updatePageProduct(id, updates)`
    - `removeProductFromSection(id)`
    - `bulkUpdatePageProducts(dto)`
    - `setCategoryForSection(pageRoute, section, categoryId, maxItems)`

#### Step 1.4: Backend Controller
- [ ] Create `server/src/controllers/pageProductController.ts`
- [ ] Implement all CRUD endpoints
- [ ] Add validation middleware
- [ ] Add RBAC checks (admin only)

#### Step 1.5: Backend Routes
- [ ] Create `server/src/routes/pageProducts.ts`
- [ ] Register routes in main router
- [ ] Add to admin routes group

#### Step 1.6: Seed Initial Data
- [ ] Create migration to populate `page_products` with current hardcoded products
- [ ] Map existing products to page sections

### Phase 2: Frontend API Service (Week 1)

#### Step 2.1: API Service
- [ ] Add to `src/services/api.ts`:
  ```typescript
  export const pageProductsAPI = {
    getAll: () => apiRequest(...),
    getByPage: (pageRoute: string, section: string) => ...,
    add: (dto: CreatePageProductDto) => ...,
    update: (id: number, updates: Partial<PageProduct>) => ...,
    remove: (id: number) => ...,
    bulkUpdate: (dto: BulkPageProductDto) => ...,
    setCategory: (pageRoute: string, section: string, categoryId: string, maxItems: number) => ...
  };
  ```

### Phase 3: Admin UI Component (Week 2)

#### Step 3.1: Main Tab Component
- [ ] Create `src/components/admin/PageProductsTab.tsx`
- [ ] List all pages and sections
- [ ] Show product counts
- [ ] Edit/View buttons

#### Step 3.2: Edit Dialog Component
- [ ] Create `src/components/admin/PageProductEditDialog.tsx`
- [ ] Drag & drop ordering
- [ ] Product search/add
- [ ] Category mode toggle
- [ ] Save/cancel actions

#### Step 3.3: Product Selector Component
- [ ] Create `src/components/admin/ProductSelector.tsx`
- [ ] Search functionality
- [ ] Product cards with add button
- [ ] Already-added indicator

#### Step 3.4: Integrate into Admin
- [ ] Add tab to Admin.tsx
- [ ] Wire up all functionality
- [ ] Add loading/error states

### Phase 4: Frontend Migration (Week 2)

#### Step 4.1: Create Public API Hook
- [ ] Create `src/hooks/usePageProducts.tsx`
  ```typescript
  export function usePageProducts(pageRoute: string, section: string) {
    // Fetch products for page/section
    // Return products array, loading, error
  }
  ```

#### Step 4.2: Update SimRacing.tsx
- [ ] Remove hardcoded `baseModels` array
- [ ] Use `usePageProducts('/sim-racing', 'base-models')`
- [ ] Handle loading/error states
- [ ] Test thoroughly

#### Step 4.3: Update FlightSim.tsx
- [ ] Remove hardcoded `baseModels` array
- [ ] Use `usePageProducts('/flight-sim', 'base-models')`
- [ ] Test thoroughly

#### Step 4.4: Update MonitorStands.tsx
- [ ] Remove hardcoded `products` and `addOns` arrays
- [ ] Use `usePageProducts('/monitor-stands', 'main-products')`
- [ ] Use `usePageProducts('/monitor-stands', 'add-ons')`
- [ ] Test thoroughly

#### Step 4.5: Update Homepage Components
- [ ] Update `SimRacingSection.tsx`
- [ ] Update `FlightSimSection.tsx`
- [ ] Update `MonitorStandsSection.tsx`
- [ ] Use special route identifier: `/homepage` or `homepage-sim-racing-section`

### Phase 5: Testing & Polish (Week 3)

#### Step 5.1: Testing
- [ ] Test all CRUD operations
- [ ] Test drag & drop ordering
- [ ] Test product search
- [ ] Test category mode
- [ ] Test public API endpoints
- [ ] Test frontend pages load correctly

#### Step 5.2: Error Handling
- [ ] Add proper error messages
- [ ] Add loading states
- [ ] Add empty states
- [ ] Handle edge cases (no products, deleted products, etc.)

#### Step 5.3: Documentation
- [ ] Update admin docs
- [ ] Create user guide for managing page products
- [ ] Document API endpoints

---

## 📊 Page/Section Mapping

### Defined Page Routes and Sections

| Page Route | Page Name | Sections | Description |
|------------|-----------|----------|-------------|
| `/sim-racing` | Sim Racing | `base-models` | Base model products shown on Sim Racing page |
| `/flight-sim` | Flight Sim | `base-models` | Base model products shown on Flight Sim page |
| `/monitor-stands` | Monitor Stands | `main-products`, `add-ons` | Main products and add-ons sections |
| `/homepage` or `homepage` | Homepage | `sim-racing-section`, `flight-sim-section`, `monitor-stands-section` | Homepage component sections |
| `/shop` | Shop | N/A | Uses existing category/product filtering |

---

## 🔍 Frontend Component Updates

### Before (Hardcoded)
```typescript
// SimRacing.tsx
const baseModels = [
  { name: "GEN3 Modular...", price: "$399", ... }
];
```

### After (Dynamic)
```typescript
// SimRacing.tsx
import { usePageProducts } from '@/hooks/usePageProducts';

const SimRacing = () => {
  const { products: baseModels, loading, error } = usePageProducts('/sim-racing', 'base-models');
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  
  // Rest of component uses baseModels from API
};
```

---

## 🎯 Success Metrics

1. ✅ All hardcoded product arrays removed from pages
2. ✅ Admin can manage products for each page without code changes
3. ✅ Products update immediately on frontend after admin changes
4. ✅ Drag & drop reordering works smoothly
5. ✅ Category mode works as alternative to manual selection
6. ✅ Zero downtime during migration
7. ✅ All existing products preserved and mapped correctly

---

## 🚀 Future Enhancements

1. **Page Templates** - Save page configurations as templates
2. **Scheduled Changes** - Schedule product updates for specific dates
3. **A/B Testing** - Test different product configurations
4. **Analytics** - Track which page products perform best
5. **Preview Mode** - Preview how pages will look before publishing
6. **Bulk Import/Export** - Import page products via CSV/JSON
7. **Multi-language Support** - Different products for different languages
8. **Conditional Display** - Show products based on user segments

---

## 📝 Notes

- **Backward Compatibility**: Initially, if no page products are configured, fall back to empty array (or keep hardcoded as fallback during migration)
- **Performance**: Cache page products on frontend, invalidate on admin updates
- **Security**: All admin endpoints require admin authentication
- **Validation**: Ensure product exists before adding to page
- **Soft Delete**: When product is deleted, mark page_product as inactive instead of deleting

---

## ✅ Acceptance Criteria

1. Admin can view all pages with product sections
2. Admin can add/remove products from any page section
3. Admin can reorder products via drag & drop
4. Admin can set a category instead of individual products
5. Frontend pages load products from API instead of hardcoded data
6. Changes to page products reflect immediately on frontend
7. Ordering is preserved correctly
8. Inactive products don't appear on frontend
9. Admin interface is intuitive and easy to use
10. All existing functionality continues to work

---

## 📅 Estimated Timeline

- **Week 1**: Backend implementation (API, database, services)
- **Week 2**: Frontend admin UI and frontend migration
- **Week 3**: Testing, polish, documentation

**Total: 3 weeks**

---

## 🔗 Related Files

### Backend
- `server/src/migrations/XXXX_create_page_products.sql`
- `server/src/types/pageProducts.ts`
- `server/src/services/PageProductService.ts`
- `server/src/controllers/pageProductController.ts`
- `server/src/routes/pageProducts.ts`

### Frontend
- `src/components/admin/PageProductsTab.tsx`
- `src/components/admin/PageProductEditDialog.tsx`
- `src/components/admin/ProductSelector.tsx`
- `src/hooks/usePageProducts.tsx`
- `src/services/api.ts` (add pageProductsAPI)
- `src/pages/SimRacing.tsx` (update)
- `src/pages/FlightSim.tsx` (update)
- `src/pages/MonitorStands.tsx` (update)
- `src/components/SimRacingSection.tsx` (update)
- `src/components/FlightSimSection.tsx` (update)
- `src/components/MonitorStandsSection.tsx` (update)

---

**End of Implementation Plan**


