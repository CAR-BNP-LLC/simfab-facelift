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

      console.log('Update data received:', JSON.stringify(updateData, null, 2));

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

