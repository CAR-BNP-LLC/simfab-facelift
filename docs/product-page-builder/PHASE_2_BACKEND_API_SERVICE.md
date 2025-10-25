# Phase 2: Backend API & Service Layer

## Overview
This phase implements the service layer, API routes, and integrates the description components into the existing ProductService.

## Implementation Steps

### 1. Create ProductDescriptionService

**File:** `server/src/services/ProductDescriptionService.ts`

```typescript
/**
 * Product Description Service
 * Handles CRUD operations for product description components
 */

import { Pool } from 'pg';
import { 
  ProductDescriptionComponent, 
  CreateComponentDto, 
  UpdateComponentDto,
  ComponentWithContent,
  ComponentContent
} from '../types/productDescription';
import { validateComponentContent, sanitizeHtmlContent } from '../validators/productDescription';

export class ProductDescriptionService {
  constructor(private pool: Pool) {}

  /**
   * Get all components for a product (public - active only)
   */
  async getComponentsByProduct(productId: number): Promise<ComponentWithContent[]> {
    const sql = `
      SELECT id, product_id, component_type, content, sort_order, is_active, created_at, updated_at
      FROM product_description_components
      WHERE product_id = $1 AND is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get all components for a product (admin - including inactive)
   */
  async getAllComponentsByProduct(productId: number): Promise<ComponentWithContent[]> {
    const sql = `
      SELECT id, product_id, component_type, content, sort_order, is_active, created_at, updated_at
      FROM product_description_components
      WHERE product_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  /**
   * Get component by ID
   */
  async getComponentById(id: number): Promise<ComponentWithContent | null> {
    const sql = `
      SELECT id, product_id, component_type, content, sort_order, is_active, created_at, updated_at
      FROM product_description_components
      WHERE id = $1
    `;

    const result = await this.pool.query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create new component
   */
  async createComponent(productId: number, data: CreateComponentDto): Promise<ComponentWithContent> {
    // Validate component content
    if (!validateComponentContent(data.component_type, data.content)) {
      throw new Error('Invalid component content structure');
    }

    // Sanitize HTML content if present
    const sanitizedContent = this.sanitizeComponentContent(data.content);

    // Get next sort order if not provided
    let sortOrder = data.sort_order;
    if (sortOrder === undefined) {
      const maxOrderResult = await this.pool.query(`
        SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
        FROM product_description_components
        WHERE product_id = $1
      `, [productId]);
      sortOrder = maxOrderResult.rows[0].next_order;
    }

    const sql = `
      INSERT INTO product_description_components (
        product_id, component_type, content, sort_order, is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, product_id, component_type, content, sort_order, is_active, created_at, updated_at
    `;

    const result = await this.pool.query(sql, [
      productId,
      data.component_type,
      JSON.stringify(sanitizedContent),
      sortOrder,
      data.is_active ?? true
    ]);

    return result.rows[0];
  }

  /**
   * Update component
   */
  async updateComponent(id: number, data: UpdateComponentDto): Promise<ComponentWithContent> {
    // Validate component content if provided
    if (data.content && !validateComponentContent(data.component_type || 'text', data.content)) {
      throw new Error('Invalid component content structure');
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.component_type !== undefined) {
      updates.push(`component_type = $${paramIndex++}`);
      values.push(data.component_type);
    }

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(JSON.stringify(this.sanitizeComponentContent(data.content)));
    }

    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(data.sort_order);
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE product_description_components
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, product_id, component_type, content, sort_order, is_active, created_at, updated_at
    `;

    const result = await this.pool.query(sql, values);

    if (result.rows.length === 0) {
      throw new Error('Component not found');
    }

    return result.rows[0];
  }

  /**
   * Delete component
   */
  async deleteComponent(id: number): Promise<void> {
    const sql = 'DELETE FROM product_description_components WHERE id = $1';
    const result = await this.pool.query(sql, [id]);

    if (result.rowCount === 0) {
      throw new Error('Component not found');
    }
  }

  /**
   * Reorder components
   */
  async reorderComponents(productId: number, componentIds: number[]): Promise<void> {
    // Validate that all components belong to the product
    const validateSql = `
      SELECT id FROM product_description_components
      WHERE id = ANY($1) AND product_id = $2
    `;
    const validateResult = await this.pool.query(validateSql, [componentIds, productId]);

    if (validateResult.rows.length !== componentIds.length) {
      throw new Error('Some components do not belong to the specified product');
    }

    // Update sort orders
    const updatePromises = componentIds.map((id, index) => {
      return this.pool.query(
        'UPDATE product_description_components SET sort_order = $1 WHERE id = $2',
        [index, id]
      );
    });

    await Promise.all(updatePromises);
  }

  /**
   * Get component count for a product
   */
  async getComponentCount(productId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM product_description_components
      WHERE product_id = $1
    `;

    const result = await this.pool.query(sql, [productId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Sanitize component content
   */
  private sanitizeComponentContent(content: ComponentContent): ComponentContent {
    // Recursively sanitize HTML content in text fields
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeHtmlContent(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      return obj;
    };

    return sanitize(content);
  }
}
```

### 2. Create API Routes

**File:** `server/src/routes/productDescriptions.ts`

```typescript
/**
 * Product Description Routes
 * API endpoints for product description component management
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { ProductDescriptionService } from '../services/ProductDescriptionService';
import {
  createComponentSchema,
  updateComponentSchema,
  reorderComponentsSchema,
  getComponentsParamsSchema,
  componentIdParamsSchema
} from '../validators/productDescription';

const router = Router();
const descriptionService = new ProductDescriptionService(pool);

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// GET /api/products/:productId/description-components
router.get('/products/:productId/description-components',
  validate(getComponentsParamsSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      
      const components = await descriptionService.getComponentsByProduct(parseInt(productId));

      res.json({
        success: true,
        data: components
      });
    } catch (error) {
      console.error('Error fetching description components:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch description components'
      });
    }
  }
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// GET /api/admin/products/:productId/description-components (all components)
router.get('/admin/products/:productId/description-components',
  requireAdmin,
  validate(getComponentsParamsSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      
      const components = await descriptionService.getAllComponentsByProduct(parseInt(productId));

      res.json({
        success: true,
        data: components
      });
    } catch (error) {
      console.error('Error fetching all description components:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch description components'
      });
    }
  }
);

// POST /api/admin/products/:productId/description-components
router.post('/admin/products/:productId/description-components',
  requireAdmin,
  validate(getComponentsParamsSchema, 'params'),
  validate(createComponentSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const componentData = req.body;

      const component = await descriptionService.createComponent(parseInt(productId), componentData);

      res.status(201).json({
        success: true,
        data: component,
        message: 'Component created successfully'
      });
    } catch (error) {
      console.error('Error creating component:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create component'
      });
    }
  }
);

// PUT /api/admin/description-components/:id
router.put('/admin/description-components/:id',
  requireAdmin,
  validate(componentIdParamsSchema, 'params'),
  validate(updateComponentSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const component = await descriptionService.updateComponent(parseInt(id), updateData);

      res.json({
        success: true,
        data: component,
        message: 'Component updated successfully'
      });
    } catch (error) {
      console.error('Error updating component:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update component'
      });
    }
  }
);

// DELETE /api/admin/description-components/:id
router.delete('/admin/description-components/:id',
  requireAdmin,
  validate(componentIdParamsSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await descriptionService.deleteComponent(parseInt(id));

      res.json({
        success: true,
        message: 'Component deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting component:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete component'
      });
    }
  }
);

// PUT /api/admin/products/:productId/description-components/reorder
router.put('/admin/products/:productId/description-components/reorder',
  requireAdmin,
  validate(getComponentsParamsSchema, 'params'),
  validate(reorderComponentsSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { componentIds } = req.body;

      await descriptionService.reorderComponents(parseInt(productId), componentIds);

      res.json({
        success: true,
        message: 'Components reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering components:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder components'
      });
    }
  }
);

export default router;
```

### 3. Update ProductService Integration

**File:** `server/src/services/ProductService.ts` (add to existing file)

Add this method to the existing ProductService class:

```typescript
  /**
   * Get product description components
   */
  private async getProductDescriptionComponents(productId: number) {
    const sql = `
      SELECT id, product_id, component_type, content, sort_order, is_active, created_at, updated_at
      FROM product_description_components
      WHERE product_id = $1 AND is_active = true
      ORDER BY sort_order ASC, created_at ASC
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }
```

Update the `getProductById` method to include description components:

```typescript
  // In the existing getProductById method, add this line after getting FAQs:
  const descriptionComponents = await this.getProductDescriptionComponents(id);
  
  // Add to the return object:
  return {
    ...product,
    variations: variations,
    addons: addons,
    faqs: faqs,
    descriptionComponents: descriptionComponents, // Add this line
    // ... other existing fields
  };
```

### 4. Register Routes in Main App

**File:** `server/src/index.ts` (add to existing file)

Add this import and route registration:

```typescript
import productDescriptionRoutes from './routes/productDescriptions';

// Add after other route registrations:
app.use('/api', productDescriptionRoutes);
```

## Testing Instructions

1. **Test Service Layer:**
   ```bash
   cd server
   npm run test -- --grep "ProductDescriptionService"
   ```

2. **Test API Endpoints:**
   ```bash
   # Get components for a product
   curl http://localhost:3001/api/products/1/description-components

   # Create a text component (admin)
   curl -X POST http://localhost:3001/api/admin/products/1/description-components \
     -H "Content-Type: application/json" \
     -H "Cookie: session=your-session-cookie" \
     -d '{
       "component_type": "text",
       "content": {
         "heading": "Test Heading",
         "paragraph": "Test paragraph content"
       }
     }'
   ```

3. **Verify ProductService Integration:**
   ```bash
   curl http://localhost:3001/api/products/1
   # Should include descriptionComponents array in response
   ```

## Next Steps

After completing Phase 2:
- Service layer handles all CRUD operations
- API routes provide public and admin endpoints
- Components are integrated into product responses
- Ready to build frontend display components in Phase 3

## Notes

- All HTML content is sanitized for security
- Validation ensures data integrity
- Admin routes require authentication
- Sort order is automatically managed
- Components can be reordered via drag-and-drop API

