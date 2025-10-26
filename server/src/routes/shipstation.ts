/**
 * ShipStation Routes
 * Routes for ShipStation Custom Store integration
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { ShipStationController } from '../controllers/shipstationController';
import { shipstationAuth, optionalShipstationAuth } from '../middleware/shipstationAuth';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const createShipStationRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new ShipStationController(pool);

  // Apply rate limiting to all ShipStation routes
  router.use(apiRateLimiter);

  /**
   * @route   GET /api/shipstation/orders
   * @desc    Export orders to ShipStation (order pull)
   * @access  ShipStation Basic Auth
   * @query   action=export&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&page=1
   */
  router.get(
    '/orders',
    shipstationAuth,
    controller.exportOrders
  );

  /**
   * @route   POST /api/shipstation/orders
   * @desc    Alternative endpoint for order export (some ShipStation configs use POST)
   * @access  ShipStation Basic Auth
   * @query   action=export&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&page=1
   */
  router.post(
    '/orders',
    shipstationAuth,
    controller.exportOrders
  );

  /**
   * @route   POST /api/shipstation/shipmentupdate
   * @desc    Receive shipment updates from ShipStation
   * @access  ShipStation Basic Auth
   * @body    XML with tracking information
   */
  router.post(
    '/shipmentupdate',
    shipstationAuth,
    controller.updateShipment
  );

  /**
   * @route   GET /api/shipstation/test
   * @desc    Test endpoint for ShipStation connection validation
   * @access  ShipStation Basic Auth (optional)
   * @note    Only available in development mode
   */
  router.get(
    '/test',
    optionalShipstationAuth,
    controller.testConnection
  );

  /**
   * @route   GET /api/shipstation/health
   * @desc    Health check for ShipStation integration status
   * @access  Public
   */
  router.get(
    '/health',
    controller.healthCheck
  );

  return router;
};
