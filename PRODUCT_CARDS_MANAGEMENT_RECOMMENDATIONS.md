# Product Cards Management Recommendations

## Current Situation

Hardcoded product cards exist on:
- **SimRacing.tsx**: `baseModels` array (2 products)
- **MonitorStands.tsx**: `products` array (3 products) + `addOns` array (6 products)  
- **FlightSim.tsx**: `baseModels` array (4 products)

## Recommended Solution: Dynamic Product Fetching

### Approach: Category/Tag-Based Product Filtering

The backend already has product APIs with category support. Use this to dynamically load products.

### Implementation Steps

#### 1. Backend: Add Category Tags/Metadata
- Ensure products have appropriate category tags (e.g., "sim-racing-base-models", "monitor-stands-main", "monitor-stands-addons", "flight-sim-base-models")
- Or use existing category system with specific category names
- Add a `display_order` field to control ordering on specific pages

#### 2. Frontend: Create Reusable Product Card Component
Create a component that works with API product data structure:
```typescript
// src/components/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  showButton?: boolean;
}
```

#### 3. Update Pages to Use API

**SimRacing.tsx:**
```typescript
const [baseModels, setBaseModels] = useState<Product[]>([]);

useEffect(() => {
  const fetchBaseModels = async () => {
    try {
      const response = await productsAPI.getAll({
        category: 'sim-racing-base-models', // or use tag
        limit: 10,
        sortBy: 'display_order'
      });
      setBaseModels(response.data.products);
    } catch (error) {
      console.error('Failed to load base models:', error);
    }
  };
  fetchBaseModels();
}, []);
```

**MonitorStands.tsx:**
```typescript
const [products, setProducts] = useState<Product[]>([]);
const [addOns, setAddOns] = useState<Product[]>([]);

useEffect(() => {
  // Fetch main products
  productsAPI.getAll({ category: 'monitor-stands-main', limit: 10 })
    .then(res => setProducts(res.data.products));
  
  // Fetch add-ons
  productsAPI.getAll({ category: 'monitor-stands-addons', limit: 10 })
    .then(res => setAddOns(res.data.products));
}, []);
```

## Alternative Approaches

### Option A: Featured Products by Page Context
Add a backend endpoint: `GET /api/products/featured?pageContext=sim-racing-base-models`
- Products can have a `page_contexts` JSON field storing where they should appear
- More flexible but requires backend changes

### Option B: Product Collections/Curated Lists
Create a "Product Collections" feature:
- Admin can create collections (e.g., "Sim Racing Base Models")
- Assign products to collections
- Fetch by collection ID: `GET /api/products/collections/:collectionId`

### Option C: Static Data with Admin Override
- Keep static data as default/fallback
- Admin can override via a "Page Product Settings" feature
- Fetches override data if exists, otherwise uses static

### Option D: Headless CMS Integration
- Use Strapi, Contentful, or similar
- Manage product listings through CMS
- More overhead but very flexible for marketing team

## Database Schema Considerations

If using categories/tags approach, ensure:
```sql
-- Products table should have:
- categories (JSON or relation)
- tags (JSON array)
- featured (boolean)
- display_order (integer, nullable)
- status ('active', 'draft', 'archived')
```

## Recommended Next Steps

1. **Short-term (Quick Win):**
   - Create reusable `ProductCard` component
   - Update one page (e.g., SimRacing.tsx) to use API
   - Test and iterate

2. **Medium-term (Full Migration):**
   - Update all pages to use API
   - Add category/tag management in admin panel
   - Ensure proper product categorization in database

3. **Long-term (Enhancement):**
   - Add page-specific product ordering in admin
   - Create "Product Collections" feature
   - Add preview/validation before publishing

## Benefits of Dynamic Approach

✅ **Single Source of Truth**: Products managed in one place (database)  
✅ **No Code Changes for Product Updates**: Change in admin panel, not code  
✅ **Consistent Product Data**: Same structure across all pages  
✅ **Inventory Sync**: Stock, pricing automatically reflected  
✅ **SEO Benefits**: Dynamic content can be better for SEO  
✅ **Analytics**: Track which products are shown where  

## Migration Path

1. Tag existing products in database with appropriate categories
2. Create ProductCard component wrapper
3. Migrate one page at a time
4. Test thoroughly before moving to next page
5. Remove hardcoded arrays after validation

## Code Structure

```
src/
  components/
    ProductCard.tsx          # Reusable product card
    ProductCardGrid.tsx     # Grid layout wrapper
  pages/
    SimRacing.tsx           # Uses API + ProductCard
    MonitorStands.tsx       # Uses API + ProductCard
    FlightSim.tsx           # Uses API + ProductCard
  hooks/
    usePageProducts.tsx     # Custom hook for page-specific products
```

