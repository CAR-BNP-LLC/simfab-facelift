# Phase 1 Testing Instructions

## Migration File Created ✅
- File: `server/src/migrations/sql/045_refactor_assembly_manuals_for_cms.sql`

## To Test Migration (Once Database is Configured)

### 1. Configure Database Connection
Ensure your `.env` file in the `server/` directory has:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/simfab_dev
```

### 2. Check Migration Status
```bash
cd server
npm run migrate:status
```

### 3. Run Migration
```bash
npm run migrate:up
```

### 4. Verify Tables Created
```sql
-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'assembly_manuals_cms'
ORDER BY ordinal_position;

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
```

### 5. Verify Data Migration (if existing data)
```sql
SELECT COUNT(*) as old_count FROM assembly_manuals;
SELECT COUNT(*) as new_count FROM assembly_manuals_cms;
SELECT COUNT(*) as junction_count FROM product_assembly_manuals;
```

## Migration Notes
- The migration is idempotent (uses `IF NOT EXISTS`)
- Existing data from `assembly_manuals` will be migrated
- Old table remains intact (for backward compatibility)
- All existing manuals set as `is_public = true` by default

