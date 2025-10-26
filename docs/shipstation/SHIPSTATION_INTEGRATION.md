# ShipStation Custom Store Integration

## Overview

This document describes the ShipStation Custom Store integration implemented for the SimFab e-commerce platform. The integration allows ShipStation to pull paid orders and push back shipment tracking information through XML-based API endpoints.

## Architecture

The integration consists of several components:

- **XML Builder Utilities** (`server/src/utils/shipstationXML.ts`) - Creates ShipStation-compliant XML responses
- **ShipStation Service** (`server/src/services/ShipStationService.ts`) - Core business logic for order fetching and tracking updates
- **Authentication Middleware** (`server/src/middleware/shipstationAuth.ts`) - Basic HTTP Auth for ShipStation endpoints
- **Controller** (`server/src/controllers/shipstationController.ts`) - HTTP request handlers
- **Routes** (`server/src/routes/shipstation.ts`) - API endpoint definitions

## Setup Instructions

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# ShipStation Custom Store Configuration
SHIPSTATION_USERNAME=your_shipstation_username
SHIPSTATION_PASSWORD=your_shipstation_password
SHIPSTATION_ENABLED=true
```

**Security Note**: Use strong, unique credentials for ShipStation authentication. These credentials will be used for Basic HTTP Auth on all ShipStation endpoints.

### 2. Database Migration

Run the database migration to add ShipStation-specific indexes:

```bash
cd server
npm run migrate:up
```

This will create optimized indexes for:
- Order export queries (payment_status + created_at)
- Order number lookups for shipment updates
- Order status history queries

### 3. ShipStation Dashboard Configuration

In your ShipStation dashboard, configure the Custom Store connection:

1. Go to **Account Settings** > **Selling Channels** > **Store Setup**
2. Click **Connect a Store or Marketplace**
3. Select **Custom Store**
4. Configure the following settings:

| Field | Value | Description |
|-------|-------|-------------|
| **URL to Custom XML Page** | `https://yourdomain.com/api/shipstation/orders` | Main endpoint for order export |
| **Username** | Value from `SHIPSTATION_USERNAME` env var | Basic HTTP Auth username |
| **Password** | Value from `SHIPSTATION_PASSWORD` env var | Basic HTTP Auth password |
| **Awaiting Payment Status** | `unpaid` | Not used (we only send paid orders) |
| **Awaiting Shipment Status** | `paid` | Orders ready for shipping |
| **Shipped Status** | `shipped` | Orders that have been shipped |
| **Cancelled Status** | `cancelled` | Cancelled orders |
| **On-Hold Status** | `on_hold` | Orders on hold |

## API Endpoints

### Order Export (GET/POST)
- **URL**: `/api/shipstation/orders`
- **Method**: GET or POST
- **Authentication**: Basic HTTP Auth
- **Query Parameters**:
  - `action=export` (required)
  - `start_date=YYYY-MM-DD` (required)
  - `end_date=YYYY-MM-DD` (required)
  - `page=1` (optional, defaults to 1)

**Response**: XML document containing orders in ShipStation format

### Shipment Update (POST)
- **URL**: `/api/shipstation/shipmentupdate`
- **Method**: POST
- **Authentication**: Basic HTTP Auth
- **Body**: XML with tracking information

**Response**: XML success/error response

### Health Check (GET)
- **URL**: `/api/shipstation/health`
- **Method**: GET
- **Authentication**: None
- **Response**: JSON with integration status

### Test Connection (GET)
- **URL**: `/api/shipstation/test`
- **Method**: GET
- **Authentication**: Optional Basic HTTP Auth
- **Response**: Sample XML for testing
- **Note**: Only available in development mode

## Order Status Mapping

The integration maps internal order statuses to ShipStation statuses as follows:

| Internal Status | ShipStation Status | Description |
|----------------|-------------------|-------------|
| `payment_status = 'paid'` AND `shipping_status = 'pending'` | `paid` | Awaiting shipment |
| `shipping_status = 'shipped'` | `shipped` | Order shipped |
| `shipping_status = 'in_transit'` | `shipped` | In transit |
| `shipping_status = 'delivered'` | `shipped` | Delivered |
| `status = 'cancelled'` | `cancelled` | Order cancelled |
| `status = 'on_hold'` | `on_hold` | Order on hold |

**Important**: Only orders with `payment_status = 'paid'` are sent to ShipStation.

## XML Response Format

