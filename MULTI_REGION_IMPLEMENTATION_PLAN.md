# Multi-Region Product System Implementation Plan

## Overview
Implement dual-region support for simfab.com (US) and eu.simfab.com (EU) with shared admin dashboard, separate stock tracking per region, and unified product management for multi-region products.

## Architecture Decision

**Product Group System with Unified Editing**
- Each product has a `region` field ('us' or 'eu')
- Products can be linked via `product_group_id` (UUID) when available in both regions
- Stock, SKU, pricing, and variation stock are region-specific (stored per product)
- All other product data (name, description, images, variations structure, addons, etc.) can be synced
- Admin dashboard provides unified editing: edit shared fields once, stock separately per region
- Migration: All existing products default to `region = 'us'` with unique `product_group_id`

## Database Schema Changes

### 1. Products Table Modifications

```sql
-- Add region support
ALTER TABLE products 
ADD COLUMN region VARCHAR(10) CHECK (region IN ('us', 'eu')),
ADD COLUMN product_group_id UUID; -- Links related products across regions

-- Create unique constraint: one product per region per group
CREATE UNIQUE INDEX idx_products_group_region 
ON products(product_group_id, region) 
WHERE product_group_id IS NOT NULL;

-- Indexes for performance
CREATE INDEX idx_products_region ON products(region);
CREATE INDEX idx_products_group_id ON products(product_group_id);

-- Migration: Set all existing products to US region
UPDATE products SET region = 'us' WHERE region IS NULL;
-- Generate unique group IDs for existing products
UPDATE products 
SET product_group_id = gen_random_uuid() 
WHERE product_group_id IS NULL;

-- Make region NOT NULL after migration
ALTER TABLE products ALTER COLUMN region SET NOT NULL;
```

**Note:** `product_group_id` is UUID (not foreign key) to allow flexible grouping

### 2. Region-Based Stock Tracking
- Each product maintains its own `stock` field (already exists)
- Each product has its own variations with region-specific stock
- Variation options track stock per product (each region product has its own variations)
- Orders reference the region-specific product ID
- Stock updates are isolated per region

## Implementation Components

### Backend Changes

#### 1. Region Detection Middleware (`server/src/middleware/regionDetection.ts`)
- **Production**: Detect from request hostname (`eu.simfab.com` → 'eu', `simfab.com` → 'us')
- **Development/Testing**: Check `X-Region` header or `?region=eu` query param
- Set `req.region = 'eu'` or `req.region = 'us'`
- Default to 'us' if hostname doesn't match patterns

#### 2. Product Service Updates (`server/src/services/ProductService.ts`)
- Filter products by region in all public-facing queries
- Add methods:
  - `getProductGroup(groupId)` - Get all products in a group (for admin)
  - `getProductByGroupAndRegion(groupId, region)` - Get specific region product
  - `createProductGroup(productData, regions)` - Create products for multiple regions
  - `syncProductGroup(groupId, excludeFields)` - Sync shared data across group (excludes: stock, sku, pricing, variation stock)
  - `getAllRegionsForProduct(productId)` - Get all regions where this product exists

#### 3. Admin Product Controller (`server/src/controllers/adminProductController.ts`)
- `GET /api/admin/products/:id/group` - Get all products in the same group (all regions)
- `PUT /api/admin/products/group/:groupId/sync` - Sync shared data across all products in group
- `POST /api/admin/products/group` - Create product group (single or multiple regions)
- `PUT /api/admin/products/group/:groupId` - Update shared fields for all products in group
- List endpoint returns region info and group relationships

#### 4. Public Product Controller (`server/src/controllers/productController.ts`)
- Auto-filter by region in all product queries using middleware
- Include `region` field in product DTOs
- Only return products matching current region

#### 5. Order System Updates
- Orders must track which region product was purchased (product ID is already region-specific)
- Ensure stock deduction happens on correct region product
- Add `region` field to orders table for analytics (optional, can derive from product)

### Frontend Changes

#### 1. Region Detection Utility (`src/utils/region.ts`)
- **Production**: Detect from `window.location.hostname` (`eu.simfab.com` → 'eu', `simfab.com` → 'us')
- **Testing/Development**: Check `VITE_DEFAULT_REGION` env var or query param `?region=eu`
- Provide React context `RegionContext` for region access throughout app
- Store region in session/localStorage for consistency during session

