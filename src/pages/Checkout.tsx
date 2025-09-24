import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Checkout = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    country: 'US',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    subscribeNewsletter: false,
    shipToDifferent: false,
    orderNotes: '',
    acceptTerms: false
  });

  const [couponCode, setCouponCode] = useState('');

  // Mock cart data
  const cartItem = {
    name: 'Sim Racing & Flight Simulation Cockpit Four Point Harness - Blue',
    price: 79.99,
    quantity: 1,
    image: '/src/assets/sim-racing-cockpit.jpg'
  };

  const subtotal = cartItem.price * cartItem.quantity;
  const total = subtotal;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Returning Customer Banner */}
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <p className="text-sm text-foreground">
            ℹ️ Returning customer? 
            <button className="text-destructive hover:underline ml-1">
              Click here to login
            </button>
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">
              Do you still have questions? Toll free for USA and Canada: 
              <span className="text-destructive"> 1-888-299-2746</span>
            </p>
            <p className="text-sm text-muted-foreground">
              or email us at <span className="text-destructive">info@simfab.com</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Billing Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Billing Info */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Billing Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="firstName">First name *</Label>
                  <Input id="firstName" required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input id="lastName" required />
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="company">Company name (optional)</Label>
                <Input id="company" />
              </div>

              <div className="mb-4">
                <Label htmlFor="country">Country / Region *</Label>
                <Select defaultValue="US">
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States (US)</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="address">Street address *</Label>
                <Input id="address" placeholder="House number and street name" required />
              </div>

              <div className="mb-4">
                <Input placeholder="Apartment, suite, unit, etc. (optional)" />
              </div>

              <div className="mb-4">
                <Label htmlFor="city">Town / City *</Label>
                <Input id="city" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FL">Florida</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="NY">New York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input id="zipCode" required />
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" required />
              </div>

              <div className="mb-4">
                <Label htmlFor="email">Email address *</Label>
                <Input id="email" type="email" required />
              </div>

              <div className="flex items-center space-x-2 mb-6">
                <Checkbox 
                  id="newsletter" 
                  checked={formData.subscribeNewsletter}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, subscribeNewsletter: checked as boolean }))
                  }
                />
                <Label htmlFor="newsletter" className="text-sm">
                  Subscribe to our newsletter
                </Label>
              </div>
            </div>

            {/* Shipping Information */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Shipping Information</h2>
              
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="shipDifferent" 
                  checked={formData.shipToDifferent}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, shipToDifferent: checked as boolean }))
                  }
                />
                <Label htmlFor="shipDifferent" className="text-sm">
                  Ship to a different address?
                </Label>
              </div>

              <div>
                <Label htmlFor="orderNotes">Order notes (optional)</Label>
                <Textarea 
                  id="orderNotes" 
                  placeholder="Notes about your order, e.g. special notes for delivery."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-6 h-fit">
            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
            
            {/* Login Prompt */}
            <div className="bg-muted rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                👤 Already have an account?
              </p>
              <button className="text-primary hover:underline text-sm font-medium">
                Log in here
              </button>
            </div>

            {/* Product */}
            <div className="flex gap-3 mb-6">
              <img 
                src={cartItem.image} 
                alt={cartItem.name}
                className="w-16 h-16 object-contain bg-card rounded"
              />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground mb-1">
                  {cartItem.name}
                </h3>
                <p className="text-sm text-muted-foreground">× {cartItem.quantity}</p>
                <button className="text-sm text-primary hover:underline">Edit options</button>
              </div>
              <div className="text-right">
                <p className="font-medium">${cartItem.price.toFixed(2)}</p>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                />
                <Button variant="destructive" className="px-4">
                  APPLY COUPON
                </Button>
              </div>
            </div>

            {/* Shipping Notice */}
            <div className="text-sm text-muted-foreground mb-6">
              <p>Free shipping for US on orders over $50 and excluding Alaska and Hawaii. Additional shipping costs might be applied during checkout for shipping to Canada.</p>
            </div>

            {/* Payment */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Payment</h3>
              
              <div className="space-y-3 mb-4">
                <div className="text-sm text-muted-foreground">
                  Pay in 4 interest-free payments of $20.00 with <strong>PayPal</strong>. Learn more
                </div>
                
                <div className="flex items-center space-x-2">
                  <input type="radio" name="payment" id="paypal" defaultChecked className="text-primary" />
                  <Label htmlFor="paypal" className="flex items-center gap-2">
                    PayPal
                    <img src="/paypal-icon.svg" alt="PayPal" className="h-4" />
                  </Label>
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-4">
                Your personal data will only be used to process your order, support your experience throughout this website.
              </div>

              <div className="flex items-center space-x-2 mb-6">
                <Checkbox 
                  id="terms" 
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, acceptTerms: checked as boolean }))
                  }
                  required
                />
                <Label htmlFor="terms" className="text-sm">
                  I have read and agree to the website terms and conditions *
                </Label>
              </div>

              {/* Payment Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
                  disabled={!formData.acceptTerms}
                >
                  PayPal
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={!formData.acceptTerms}
                >
                  💳 Debit or Credit Card
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Powered by PayPal
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;