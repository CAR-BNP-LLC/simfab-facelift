/**
 * Product Validation Schemas
 * Joi validation schemas for product-related requests
 */

import Joi from 'joi';
import { ProductType, ProductStatus, VariationType } from '../types/product';

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export const createProductSchema = Joi.object({
  sku: Joi.string().min(3).max(100).required(),
  name: Joi.string().min(1).max(255).required(),
  slug: Joi.string().min(3).max(255).optional(),
  description: Joi.string().allow('', null).optional(),
  short_description: Joi.string().max(500).allow('', null).optional(),
  type: Joi.string().valid(...Object.values(ProductType)).required(),
  status: Joi.string().valid(...Object.values(ProductStatus)).optional(),
  featured: Joi.boolean().optional(),

  // Region support
  region: Joi.string().valid('us', 'eu').optional(),
  product_group_id: Joi.string().uuid().allow(null).optional(),

  // Pricing
  regular_price: Joi.number().positive().required(),
  sale_price: Joi.number().positive().allow(null).optional(),
  sale_start_date: Joi.date().allow(null).optional(),
  sale_end_date: Joi.date().allow(null).optional(),
  
  // Discount fields
  is_on_sale: Joi.boolean().optional(),
  sale_label: Joi.string().max(100).allow(null, '').optional(),

  // Physical attributes
  weight_lbs: Joi.number().positive().optional(),
  length_in: Joi.number().positive().optional(),
  width_in: Joi.number().positive().optional(),
  height_in: Joi.number().positive().optional(),

  // Inventory
  stock_quantity: Joi.number().integer().min(0).optional(),
  low_stock_threshold: Joi.number().integer().min(0).optional(),
  manage_stock: Joi.boolean().optional(),
  allow_backorders: Joi.boolean().optional(),

  // Shipping
  requires_shipping: Joi.boolean().optional(),
  tax_class: Joi.string().max(50).allow(null).optional(),
  shipping_class: Joi.string().max(50).allow(null).optional(),

  // Metadata
  categories: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  meta_data: Joi.object().optional(),

  // SEO
  seo_title: Joi.string().max(255).optional(),
  seo_description: Joi.string().max(500).optional()
});

export const updateProductSchema = Joi.object({
  sku: Joi.string().min(3).max(100).optional(),
  name: Joi.string().min(1).max(255).optional(),
  slug: Joi.string().min(3).max(255).optional(),
  description: Joi.string().allow('', null).optional(),
  short_description: Joi.string().max(500).allow('', null).optional(),
  type: Joi.string().valid(...Object.values(ProductType)).optional(),
  status: Joi.string().valid(...Object.values(ProductStatus)).optional(),
  featured: Joi.boolean().optional(),

  // Region support
  region: Joi.string().valid('us', 'eu').optional(),
  product_group_id: Joi.string().uuid().allow(null).optional(),

  // Pricing
  regular_price: Joi.number().positive().optional(),
  sale_price: Joi.number().positive().allow(null).optional(),
  
  // Discount fields
  is_on_sale: Joi.boolean().optional(),
  sale_start_date: Joi.date().allow(null).optional(),
  sale_end_date: Joi.date().allow(null).optional(),
  sale_label: Joi.string().max(100).allow(null, '').optional(),

  // Physical attributes
  weight_lbs: Joi.number().positive().allow(null).optional(),
  length_in: Joi.number().positive().allow(null).optional(),
  width_in: Joi.number().positive().allow(null).optional(),
  height_in: Joi.number().positive().allow(null).optional(),

  // Inventory
  stock_quantity: Joi.number().integer().min(0).optional(),
  low_stock_threshold: Joi.number().integer().min(0).optional(),
  manage_stock: Joi.boolean().optional(),
  allow_backorders: Joi.boolean().optional(),

  // Shipping
  requires_shipping: Joi.boolean().optional(),
  tax_class: Joi.string().max(50).allow(null).optional(),
  shipping_class: Joi.string().max(50).allow(null).optional(),

  // Metadata
  categories: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  meta_data: Joi.object().optional(),

  // SEO
  seo_title: Joi.string().max(255).optional(),
  seo_description: Joi.string().max(500).optional()
}).min(1); // At least one field must be provided

// ============================================================================
// VARIATION SCHEMAS
// ============================================================================

export const createVariationSchema = Joi.object({
  variation_type: Joi.string().valid(...Object.values(VariationType)).required(),
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().allow('', null).optional(),
  is_required: Joi.boolean().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  tracks_stock: Joi.boolean().optional(),
  options: Joi.array().items(
    Joi.object({
      option_name: Joi.string().required(),
      option_value: Joi.string().required(),
      price_adjustment: Joi.number().optional(),
      image_url: Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().allow(''),
        Joi.valid(null)
      ).optional(),
      is_default: Joi.boolean().optional()
    })
  ).min(1).when('variation_type', {
    is: Joi.string().valid('dropdown', 'image'),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

export const updateVariationSchema = Joi.object({
  variation_type: Joi.string().valid(...Object.values(VariationType)).optional(),
  name: Joi.string().min(2).max(255).optional(),
  description: Joi.string().allow('', null).optional(),
  is_required: Joi.boolean().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  tracks_stock: Joi.boolean().optional(),
  options: Joi.array().items(
    Joi.object({
      option_name: Joi.string().required(),
      option_value: Joi.string().required(),
      price_adjustment: Joi.number().optional(),
      image_url: Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().allow(''),
        Joi.valid(null)
      ).optional(),
      is_default: Joi.boolean().optional()
    })
  ).min(1).when('variation_type', {
    is: Joi.string().valid('dropdown', 'image', 'boolean'),
    then: Joi.optional(),
    otherwise: Joi.forbidden()
  })
}).min(1);

// ============================================================================
// PRICE CALCULATION SCHEMA
// ============================================================================

export const calculatePriceSchema = Joi.object({
  variations: Joi.object().pattern(
    Joi.number().integer().positive(),
    Joi.number().integer().positive()
  ).optional(),
  quantity: Joi.number().integer().min(1).max(100).optional()
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  category: Joi.string().optional(),
  search: Joi.string().min(1).optional(),
  minPrice: Joi.number().positive().optional(),
  maxPrice: Joi.number().positive().optional(),
  inStock: Joi.boolean().optional(),
  featured: Joi.boolean().optional(),
  status: Joi.string().valid(...Object.values(ProductStatus)).optional(),
  sortBy: Joi.string().valid('name', 'price', 'created_at', 'featured', 'rating').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  tags: Joi.string().optional() // Comma-separated string
});

export const searchQuerySchema = Joi.object({
  q: Joi.string().optional().allow(''), // Allow empty/single char - controller handles validation
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  category: Joi.string().optional()
});

// ============================================================================
// IMAGE SCHEMAS
// ============================================================================

export const updateImageSchema = Joi.object({
  alt_text: Joi.string().max(255).allow('', null).optional(),
  is_primary: Joi.boolean().optional(),
  sort_order: Joi.number().integer().min(0).optional()
}).min(1);

export const reorderImagesSchema = Joi.object({
  imageIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
});

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors
        }
      });
    }

    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors
        }
      });
    }

    req.query = value;
    next();
  };
};

