# 💳 Payment Implementation - Phase 1: Backend Payment Infrastructure

**Duration**: Week 1 (5 days)  
**Complexity**: High  
**Dependencies**: Existing order system, database schema

---

## 🎯 Phase 1 Objectives

### **Primary Goals**
1. **PayPal SDK Integration**: Set up PayPal server-side SDK
2. **Payment Service**: Create core payment processing logic
3. **Payment Controller**: Handle payment API endpoints
4. **Webhook System**: Process PayPal webhook events
5. **Database Integration**: Connect payments to existing order system

---

## 📋 Day-by-Day Implementation Plan

### **Day 1-2: PayPal SDK Setup & Configuration**

#### **1.1 Install Dependencies**
```bash
cd server
npm install @paypal/checkout-server-sdk
npm install @types/paypal__checkout-server-sdk
```

#### **1.2 Environment Configuration**
Create/update `.env` file:
```env
# PayPal Configuration
PAYPAL_CLIENT_ID=sandbox_client_id_here
PAYPAL_CLIENT_SECRET=sandbox_client_secret_here
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=sandbox_webhook_id_here

# For production (when ready)
PAYPAL_CLIENT_ID_PROD=live_client_id_here
PAYPAL_CLIENT_SECRET_PROD=live_client_secret_here
PAYPAL_MODE_PROD=live
```

#### **1.3 PayPal Client Configuration**
Create `server/src/config/paypal.ts`:
```typescript
import { checkoutNodeJssdk } from '@paypal/checkout-server-sdk';

const environment = process.env.NODE_ENV === 'production' 
  ? new checkoutNodeJssdk.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID_PROD!,
      process.env.PAYPAL_CLIENT_SECRET_PROD!
    )
  : new checkoutNodeJssdk.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID!,
      process.env.PAYPAL_CLIENT_SECRET!
    );

export const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(environment);

export const paypalConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  clientId: process.env.NODE_ENV === 'production' 
    ? process.env.PAYPAL_CLIENT_ID_PROD 
    : process.env.PAYPAL_CLIENT_ID,
  webhookId: process.env.PAYPAL_WEBHOOK_ID
};
```

---

### **Day 3-4: Payment Service Implementation**

#### **1.4 Create PaymentService**
Create `server/src/services/PaymentService.ts`:
```typescript
import { Pool } from 'pg';
import { paypalClient } from '../config/paypal';
import { checkoutNodeJssdk } from '@paypal/checkout-server-sdk';
import { PaymentError } from '../utils/errors';

export interface CreatePaymentData {
  orderId: number;
  amount: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentResult {
  paymentId: string;
  approvalUrl: string;
  status: string;
}

export class PaymentService {
  constructor(private pool: Pool) {}

  async createPayment(data: CreatePaymentData): Promise<PaymentResult> {
    const client = await this.pool.connect();
    
    try {
      // Create PayPal payment request
      const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: data.currency,
            value: data.amount.toString()
          },
          custom_id: data.orderId.toString()
        }],
        application_context: {
          return_url: data.returnUrl,
          cancel_url: data.cancelUrl,
          brand_name: 'SimFab',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      });

      // Execute PayPal request
      const response = await paypalClient.execute(request);
      const payment = response.result;

      // Save payment record to database
      await this.savePaymentRecord(data.orderId, payment.id!, data.amount, data.currency);

      return {
        paymentId: payment.id!,
        approvalUrl: payment.links?.find(link => link.rel === 'approve')?.href!,
        status: payment.status!
      };
    } catch (error) {
      console.error('Payment creation failed:', error);
      throw new PaymentError('Failed to create payment');
    } finally {
      client.release();
    }
  }

  async executePayment(paymentId: string, payerId: string, orderId: number): Promise<PaymentResult> {
    const client = await this.pool.connect();
    
    try {
      // Execute PayPal payment
      const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(paymentId);
      request.requestBody({});

      const response = await paypalClient.execute(request);
      const capture = response.result;

      // Update payment record
      await this.updatePaymentStatus(paymentId, 'completed', capture.id);

      // Update order status
      await this.updateOrderPaymentStatus(orderId, 'paid');

      return {
        paymentId: capture.id!,
        approvalUrl: '',
        status: capture.status!
      };
    } catch (error) {
      console.error('Payment execution failed:', error);
      await this.updatePaymentStatus(paymentId, 'failed');
      throw new PaymentError('Failed to execute payment');
    } finally {
      client.release();
    }
  }

  private async savePaymentRecord(orderId: number, paymentId: string, amount: number, currency: string) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO payments (order_id, payment_method, payment_provider, transaction_id, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, 'paypal', 'paypal', paymentId, amount, currency, 'pending']
      );
    } finally {
      client.release();
    }
  }

  private async updatePaymentStatus(paymentId: string, status: string, transactionId?: string) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE payments SET status = $1, transaction_id = COALESCE($2, transaction_id), completed_at = CURRENT_TIMESTAMP
         WHERE transaction_id = $3`,
        [status, transactionId, paymentId]
      );
    } finally {
      client.release();
    }
  }

  private async updateOrderPaymentStatus(orderId: number, status: string) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE orders SET payment_status = $1 WHERE id = $2`,
        [status, orderId]
      );
    } finally {
      client.release();
    }
  }
}
```

