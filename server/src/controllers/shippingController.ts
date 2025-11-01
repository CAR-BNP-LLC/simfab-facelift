/**
 * Shipping Controller
 * Handles shipping calculation API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ShippingService } from '../services/ShippingService';
import { successResponse } from '../utils/response';
import { cartValidation } from '../middleware/validation';

export class ShippingController {
  private shippingService: ShippingService;

  constructor(pool: Pool) {
    this.shippingService = new ShippingService(pool);
  }

  /**
   * Calculate shipping rates
   * POST /api/shipping/calculate
   */
  calculate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const { error, value } = cartValidation.calculateShipping.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { shippingAddress, packageSize = 'M', orderTotal = 0 } = value;

      // Calculate shipping
      const calculations = await this.shippingService.calculateShipping({
        country: shippingAddress.country,
        state: shippingAddress.state,
        orderTotal: parseFloat(orderTotal.toString()) || 0,
        packageSize: packageSize as 'S' | 'M' | 'L',
        shippingAddress: {
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2 || undefined,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country
        }
      });

      // Convert to ShippingMethod format
      const shippingMethods = calculations.map(calc => ({
        ...ShippingService.toShippingMethod(calc),
        fedexRateData: calc.fedexRateData // Include FedEx rate details if available
      }));

      res.json(successResponse({
        shippingMethods,
        calculations // Include raw calculations for reference
      }));
    } catch (error) {
      next(error);
    }
  };
}

