# Troubleshooting: Product Fields Not Saving

## Problem
When editing product fields in the admin dashboard, changes don't persist. When you reopen the edit dialog, the fields show their old values or are empty.

## Root Causes
This issue typically occurs when new fields are added to the product model but not properly integrated throughout the entire stack. The following components must all be updated:

## Checklist: Where to Add New Product Fields

### 1. Database Migration ✅
**File**: `server/src/migrations/sql/XXX_add_fields.sql`

```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS your_new_field TYPE;
```

**Action**: Create and run the migration.

---

### 2. TypeScript Types ✅
**Files**: 
- `server/src/types/product.ts` - Add to `Product` interface
- `server/src/types/product.ts` - Add to `CreateProductDto` interface  
- `server/src/types/product.ts` - Add to `UpdateProductDto` interface
- `server/src/database.ts` - Add to `Product` interface

**Example**:
```typescript
// In Product interface
your_new_field: string | null;

// In CreateProductDto
your_new_field?: string;

// In UpdateProductDto (inherits from CreateProductDto)
```

---

### 3. Validation Schemas ✅
**File**: `server/src/validators/product.ts`

Add validation to both `createProductSchema` and `updateProductSchema`:

```typescript
your_new_field: Joi.string().allow(null, '').optional(),
```

---

### 4. ProductService - Create Method ✅
**File**: `server/src/services/ProductService.ts`

**Location**: `createProduct()` method around line 253-318

1. Add field to INSERT statement:
```typescript
const sql = `
  INSERT INTO products (
    ...
    your_new_field,
    ...
  ) VALUES (
    ...
    $X,
    ...
  )
`;
```

2. Add value to values array:
```typescript
const values = [
  ...
  data.your_new_field || null,
  ...
];
```

---

### 5. ProductService - Update Method ✅
**File**: `server/src/services/ProductService.ts`

**Location**: `updateProduct()` method around line 327-735

1. Add field to `sharedFields` array (if it should sync between US/EU products):
```typescript
const sharedFields = [
  ...
  'your_new_field',
  ...
];
```

2. Add field handling logic:
```typescript
if (data.your_new_field !== undefined) {
  forceAddField('your_new_field', data.your_new_field || null);
  if (hasGroup) sharedFieldsToSync['your_new_field'] = data.your_new_field || null;
}
```

3. **CRITICAL**: Add field to sync SQL query (around line 603-720):
```typescript
if ('your_new_field' in sharedFieldsToSync) {
  syncFields.push(`your_new_field = $${syncParamCounter++}`);
  syncValues.push(sharedFieldsToSync.your_new_field);
}
```

**This is the most common place where fields are forgotten!**

---

### 6. ProductQueryBuilder - SELECT Statement ✅
**File**: `server/src/services/ProductQueryBuilder.ts`

**Location**: `build()` method around line 44-68

Add field to the SELECT statement:
```typescript
const sql = `
  SELECT 
    ...
    p.your_new_field,
    ...
  FROM products p
  ...
`;
```

**Note**: `getProductById()` uses `SELECT p.*` so it automatically includes all columns, but `ProductQueryBuilder` explicitly lists fields.

---

### 7. Frontend Form State ✅
**File**: `src/components/admin/ProductEditDialog.tsx`

1. Add to form state (around line 83-113):
```typescript
const [productForm, setProductForm] = useState({
  ...
  your_new_field: '',
  ...
});
```

2. Add to form initialization (around line 178-234):
```typescript
setProductForm({
  ...
  your_new_field: product.your_new_field || '',
  ...
});
```

3. Add form field to UI (in the appropriate Card section)

4. Add to form submission (around line 560-621):
```typescript
const sharedFieldsData = {
  ...
  your_new_field: productForm.your_new_field || null,
  ...
};
```

---

### 8. CSV Import/Export (if needed) ✅
**Files**:
- `server/src/types/csv.ts` - Add to `CSVProductRow` interface
- `server/src/services/CSVImportService.ts` - Add parsing logic in `parseRow()` method

---

## Quick Diagnostic Steps

