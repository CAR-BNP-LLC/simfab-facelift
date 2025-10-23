# Shop Page Filtering Fixes

## Issues Identified

1. **Images not showing in product list**
   - The `listProducts` controller was using a simplified query (`SELECT * FROM products`)
   - This query didn't include the JOIN with `product_images` table
   - Result: `images` field was `null` in the response

2. **Category filtering not working**
   - The simplified query ignored the `category` query parameter
   - All products were shown regardless of selected category

3. **Page reload on category change**
   - This is actually expected React behavior (re-rendering)
   - The useEffect triggers when category changes, showing loading state
   - Not a full page reload, just React updating the UI

## Fixes Applied

### Backend: ProductController.ts

**Before:**
```typescript
listProducts = async (req: Request, res: Response, next: NextFunction) => {
  // Simplified query - just get all products for now
  const sql = `SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
  // ... ignored all filters
}
```

**After:**
```typescript
listProducts = async (req: Request, res: Response, next: NextFunction) => {
  const options: ProductQueryOptions = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    category: req.query.category as string,
    search: req.query.search as string,
    minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
    maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
    inStock: req.query.inStock === 'true' ? true : undefined,
    featured: req.query.featured === 'true' ? true : undefined,
    sortBy: req.query.sortBy as any,
    sortOrder: req.query.sortOrder as any
  };

  const result = await this.productService.getProducts(options);
  res.json(paginatedResponse(result.products, result.pagination, result.filters));
}
```

### What This Changes

1. **Images are now included**: 
   - The ProductQueryBuilder includes a subquery that joins with `product_images`
   - Returns an array of images (empty array `[]` if no images, not `null`)
   
2. **Category filtering works**:
   - The controller now passes the `category` query parameter to ProductService
   - ProductQueryBuilder applies the filter: `p.categories::text LIKE '%"category-name"%'`

3. **All filters now work**:
   - Price range filtering
   - Stock status filtering
   - Featured products filtering
   - Search functionality
   - Sorting options

4. **Category counts are accurate**:
   - The response now includes actual category counts from the database
   - Price range reflects actual product prices

## Expected Response Format

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
            "alt_text": "Product image",
            "is_primary": true,
            "sort_order": 0
          }
        ],
        // ... other fields
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    },
    "categories": [
      { "id": "accessories", "name": "Accessories", "count": 5 },
      // ... other categories
    ],
    "priceRange": {
      "min": 10,
      "max": 500
    }
  }
}
```

## Testing

To test the fixes:

1. **Test category filtering:**
   ```bash
   curl "http://localhost:3001/api/products?category=accessories"
   ```

2. **Test images in response:**
   - Check that `images` is an array (not null)
   - Each image should have `image_url`, `is_primary`, etc.

3. **Test in browser:**
   - Navigate to `/shop`
   - Click on different categories
   - Verify products filter correctly
   - Verify images display (or "No image available" if no images)

## Notes

- The frontend already handles empty images arrays correctly
- The "page reload" behavior is normal React re-rendering, not a bug
- If products still don't have images, you need to add them via the admin panel or API