### Order Export XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Orders pages="1">
  <Order>
    <OrderID>123</OrderID>
    <OrderNumber>ORDER-001</OrderNumber>
    <OrderDate>2025-10-25T10:00:00.000Z</OrderDate>
    <OrderStatus>paid</OrderStatus>
    <LastModifiedDate>2025-10-25T10:00:00.000Z</LastModifiedDate>
    <ShippingMethod>Standard Shipping</ShippingMethod>
    <PaymentMethod>PayPal</PaymentMethod>
    <OrderTotal>118.00</OrderTotal>
    <TaxAmount>8.00</TaxAmount>
    <ShippingAmount>10.00</ShippingAmount>
    <CustomerNotes>Customer notes here</CustomerNotes>
    <InternalNotes></InternalNotes>
    <Gift>false</Gift>
    <GiftMessage></GiftMessage>
    <Customer>
      <CustomerCode>customer@example.com</CustomerCode>
      <BillTo>
        <Name>John Doe</Name>
        <Company>Test Company</Company>
        <Address1>123 Test St</Address1>
        <Address2></Address2>
        <City>Test City</City>
        <State>CA</State>
        <PostalCode>12345</PostalCode>
        <Country>US</Country>
        <Phone>555-123-4567</Phone>
        <Email>customer@example.com</Email>
      </BillTo>
    </Customer>
    <ShippingAddress>
      <Name>John Doe</Name>
      <Company>Test Company</Company>
      <Address1>123 Test St</Address1>
      <Address2></Address2>
      <City>Test City</City>
      <State>CA</State>
      <PostalCode>12345</PostalCode>
      <Country>US</Country>
      <Phone>555-123-4567</Phone>
    </ShippingAddress>
    <Items>
      <Item>
        <SKU>PRODUCT-SKU-001</SKU>
        <Name>Test Product</Name>
        <ImageUrl></ImageUrl>
        <Weight>0</Weight>
        <WeightUnits>pounds</WeightUnits>
        <Quantity>1</Quantity>
        <UnitPrice>100.00</UnitPrice>
        <Location></Location>
        <Options></Options>
        <ProductID>1</ProductID>
      </Item>
    </Items>
  </Order>
</Orders>
```

### Shipment Update XML (from ShipStation)

```xml
<ShipNotice>
  <OrderNumber>ORDER-001</OrderNumber>
  <TrackingNumber>1Z999AA1234567890</TrackingNumber>
  <Carrier>UPS</Carrier>
  <ShippedDate>2025-10-25T10:00:00</ShippedDate>
  <ServiceCode>UPS Ground</ServiceCode>
</ShipNotice>
```

## Testing

### 1. Test Connection

Use ShipStation's "Test Connection" feature in the dashboard to verify the integration is working.

### 2. Manual Testing

Test the health check endpoint:

```bash
curl https://yourdomain.com/api/shipstation/health
```

Test order export (replace credentials):

```bash
curl -u "username:password" \
  "https://yourdomain.com/api/shipstation/orders?action=export&start_date=2025-01-01&end_date=2025-12-31&page=1"
```

### 3. Development Testing

In development mode, you can test with sample data:

```bash
curl -u "username:password" \
  "https://yourdomain.com/api/shipstation/test"
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that `SHIPSTATION_USERNAME` and `SHIPSTATION_PASSWORD` are set correctly
   - Verify credentials match those configured in ShipStation dashboard
   - Ensure `SHIPSTATION_ENABLED=true`

2. **No Orders Returned**
   - Verify orders exist with `payment_status = 'paid'`
   - Check date range parameters
   - Ensure orders are within the specified date range

3. **XML Parsing Errors**
   - Verify XML format matches ShipStation requirements
   - Check for special characters in order data
   - Ensure all required fields are present

4. **Shipment Updates Not Processing**
   - Check XML format of incoming shipment data
   - Verify order number exists in database
   - Check order status is eligible for shipment update

### Logging

The integration logs all ShipStation requests and responses. Check server logs for:
- Authentication attempts
- Order export requests
- Shipment update processing
- Error messages

### Performance Considerations

- Orders are paginated (100 per page by default)
- Date range is limited to 30 days maximum
- Database indexes optimize query performance
- Rate limiting prevents abuse

## Security Considerations

1. **Authentication**: Basic HTTP Auth with strong credentials
2. **Rate Limiting**: Applied to all ShipStation endpoints
3. **Input Validation**: All incoming data is validated
4. **Logging**: All requests are logged for audit trail
5. **Environment Variables**: Credentials stored securely in environment

## Future Enhancements

Potential improvements for future versions:

- Email notifications when orders are shipped
- Admin UI for viewing sync status and manual operations
- Webhook support for real-time updates
- Automatic retry for failed syncs
- Detailed sync logging and monitoring
- Support for multiple ShipStation accounts
- Advanced order filtering options

## Support

For issues with the ShipStation integration:

1. Check server logs for error messages
2. Verify environment configuration
3. Test with ShipStation's connection test feature
4. Review this documentation for troubleshooting steps

The integration follows ShipStation's Custom Store Development Guide and implements all required functionality for basic order export and shipment update processing.
