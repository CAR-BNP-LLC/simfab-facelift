# Docker Server Reload Instructions

## Changes Made

I've fixed the shop page filtering and images issues by updating the backend code:

### Files Modified:
1. `server/src/controllers/ProductController.ts` - Fixed `listProducts` method
2. `server/src/services/ProductService.ts` - Added debug logging
3. `server/src/index.ts` - Added version banner

### What Was Fixed:
1. **Category filtering** - Now properly uses the `category` query parameter
2. **Images inclusion** - Now includes product images in the response
3. **All filters work** - Search, price range, stock status, etc.

## How to Reload Docker

Since Docker containers don't auto-reload on code changes, you need to rebuild:

```bash
# Stop the current containers
docker-compose down

# Rebuild the server container with the new code
docker-compose build server

# Start everything back up
docker-compose up -d

# Or do it all in one command:
docker-compose up -d --build server
```

## How to Verify the New Code is Running

### 1. Check Server Startup Logs
```bash
docker-compose logs server
```

You should see this banner:
```
============================================================
🔧 SERVER VERSION 2.0 - FILTERING & IMAGES FIXED
============================================================
```

If you don't see "VERSION 2.0", the old code is still running.

### 2. Check the Root Endpoint
Visit `http://localhost:3001/` in your browser or:
```bash
curl http://localhost:3001/
```

The response should show:
```json
{
  "version": "2.0.0 - FILTERING & IMAGES FIXED"
}
```

### 3. Watch Logs While Testing
```bash
docker-compose logs -f server
```

Then visit the shop page. You should see these console logs:
```
===========================================
🔧 ProductController.listProducts v2.0 ACTIVE
Query params: { category: 'accessories' }
===========================================
📦 ProductService.getProducts v2.0
Options received: { category: 'accessories', ... }
Query returned: 2 products
Sample product structure: { id: 1, name: '...', hasImages: true, ... }
```

## What to Look For

### If Version 2.0 Banner Shows:
✅ New code is loaded
- Check the logs when you load `/shop` or change categories
- You'll see detailed logging showing:
  - Query parameters received
  - SQL being executed
  - Images data structure
  - Products returned

### If Old Code is Still Running:
❌ Need to rebuild Docker container
- Run `docker-compose up -d --build server`
- Check logs again

## Testing the API Directly

### Test without filters:
```bash
curl "http://localhost:3001/api/products?limit=2"
```

### Test with category filter:
```bash
curl "http://localhost:3001/api/products?category=accessories&limit=2"
```

### Expected Response Structure:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Product Name",
        "images": [
          {
            "id": 1,
            "image_url": "/uploads/image.jpg",
            "is_primary": true,
            "sort_order": 0
          }
        ],
        ...
      }
    ],
    "pagination": {...},
    "categories": [...],
    "priceRange": {...}
  }
}
```

## If Images Still Show as null

If the response shows `"images": null` instead of an array, it means:

1. **The old code is still running** - Rebuild Docker
2. **No images in database** - Products don't have images uploaded yet

To check if products have images in the database:
```bash
# Connect to the database
docker-compose exec db psql -U postgres -d simfab_dev

# Check if product_images table has data
SELECT product_id, image_url FROM product_images;
```

If no rows are returned, you need to upload images through the admin panel first.

## Summary

**To apply the fixes:**
1. Rebuild Docker: `docker-compose up -d --build server`
2. Check logs: `docker-compose logs server` (look for "VERSION 2.0")
3. Test the shop page and watch logs: `docker-compose logs -f server`

**The logs will show you exactly what's happening** with detailed information about:
- Query parameters
- SQL queries
- Images data
- Filtering results