### Step 1: Check Database
```sql
SELECT your_new_field FROM products WHERE id = <product_id>;
```
If the value is NULL or old, the database update isn't working.

### Step 2: Check Backend Logs
Look for the update SQL query in server logs:
```
📝 Updating product: <id> with data: {...}
```

Check if your field is in the update data and in the SQL query.

### Step 3: Check Frontend Network Tab
1. Open browser DevTools → Network tab
2. Edit product and save
3. Find the PUT request to `/api/admin/products/:id`
4. Check Request Payload - is your field included?
5. Check Response - is your field in the returned product?

### Step 4: Check Form State
Add console.log in ProductEditDialog:
```typescript
console.log('Form data:', productForm);
console.log('Product data:', product);
```

---

## Common Mistakes

### ❌ Mistake 1: Forgetting Sync Logic
**Symptom**: Field saves for one product but not the paired product (US/EU)

**Fix**: Add field to sync SQL query in `ProductService.updateProduct()` around line 603-720

### ❌ Mistake 2: Missing from ProductQueryBuilder
**Symptom**: Field saves but doesn't appear in product lists

**Fix**: Add field to SELECT statement in `ProductQueryBuilder.build()`

### ❌ Mistake 3: Wrong Field Name
**Symptom**: Field saves but with wrong name or type

**Fix**: Ensure database column name matches TypeScript property name exactly

### ❌ Mistake 4: Not Handling Null/Empty
**Symptom**: Field works when set but breaks when cleared

**Fix**: Use `forceAddField()` or handle null/empty strings properly:
```typescript
forceAddField('your_new_field', data.your_new_field || null);
```

---

## Testing Checklist

After adding a new field, test:

- [ ] Create new product with field
- [ ] Update existing product with field
- [ ] Clear/empty the field
- [ ] Update product in group mode (should sync to paired product)
- [ ] Update product in individual mode (should NOT sync)
- [ ] View product in product list (should display correctly)
- [ ] Export/import CSV (if applicable)

---

## Example: Adding a New Field

Let's say you want to add `warranty_years` field:

1. **Migration**: `055_add_warranty_years.sql`
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_years INTEGER;
```

2. **Types**: Add to all Product interfaces
```typescript
warranty_years: number | null;
```

3. **Validators**: Add validation
```typescript
warranty_years: Joi.number().integer().min(0).allow(null).optional(),
```

4. **ProductService.createProduct()**: Add to INSERT
5. **ProductService.updateProduct()**: 
   - Add to `sharedFields` array
   - Add field handling
   - **Add to sync SQL query** ← Most important!
6. **ProductQueryBuilder**: Add to SELECT
7. **Frontend**: Add to form state, initialization, UI, and submission

---

## Quick Reference: File Locations

| Component | File | Line Range |
|-----------|------|------------|
| Database Migration | `server/src/migrations/sql/XXX_*.sql` | - |
| Product Interface | `server/src/types/product.ts` | ~39-98 |
| CreateProductDto | `server/src/types/product.ts` | ~294-346 |
| Validators | `server/src/validators/product.ts` | ~13-65, ~67-119 |
| Database Interface | `server/src/database.ts` | ~3-39 |
| Create Product | `server/src/services/ProductService.ts` | ~253-321 |
| Update Product | `server/src/services/ProductService.ts` | ~327-735 |
| Sync Logic | `server/src/services/ProductService.ts` | ~603-720 |
| Query Builder | `server/src/services/ProductQueryBuilder.ts` | ~44-68 |
| Frontend Form | `src/components/admin/ProductEditDialog.tsx` | Multiple |

---

## Still Not Working?

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
2. **Restart the server** to ensure migrations ran
3. **Check migration status**: Ensure migration file was executed
4. **Check TypeScript errors**: Run `npm run build` or check linter
5. **Check database directly**: Verify column exists and has data
6. **Check API response**: Verify field is returned from GET endpoint

---

## Prevention

To avoid this issue in the future:

1. **Use this checklist** every time you add a new field
2. **Test immediately** after adding each component
3. **Create a template** for adding new fields
4. **Document field additions** in commit messages

---

Last Updated: 2024
Maintained by: Development Team