---

### **Day 5: Payment Controller & Routes**

#### **1.5 Payment Controller**
Create `server/src/controllers/paymentController.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { PaymentService } from '../services/PaymentService';
import { successResponse, errorResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class PaymentController {
  private paymentService: PaymentService;

  constructor(pool: Pool) {
    this.paymentService = new PaymentService(pool);
  }

  createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, currency, returnUrl, cancelUrl } = req.body;

      if (!orderId || !amount || !currency) {
        throw new ValidationError('Missing required payment data');
      }

      const paymentData = {
        orderId,
        amount,
        currency,
        returnUrl: returnUrl || `${process.env.FRONTEND_URL}/checkout/success`,
        cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/checkout/cancel`
      };

      const result = await this.paymentService.createPayment(paymentData);

      res.status(201).json(successResponse({
        payment: result,
        message: 'Payment created successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  executePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId, payerId } = req.body;
      const orderId = req.body.orderId;

      if (!paymentId || !payerId || !orderId) {
        throw new ValidationError('Missing required payment execution data');
      }

      const result = await this.paymentService.executePayment(paymentId, payerId, orderId);

      res.json(successResponse({
        payment: result,
        message: 'Payment executed successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentId } = req.params;
      
      // Implementation to get payment status from database
      const client = await this.paymentService.pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM payments WHERE transaction_id = $1',
          [paymentId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json(errorResponse('Payment not found'));
        }

        res.json(successResponse({
          payment: result.rows[0]
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  };
}
```

#### **1.6 Payment Routes**
Create `server/src/routes/payments.ts`:
```typescript
import { Router } from 'express';
import { Pool } from 'pg';
import { PaymentController } from '../controllers/paymentController';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';

export const createPaymentRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new PaymentController(pool);

  // Apply rate limiting
  router.use(apiRateLimiter);

  /**
   * @route   POST /api/payments/create
   * @desc    Create PayPal payment
   * @access  Public (with order validation)
   */
  router.post('/create', controller.createPayment);

  /**
   * @route   POST /api/payments/execute
   * @desc    Execute PayPal payment
   * @access  Public (with validation)
   */
  router.post('/execute', controller.executePayment);

  /**
   * @route   GET /api/payments/:paymentId
   * @desc    Get payment status
   * @access  Public
   */
  router.get('/:paymentId', controller.getPaymentStatus);

  return router;
};
```

#### **1.7 Update Main Server**
Update `server/src/index.ts`:
```typescript
// Add payment routes
import { createPaymentRoutes } from './routes/payments';

// After other route imports
app.use('/api/payments', createPaymentRoutes(pool));
```

---

## 🔧 Required Database Updates

### **Payment Table Enhancement**
```sql
-- Add additional columns if needed
ALTER TABLE payments ADD COLUMN IF NOT EXISTS return_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cancel_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_events JSONB DEFAULT '[]';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(transaction_id);
```

---

## ✅ Phase 1 Deliverables

### **Backend Components Created**
- ✅ PayPal SDK configuration
- ✅ PaymentService with core functionality
- ✅ PaymentController with API endpoints
- ✅ Payment routes with validation
- ✅ Database integration

### **API Endpoints Ready**
- ✅ `POST /api/payments/create` - Create PayPal payment
- ✅ `POST /api/payments/execute` - Execute PayPal payment
- ✅ `GET /api/payments/:paymentId` - Get payment status

### **Testing Checklist**
- ✅ PayPal SDK connection
- ✅ Payment creation flow
- ✅ Database payment records
- ✅ Error handling
- ✅ Input validation

---

## 🚀 Next Steps

**Phase 1 Completion Criteria:**
- All backend payment infrastructure is implemented
- PayPal SDK is properly configured
- Payment API endpoints are functional
- Database integration is working
- Basic error handling is in place

**Ready for Phase 2:** Frontend Payment Integration

---

**Status**: 📋 Ready for Implementation  
**Estimated Time**: 5 days  
**Dependencies**: PayPal Developer Account, Environment Variables
