/**
 * Shipping Controller
 * Handles shipping calculation API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ShippingService } from '../services/ShippingService';
import { ShippingQuoteService } from '../services/ShippingQuoteService';
import { EmailService } from '../services/EmailService';
import { successResponse } from '../utils/response';
import { cartValidation } from '../middleware/validation';

export class ShippingController {
  private shippingService: ShippingService;
  private shippingQuoteService: ShippingQuoteService;
  private emailService: EmailService;

  constructor(pool: Pool) {
    this.shippingService = new ShippingService(pool);
    this.shippingQuoteService = new ShippingQuoteService(pool);
    this.emailService = new EmailService(pool);
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

      const { shippingAddress, packageSize, orderTotal = 0, cartItems } = value;

      // Calculate shipping (package size will be auto-determined if not provided)
      const calculations = await this.shippingService.calculateShipping({
        country: shippingAddress.country,
        state: shippingAddress.state,
        orderTotal: parseFloat(orderTotal.toString()) || 0,
        packageSize: packageSize ? (packageSize as 'S' | 'M' | 'L') : undefined,
        shippingAddress: {
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2 || undefined,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country
        },
        cartItems: cartItems || []
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

  /**
   * Request shipping quote (customer-facing)
   * POST /api/shipping/request-quote
   */
  requestQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { shippingAddress, packageSize, cartItems } = req.body;

      // Validate required fields
      if (!shippingAddress || !shippingAddress.email || !shippingAddress.firstName || !shippingAddress.lastName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Shipping address with email, firstName, and lastName is required'
          }
        });
      }

      if (!packageSize || !['S', 'M', 'L'].includes(packageSize)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Package size (S, M, or L) is required'
          }
        });
      }

      // Create shipping quote
      const quote = await this.shippingQuoteService.createShippingQuote({
        customerEmail: shippingAddress.email,
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        shippingAddress: {
          country: shippingAddress.country,
          state: shippingAddress.state,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2
        },
        packageSize: packageSize as 'S' | 'M' | 'L',
        cartItems: cartItems || []
      });

      // Send emails
      try {
        // Email to admin
        await this.emailService.triggerEvent(
          'shipping.quote.requested',
          {
            quote_id: quote.id.toString(),
            customer_name: quote.customer_name,
            customer_email: quote.customer_email,
            shipping_address: `${shippingAddress.city || ''}, ${shippingAddress.state || ''} ${shippingAddress.postalCode || ''}, ${shippingAddress.country}`,
            package_size: packageSize,
            cart_items: cartItems ? cartItems.map((item: any) => 
              `${item.productName} x ${item.quantity} - $${item.unitPrice.toFixed(2)}`
            ).join('\n') : 'N/A'
          },
          {
            adminEmail: 'info@simfab.com'
          }
        );

        // Email to customer
        await this.emailService.triggerEvent(
          'shipping.quote.confirmation',
          {
            customer_name: quote.customer_name,
            customer_email: quote.customer_email,
            quote_id: quote.id.toString()
          },
          {
            customerEmail: quote.customer_email,
            customerName: quote.customer_name
          }
        );
      } catch (emailError) {
        console.error('Failed to send quote request emails:', emailError);
        // Don't fail the request if emails fail
      }

      res.json(successResponse({
        quote,
        message: 'Shipping quote request submitted successfully. You will receive an email confirmation shortly.'
      }));
    } catch (error) {
      next(error);
    }
  };
}

