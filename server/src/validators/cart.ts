/**
 * Cart Validation Schemas
 * Joi validation schemas for cart and order requests
 */

import Joi from 'joi';

// ============================================================================
// CART SCHEMAS
// ============================================================================

export const addToCartSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).max(100).required(),
  configuration: Joi.object({
    colorId: Joi.number().integer().positive().optional(),
    modelVariationId: Joi.number().integer().positive().optional(),
    dropdownSelections: Joi.object().pattern(
      Joi.number().integer().positive(),
      Joi.number().integer().positive()
    ).optional(),
    variations: Joi.object().pattern(
      Joi.number().integer().positive(),
      Joi.number().integer().positive()
    ).optional(),
    bundleItems: Joi.object({
      selectedOptional: Joi.array().items(
        Joi.number().integer().positive()
      ).optional(),
      configurations: Joi.object().pattern(
        Joi.number().integer().positive(),
        Joi.object().pattern(
          Joi.number().integer().positive(),
          Joi.alternatives().try(
            Joi.number().integer(),
            Joi.string(),
            Joi.boolean()
          )
        )
      ).optional()
    }).optional()
  }).optional()
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(100).required()
});

export const applyCouponSchema = Joi.object({
  couponCode: Joi.string().min(2).max(50).required()
});

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

const addressSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  company: Joi.string().max(255).allow('', null).optional(),
  addressLine1: Joi.string().min(3).max(255).required(),
  addressLine2: Joi.string().max(255).allow('', null).optional(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().min(2).max(100).required(),
  postalCode: Joi.string().min(3).max(20).required(),
  country: Joi.string().min(2).max(100).required(),
  phone: Joi.string().max(20).allow('', null).optional(),
  email: Joi.string().email().optional()
});

export const createOrderSchema = Joi.object({
  billingAddress: addressSchema.required(),
  shippingAddress: addressSchema.required(),
  shippingMethodId: Joi.string().max(100).optional(),
  paymentMethodId: Joi.string().max(100).optional(),
  orderNotes: Joi.string().max(1000).allow('', null).optional(),
  subscribeNewsletter: Joi.boolean().optional()
});

export const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
  comments: Joi.string().max(1000).optional()
});

// ============================================================================
// VALIDATION HELPERS
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

