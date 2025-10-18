/**
 * FAQ Routes
 * API endpoints for product FAQ management
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { 
  createFAQSchema, 
  updateFAQSchema, 
  reorderFAQsSchema, 
  getProductFAQsSchema, 
  deleteFAQSchema 
} from '../validators/faq';
import { CreateFAQDto, UpdateFAQDto, ReorderFAQsDto } from '../types/faq';

const router = Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// GET /api/products/:productId/faqs - Get all active FAQs for a product
router.get('/products/:productId/faqs', 
  validate(getProductFAQsSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      
      const result = await pool.query(`
        SELECT id, question, answer, sort_order
        FROM product_faqs 
        WHERE product_id = $1 AND is_active = '1' 
        ORDER BY sort_order ASC, created_at ASC
      `, [productId]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching product FAQs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch FAQs'
      });
    }
  }
);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// POST /api/products/:productId/faqs - Create new FAQ (admin only)
router.post('/products/:productId/faqs',
  requireAdmin,
  validate(createFAQSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const faqData: CreateFAQDto = { ...req.body, product_id: parseInt(productId) };

      // Get next sort order if not provided
      if (faqData.sort_order === undefined) {
        const maxOrderResult = await pool.query(`
          SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
          FROM product_faqs 
          WHERE product_id = $1
        `, [productId]);
        faqData.sort_order = maxOrderResult.rows[0].next_order;
      }

      const result = await pool.query(`
        INSERT INTO product_faqs (product_id, question, answer, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        faqData.product_id,
        faqData.question,
        faqData.answer,
        faqData.sort_order,
        faqData.is_active ?? '1'
      ]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'FAQ created successfully'
      });
    } catch (error) {
      console.error('Error creating FAQ:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create FAQ'
      });
    }
  }
);

// PUT /api/faqs/:id - Update FAQ (admin only)
router.put('/faqs/:id',
  requireAdmin,
  validate(updateFAQSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData: UpdateFAQDto = { ...req.body, id: parseInt(id) };

      // Build dynamic query
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.question !== undefined) {
        fields.push(`question = $${paramCount++}`);
        values.push(updateData.question);
      }
      if (updateData.answer !== undefined) {
        fields.push(`answer = $${paramCount++}`);
        values.push(updateData.answer);
      }
      if (updateData.sort_order !== undefined) {
        fields.push(`sort_order = $${paramCount++}`);
        values.push(updateData.sort_order);
      }
      if (updateData.is_active !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updateData.is_active);
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      values.push(id); // Add id as last parameter

      const result = await pool.query(`
        UPDATE product_faqs 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'FAQ not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'FAQ updated successfully'
      });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update FAQ'
      });
    }
  }
);

// DELETE /api/faqs/:id - Delete FAQ (admin only)
router.delete('/faqs/:id',
  requireAdmin,
  validate(deleteFAQSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        DELETE FROM product_faqs 
        WHERE id = $1
        RETURNING id
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'FAQ not found'
        });
      }

      res.json({
        success: true,
        message: 'FAQ deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete FAQ'
      });
    }
  }
);

// PUT /api/faqs/reorder - Reorder FAQs (admin only)
router.put('/faqs/reorder',
  requireAdmin,
  validate(reorderFAQsSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      const { product_id, faq_ids }: ReorderFAQsDto = req.body;

      // Start transaction
      await pool.query('BEGIN');

      try {
        // Update sort order for each FAQ
        for (let i = 0; i < faq_ids.length; i++) {
          await pool.query(`
            UPDATE product_faqs 
            SET sort_order = $1 
            WHERE id = $2 AND product_id = $3
          `, [i + 1, faq_ids[i], product_id]);
        }

        await pool.query('COMMIT');

        res.json({
          success: true,
          message: 'FAQs reordered successfully'
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error reordering FAQs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reorder FAQs'
      });
    }
  }
);

export default router;
