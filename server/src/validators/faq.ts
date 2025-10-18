/**
 * FAQ Validation Schemas
 * Joi validation schemas for FAQ-related requests
 */

import Joi from 'joi';

// ============================================================================
// FAQ SCHEMAS
// ============================================================================

export const createFAQSchema = Joi.object({
  question: Joi.string().min(5).max(500).required(),
  answer: Joi.string().min(10).max(2000).required(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.string().valid('1', '0').optional()
});

export const updateFAQSchema = Joi.object({
  question: Joi.string().min(5).max(500).optional(),
  answer: Joi.string().min(10).max(2000).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.string().valid('1', '0').optional()
}).min(1); // At least one field to update

export const reorderFAQsSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  faq_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required()
});

export const getProductFAQsSchema = Joi.object({
  productId: Joi.number().integer().positive().required()
});

export const deleteFAQSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});
