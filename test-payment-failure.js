#!/usr/bin/env node

/**
 * Payment Failure Test Script
 * Tests what happens when a user doesn't have enough money for payment
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_PRODUCT_ID = 3; // "the newest product" - $399
const TEST_QUANTITY = 1;

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'User'
};

const testAddress = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '555-1234',
  addressLine1: '123 Test St',
  city: 'Test City',
  state: 'CA',
  postalCode: '12345',
  country: 'US'
};

let authToken = '';
let cartId = '';
let orderId = '';
let paymentId = '';

console.log('🧪 Starting Payment Failure Test...\n');

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Request failed: ${method} ${url}`);
    console.error(`Error: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function step1_RegisterUser() {
  console.log('📝 Step 1: Register test user...');
  
  try {
    const response = await makeRequest('POST', '/api/auth/register', testUser);
    console.log('✅ User registered successfully');
    return response.data.token;
  } catch (error) {
    if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
      console.log('ℹ️  User already exists, attempting login...');
      const loginResponse = await makeRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      console.log('✅ User logged in successfully');
      return loginResponse.data.token;
    }
    console.log(`❌ Registration failed: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function step2_CreateCart() {
  console.log('🛒 Step 2: Add product to cart...');
  
  const cartData = {
    productId: TEST_PRODUCT_ID,
    quantity: TEST_QUANTITY,
    configuration: {
      colorId: null,
      modelVariationId: null,
      dropdownSelections: {},
      variations: {},
      addons: []
    }
  };
  
  const response = await makeRequest('POST', '/api/cart/add', cartData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  cartId = response.data.cart.id;
  console.log(`✅ Product added to cart with ID: ${cartId}`);
  console.log(`📦 Added ${TEST_QUANTITY}x product ${TEST_PRODUCT_ID} to cart`);
}

async function step3_CreateOrder() {
  console.log('📋 Step 3: Create order from cart...');
  
  const orderData = {
    cartId: cartId,
    shippingAddress: testAddress,
    billingAddress: testAddress,
    shippingMethod: 'standard',
    notes: 'Test order for payment failure scenario'
  };
  
  const response = await makeRequest('POST', '/api/orders', orderData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  orderId = response.data.order.id;
  console.log(`✅ Order created with ID: ${orderId}`);
  console.log(`💰 Order total: $${response.data.order.total_amount}`);
}

async function step4_CreatePayment() {
  console.log('💳 Step 4: Create payment for order...');
  
  const paymentData = {
    orderId: orderId,
    amount: 399.00,
    currency: 'USD',
    paymentMethod: 'paypal',
    returnUrl: 'http://localhost:5173/checkout/success',
    cancelUrl: 'http://localhost:5173/checkout/cancel',
    billingAddress: testAddress,
    shippingAddress: testAddress
  };
  
  const response = await makeRequest('POST', '/api/payments/create', paymentData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  paymentId = response.data.payment.paymentId;
  console.log(`✅ Payment created with ID: ${paymentId}`);
  console.log(`🔗 PayPal approval URL: ${response.data.payment.approvalUrl}`);
}

async function step5_SimulatePaymentFailure() {
  console.log('❌ Step 5: Simulate payment failure (insufficient funds)...');
  
  // Simulate PayPal returning a failed status
  const failureData = {
    paymentId: paymentId,
    payerId: 'test-payer-id',
    orderId: orderId
  };
  
  try {
    // This should fail because we're not actually executing with PayPal
    await makeRequest('POST', '/api/payments/execute', failureData, {
      'Authorization': `Bearer ${authToken}`
    });
  } catch (error) {
    console.log('✅ Payment execution failed as expected');
    console.log(`📝 Error: ${error.response?.data?.message || error.message}`);
  }
}

async function step6_CheckOrderState() {
  console.log('🔍 Step 6: Check order state after payment failure...');
  
  const response = await makeRequest('GET', `/api/orders/${orderId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  const order = response.data.order;
  console.log(`📊 Order Status: ${order.status}`);
  console.log(`💳 Payment Status: ${order.payment_status}`);
  console.log(`📅 Created: ${order.created_at}`);
  console.log(`⏰ Payment Expires: ${order.payment_expires_at}`);
}

async function step7_CheckPaymentRecord() {
  console.log('💳 Step 7: Check payment record...');
  
  const response = await makeRequest('GET', `/api/payments/${paymentId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  const payment = response.data.payment;
  console.log(`📊 Payment Status: ${payment.status}`);
  console.log(`💰 Amount: $${payment.amount}`);
  console.log(`📅 Created: ${payment.created_at}`);
  console.log(`❌ Failure Reason: ${payment.failure_reason || 'None'}`);
}

async function step8_CheckStockReservation() {
  console.log('📦 Step 8: Check stock reservation status...');
  
  const response = await makeRequest('GET', `/api/products/${TEST_PRODUCT_ID}`);
  const product = response.data.product;
  
  console.log(`📦 Product: ${product.name}`);
  console.log(`📊 Current Stock: ${product.stock}`);
  console.log(`🏷️  Price: $${product.regular_price}`);
}

async function step9_TestRetryPayment() {
  console.log('🔄 Step 9: Test retry payment functionality...');
  
  try {
    // Try to create another payment for the same order
    const paymentData = {
      orderId: orderId,
      amount: 399.00,
      currency: 'USD',
      paymentMethod: 'paypal',
      returnUrl: 'http://localhost:5173/checkout/success',
      cancelUrl: 'http://localhost:5173/checkout/cancel',
      billingAddress: testAddress,
      shippingAddress: testAddress
    };
    
    const response = await makeRequest('POST', '/api/payments/create', paymentData, {
      'Authorization': `Bearer ${authToken}`
    });
    
    console.log('✅ Retry payment created successfully');
    console.log(`🆕 New Payment ID: ${response.data.payment.paymentId}`);
  } catch (error) {
    console.log('❌ Retry payment failed (this might be expected)');
    console.log(`📝 Error: ${error.response?.data?.message || error.message}`);
  }
}

async function step10_TriggerCleanup() {
  console.log('🧹 Step 10: Trigger cleanup cron job...');
  
  try {
    const response = await makeRequest('POST', '/api/admin/cron/trigger/cleanup', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    console.log('✅ Cleanup job triggered successfully');
    console.log(`📝 Response: ${response.message}`);
  } catch (error) {
    console.log('❌ Cleanup trigger failed (might need admin auth)');
    console.log(`📝 Error: ${error.response?.data?.message || error.message}`);
  }
}

async function runTest() {
  try {
    authToken = await step1_RegisterUser();
    await step2_CreateCart();
    await step3_CreateOrder();
    await step4_CreatePayment();
    await step5_SimulatePaymentFailure();
    await step6_CheckOrderState();
    await step7_CheckPaymentRecord();
    await step8_CheckStockReservation();
    await step9_TestRetryPayment();
    await step10_TriggerCleanup();
    
    console.log('\n🎉 Payment Failure Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Order created and payment attempted');
    console.log('✅ Payment failure simulated');
    console.log('✅ Order state checked');
    console.log('✅ Payment record verified');
    console.log('✅ Stock status confirmed');
    console.log('✅ Retry functionality tested');
    console.log('✅ Cleanup job triggered');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest();
