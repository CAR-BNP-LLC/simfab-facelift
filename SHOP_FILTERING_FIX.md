# Shop Page Filtering Fix

## Problem
Category filtering in the shop page was not working - clicking on a category would show all products instead of filtered results.

## Root Cause
The category filter query was using `LIKE '%category%'` but the categories in the database are stored as JSON strings like `"[\"accessories\"]"`. 

The pattern needed to include quotes to match the JSON format properly: `LIKE '%"category"%'`

## Changes Made

### Backend Fix (`server/src/services/ProductQueryBuilder.ts`)

#### 1. Fixed Category Filter (Line 161)
**Before:**
```typescript
if (options.category) {
  this.whereConditions.push(`p.categories LIKE $${this.addParam(`%${options.category}%`)}`);
}
```

**After:**
```typescript
if (options.category) {
  this.whereConditions.push(`p.categories::text LIKE $${this.addParam(`%"${options.category}"%`)}`);
}
```

#### 2. Fixed Category Counts Query (Lines 283-299)
**Before:**
```sql
SELECT 'accessories' as category, COUNT(*)::int as count
FROM products WHERE status = 'active' AND categories LIKE '%accessories%'
```

**After:**
```sql
SELECT 'accessories' as category, COUNT(*)::int as count
FROM products WHERE status = 'active' AND categories::text LIKE '%"accessories"%'
```

## How to Apply

1. **Restart Backend Server:**
   ```bash
   cd server
   npm run dev
   ```

## Expected Result

After restarting the backend:
- ✅ Category filtering works correctly
- ✅ Category counts show the correct number of products in each category
- ✅ Clicking on "Accessories" will only show products in the accessories category
- ✅ Clicking on "All" will show all products
- ✅ The shop page updates without full page reloads (React state updates)

## Technical Notes

- Categories are currently stored as TEXT fields with JSON strings: `"[\"category-slug\"]"`
- The `::text` cast ensures compatibility across PostgreSQL versions
- The quotes in the LIKE pattern `%"category"%` match the JSON string format
- This is a temporary solution until we migrate to proper JSONB columns

