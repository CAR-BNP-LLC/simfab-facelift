/**
 * Page Product Controller
 * Handles endpoints for managing products displayed on specific pages
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { PageProductService } from '../services/PageProductService';
import {
  CreatePageProductDto,
  UpdatePageProductDto,
  BulkPageProductDto,
  SetCategoryDto
} from '../types/pageProducts';
import { successResponse, errorResponse } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

export class PageProductController {
  private pageProductService: PageProductService;

  constructor(pool: Pool) {
    this.pageProductService = new PageProductService(pool);
  }

  /**
   * Get all page configurations
   * GET /api/admin/page-products
   */
  getAllPagesConfig = asyncHandler(async (req: Request, res: Response) => {
    const configs = await this.pageProductService.getAllPagesConfig();
    res.json(successResponse(configs));
  });

  /**
   * Get products for a specific page section (Admin)
   * GET /api/admin/page-products/:pageRoute/:section
   */
  getPageSectionProducts = asyncHandler(async (req: Request, res: Response) => {
    // Decode URL-encoded route (e.g., %2Fsim-racing -> /sim-racing)
    let { pageRoute, section } = req.params;
    pageRoute = decodeURIComponent(pageRoute);
    section = decodeURIComponent(section);
    
    const includeInactive = req.query.includeInactive === 'true';
    
    const result = await this.pageProductService.getPageSectionProducts(
      pageRoute,
      section,
      includeInactive
    );
    
    res.json(successResponse(result));
  });

  /**
   * Add product to page section
   * POST /api/admin/page-products
   */
  addProductToSection = asyncHandler(async (req: Request, res: Response) => {
    const dto: CreatePageProductDto = {
      page_route: req.body.page_route || req.body.pageRoute,
      page_section: req.body.page_section || req.body.pageSection,
      product_id: req.body.product_id || req.body.productId,
      display_order: req.body.display_order || req.body.displayOrder,
      is_active: req.body.is_active !== undefined ? req.body.is_active : (req.body.isActive !== undefined ? req.body.isActive : true)
    };

    // Validation
    if (!dto.page_route || !dto.page_section || !dto.product_id) {
      return res.status(400).json(errorResponse(
        'Missing required fields: page_route, page_section, product_id'
      ));
    }

    const pageProduct = await this.pageProductService.addProductToSection(dto);
    res.status(201).json(successResponse(pageProduct));
  });

  /**
   * Update page product
   * PUT /api/admin/page-products/:id
   */
  updatePageProduct = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json(errorResponse('Invalid page product ID'));
    }

    const updates: UpdatePageProductDto = {};
    if (req.body.display_order !== undefined) {
      updates.display_order = req.body.display_order;
    }
    if (req.body.is_active !== undefined) {
      updates.is_active = req.body.is_active;
    }
    if (req.body.displayOrder !== undefined) {
      updates.display_order = req.body.displayOrder;
    }
    if (req.body.isActive !== undefined) {
      updates.is_active = req.body.isActive;
    }

    const pageProduct = await this.pageProductService.updatePageProduct(id, updates);
    res.json(successResponse(pageProduct));
  });

  /**
   * Remove product from page section
   * DELETE /api/admin/page-products/:id
   */
  removeProductFromSection = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json(errorResponse('Invalid page product ID'));
    }

    await this.pageProductService.removeProductFromSection(id);
    res.json(successResponse({ message: 'Product removed from page section' }));
  });

  /**
   * Bulk update page products
   * PUT /api/admin/page-products/bulk
   */
  bulkUpdatePageProducts = asyncHandler(async (req: Request, res: Response) => {
    const dto: BulkPageProductDto = {
      page_route: req.body.page_route || req.body.pageRoute,
      page_section: req.body.page_section || req.body.pageSection,
      products: req.body.products.map((p: any) => ({
        product_id: p.product_id || p.productId,
        display_order: p.display_order || p.displayOrder || 0,
        is_active: p.is_active !== undefined ? p.is_active : (p.isActive !== undefined ? p.isActive : true)
      }))
    };

    if (!dto.page_route || !dto.page_section || !Array.isArray(dto.products)) {
      return res.status(400).json(errorResponse(
        'Missing required fields: page_route, page_section, products (array)'
      ));
    }

    const pageProducts = await this.pageProductService.bulkUpdatePageProducts(dto);
    res.json(successResponse(pageProducts));
  });

  /**
   * Set category for page section
   * POST /api/admin/page-products/category
   */
  setCategoryForSection = asyncHandler(async (req: Request, res: Response) => {
    const dto: SetCategoryDto = {
      page_route: req.body.page_route || req.body.pageRoute,
      page_section: req.body.page_section || req.body.pageSection,
      category_id: req.body.category_id || req.body.categoryId,
      max_items: req.body.max_items || req.body.maxItems || 10
    };

    if (!dto.page_route || !dto.page_section || !dto.category_id) {
      return res.status(400).json(errorResponse(
        'Missing required fields: page_route, page_section, category_id'
      ));
    }

    const pageProduct = await this.pageProductService.setCategoryForSection(dto);
    res.json(successResponse(pageProduct));
  });

  /**
   * Get public page products (for frontend)
   * GET /api/page-products/:pageRoute/:section
   */
  getPublicPageProducts = asyncHandler(async (req: Request, res: Response) => {
    // Decode URL-encoded route
    let { pageRoute, section } = req.params;
    pageRoute = decodeURIComponent(pageRoute);
    section = decodeURIComponent(section);
    
    const result = await this.pageProductService.getPageSectionProducts(
      pageRoute,
      section,
      false // Only active products for public
    );
    
    res.json(successResponse(result));
  });
}

