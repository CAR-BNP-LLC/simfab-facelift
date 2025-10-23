# Category Stock Counts Integration

## Summary

Successfully integrated backend product counts into category navigation tabs throughout the application.

## Changes Made

### 1. Backend Updates

**File: `server/src/controllers/productController.ts`**
- Updated `getCategories()` endpoint to fetch real product counts from the database
- Utilizes existing `ProductQueryBuilder.buildCategoriesQuery()` method
- Returns category data with `count` field showing number of active products in each category
- Added import for `ProductQueryBuilder`
- Fixed: Pass `this.pool` to `ProductQueryBuilder` constructor
- Fixed: Use `this.pool.query()` instead of `pool.query()`

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "flight-sim",
      "name": "Flight Simulation",
      "slug": "flight-sim",
      "description": "Professional flight simulator cockpits and accessories",
      "image": "/images/categories/flight-sim.jpg",
      "count": 15  // ← NEW: Real product count from database
    },
    // ... other categories
  ]
}
```

### 2. Frontend Updates

**File: `src/services/api.ts`**
- Updated TypeScript interface for `getCategories()` to include `count: number` field

**File: `src/pages/Shop.tsx`**
- Updated state type to include `count` property: `Array<{ id: string; name: string; count: number }>`
- Added `totalProducts` state to track total product count across all categories
- Updated category tab display to show counts: `{category.name} ({category.count})`
- Added total count to "All" tab: `All (XX)` where XX is sum of all category counts

**File: `src/components/Header.tsx`**
- Added `categoryCounts` state to store product counts from API
- Added `useEffect` hook to fetch category counts on component mount
- Created `getCategoryCount()` helper function to map nav items to category IDs
- Updated navigation buttons to display counts next to category names: `FLIGHT SIM (15)`
- Counts appear in muted foreground color for subtle display

## How to Test

### 1. Start the Backend Server
```bash
cd server
npm run dev
```

### 2. Start the Frontend
```bash
npm run dev
```

### 3. Test Category Counts in Shop Page
1. Navigate to `/shop`
2. Verify the category tabs show counts:
   - "All (XX)" - total of all products
   - "Flight Simulation (XX)"
   - "Sim Racing (XX)"
   - "Cockpits (XX)"
   - "Monitor Stands (XX)"
   - "Accessories (XX)"
3. Click each category and verify filtering works correctly
4. Counts should reflect only **active** products in the database

### 4. Test Header Navigation
1. Hover over navigation items in the header: FLIGHT SIM, SIM RACING, etc.
2. Verify counts appear next to category names (in parentheses)
3. Counts should be subtle (muted foreground color)
4. Only categories with products (count > 0) show counts

### 5. Verify Backend API
Test the endpoint directly:
```bash
# Using curl (Git Bash or WSL)
curl http://localhost:3001/api/products/categories | json_pp

# Using PowerShell
Invoke-WebRequest -Uri 'http://localhost:3001/api/products/categories' | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

Expected response should include `count` field for each category.

## Database Query

The counts are calculated using this SQL query (from `ProductQueryBuilder.buildCategoriesQuery()`):

```sql
SELECT 'flight-sim' as category, COUNT(*)::int as count
FROM products WHERE status = 'active' AND categories LIKE '%flight-sim%'
UNION ALL
SELECT 'sim-racing' as category, COUNT(*)::int as count
FROM products WHERE status = 'active' AND categories LIKE '%sim-racing%'
-- ... etc for other categories
ORDER BY count DESC
```

## Notes

- Counts only include products with `status = 'active'`
- Categories with 0 products will show `(0)` in Shop page but may not show counts in header (count > 0 check)
- Counts are fetched on page load and won't update in real-time without refresh
- The backend query uses `LIKE` for category matching since categories are stored as TEXT (will be improved when migrating to JSONB)

## Future Improvements

1. **Real-time Updates**: Add WebSocket or polling to update counts when products are added/removed
2. **Cache**: Implement Redis caching for category counts to reduce database queries
3. **Category Migration**: Move from TEXT to JSONB for better category querying
4. **Subcategories**: Extend to show counts for subcategories in mega menus
5. **Loading States**: Add skeleton loaders while category counts are being fetched

