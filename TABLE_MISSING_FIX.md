# Page Products Table Missing - Error Handling Fix

## Issue
The `page_products` table doesn't exist (migration 036 hasn't been run), causing 500 errors when accessing the page products API.

## Error Seen
```
error: relation "page_products" does not exist
code: '42P01'
```

## Solution
Added graceful error handling for when the table doesn't exist. The API now:
- Returns empty results instead of crashing
- Logs a warning message
- Allows the admin UI to load (showing empty state)

## Changes Made

### `getAllPagesConfig()` ✅
- Added try-catch around table query
- Returns known pages structure even if table missing
- Shows pages with 0 product count

### `getPageSectionProducts()` ✅
- Added try-catch for config query
- Added try-catch for products query  
- Returns empty products array if table missing
- Returns default configuration

## Files Modified
- `server/src/services/PageProductService.ts`

## Next Steps

### To Create the Table:
```bash
cd server
npm run migrate:up
```

This will run migration 036 which creates the `page_products` table.

### After Migration:
- Admin can add products to pages
- Products will be saved to the table
- Frontend pages will show configured products

## Current Behavior (Without Table)
✅ Admin UI loads successfully  
✅ Shows all known pages  
✅ Shows 0 products for each section  
✅ Can open edit dialogs (but can't save until table exists)  
✅ Frontend pages show empty state gracefully  

## After Migration
✅ Full functionality available  
✅ Can add/remove products  
✅ Drag & drop reordering works  
✅ Products display on frontend pages  

