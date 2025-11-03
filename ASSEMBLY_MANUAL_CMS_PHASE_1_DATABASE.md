# 📚 Assembly Manuals CMS - Phase 1: Database Schema & Migration

**Goal**: Create database schema for many-to-many relationship between manuals and products, with QR code support.

---

## 🎯 Overview

This phase focuses on:
- Creating new `assembly_manuals_cms` table (independent from products)
- Creating junction table `product_assembly_manuals` for many-to-many relationships
- Adding QR code fields to support unique QR code generation
- Migrating existing data from old `assembly_manuals` table
- Adding proper indexes for performance

---

## 📋 Current State

### Existing Table Structure:
- ✅ `assembly_manuals` table exists with `product_id` (one-to-many)
- ✅ Manuals are linked directly to products via foreign key
- ✅ Basic fields: name, description, file_url, file_type, file_size, image_url

### Required Changes:
- 🔄 Change from one-to-many to many-to-many relationship
- ➕ Add QR code storage fields
- ➕ Add public visibility flag
- ➕ Add junction table for product assignments

---

## 🗄️ Database Migration

### Migration File
**File**: `server/src/migrations/sql/045_refactor_assembly_manuals_for_cms.sql`

```sql
-- Migration: 045_refactor_assembly_manuals_for_cms.sql
-- Purpose: Create CMS structure for assembly manuals with many-to-many product relationships

-- ============================================================================
-- Step 1: Create new assembly_manuals_cms table
-- ============================================================================

CREATE TABLE IF NOT EXISTS assembly_manuals_cms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'pdf',
  file_size INTEGER,
  thumbnail_url VARCHAR(500), -- Preview image/thumbnail for display
  qr_code_url VARCHAR(500), -- QR code image file URL for printing
  qr_code_data TEXT, -- URL encoded in QR code (e.g., https://simfab.com/manuals/:id)
  is_public BOOLEAN DEFAULT true, -- Can be viewed on website (for QR code scanning)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Step 2: Create junction table for many-to-many relationship
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_assembly_manuals (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  manual_id INTEGER NOT NULL REFERENCES assembly_manuals_cms(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, manual_id) -- Prevent duplicate assignments
);

-- ============================================================================
-- Step 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_product_assembly_manuals_product_id 
  ON product_assembly_manuals(product_id);

CREATE INDEX IF NOT EXISTS idx_product_assembly_manuals_manual_id 
  ON product_assembly_manuals(manual_id);

CREATE INDEX IF NOT EXISTS idx_assembly_manuals_cms_public 
  ON assembly_manuals_cms(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_assembly_manuals_cms_sort_order 
  ON assembly_manuals_cms(sort_order);

-- ============================================================================
-- Step 4: Migrate existing data (if any exists)
-- ============================================================================

-- Migrate manuals from old table to new table
INSERT INTO assembly_manuals_cms (
  name, 
  description, 
  file_url, 
  file_type, 
  file_size, 
  thumbnail_url, 
  is_public, 
  sort_order, 
  created_at
)
SELECT 
  name, 
  description, 
  file_url, 
  COALESCE(file_type, 'pdf'), 
  file_size, 
  image_url, 
  true, -- All existing manuals set as public by default
  sort_order, 
  created_at
FROM assembly_manuals
ON CONFLICT DO NOTHING;

-- Migrate product-manual relationships to junction table
INSERT INTO product_assembly_manuals (
  product_id, 
  manual_id, 
  sort_order, 
  created_at
)
SELECT 
  am.product_id, 
  amc.id, 
  am.sort_order, 
  am.created_at
FROM assembly_manuals am
JOIN assembly_manuals_cms amc ON am.file_url = amc.file_url
ON CONFLICT (product_id, manual_id) DO NOTHING;

-- ============================================================================
-- Step 5: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE assembly_manuals_cms IS 
  'Central repository for assembly manuals. Manuals are independent entities that can be assigned to multiple products.';

COMMENT ON TABLE product_assembly_manuals IS 
  'Junction table for many-to-many relationship between products and assembly manuals. Allows a manual to be assigned to multiple products.';

COMMENT ON COLUMN assembly_manuals_cms.qr_code_url IS 
  'QR code image file URL. Generated automatically when manual is created. Can be downloaded/printed for packaging.';

COMMENT ON COLUMN assembly_manuals_cms.qr_code_data IS 
  'URL encoded in QR code. Format: {FRONTEND_URL}/manuals/:id. Used for QR code scanning.';

COMMENT ON COLUMN assembly_manuals_cms.is_public IS 
  'Whether manual can be viewed publicly via QR code scan. Private manuals are admin-only.';

COMMENT ON COLUMN product_assembly_manuals.sort_order IS 
  'Display order of manual on product detail page. Lower numbers appear first.';
```

