# Shipping System Implementation Plan

## Overview
This document outlines the implementation of an enhanced shipping system with country-based pricing, shipping quotes for international orders, and automated invoice generation.

## Table of Contents
1. [Shipping Pricing Structure](#shipping-pricing-structure)
2. [Database Schema Changes](#database-schema-changes)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Implementation](#backend-implementation)
5. [Admin Dashboard Updates](#admin-dashboard-updates)
6. [Email System Integration](#email-system-integration)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)

## Shipping Pricing Structure

### US Domestic Shipping
- **Continental US (excluding Alaska & Hawaii)**
  - Orders ≥ $50: **FREE SHIPPING**
  - Orders < $50: **$9.99** flat rate

### US Territories Shipping
- **Alaska & Hawaii**
  - Small Package (S): **$30**
  - Medium Package (M): **$50**
  - Large Package (L): **$150**

### Canada Shipping
- Small Package (S): **$35**
  - Medium Package (M): **$100**
  - Large Package (L): **$200**

### International Shipping
- **All other countries**: Contact for shipping quote
- No automatic calculation available
- Manual quote process required

## Database Schema Changes

### 1. Shipping Methods Table
```sql
-- Add new shipping methods
INSERT INTO shipping_methods (id, name, description, price, carrier, country_code, package_size, min_order_amount) VALUES
('us_free', 'Free Shipping (US)', 'Free shipping for orders over $50', 0, 'USPS', 'US', NULL, 50),
('us_standard', 'Standard Shipping (US)', 'Standard shipping for orders under $50', 9.99, 'USPS', 'US', NULL, 0),
('us_territories_s', 'US Territories - Small', 'Shipping to Alaska/Hawaii - Small package', 30, 'USPS', 'US', 'S', 0),
('us_territories_m', 'US Territories - Medium', 'Shipping to Alaska/Hawaii - Medium package', 50, 'USPS', 'US', 'M', 0),
('us_territories_l', 'US Territories - Large', 'Shipping to Alaska/Hawaii - Large package', 150, 'USPS', 'US', 'L', 0),
('canada_s', 'Canada - Small', 'Shipping to Canada - Small package', 35, 'USPS', 'CA', 'S', 0),
('canada_m', 'Canada - Medium', 'Shipping to Canada - Medium package', 100, 'USPS', 'CA', 'M', 0),
('canada_l', 'Canada - Large', 'Shipping to Canada - Large package', 200, 'USPS', 'CA', 'L', 0),
('international_quote', 'International Quote', 'Contact for shipping quote', NULL, 'TBD', 'INT', NULL, 0);
```

### 2. Shipping Quotes Table
```sql
CREATE TABLE shipping_quotes (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  package_size VARCHAR(10), -- S, M, L
  estimated_weight DECIMAL(8,2),
  estimated_dimensions JSONB, -- {length, width, height}
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, quoted, paid, cancelled
  quoted_amount DECIMAL(10,2),
  quoted_by INTEGER REFERENCES users(id),
  quoted_at TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Orders Table Updates
```sql
-- Add shipping quote reference
ALTER TABLE orders ADD COLUMN shipping_quote_id INTEGER REFERENCES shipping_quotes(id);
ALTER TABLE orders ADD COLUMN package_size VARCHAR(10); -- S, M, L
ALTER TABLE orders ADD COLUMN is_shipping_quote BOOLEAN DEFAULT FALSE;
```

### 4. Package Size Classification
```sql
CREATE TABLE package_sizes (
  id VARCHAR(10) PRIMARY KEY, -- S, M, L
  name VARCHAR(50) NOT NULL,
  max_weight DECIMAL(8,2),
  max_length DECIMAL(8,2),
  max_width DECIMAL(8,2),
  max_height DECIMAL(8,2),
  description TEXT
);

INSERT INTO package_sizes VALUES
('S', 'Small Package', 5.0, 12, 9, 2, 'Small items, accessories'),
('M', 'Medium Package', 20.0, 18, 12, 6, 'Medium items, components'),
('L', 'Large Package', 50.0, 30, 20, 12, 'Large items, complete cockpits');
```

## Frontend Implementation

### 1. Checkout Form Updates

#### Country Selection Component
```typescript
// src/components/checkout/CountrySelector.tsx
interface CountrySelectorProps {
  value: string;
  onChange: (country: string) => void;
  required?: boolean;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ value, onChange, required }) => {
  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    // Add more countries as needed
  ];

  return (
    <Select value={value} onValueChange={onChange} required={required}>
      <SelectTrigger>
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent>
        {countries.map(country => (
          <SelectItem key={country.code} value={country.code}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

#### State/Province Selector
```typescript
// src/components/checkout/StateSelector.tsx
interface StateSelectorProps {
  country: string;
  value: string;
  onChange: (state: string) => void;
  required?: boolean;
}

const StateSelector: React.FC<StateSelectorProps> = ({ country, value, onChange, required }) => {
  const getStatesForCountry = (countryCode: string) => {
    const states = {
      'US': [
        { code: 'AL', name: 'Alabama' },
        { code: 'AK', name: 'Alaska' },
        { code: 'AZ', name: 'Arizona' },
        { code: 'AR', name: 'Arkansas' },
        { code: 'CA', name: 'California' },
        { code: 'CO', name: 'Colorado' },
        { code: 'CT', name: 'Connecticut' },
        { code: 'DE', name: 'Delaware' },
        { code: 'FL', name: 'Florida' },
        { code: 'GA', name: 'Georgia' },
        { code: 'HI', name: 'Hawaii' },
        { code: 'ID', name: 'Idaho' },
        { code: 'IL', name: 'Illinois' },
        { code: 'IN', name: 'Indiana' },
        { code: 'IA', name: 'Iowa' },
        { code: 'KS', name: 'Kansas' },
        { code: 'KY', name: 'Kentucky' },
        { code: 'LA', name: 'Louisiana' },
        { code: 'ME', name: 'Maine' },
        { code: 'MD', name: 'Maryland' },
        { code: 'MA', name: 'Massachusetts' },
        { code: 'MI', name: 'Michigan' },
        { code: 'MN', name: 'Minnesota' },
        { code: 'MS', name: 'Mississippi' },
        { code: 'MO', name: 'Missouri' },
        { code: 'MT', name: 'Montana' },
        { code: 'NE', name: 'Nebraska' },
        { code: 'NV', name: 'Nevada' },
        { code: 'NH', name: 'New Hampshire' },
        { code: 'NJ', name: 'New Jersey' },
        { code: 'NM', name: 'New Mexico' },
        { code: 'NY', name: 'New York' },
        { code: 'NC', name: 'North Carolina' },
        { code: 'ND', name: 'North Dakota' },
        { code: 'OH', name: 'Ohio' },
        { code: 'OK', name: 'Oklahoma' },
        { code: 'OR', name: 'Oregon' },
        { code: 'PA', name: 'Pennsylvania' },
        { code: 'RI', name: 'Rhode Island' },
        { code: 'SC', name: 'South Carolina' },
        { code: 'SD', name: 'South Dakota' },
        { code: 'TN', name: 'Tennessee' },
        { code: 'TX', name: 'Texas' },
        { code: 'UT', name: 'Utah' },
        { code: 'VT', name: 'Vermont' },
        { code: 'VA', name: 'Virginia' },
        { code: 'WA', name: 'Washington' },
        { code: 'WV', name: 'West Virginia' },
        { code: 'WI', name: 'Wisconsin' },
        { code: 'WY', name: 'Wyoming' }
      ],
      'CA': [
        { code: 'AB', name: 'Alberta' },
        { code: 'BC', name: 'British Columbia' },
        { code: 'MB', name: 'Manitoba' },
        { code: 'NB', name: 'New Brunswick' },
        { code: 'NL', name: 'Newfoundland and Labrador' },
        { code: 'NS', name: 'Nova Scotia' },
        { code: 'ON', name: 'Ontario' },
        { code: 'PE', name: 'Prince Edward Island' },
        { code: 'QC', name: 'Quebec' },
        { code: 'SK', name: 'Saskatchewan' },
        { code: 'NT', name: 'Northwest Territories' },
        { code: 'NU', name: 'Nunavut' },
        { code: 'YT', name: 'Yukon' }
      ]
    };
    return states[countryCode] || [];
  };

  const states = getStatesForCountry(country);

  if (states.length === 0) {
    return (
      <Input
        placeholder="State/Province"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    );
  }

  return (
    <Select value={value} onValueChange={onChange} required={required}>
      <SelectTrigger>
        <SelectValue placeholder="Select state/province" />
      </SelectTrigger>
      <SelectContent>
        {states.map(state => (
          <SelectItem key={state.code} value={state.code}>
            {state.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### 2. Shipping Calculation Service

```typescript
// src/services/ShippingService.ts
export interface ShippingCalculation {
  method: string;
  price: number;
  estimatedDays: string;
  isAvailable: boolean;
}

export interface PackageInfo {
  size: 'S' | 'M' | 'L';
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

export class ShippingService {
  static calculateShipping(
    country: string,
    state: string,
    orderTotal: number,
    packageInfo: PackageInfo
  ): ShippingCalculation[] {
    const results: ShippingCalculation[] = [];

    // US Domestic (excluding Alaska & Hawaii)
    if (country === 'US' && !['AK', 'HI'].includes(state)) {
      if (orderTotal >= 50) {
        results.push({
          method: 'us_free',
          price: 0,
          estimatedDays: '5-7 business days',
          isAvailable: true
        });
      } else {
        results.push({
          method: 'us_standard',
          price: 9.99,
          estimatedDays: '5-7 business days',
          isAvailable: true
        });
      }
    }

    // US Territories (Alaska & Hawaii)
    if (country === 'US' && ['AK', 'HI'].includes(state)) {
      const territoryPricing = {
        'S': 30,
        'M': 50,
        'L': 150
      };

      results.push({
        method: `us_territories_${packageInfo.size.toLowerCase()}`,
        price: territoryPricing[packageInfo.size],
        estimatedDays: '7-10 business days',
        isAvailable: true
      });
    }

    // Canada
    if (country === 'CA') {
      const canadaPricing = {
        'S': 35,
        'M': 100,
        'L': 200
      };

      results.push({
        method: `canada_${packageInfo.size.toLowerCase()}`,
        price: canadaPricing[packageInfo.size],
        estimatedDays: '7-14 business days',
        isAvailable: true
      });
    }

    // International (requires quote)
    if (!['US', 'CA'].includes(country)) {
      results.push({
        method: 'international_quote',
        price: 0,
        estimatedDays: 'Contact for quote',
        isAvailable: true
      });
    }

    return results;
  }

  static determinePackageSize(items: CartItem[]): PackageInfo {
    // Logic to determine package size based on cart items
    // This would analyze product dimensions and weights
    // For now, return a default medium package
    return {
      size: 'M',
      weight: 15.0,
      dimensions: {
        length: 18,
        width: 12,
        height: 6
      }
    };
  }
}
```

### 3. Shipping Quote Request Component

```typescript
// src/components/checkout/ShippingQuoteRequest.tsx
interface ShippingQuoteRequestProps {
  cartItems: CartItem[];
  shippingAddress: Address;
  onQuoteRequested: (quoteData: ShippingQuoteData) => void;
}

const ShippingQuoteRequest: React.FC<ShippingQuoteRequestProps> = ({
  cartItems,
  shippingAddress,
  onQuoteRequested
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestQuote = async () => {
    setIsSubmitting(true);
    try {
      const quoteData = {
        customerEmail: shippingAddress.email,
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        country: shippingAddress.country,
        state: shippingAddress.state,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        items: cartItems.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price
        }))
      };

      await onQuoteRequested(quoteData);
    } catch (error) {
      console.error('Failed to request shipping quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          International Shipping Quote Required
        </CardTitle>
        <CardDescription>
          Shipping to {shippingAddress.country} requires a custom quote. 
          We'll calculate the exact shipping cost and send you an invoice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Order Items:</h4>
            <div className="space-y-2">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.product_name} x {item.quantity}</span>
                  <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Shipping Address:</h4>
            <div className="text-sm text-muted-foreground">
              {shippingAddress.firstName} {shippingAddress.lastName}<br />
              {shippingAddress.addressLine1}<br />
              {shippingAddress.addressLine2 && `${shippingAddress.addressLine2}<br />`}
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}<br />
              {shippingAddress.country}
            </div>
          </div>

          <Button 
            onClick={handleRequestQuote}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting Quote...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Contact Us for Shipping Quote
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

## Backend Implementation

### 1. Shipping Service

```typescript
// server/src/services/ShippingService.ts
export class ShippingService {
  constructor(private pool: Pool) {}

  async calculateShipping(
    country: string,
    state: string,
    orderTotal: number,
    packageSize: string
  ): Promise<ShippingMethod[]> {
    const methods: ShippingMethod[] = [];

    // US Domestic (excluding Alaska & Hawaii)
    if (country === 'US' && !['AK', 'HI'].includes(state)) {
      if (orderTotal >= 50) {
        methods.push({
          id: 'us_free',
          name: 'Free Shipping',
          description: 'Free shipping for orders over $50',
          price: 0,
          estimatedDays: '5-7 business days',
          carrier: 'USPS'
        });
      } else {
        methods.push({
          id: 'us_standard',
          name: 'Standard Shipping',
          description: 'Standard shipping for orders under $50',
          price: 9.99,
          estimatedDays: '5-7 business days',
          carrier: 'USPS'
        });
      }
    }

    // US Territories
    if (country === 'US' && ['AK', 'HI'].includes(state)) {
      const territoryPricing = { 'S': 30, 'M': 50, 'L': 150 };
      methods.push({
        id: `us_territories_${packageSize.toLowerCase()}`,
        name: `US Territories - ${packageSize} Package`,
        description: `Shipping to ${state === 'AK' ? 'Alaska' : 'Hawaii'}`,
        price: territoryPricing[packageSize],
        estimatedDays: '7-10 business days',
        carrier: 'USPS'
      });
    }

    // Canada
    if (country === 'CA') {
      const canadaPricing = { 'S': 35, 'M': 100, 'L': 200 };
      methods.push({
        id: `canada_${packageSize.toLowerCase()}`,
        name: `Canada - ${packageSize} Package`,
        description: 'Shipping to Canada',
        price: canadaPricing[packageSize],
        estimatedDays: '7-14 business days',
        carrier: 'USPS'
      });
    }

    return methods;
  }

  async createShippingQuote(quoteData: CreateShippingQuoteData): Promise<ShippingQuote> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO shipping_quotes (
          customer_email, customer_name, country, state, city, postal_code,
          package_size, estimated_weight, estimated_dimensions, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          quoteData.customerEmail,
          quoteData.customerName,
          quoteData.country,
          quoteData.state,
          quoteData.city,
          quoteData.postalCode,
          quoteData.packageSize,
          quoteData.estimatedWeight,
          JSON.stringify(quoteData.estimatedDimensions),
          'pending'
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateShippingQuote(
    quoteId: number,
    quotedAmount: number,
    quotedBy: number,
    notes?: string
  ): Promise<ShippingQuote> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `UPDATE shipping_quotes 
         SET quoted_amount = $1, quoted_by = $2, quoted_at = CURRENT_TIMESTAMP,
             status = 'quoted', notes = $3, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
         WHERE id = $4
         RETURNING *`,
        [quotedAmount, quotedBy, notes, quoteId]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
```

### 2. Shipping Quote Controller

```typescript
// server/src/controllers/shippingQuoteController.ts
export class ShippingQuoteController {
  private shippingService: ShippingService;

  constructor(pool: Pool) {
    this.shippingService = new ShippingService(pool);
  }

  createShippingQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteData: CreateShippingQuoteData = req.body;
      
      const quote = await this.shippingService.createShippingQuote(quoteData);
      
      // TODO: Send emails to admin and customer
      // await this.emailService.sendShippingQuoteRequest(quote);
      // await this.emailService.sendShippingQuoteConfirmation(quote);

      res.status(201).json(successResponse({
        quote,
        message: 'Shipping quote request submitted successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  updateShippingQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quoteId } = req.params;
      const { quotedAmount, notes } = req.body;
      const quotedBy = req.session?.userId;

      if (!quotedBy) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const quote = await this.shippingService.updateShippingQuote(
        parseInt(quoteId),
        quotedAmount,
        quotedBy,
        notes
      );

      // TODO: Generate and send PayPal invoice
      // await this.paymentService.generateShippingInvoice(quote);

      res.json(successResponse({
        quote,
        message: 'Shipping quote updated successfully'
      }));
    } catch (error) {
      next(error);
    }
  };

  getShippingQuotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const quotes = await this.shippingService.getShippingQuotes(page, limit, status);

      res.json(successResponse(quotes));
    } catch (error) {
      next(error);
    }
  };
}
```

## Admin Dashboard Updates

### 1. Shipping Quotes Management

```typescript
// src/pages/admin/ShippingQuotes.tsx
const ShippingQuotes: React.FC = () => {
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<ShippingQuote | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');

  const handleUpdateQuote = async (quoteId: number) => {
    try {
      const response = await fetch(`/api/admin/shipping-quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotedAmount: parseFloat(quoteAmount),
          notes: 'Quote updated by admin'
        })
      });

      if (response.ok) {
        // Refresh quotes list
        fetchQuotes();
        setSelectedQuote(null);
        setQuoteAmount('');
      }
    } catch (error) {
      console.error('Failed to update quote:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shipping Quotes</h1>
        <Badge variant="outline">
          {quotes.filter(q => q.status === 'pending').length} Pending
        </Badge>
      </div>

      <div className="grid gap-4">
        {quotes.map(quote => (
          <Card key={quote.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {quote.customer_name}
                  </CardTitle>
                  <CardDescription>
                    {quote.country} • {quote.city}, {quote.state}
                  </CardDescription>
                </div>
                <Badge variant={quote.status === 'pending' ? 'destructive' : 'default'}>
                  {quote.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Email:</strong> {quote.customer_email}
                </div>
                <div>
                  <strong>Package Size:</strong> {quote.package_size}
                </div>
                <div>
                  <strong>Requested:</strong> {new Date(quote.requested_at).toLocaleDateString()}
                </div>
                <div>
                  <strong>Quoted Amount:</strong> 
                  {quote.quoted_amount ? `$${quote.quoted_amount}` : 'Not quoted'}
                </div>
              </div>
              
              {quote.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter shipping cost"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    className="w-32"
                  />
                  <Button 
                    onClick={() => handleUpdateQuote(quote.id)}
                    disabled={!quoteAmount}
                  >
                    Quote & Send Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

### 2. Orders Dashboard Updates

```typescript
// Update existing orders table to show shipping quote status
const OrdersTable: React.FC = () => {
  // Add shipping quote column
  const columns = [
    // ... existing columns
    {
      key: 'shipping_status',
      label: 'Shipping',
      render: (order: Order) => {
        if (order.is_shipping_quote) {
          return (
            <Badge variant="outline">
              Quote Required
            </Badge>
          );
        }
        return <Badge variant="default">{order.shipping_status}</Badge>;
      }
    }
  ];
};
```

## Email System Integration

### 1. Email Templates (Placeholder)

```typescript
// server/src/services/EmailService.ts
export class EmailService {
  async sendShippingQuoteRequest(quote: ShippingQuote): Promise<void> {
    // TODO: Implement email template for admin notification
    console.log('Sending shipping quote request email to admin:', quote);
  }

  async sendShippingQuoteConfirmation(quote: ShippingQuote): Promise<void> {
    // TODO: Implement email template for customer confirmation
    console.log('Sending shipping quote confirmation email to customer:', quote);
  }

  async sendShippingInvoice(quote: ShippingQuote, invoiceUrl: string): Promise<void> {
    // TODO: Implement email template for shipping invoice
    console.log('Sending shipping invoice email:', quote, invoiceUrl);
  }
}
```

### 2. PayPal Invoice Generation (Placeholder)

```typescript
// server/src/services/PayPalInvoiceService.ts
export class PayPalInvoiceService {
  async generateShippingInvoice(quote: ShippingQuote): Promise<string> {
    // TODO: Implement PayPal invoice generation
    // This would create a PayPal invoice with:
    // - Product items
    // - Shipping cost
    // - Total amount
    // - Payment link
    
    console.log('Generating PayPal invoice for quote:', quote);
    return 'https://paypal.com/invoice/placeholder';
  }
}
```

## Implementation Phases

### Phase 1: Database & Basic Structure
- [ ] Create shipping methods table
- [ ] Create shipping quotes table
- [ ] Create package sizes table
- [ ] Update orders table schema
- [ ] Run database migrations

### Phase 2: Frontend Components
- [ ] Implement CountrySelector component
- [ ] Implement StateSelector component
- [ ] Update checkout form with country selection
- [ ] Implement shipping calculation logic
- [ ] Create ShippingQuoteRequest component

### Phase 3: Backend Services
- [ ] Implement ShippingService
- [ ] Create shipping quote controller
- [ ] Add shipping calculation API endpoints
- [ ] Implement quote management endpoints

### Phase 4: Admin Dashboard
- [ ] Create shipping quotes management page
- [ ] Update orders dashboard
- [ ] Add quote update functionality
- [ ] Implement admin quote workflow

### Phase 5: Email Integration
- [ ] Design email templates
- [ ] Implement email service
- [ ] Add email sending logic
- [ ] Test email delivery

### Phase 6: PayPal Integration
- [ ] Implement PayPal invoice generation
- [ ] Add invoice sending logic
- [ ] Test payment flow
- [ ] Handle payment callbacks

### Phase 7: Testing & Optimization
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates

## Testing Strategy

### 1. Unit Tests
- Shipping calculation logic
- Package size determination
- Country/state validation
- Quote creation and updates

### 2. Integration Tests
- Checkout flow with different countries
- Shipping quote request process
- Admin quote management
- Email sending functionality

### 3. End-to-End Tests
- Complete checkout with US domestic shipping
- Complete checkout with US territories
- Complete checkout with Canada
- Complete checkout with international quote
- Admin quote approval and invoice generation

### 4. Manual Testing Scenarios
- Test all country/state combinations
- Verify shipping calculations
- Test quote request workflow
- Verify admin dashboard functionality
- Test email delivery
- Test PayPal invoice generation

## Configuration

### Environment Variables
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox # or live

# Admin Email
ADMIN_EMAIL=admin@simfab.com
```

### Shipping Configuration
```typescript
// server/src/config/shipping.ts
export const SHIPPING_CONFIG = {
  US_FREE_SHIPPING_THRESHOLD: 50,
  US_STANDARD_RATE: 9.99,
  US_TERRITORIES: {
    S: 30,
    M: 50,
    L: 150
  },
  CANADA: {
    S: 35,
    M: 100,
    L: 200
  },
  QUOTE_EXPIRY_DAYS: 7
};
```

This implementation plan provides a comprehensive roadmap for building the enhanced shipping system with country-based pricing and shipping quote functionality. Each phase builds upon the previous one, ensuring a systematic and reliable implementation.
