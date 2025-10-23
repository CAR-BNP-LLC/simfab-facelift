import { Pool } from 'pg';
import { WebhookService } from '../services/WebhookService';
import { successResponse, errorResponse } from '../utils/response';

export class WebhookTestController {
  private webhookService: WebhookService;

  constructor(pool: Pool) {
    this.webhookService = new WebhookService(pool);
  }

  /**
   * Test webhook signature verification
   */
  testWebhookSignature = async (req: any, res: any, next: any) => {
    try {
      const { headers, body, webhookId } = req.body;

      if (!headers || !body || !webhookId) {
        return res.status(400).json(errorResponse('Missing required fields: headers, body, webhookId'));
      }

      const isValid = await this.webhookService.verifyWebhookSignature(
        headers,
        JSON.stringify(body),
        webhookId
      );

      res.json(successResponse({
        message: 'Webhook signature test completed',
        isValid,
        testData: {
          headers: Object.keys(headers),
          bodyKeys: Object.keys(body),
          webhookId
        }
      }));
    } catch (error) {
      console.error('Webhook signature test failed:', error);
      next(error);
    }
  };

  /**
   * Simulate webhook events for testing
   */
  simulateWebhookEvent = async (req: any, res: any, next: any) => {
    try {
      const { eventType, orderId, paymentId } = req.body;

      if (!eventType || !orderId) {
        return res.status(400).json(errorResponse('Missing required fields: eventType, orderId'));
      }

      // Create mock webhook event
      const mockEvent = {
        id: `test_${Date.now()}`,
        event_type: eventType,
        create_time: new Date().toISOString(),
        resource_type: 'capture',
        resource: {
          id: paymentId || `test_payment_${Date.now()}`,
          custom_id: orderId.toString(),
          amount: {
            value: '100.00',
            currency_code: 'USD'
          },
          status: eventType.includes('COMPLETED') ? 'COMPLETED' : 
                  eventType.includes('DENIED') ? 'DENIED' : 'PENDING'
        },
        summary: `Test ${eventType} event`,
        links: []
      };

      await this.webhookService.handleWebhookEvent(mockEvent);

      res.json(successResponse({
        message: `Simulated ${eventType} webhook event`,
        event: mockEvent,
        orderId
      }));
    } catch (error) {
      console.error('Webhook simulation failed:', error);
      next(error);
    }
  };

  /**
   * Get webhook event history
   */
  getWebhookHistory = async (req: any, res: any, next: any) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const client = await this.webhookService['pool'].connect();

      try {
        const result = await client.query(
          `SELECT event_id, event_type, processed_at, 
                  event_data->>'resource' as resource_data
           FROM webhook_events 
           ORDER BY processed_at DESC 
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        const countResult = await client.query(
          'SELECT COUNT(*) as total FROM webhook_events'
        );

        res.json(successResponse({
          events: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to get webhook history:', error);
      next(error);
    }
  };

  /**
   * Test payment flow end-to-end
   */
  testPaymentFlow = async (req: any, res: any, next: any) => {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json(errorResponse('Missing orderId'));
      }

      const client = await this.webhookService['pool'].connect();
      
      try {
        // Get order details
        const orderResult = await client.query(
          `SELECT o.*, p.status as payment_status, p.transaction_id
           FROM orders o
           LEFT JOIN payments p ON o.id = p.order_id
           WHERE o.id = $1`,
          [orderId]
        );

        if (orderResult.rows.length === 0) {
          return res.status(404).json(errorResponse('Order not found'));
        }

        const order = orderResult.rows[0];

        // Get stock reservations
        const reservationsResult = await client.query(
          'SELECT * FROM stock_reservations WHERE order_id = $1',
          [orderId]
        );

        // Get order items
        const itemsResult = await client.query(
          'SELECT * FROM order_items WHERE order_id = $1',
          [orderId]
        );

        res.json(successResponse({
          message: 'Payment flow test completed',
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            payment_expires_at: order.payment_expires_at,
            stock_reserved: order.stock_reserved,
            total_amount: order.total_amount
          },
          payment: {
            status: order.payment_status,
            transaction_id: order.transaction_id
          },
          stockReservations: reservationsResult.rows,
          orderItems: itemsResult.rows,
          testResults: {
            hasActiveReservations: reservationsResult.rows.length > 0,
            isPaymentExpired: order.payment_expires_at && new Date(order.payment_expires_at) < new Date(),
            needsCleanup: order.payment_status === 'pending' && 
                         order.payment_expires_at && 
                         new Date(order.payment_expires_at) < new Date()
          }
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Payment flow test failed:', error);
      next(error);
    }
  };
}
