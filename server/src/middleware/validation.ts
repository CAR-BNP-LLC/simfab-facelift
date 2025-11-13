import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Joi validation middleware factory
 * Validates request body, query, or params against a Joi schema
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: false, // Don't remove unknown fields (important for nested JSON structures)
      convert: true // Convert types (e.g., string to number)
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/["]/g, '')
      }));

      throw new ValidationError('Invalid input data', details);
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ID parameter
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // Email
  email: Joi.string().email().lowercase().trim().required(),

  // Password (strong password requirements)
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'string.min': 'Password must be at least 8 characters long'
    }),

  // Phone number
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    }),

  // Postal Code (international format - accepts various formats)
  postalCode: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[A-Z0-9\s-]+$/)
    .messages({
      'string.pattern.base': 'Invalid postal code format',
      'string.min': 'Postal code must be at least 3 characters',
      'string.max': 'Postal code must be at most 20 characters'
    }),

  // URL
  url: Joi.string().uri().allow('', null)
};

/**
 * User validation schemas
 */
export const userValidation = {
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match'
    }),
    firstName: Joi.string().min(1).max(100).trim().required(),
    lastName: Joi.string().min(1).max(100).trim().required(),
    phone: commonSchemas.phone,
    company: Joi.string().max(255).trim().allow('', null),
    subscribeNewsletter: Joi.boolean().default(false)
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false)
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(100).trim(),
    lastName: Joi.string().min(1).max(100).trim(),
    phone: commonSchemas.phone,
    company: Joi.string().max(255).trim().allow('', null)
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match'
    })
  }),

  passwordResetRequest: Joi.object({
    email: commonSchemas.email
  }),

  passwordReset: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords do not match'
    })
  })
};

/**
 * Address validation schema
 */
export const addressValidation = {
  create: Joi.object({
    type: Joi.string().valid('billing', 'shipping').required(),
    firstName: Joi.string().min(1).max(100).trim().required(),
    lastName: Joi.string().min(1).max(100).trim().required(),
    company: Joi.string().max(255).trim().allow('', null),
    addressLine1: Joi.string().min(1).max(255).trim().required(),
    addressLine2: Joi.string().max(255).trim().allow('', null),
    city: Joi.string().min(1).max(100).trim().required(),
    state: Joi.string().min(2).max(100).trim().required(),
    postalCode: commonSchemas.postalCode.required(),
    country: Joi.string().length(2).uppercase().default('US'),
    phone: commonSchemas.phone,
    isDefault: Joi.boolean().default(false)
  }),

  update: Joi.object({
    type: Joi.string().valid('billing', 'shipping'),
    firstName: Joi.string().min(1).max(100).trim(),
    lastName: Joi.string().min(1).max(100).trim(),
    company: Joi.string().max(255).trim().allow('', null),
    addressLine1: Joi.string().min(1).max(255).trim(),
    addressLine2: Joi.string().max(255).trim().allow('', null),
    city: Joi.string().min(1).max(100).trim(),
    state: Joi.string().min(2).max(100).trim(),
    postalCode: commonSchemas.postalCode,
    country: Joi.string().length(2).uppercase(),
    phone: commonSchemas.phone,
    isDefault: Joi.boolean()
  })
};

/**
 * Product validation schemas
 */
export const productValidation = {
  list: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().trim(),
    search: Joi.string().trim(),
    sortBy: Joi.string().valid('name', 'price_min', 'created_at', 'updated_at').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    inStock: Joi.boolean(),
    featured: Joi.boolean(),
    status: Joi.string().valid('active', 'inactive', 'draft')
  }),

  calculatePrice: Joi.object({
    modelVariationId: Joi.number().integer().positive().allow(null),
    dropdownSelections: Joi.object().pattern(
      Joi.number(),
      Joi.number().integer().positive()
    ).default({}),
    quantity: Joi.number().integer().min(1).max(100).default(1)
  })
};

/**
 * Cart validation schemas
 */
export const cartValidation = {
  addItem: Joi.object({
    productId: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().min(1).max(100).default(1),
    configuration: Joi.object({
      modelVariationId: Joi.number().integer().positive().allow(null),
      dropdownSelections: Joi.object().pattern(
        Joi.number(),
        Joi.number().integer().positive()
      ).default({})
    }).default({})
  }),

  updateItem: Joi.object({
    quantity: Joi.number().integer().min(1).max(100).required()
  }),

  applyCoupon: Joi.object({
    couponCode: Joi.string().trim().uppercase().required()
  }),

  calculateShipping: Joi.object({
    shippingAddress: Joi.object({
      addressLine1: Joi.string().required(),
      addressLine2: Joi.string().allow('', null),
      city: Joi.string().required(),
      state: Joi.string().allow('', null), // Optional for international addresses
      postalCode: commonSchemas.postalCode.required(),
      country: Joi.string().length(2).uppercase().default('US')
    }).required(),
    packageSize: Joi.string().valid('S', 'M', 'L').default('M'),
    orderTotal: Joi.number().min(0).default(0),
    cartItems: Joi.array().items(
      Joi.object({
        productId: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).required(),
        unitPrice: Joi.number().min(0).required()
      })
    ).optional()
  })
};

/**
 * Order validation schemas
 */
export const orderValidation = {
  create: Joi.object({
    billingAddress: addressValidation.create.keys({
      email: commonSchemas.email
    }),
    shippingAddress: addressValidation.create,
    shippingMethodId: Joi.string().required(),
    paymentMethodId: Joi.string().valid('paypal', 'credit_card', 'debit_card').required(),
    orderNotes: Joi.string().max(500).trim().allow('', null),
    subscribeNewsletter: Joi.boolean().default(false)
  }),

  cancel: Joi.object({
    reason: Joi.string().max(255).trim().required(),
    comments: Joi.string().max(500).trim().allow('', null)
  })
};

/**
 * Newsletter validation
 */
export const newsletterValidation = {
  subscribe: Joi.object({
    email: commonSchemas.email
  }),

  unsubscribe: Joi.object({
    email: commonSchemas.email,
    token: Joi.string().allow('', null)
  })
};


