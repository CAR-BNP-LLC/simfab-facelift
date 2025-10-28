# Phase 4: Integration

**Goal**: Integrate email sending with order lifecycle  
**Time**: 2-3 hours  
**Priority**: HIGH

---

## 📋 Tasks

- [ ] Update `orderController.ts` to send emails on order creation
- [ ] Update `paymentController.ts` for payment events
- [ ] Update `adminOrderController.ts` for status changes
- [ ] Update `authController.ts` for password reset and new accounts
- [ ] Test all integration points

---

## 🔗 Integration Points

### 1. Order Creation (`server/src/controllers/orderController.ts`)

After successful order creation:

```typescript
import { EmailService } from '../services/EmailService';

// In orderController.ts
export class OrderController {
  private emailService: EmailService;

  constructor(pool: Pool) {
    this.emailService = new EmailService(pool);
    this.emailService.initialize();
  }

  async createOrder(req: Request, res: Response) {
    // ... existing order creation code ...
    
    // After order is created successfully
    await this.emailService.sendEmail({
      templateType: 'new_order_admin',
      recipientEmail: 'info@simfab.com',
      variables: {
        order_number: order.order_number,
        customer_name: order.customer_email,
        order_total: `$${order.total_amount.toFixed(2)}`,
        order_date: order.created_at.toLocaleDateString()
      }
    });
    
    res.json(order);
  }
}
```

---

### 2. Order Status Changes (`server/src/controllers/adminOrderController.ts`)

When admin changes order status:

```typescript
async updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  
  // ... update order status ...
  
  // Send appropriate email based on status
  let templateType = '';
  if (status === 'processing') templateType = 'order_processing';
  else if (status === 'shipped' || status === 'delivered') templateType = 'order_completed';
  else if (status === 'cancelled') templateType = 'order_cancelled_customer';
  
  if (templateType) {
    await this.emailService.sendEmail({
      templateType,
      recipientEmail: order.customer_email,
      variables: {
        order_number: order.order_number,
        customer_name: order.customer_email,
        order_total: `$${order.total_amount.toFixed(2)}`
      }
    });
  }
}
```

---

### 3. Payment Failure (`server/src/controllers/paymentController.ts`)

When payment fails:

```typescript
async handlePaymentFailure(orderId: number, error: string) {
  // ... existing failure handling ...
  
  // Send emails
  const order = await getOrder(orderId);
  
  // Admin notification
  await this.emailService.sendEmail({
    templateType: 'order_failed_admin',
    recipientEmail: 'info@simfab.com',
    variables: {
      order_number: order.order_number,
      customer_email: order.customer_email,
      error_message: error
    }
  });
  
  // Customer notification
  await this.emailService.sendEmail({
    templateType: 'order_failed_customer',
    recipientEmail: order.customer_email,
    variables: {
      order_number: order.order_number,
      order_total: `$${order.total_amount.toFixed(2)}`
    }
  });
}
```

---

### 4. Password Reset (`server/src/controllers/authController.ts`)

When password reset is requested:

```typescript
async requestPasswordReset(req: Request, res: Response) {
  const { email } = req.body;
  
  // ... generate reset token ...
  
  await this.emailService.sendEmail({
    templateType: 'reset_password',
    recipientEmail: email,
    variables: {
      reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
      expire_hours: '24'
    }
  });
  
  res.json({ message: 'Reset email sent' });
}
```

---

### 5. New Account (`server/src/controllers/authController.ts`)

When user creates account:

```typescript
async createAccount(req: Request, res: Response) {
  // ... create user account ...
  
  await this.emailService.sendEmail({
    templateType: 'new_account',
    recipientEmail: user.email,
    variables: {
      customer_name: user.first_name || user.email,
      login_url: `${process.env.FRONTEND_URL}/login`
    }
  });
  
  res.json(user);
}
```

---

## 📊 Integration Flow Map

```
Order Created
├── Send new_order_admin → info@simfab.com
│
Payment Success
├── Send order_processing → customer@example.com
│
Status Change: Shipped
├── Send order_completed → customer@example.com
│
Status Change: Cancelled
├── Send order_cancelled_customer → customer@example.com
└── Send order_cancelled_admin → info@simfab.com
│
Payment Failed
├── Send order_failed_customer → customer@example.com
└── Send order_failed_admin → info@simfab.com
```

---

## 🧪 Testing Checklist

- [ ] Create order → verify admin email received
- [ ] Change order to "processing" → verify customer email
- [ ] Change order to "completed" → verify customer email
- [ ] Cancel order → verify both emails sent
- [ ] Request password reset → verify reset email
- [ ] Create account → verify welcome email
- [ ] Test payment failure → verify both error emails

---

## ✅ Success Criteria

- [x] All order events send appropriate emails
- [x] Customer emails sent to correct recipient
- [x] Admin emails sent to info@simfab.com
- [x] Email variables populated from order data
- [x] No missing email triggers
- [x] Test mode works (emails logged to console)

---

## 🔧 Email Service Integration

Make sure to initialize EmailService in your main file:

```typescript
// server/src/index.ts
import { EmailService } from './services/EmailService';

const emailService = new EmailService(pool);
await emailService.initialize();
console.log('Email service initialized');
```

---

**Next Phase**: [Phase 5: Email Templates](./PHASE_5_EMAIL_TEMPLATES.md)

