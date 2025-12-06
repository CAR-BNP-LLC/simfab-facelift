/**
 * ShipStation Controller
 * Handles HTTP requests for ShipStation Custom Store integration
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ShipStationService } from '../services/ShipStationService';
import { 
  buildSuccessResponseXML, 
  buildErrorResponseXML,
  buildOrdersXML 
} from '../utils/shipstationXML';
import { ShipStationRequest } from '../middleware/shipstationAuth';

export class ShipStationController {
  private shipStationService: ShipStationService;

  constructor(pool: Pool) {
    this.shipStationService = new ShipStationService(pool);
  }

  /**
   * Export orders to ShipStation (GET/POST endpoint)
   * ShipStation calls this endpoint to pull orders
   */
  exportOrders = async (req: ShipStationRequest, res: Response, next: NextFunction) => {
    try {
      // Get parameters from query string or body (POST requests may have params in body)
      const action = req.query.action || req.body?.action;
      const start_date = req.query.start_date || req.body?.start_date;
      const end_date = req.query.end_date || req.body?.end_date;
      const page = req.query.page || req.body?.page;

      // Handle shipment notification (ShipStation sends these to the orders endpoint)
      if (action === 'shipnotify') {
        // Helper to get value from query or body, handling empty strings
        const getParam = (key: string) => {
          const queryVal = req.query[key];
          const bodyVal = req.body?.[key];
          return (typeof queryVal === 'string' && queryVal.trim() !== '') ? queryVal : 
                 (typeof bodyVal === 'string' && bodyVal.trim() !== '') ? bodyVal : undefined;
        };
        
        const trackingData = {
          order_number: getParam('order_number'),
          tracking_number: getParam('tracking_number'),
          carrier: getParam('carrier'),
          shipped_date: new Date().toISOString(),
          service_code: getParam('service')
        };

        // Order number and carrier are required, tracking_number is optional (may be assigned later)
        if (!trackingData.order_number || !trackingData.carrier) {
          console.error('Missing required shipment data:', trackingData);
          return res.status(400).send(buildErrorResponseXML('Missing required shipment data. Required: order_number, carrier'));
        }

        // If tracking number is not provided, we can still process the shipment notification
        if (!trackingData.tracking_number) {
          console.warn('Tracking number not provided, proceeding with shipment update anyway');
        }

        const success = await this.shipStationService.processShipmentUpdateByData(trackingData);
        
        if (success) {
          res.set('Content-Type', 'application/xml; charset=utf-8');
          res.send(buildSuccessResponseXML());
        } else {
          console.error('Failed to process shipment notification');
          res.status(400).send(buildErrorResponseXML('Failed to process shipment update'));
        }
        return;
      }

      // Handle order export
      if (action !== 'export') {
        console.error('Invalid action parameter:', action);
        return res.status(400).send(buildErrorResponseXML(`Invalid action parameter: ${action}. Expected 'export' or 'shipnotify'`));
      }

      if (!start_date || !end_date) {
        console.error('Missing date parameters:', { start_date, end_date });
        return res.status(400).send(buildErrorResponseXML('Missing start_date or end_date parameter'));
      }

      // Parse dates
      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);
      const pageNum = parseInt(page as string) || 1;

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date format:', { start_date, end_date });
        return res.status(400).send(buildErrorResponseXML('Invalid date format'));
      }

      // Ensure end date is not before start date
      if (endDate < startDate) {
        console.error('End date before start date');
        return res.status(400).send(buildErrorResponseXML('End date must be after start date'));
      }

      // Limit date range to prevent excessive data requests
      const maxDays = 30;
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        console.error('Date range too large:', daysDiff);
        return res.status(400).send(buildErrorResponseXML(`Date range cannot exceed ${maxDays} days`));
      }

      // Generate XML response
      const xmlResponse = await this.shipStationService.getOrdersXML(startDate, endDate, pageNum);
      
      // Set appropriate headers for XML response
      res.set({
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.send(xmlResponse);
    } catch (error) {
      console.error('Error in ShipStation export:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(500).send(buildErrorResponseXML('Internal server error'));
    }
  };

  /**
   * Handle shipment updates from ShipStation (POST endpoint)
   * ShipStation sends tracking information back to us
   */
  updateShipment = async (req: ShipStationRequest, res: Response, next: NextFunction) => {
    try {
      // Get XML body from ShipStation
      const xmlBody = req.body;
      
      console.log('ShipStation Update Body Type:', typeof xmlBody);
      console.log('ShipStation Update Body Length:', xmlBody ? xmlBody.length : 0);
      console.log('ShipStation Update Body Preview:', xmlBody ? (typeof xmlBody === 'string' ? xmlBody.substring(0, 100) : JSON.stringify(xmlBody)) : 'null');

      if (!xmlBody || typeof xmlBody !== 'string') {
        const debugInfo = {
          type: typeof xmlBody,
          isNull: xmlBody === null,
          isUndefined: xmlBody === undefined,
          isObject: typeof xmlBody === 'object',
          preview: typeof xmlBody === 'object' ? JSON.stringify(xmlBody) : String(xmlBody)
        };
        console.error('Invalid XML body received:', debugInfo);
        
        // Return raw JSON for debugging instead of XML to see the full object
        return res.status(400).send(`Invalid XML body. Debug info: ${JSON.stringify(debugInfo)}`);
      }

      // Process the shipment update
      const success = await this.shipStationService.processShipmentUpdate(xmlBody);

      if (success) {
        res.set({
          'Content-Type': 'application/xml; charset=utf-8'
        });
        res.send(buildSuccessResponseXML());
      } else {
        res.status(400).send(buildErrorResponseXML('Failed to process shipment update'));
      }
    } catch (error) {
      console.error('Error processing ShipStation shipment update:', error);
      res.status(500).send(buildErrorResponseXML('Internal server error'));
    }
  };

  /**
   * Test endpoint for ShipStation connection validation
   * Returns sample XML for testing purposes
   */
  testConnection = async (req: ShipStationRequest, res: Response, next: NextFunction) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).send(buildErrorResponseXML('Test endpoint not available in production'));
      }

      // Get a sample order for testing
      const sampleOrder = await this.shipStationService.getOrderByNumber('TEST-ORDER-001');
      
      if (!sampleOrder) {
        // Create a mock order for testing
        const mockOrder = {
          id: 999,
          order_number: 'TEST-ORDER-001',
          created_at: new Date(),
          status: 'processing',
          payment_status: 'paid',
          shipping_status: 'pending',
          subtotal: 100.00,
          tax_amount: 8.00,
          shipping_amount: 10.00,
          discount_amount: 0.00,
          total_amount: 118.00,
          currency: 'USD',
          customer_email: 'test@example.com',
          customer_phone: '555-123-4567',
          billing_address: {
            first_name: 'John',
            last_name: 'Doe',
            company: 'Test Company',
            address1: '123 Test St',
            address2: '',
            city: 'Test City',
            state: 'CA',
            postal_code: '12345',
            country: 'US'
          },
          shipping_address: {
            first_name: 'John',
            last_name: 'Doe',
            company: 'Test Company',
            address1: '123 Test St',
            address2: '',
            city: 'Test City',
            state: 'CA',
            postal_code: '12345',
            country: 'US'
          },
          payment_method: 'PayPal',
          shipping_method: 'Standard Shipping',
          notes: 'Test order for ShipStation integration',
          items: [
            {
              id: 1,
              product_name: 'Test Product',
              product_sku: 'TEST-SKU-001',
              quantity: 1,
              unit_price: 100.00,
              total_price: 100.00,
              configuration: {}
            }
          ]
        };

        const xmlResponse = buildOrdersXML([mockOrder], 1);
        
        res.set({
          'Content-Type': 'application/xml; charset=utf-8'
        });
        
        res.send(xmlResponse);
      } else {
        const xmlResponse = buildOrdersXML([sampleOrder], 1);
        
        res.set({
          'Content-Type': 'application/xml; charset=utf-8'
        });
        
        res.send(xmlResponse);
      }
    } catch (error) {
      console.error('Error in ShipStation test connection:', error);
      res.status(500).send(buildErrorResponseXML('Test connection failed'));
    }
  };

  /**
   * Health check endpoint for ShipStation integration
   */
  healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enabled = process.env.SHIPSTATION_ENABLED === 'true';
      const hasCredentials = !!(process.env.SHIPSTATION_USERNAME && process.env.SHIPSTATION_PASSWORD);

      res.json({
        success: true,
        data: {
          enabled,
          hasCredentials,
          status: enabled && hasCredentials ? 'ready' : 'not_configured',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in ShipStation health check:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Health check failed'
        }
      });
    }
  };
}
