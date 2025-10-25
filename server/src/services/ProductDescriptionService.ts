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
    // First, get the existing component to know its current type
    const existingComponent = await this.pool.query(
      'SELECT component_type FROM product_description_components WHERE id = $1',
      [id]
    );

    if (existingComponent.rows.length === 0) {
      throw new Error('Component not found');
    }

    const componentType = data.component_type || existingComponent.rows[0].component_type;

    // Validate component content if provided
    if (data.content && !validateComponentContent(componentType, data.content)) {
      console.error('Validation failed for component type:', componentType, 'Content:', JSON.stringify(data.content, null, 2));
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
      const sanitizedContent = this.sanitizeComponentContent(data.content);
      console.log('Original content:', JSON.stringify(data.content, null, 2));
      console.log('Sanitized content:', JSON.stringify(sanitizedContent, null, 2));
      updates.push(`content = $${paramIndex++}`);
      values.push(JSON.stringify(sanitizedContent));
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