---

## ✅ Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Check existing `assembly_manuals` table structure
- [ ] Verify no foreign key constraints prevent migration
- [ ] Ensure `products` table exists and is accessible

### Migration Steps
- [ ] Create migration file `045_refactor_assembly_manuals_for_cms.sql`
- [ ] Run migration: `npm run migrate:up`
- [ ] Verify new tables created successfully
- [ ] Verify indexes created
- [ ] Check data migration (if existing data exists)

### Post-Migration Verification
- [ ] Verify `assembly_manuals_cms` table structure
- [ ] Verify `product_assembly_manuals` table structure
- [ ] Check indexes are created
- [ ] Verify existing data migrated (if applicable)
- [ ] Test foreign key constraints work
- [ ] Test cascade delete works (deleting product removes assignments)

### SQL Verification Queries
```sql
-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'assembly_manuals_cms'
ORDER BY ordinal_position;

-- Check junction table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'product_assembly_manuals'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('assembly_manuals_cms', 'product_assembly_manuals');

-- Verify foreign keys
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('assembly_manuals_cms', 'product_assembly_manuals');

-- Check migrated data (if any)
SELECT COUNT(*) FROM assembly_manuals_cms;
SELECT COUNT(*) FROM product_assembly_manuals;
```

---

## 🔄 Backward Compatibility

### Keeping Old Table
- The old `assembly_manuals` table can remain for backward compatibility
- It won't interfere with the new structure
- Can be dropped in a future cleanup migration if desired

### Migration Strategy
- New system uses `assembly_manuals_cms` exclusively
- Old `assembly_manuals` table remains as read-only reference
- Future cleanup: Add migration to drop old table after verifying all systems migrated

---

## 📊 Schema Summary

### assembly_manuals_cms
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR(255) | Manual name |
| description | TEXT | Manual description |
| file_url | VARCHAR(500) | PDF file URL |
| file_type | VARCHAR(50) | File type (default: pdf) |
| file_size | INTEGER | File size in bytes |
| thumbnail_url | VARCHAR(500) | Preview image URL |
| qr_code_url | VARCHAR(500) | QR code image URL |
| qr_code_data | TEXT | URL in QR code |
| is_public | BOOLEAN | Public visibility flag |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### product_assembly_manuals
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| product_id | INTEGER | Foreign key to products |
| manual_id | INTEGER | Foreign key to assembly_manuals_cms |
| sort_order | INTEGER | Display order on product page |
| created_at | TIMESTAMP | Assignment timestamp |

---

## 🚨 Important Notes

1. **Unique Constraint**: The `UNIQUE(product_id, manual_id)` constraint prevents duplicate assignments
2. **Cascade Deletes**: Deleting a product removes all manual assignments. Deleting a manual removes all product assignments.
3. **Public Flag**: Only manuals with `is_public = true` are accessible via QR code scanning
4. **QR Code Generation**: QR codes will be generated in Phase 2 (Backend Services)
5. **Data Migration**: If no existing data, migration still runs but inserts nothing

---

## ✅ Phase 1 Completion Criteria

- [x] Migration file created
- [ ] Migration tested on development database
- [ ] Tables created with correct structure
- [ ] Indexes created successfully
- [ ] Foreign keys working correctly
- [ ] Existing data migrated (if applicable)
- [ ] Documentation updated

**Next Phase**: Phase 2 - Backend Services (QR Code Service & Assembly Manual Service)