#### 2. API Service Updates (`src/services/api.ts`)
- Add `X-Region` header to requests (optional, backend can also detect from hostname)
- Update product interfaces to include `region` and `product_group_id` fields

#### 3. Admin Dashboard Enhancements (`src/pages/Admin.tsx`)
- Product list enhancements:
  - Show region badge (US/EU) on each product
  - Group products by `product_group_id` with expandable view
  - Show "Multi-Region" indicator for grouped products
  - Filter by region
- Unified editing interface (`src/components/admin/ProductGroupEditDialog.tsx`):
  - When editing grouped product, show all regions
  - Single form for shared fields (name, description, images, variations structure, addons, etc.)
  - Separate sections per region for: stock, SKU, pricing, variation stock
  - "Sync to all regions" checkbox/button for shared fields
  - "Save all regions" saves all at once
- Product creation:
  - Radio/checkbox for regions: "US Only", "EU Only", or "Both Regions"
  - If "Both": create two products with same `product_group_id`, same shared data, different stock/SKU

#### 4. Product Edit Dialog Updates (`src/components/admin/ProductEditDialog.tsx`)
- Show linked products if product has `product_group_id`
- Region-specific stock inputs when editing grouped product
- Sync controls for shared data
- Option to "Create EU version" or "Create US version" for single-region products

#### 5. Shop Pages Updates (`src/pages/Shop.tsx`, `src/pages/ProductDetail.tsx`)
- Filter products by current region automatically
- Hide out-of-region products
- Region indicator badge (optional, for multi-region products)

## Migration Strategy

### 1. Database Migration (`server/src/migrations/sql/XXX_add_region_support.sql`)
- Add `region` column (nullable initially)
- Add `product_group_id` column (UUID, nullable)
- Create indexes
- Migrate existing data:
  - Set all existing products to `region = 'us'`
  - Generate unique `product_group_id` for each existing product
- Make `region` NOT NULL
- Add check constraint

### 2. Data Migration Script
- Optional: Create product pairs for products that should be available in both regions
- Manual process via admin dashboard recommended (use "Create EU version" button)

## Configuration

### Environment Variables

**Backend:**
- `DEFAULT_REGION` - Default region when hostname doesn't match (defaults to 'us')
- `SUPPORTED_REGIONS` - Comma-separated list (default: 'us,eu')

**Frontend (Vite):**
- `VITE_DEFAULT_REGION` - For local testing (values: 'us' or 'eu')

### Domain Configuration
- Production: `simfab.com` → US, `eu.simfab.com` → EU
- Development: Use `VITE_DEFAULT_REGION` env var or `?region=eu` query param

## Implementation Notes

**Pricing:** Can differ per region (stored per product), but defaults to same value
**Images:** Shared across regions (synced via product group)
**Variations Structure:** Shared (variation definitions), but stock per option is region-specific
**Existing Products:** All default to `region = 'us'` during migration
**Existing Orders:** Assume US region (add region column to orders table if needed later)

## Testing Considerations

1. Unit tests for region detection (hostname, env var, query param)
2. Integration tests for product filtering by region
3. Admin dashboard tests for product grouping and syncing
4. Order creation tests with region-specific products
5. Stock management tests per region
6. Cross-region product creation/syncing tests

## Rollout Plan

1. **Phase 1**: Database schema migration + backend region detection middleware
2. **Phase 2**: Product service filtering by region + admin API endpoints
3. **Phase 3**: Admin dashboard UI for product grouping and unified editing
4. **Phase 4**: Frontend region detection and filtering in shop pages
5. **Phase 5**: Order system updates for region tracking (if needed)
6. **Phase 6**: Testing and migration of existing products

## Key Files to Modify

### Backend
- `server/src/migrations/sql/XXX_add_region_support.sql` (new)
- `server/src/middleware/regionDetection.ts` (new)
- `server/src/services/ProductService.ts` (update)
- `server/src/controllers/adminProductController.ts` (update)
- `server/src/controllers/productController.ts` (update)
- `server/src/types/product.ts` (update interfaces)

### Frontend
- `src/utils/region.ts` (new)
- `src/contexts/RegionContext.tsx` (new)
- `src/services/api.ts` (update)
- `src/pages/Admin.tsx` (update)
- `src/components/admin/ProductEditDialog.tsx` (update)
- `src/components/admin/ProductGroupEditDialog.tsx` (new)
- `src/pages/Shop.tsx` (update)
- `src/pages/ProductDetail.tsx` (update)

