/**
 * ShipStation XML Builder Utilities
 * Creates ShipStation-compliant XML responses for order export
 */

export interface ShipStationOrder {
  id: number;
  order_number: string;
  created_at: Date;
  status: string;
  payment_status: string;
  shipping_status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  customer_email: string;
  customer_phone?: string;
  billing_address: any;
  shipping_address: any;
  payment_method?: string;
  shipping_method?: string;
  notes?: string;
  items: ShipStationOrderItem[];
}

export interface ShipStationOrderItem {
  id: number;
  product_name: string;
  product_sku: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  configuration?: any;
}

export interface ShipStationTrackingData {
  order_number: string;
  tracking_number: string;
  carrier: string;
  shipped_date: string;
  service_code?: string;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date for ShipStation XML (MM/DD/YYYY HH:MM:SS AM/PM format)
 * ShipStation expects dates in the format: 10/26/2025 11:36:14 AM
 */
function formatDateForXML(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const hoursStr = String(hours).padStart(2, '0');
  
  return `${month}/${day}/${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Map internal order status to ShipStation status
 */
function mapOrderStatus(order: ShipStationOrder): string {
  // Only send paid orders to ShipStation
  if (order.payment_status !== 'paid') {
    return 'unpaid';
  }

  // Map based on shipping status
  switch (order.shipping_status) {
    case 'shipped':
    case 'in_transit':
      return 'shipped';
    case 'delivered':
      return 'shipped'; // ShipStation doesn't have delivered status
    case 'returned':
      return 'shipped'; // Handle returns separately
    default:
      return 'paid'; // awaiting shipment
  }
}

/**
 * Build customer XML element
 */
function buildCustomerXML(order: ShipStationOrder): string {
  const billing = order.billing_address || {};
  const shipping = order.shipping_address || {};
  
  // Use correct camelCase field names from Address interface
  return `
    <Customer>
      <CustomerCode>${escapeXml(order.customer_email)}</CustomerCode>
      <BillTo>
        <Name>${escapeXml(billing.firstName || '')} ${escapeXml(billing.lastName || '')}</Name>
        <Company>${escapeXml(billing.company || '')}</Company>
        <Address1>${escapeXml(billing.addressLine1 || '')}</Address1>
        <Address2>${escapeXml(billing.addressLine2 || '')}</Address2>
        <City>${escapeXml(billing.city || '')}</City>
        <State>${escapeXml(billing.state || '')}</State>
        <PostalCode>${escapeXml(billing.postalCode || '')}</PostalCode>
        <Country>${escapeXml(billing.country || 'US')}</Country>
        <Phone>${escapeXml(order.customer_phone || '')}</Phone>
        <Email>${escapeXml(order.customer_email)}</Email>
      </BillTo>
      <ShipTo>
        <Name>${escapeXml(shipping.firstName || '')} ${escapeXml(shipping.lastName || '')}</Name>
        <Company>${escapeXml(shipping.company || '')}</Company>
        <Address1>${escapeXml(shipping.addressLine1 || '')}</Address1>
        <Address2>${escapeXml(shipping.addressLine2 || '')}</Address2>
        <City>${escapeXml(shipping.city || '')}</City>
        <State>${escapeXml(shipping.state || '')}</State>
        <PostalCode>${escapeXml(shipping.postalCode || '')}</PostalCode>
        <Country>${escapeXml(shipping.country || 'US')}</Country>
        <Phone>${escapeXml(order.customer_phone || '')}</Phone>
      </ShipTo>
    </Customer>`;
}

/**
 * Build order items XML element
 */
function buildItemsXML(items: ShipStationOrderItem[]): string {
  const itemsXML = items.map(item => `
    <Item>
      <LineItemID>${item.id}</LineItemID>
      <SKU>${escapeXml(item.product_sku)}</SKU>
      <Name>${escapeXml(item.product_name)}</Name>
      <ImageUrl>${item.product_image ? escapeXml(item.product_image) : ''}</ImageUrl>
      <Weight>0</Weight>
      <WeightUnits>pounds</WeightUnits>
      <Quantity>${item.quantity}</Quantity>
      <UnitPrice>${item.unit_price.toFixed(2)}</UnitPrice>
      <Location></Location>
      <Options></Options>
    </Item>`).join('');

  return `<Items>${itemsXML}</Items>`;
}

/**
 * Build individual order XML element
 */
function buildOrderXML(order: ShipStationOrder): string {
  const orderStatus = mapOrderStatus(order);
  
  return `
  <Order>
    <OrderID>${order.id}</OrderID>
    <OrderNumber>${escapeXml(order.order_number)}</OrderNumber>
    <OrderDate>${formatDateForXML(order.created_at)}</OrderDate>
    <OrderStatus>${orderStatus}</OrderStatus>
    <LastModified>${formatDateForXML(order.created_at)}</LastModified>
    <ShippingMethod>${escapeXml(order.shipping_method || 'Standard Shipping')}</ShippingMethod>
    <PaymentMethod>${escapeXml(order.payment_method || 'PayPal')}</PaymentMethod>
    <OrderTotal>${order.total_amount.toFixed(2)}</OrderTotal>
    <TaxAmount>${order.tax_amount.toFixed(2)}</TaxAmount>
    <ShippingAmount>${order.shipping_amount.toFixed(2)}</ShippingAmount>
    <CustomerNotes>${escapeXml(order.notes || '')}</CustomerNotes>
    <InternalNotes></InternalNotes>
    <Gift>false</Gift>
    <GiftMessage></GiftMessage>
    ${buildCustomerXML(order)}
    ${buildItemsXML(order.items)}
  </Order>`;
}

/**
 * Build complete orders XML response
 */
export function buildOrdersXML(orders: ShipStationOrder[], totalPages: number = 1): string {
  const ordersXML = orders.map(buildOrderXML).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Orders pages="${totalPages}">
${ordersXML}
</Orders>`;
}

/**
 * Parse ShipStation shipment update XML
 */
export function parseShipmentUpdateXML(xmlBody: string): ShipStationTrackingData | null {
  try {
    // Simple XML parsing for shipment updates
    // ShipStation sends XML like:
    // <ShipNotice>
    //   <OrderNumber>ORDER123</OrderNumber>
    //   <TrackingNumber>1Z999AA1234567890</TrackingNumber>
    //   <Carrier>UPS</Carrier>
    //   <ShippedDate>2025-10-25T10:00:00</ShippedDate>
    // </ShipNotice>
    
    const orderNumberMatch = xmlBody.match(/<OrderNumber>(.*?)<\/OrderNumber>/);
    const trackingNumberMatch = xmlBody.match(/<TrackingNumber>(.*?)<\/TrackingNumber>/);
    const carrierMatch = xmlBody.match(/<Carrier>(.*?)<\/Carrier>/);
    const shippedDateMatch = xmlBody.match(/<ShippedDate>(.*?)<\/ShippedDate>/);
    const serviceCodeMatch = xmlBody.match(/<ServiceCode>(.*?)<\/ServiceCode>/);

    // Some fields might be missing or empty strings, so be flexible
    if (!orderNumberMatch) {
        console.error('Missing OrderNumber in XML');
        return null;
    }

    return {
      order_number: orderNumberMatch[1],
      tracking_number: trackingNumberMatch ? trackingNumberMatch[1] : '',
      carrier: carrierMatch ? carrierMatch[1] : 'Unknown',
      shipped_date: shippedDateMatch ? shippedDateMatch[1] : new Date().toISOString(),
      service_code: serviceCodeMatch ? serviceCodeMatch[1] : undefined
    };
  } catch (error) {
    console.error('Error parsing ShipStation XML:', error);
    return null;
  }
}

/**
 * Build success response XML for shipment updates
 */
export function buildSuccessResponseXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Status>Success</Status>
  <Message>Shipment update processed successfully</Message>
</Response>`;
}

/**
 * Build error response XML
 */
export function buildErrorResponseXML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Status>Error</Status>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}
