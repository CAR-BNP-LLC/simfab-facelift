/**
 * Admin Product Controller
 * Handles admin product management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ProductService } from '../services/ProductService';
import { ProductVariationService } from '../services/ProductVariationService';
import { ProductImageService } from '../services/ProductImageService';
import { FileUploadService } from '../services/FileUploadService';
import { ImageMigrationService } from '../services/ImageMigrationService';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateVariationDto,
  ProductStatus
} from '../types/product';
import { successResponse, paginatedResponse } from '../utils/response';

export class AdminProductController {
  private productService: ProductService;
  private variationService: ProductVariationService;
  private imageService: ProductImageService;
  private fileUploadService: FileUploadService;
  private imageMigrationService: ImageMigrationService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.productService = new ProductService(pool);
    this.variationService = new ProductVariationService(pool);
    this.imageService = new ProductImageService(pool);
    this.fileUploadService = new FileUploadService();
    this.imageMigrationService = new ImageMigrationService(pool);
  }

  // ============================================================================
  // PRODUCT CRUD
  // ============================================================================

  /**
   * List all products (admin view)
   * GET /api/admin/products
   */
  listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        search: req.query.search as string,
        category: req.query.category as string,
        status: req.query.status as ProductStatus,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        includeDeleted: req.query.includeDeleted === 'true' // Admin can see deleted products
      };

      const result = await this.productService.getProducts(options);

      res.json(paginatedResponse(
        result.products,
        result.pagination
      ));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get product details (admin view)
   * GET /api/admin/products/:id
   */
  getProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await this.productService.getProductById(productId);

      res.json(successResponse(product, 'Product retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create product
   * POST /api/admin/products
   */
  createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productData: CreateProductDto = req.body;
      const product = await this.productService.createProduct(productData);

      res.status(201).json(successResponse(product, 'Product created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create product group (both US and EU)
   * POST /api/admin/products/group
   */
  createProductGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name, slug, description, short_description, type, status, featured,
        regular_price, categories, tags, note,
        sku,
        stock_quantity_us, stock_quantity_eu
      } = req.body;

      const products = await this.productService.createProductGroup({
        name,
        slug,
        description,
        short_description,
        type,
        status,
        featured,
        regular_price,
        categories,
        tags,
        note,
        sku,
        stock_quantity_us,
        stock_quantity_eu
      });

      res.status(201).json(successResponse(products, 'Product group created successfully (US & EU)'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update product
   * PUT /api/admin/products/:id
   */
  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const updateData: Partial<UpdateProductDto> = req.body;

      // Log the request for debugging
      console.log('📝 Updating product:', productId, 'with data:', JSON.stringify(updateData, null, 2));
      
      const product = await this.productService.updateProduct(productId, updateData);

      console.log('✅ Product updated successfully:', product.id);
      res.json(successResponse(product, 'Product updated successfully'));
    } catch (error) {
      console.error('❌ Error updating product:', error);
      next(error);
    }
  };

  /**
   * Break product group (unlink products)
   * DELETE /api/admin/products/group/:groupId
   */
  breakProductGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productGroupId = req.params.groupId;
      await this.productService.breakProductGroup(productGroupId);

      res.json(successResponse(null, 'Product group broken successfully. Products are now unlinked.'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete product
   * DELETE /api/admin/products/:id?force=true
   */
  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const force = req.query.force === 'true';
      const result = await this.productService.deleteProduct(productId, force);

      const message = result.softDeleted
        ? `Product marked as deleted (soft delete). It is referenced in orders and cannot be permanently deleted.`
        : force 
          ? 'Product deleted successfully (removed from carts)'
          : 'Product deleted successfully';
      
      res.json(successResponse({ softDeleted: result.softDeleted }, message));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Restore soft-deleted product
   * POST /api/admin/products/:id/restore
   */
  restoreProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      await this.productService.restoreProduct(productId);

      res.json(successResponse(null, 'Product restored successfully'));
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // VARIATIONS
  // ============================================================================

  /**
   * Get product variations
   * GET /api/admin/products/:id/variations
   */
  getVariations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const variations = await this.variationService.getVariationsByProduct(productId);

      res.json(successResponse(variations, 'Variations retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create variation
   * POST /api/admin/products/:id/variations
   */
  createVariation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const variationData: CreateVariationDto = {
        ...req.body,
        product_id: productId
      };

      const variation = await this.variationService.createVariation(variationData);

      res.status(201).json(successResponse(variation, 'Variation created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update variation
   * PUT /api/admin/products/:id/variations/:variationId
   */
  updateVariation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const variationId = parseInt(req.params.variationId);
      const updateData = req.body;

      const variation = await this.variationService.updateVariation(variationId, updateData);

      res.json(successResponse(variation, 'Variation updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete variation
   * DELETE /api/admin/products/:id/variations/:variationId
   */
  deleteVariation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const variationId = parseInt(req.params.variationId);
      await this.variationService.deleteVariation(variationId);

      res.json(successResponse(null, 'Variation deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  // ============================================================================
  // IMAGES
  // ============================================================================

  /**
   * Get product images
   * GET /api/admin/products/:id/images
   */
  getImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const images = await this.imageService.getImagesByProduct(productId);
      res.json(successResponse(images, 'Images retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload image for variations (no product ID required)
   * POST /api/admin/upload/image
   */
  uploadVariationImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = this.fileUploadService.getFileUrl(file.filename, baseUrl);

      res.status(201).json({
        success: true,
        data: {
          url: imageUrl,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size
        },
        message: 'Image uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload product image
   * POST /api/admin/products/:id/images
   */
  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = this.fileUploadService.getFileUrl(file.filename, baseUrl);
      const altText = req.body.alt_text;
      const isPrimary = req.body.is_primary === 'true';

      const image = await this.imageService.addImage(productId, imageUrl, altText, isPrimary);

      res.status(201).json(successResponse(image, 'Image uploaded successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update image metadata
   * PUT /api/admin/products/:id/images/:imageId
   */
  updateImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const imageId = parseInt(req.params.imageId);
      const updateData = req.body;

      const image = await this.imageService.updateImage(imageId, updateData);

      res.json(successResponse(image, 'Image updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete image
   * DELETE /api/admin/products/:id/images/:imageId
   */
  deleteImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const imageId = parseInt(req.params.imageId);
      await this.imageService.deleteImage(imageId);

      res.json(successResponse(null, 'Image deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reorder images
   * PUT /api/admin/products/:id/images/reorder
   */
  reorderImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const { imageIds } = req.body;

      if (!Array.isArray(imageIds)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'imageIds must be an array'
          }
        });
      }

      await this.imageService.reorderImages(productId, imageIds);

      res.json(successResponse(null, 'Images reordered successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get stock summary for all variations in a product
   * GET /api/admin/products/:id/variation-stock-summary
   */
  getVariationStockSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      
      // Get variations with stock tracking enabled, even if they have no options yet
      const result = await this.pool.query(
        `SELECT 
          v.id as variation_id, v.name as variation_name, v.tracks_stock,
          vo.id as option_id, vo.option_name,
          vo.stock_quantity, vo.low_stock_threshold,
          COALESCE(vo.reserved_quantity, 0) as reserved_quantity,
          CASE 
            WHEN vo.stock_quantity IS NULL THEN 0
            ELSE COALESCE((vo.stock_quantity - COALESCE(vo.reserved_quantity, 0)), 0)
          END as available,
          CASE 
            WHEN vo.stock_quantity IS NULL THEN 'no_track'
            WHEN vo.stock_quantity - COALESCE(vo.reserved_quantity, 0) <= 0 THEN 'out_of_stock'
            WHEN vo.stock_quantity <= vo.low_stock_threshold THEN 'low_stock'
            ELSE 'in_stock'
          END as status
         FROM product_variations v
         LEFT JOIN variation_options vo ON vo.variation_id = v.id
         WHERE v.product_id = $1 AND v.tracks_stock = true
         ORDER BY v.sort_order, COALESCE(vo.sort_order, 0)`,
        [productId]
      );

      res.json(successResponse(result.rows));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get stock mismatch info for products with variation stock
   * GET /api/admin/products/stock-mismatch-check
   */
  checkStockMismatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.pool.query(
        `SELECT 
          p.id as product_id,
          p.stock as product_stock,
          COALESCE(SUM(vo.stock_quantity), 0) as variation_stock_sum
         FROM products p
         LEFT JOIN product_variations v ON v.product_id = p.id AND v.tracks_stock = true
         LEFT JOIN variation_options vo ON vo.variation_id = v.id
         WHERE EXISTS (
           SELECT 1 FROM product_variations 
           WHERE product_id = p.id AND tracks_stock = true
         )
         GROUP BY p.id, p.stock
         HAVING COALESCE(SUM(vo.stock_quantity), 0) != p.stock`,
        []
      );

      const mismatchMap: Record<number, boolean> = {};
      result.rows.forEach((row: any) => {
        mismatchMap[row.product_id] = true;
      });

      res.json(successResponse(mismatchMap));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Migrate external images to local storage
   * POST /api/admin/products/migrate-images
   */
  migrateImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await this.imageMigrationService.migrateAllImages(baseUrl);

      res.json(successResponse(result, 'Image migration completed'));
    } catch (error) {
      next(error);
    }
  };
}

