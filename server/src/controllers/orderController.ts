/**
 * Order Controller
 * Handles order HTTP endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { OrderService } from '../services/OrderService';
import { EmailService } from '../services/EmailService';
import { ShippingQuoteService } from '../services/ShippingQuoteService';
import { CreateOrderData } from '../types/cart';
import { successResponse, paginatedResponse } from '../utils/response';

export class OrderController {
  private orderService: OrderService;
  private emailService: EmailService;
  private shippingQuoteService: ShippingQuoteService;

  constructor(pool: Pool) {
    this.orderService = new OrderService(pool);
    this.emailService = new EmailService(pool);
    this.shippingQuoteService = new ShippingQuoteService(pool);
    this.emailService.initialize();
  }

  /**
   * Create new order from cart
   * POST /api/orders
   */
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.userId;
      const orderData: CreateOrderData = req.body;

      console.log('Creating order for session:', sessionId, 'user:', userId);
      console.log('Order data received:', JSON.stringify(orderData, null, 2));

      const order = await this.orderService.createOrder(sessionId, userId, orderData);

      // Get customer name from billing address (handle JSONB parsing)
      let customerName = order.customer_email;
      try {
        const billingAddress = typeof order.billing_address === 'string' 
          ? JSON.parse(order.billing_address) 
          : order.billing_address;
        if (billingAddress?.firstName && billingAddress?.lastName) {
          customerName = `${billingAddress.firstName} ${billingAddress.lastName}`;
        }
      } catch (error) {
        // If parsing fails, use email as fallback
        console.warn('Could not parse billing address for customer name:', error);
      }

      // Create shipping quote if international order with 40% rate (no negotiated rate)
      if (order.is_international_shipping && orderData.shippingMethodData?.fedexRateData) {
        const fedexData = orderData.shippingMethodData.fedexRateData;
        
        // Create quote if charging 40% (no negotiated rate available)
        if (!fedexData.hasNegotiatedRate && fedexData.discountPercent) {
          try {
            const shippingAddress = typeof order.shipping_address === 'string'
              ? JSON.parse(order.shipping_address)
              : order.shipping_address;

            await this.shippingQuoteService.createShippingQuote({
              orderId: order.id,
              customerEmail: order.customer_email,
              customerName,
              shippingAddress: {
                country: shippingAddress.country,
                state: shippingAddress.state,
                city: shippingAddress.city,
                postalCode: shippingAddress.postalCode
              },
              packageSize: (order.package_size as 'S' | 'M' | 'L') || 'M',
              fedexListRate: fedexData.listRate,
              fedexNegotiatedRate: fedexData.negotiatedRate,
              fedexAppliedRate: fedexData.listRate * (1 - (fedexData.discountPercent / 100)),
              fedexRateDiscountPercent: fedexData.discountPercent,
              fedexServiceType: 'STANDARD',
              fedexRateData: orderData.shippingMethodData.fedexRateData
            });

            // Send admin notification email for shipping quote
            try {
              await this.emailService.triggerEvent(
                'shipping.quote.created',
                {
                  order_number: order.order_number,
                  customer_name: customerName,
                  customer_email: order.customer_email,
                  shipping_address: `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}, ${shippingAddress.country}`,
                  package_size: order.package_size || 'M',
                  fedex_list_rate: `$${fedexData.listRate.toFixed(2)}`,
                  fedex_applied_rate: `$${(fedexData.listRate * (1 - (fedexData.discountPercent! / 100))).toFixed(2)}`,
                  discount_percent: `${fedexData.discountPercent}%`
                },
                {
                  adminEmail: 'info@simfab.com'
                }
              );
            } catch (emailError) {
              console.error('Failed to send shipping quote notification email:', emailError);
            }
          } catch (quoteError) {
            console.error('Failed to create shipping quote:', quoteError);
            // Don't fail order creation if quote creation fails
          }
        }
      }

      // Trigger order.created event - automatically sends emails for all templates registered for this event
      try {
        // Convert string amounts to numbers (PostgreSQL returns numeric types as strings)
        const totalAmount = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : Number(order.total_amount) || 0;
        const subtotal = typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : Number(order.subtotal) || 0;
        const taxAmount = typeof order.tax_amount === 'string' ? parseFloat(order.tax_amount) : Number(order.tax_amount) || 0;
        const shippingAmount = typeof order.shipping_amount === 'string' ? parseFloat(order.shipping_amount) : Number(order.shipping_amount) || 0;
        const discountAmount = typeof order.discount_amount === 'string' ? parseFloat(order.discount_amount) : Number(order.discount_amount) || 0;

        console.log('📧 [DEBUG] Triggering order.created event:', {
          order_number: order.order_number,
          customer_email: order.customer_email,
          customer_name: customerName,
          amounts: {
            total: totalAmount,
            subtotal,
            tax: taxAmount,
            shipping: shippingAmount,
            discount: discountAmount
          }
        });

        await this.emailService.triggerEvent(
          'order.created',
          {
            order_number: order.order_number,
            customer_name: customerName,
            customer_email: order.customer_email,
            order_total: `$${totalAmount.toFixed(2)}`,
            order_date: new Date(order.created_at).toLocaleDateString(),
            subtotal: `$${subtotal.toFixed(2)}`,
            tax_amount: `$${taxAmount.toFixed(2)}`,
            shipping_amount: `$${shippingAmount.toFixed(2)}`,
            discount_amount: `$${discountAmount.toFixed(2)}`
          },
          {
            customerEmail: order.customer_email,
            customerName: customerName,
            adminEmail: 'info@simfab.com'
          }
        );

        console.log('✅ [DEBUG] order.created event triggered successfully');
      } catch (emailError) {
        console.error('❌ [DEBUG] Failed to trigger order.created event emails:', emailError);
        console.error('Error stack:', emailError instanceof Error ? emailError.stack : 'No stack trace');
      }

      res.status(201).json(successResponse({
        order,
        message: 'Order created successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's orders
   * GET /api/orders
   */
  getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please login to view orders'
          }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.orderService.getUserOrders(userId, page, limit);

      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: result.page < result.totalPages,
            hasPrevious: result.page > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order details
   * GET /api/orders/:orderNumber
   */
  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderNumber = req.params.orderNumber;
      const userId = req.session?.userId;

      const order = await this.orderService.getOrderByNumber(orderNumber);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      res.json(successResponse(order));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel order
   * POST /api/orders/:orderNumber/cancel
   */
  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderNumber = req.params.orderNumber;
      const userId = req.session?.userId;

      const order = await this.orderService.cancelOrder(orderNumber, userId);

      res.json(successResponse({
        order,
        message: 'Order cancelled successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Debug endpoint to test order data
   * POST /api/orders/debug
   */
  debugOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Debug order data received:', JSON.stringify(req.body, null, 2));
      
      res.json({
        success: true,
        data: {
          received: req.body,
          shippingState: req.body.shippingAddress?.state,
          billingState: req.body.billingAddress?.state,
          shippingStateLength: req.body.shippingAddress?.state?.length,
          billingStateLength: req.body.billingAddress?.state?.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get order by order number (for confirmation page)
   * GET /api/orders/:orderNumber
   */
  getOrderByNumber = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderNumber } = req.params;
      const order = await this.orderService.getOrderByNumber(orderNumber);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
            requestId: req.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json(successResponse({ order }));
    } catch (error) {
      next(error);
    }
  };
}

