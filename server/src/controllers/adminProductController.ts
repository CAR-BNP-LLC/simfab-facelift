/**
 * Admin Product Controller
 * Handles admin product management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ProductService } from '../services/ProductService';
import { ProductVariationService } from '../services/ProductVariationService';
import { ProductAddonService } from '../services/ProductAddonService';
import { ProductImageService } from '../services/ProductImageService';
import { FileUploadService } from '../services/FileUploadService';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateVariationDto,
  CreateAddonDto,
  ProductStatus
} from '../types/product';
import { successResponse, paginatedResponse } from '../utils/response';

export class AdminProductController {
  private productService: ProductService;
  private variationService: ProductVariationService;
  private addonService: ProductAddonService;
  private imageService: ProductImageService;
  private fileUploadService: FileUploadService;

  constructor(pool: Pool) {
    this.productService = new ProductService(pool);
    this.variationService = new ProductVariationService(pool);
    this.addonService = new ProductAddonService(pool);
    this.imageService = new ProductImageService(pool);
    this.fileUploadService = new FileUploadService();
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
        status: req.query.status as ProductStatus,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
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
   * Update product
   * PUT /api/admin/products/:id
   */
  updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const updateData: Partial<UpdateProductDto> = req.body;

      // Log the request for debugging
      console.log('AdminProductController.updateProduct - Request body:', JSON.stringify(req.body, null, 2));
      console.log('AdminProductController.updateProduct - Product ID:', productId);

      const product = await this.productService.updateProduct(productId, updateData);

      res.json(successResponse(product, 'Product updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete product
   * DELETE /api/admin/products/:id
   */
  deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      await this.productService.deleteProduct(productId);

      res.json(successResponse(null, 'Product deleted successfully'));
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
  // ADD-ONS
  // ============================================================================

  /**
   * Get product add-ons
   * GET /api/admin/products/:id/addons
   */
  getAddons = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const addons = await this.addonService.getAddonsByProduct(productId);

      res.json(successResponse(addons, 'Add-ons retrieved'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create add-on
   * POST /api/admin/products/:id/addons
   */
  createAddon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const addonData: CreateAddonDto = {
        ...req.body,
        product_id: productId
      };

      const addon = await this.addonService.createAddon(addonData);

      res.status(201).json(successResponse(addon, 'Add-on created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update add-on
   * PUT /api/admin/products/:id/addons/:addonId
   */
  updateAddon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const addonId = parseInt(req.params.addonId);
      const updateData = req.body;

      const addon = await this.addonService.updateAddon(addonId, updateData);

      res.json(successResponse(addon, 'Add-on updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete add-on
   * DELETE /api/admin/products/:id/addons/:addonId
   */
  deleteAddon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const addonId = parseInt(req.params.addonId);
      await this.addonService.deleteAddon(addonId);

      res.json(successResponse(null, 'Add-on deleted successfully'));
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
}

