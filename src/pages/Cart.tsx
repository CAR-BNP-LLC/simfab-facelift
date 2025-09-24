import { useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  color?: string;
}

const Cart = () => {
  // Mock cart data - in real app this would come from context/state management
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Sim Racing & Flight Simulation Cockpit Four Point Harness - Blue',
      price: 79.99,
      quantity: 1,
      image: '/src/assets/sim-racing-cockpit.jpg',
      color: 'Blue'
    }
  ]);

  const [couponCode, setCouponCode] = useState('');

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    setCartItems(items => 
      items.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal; // Add shipping/tax calculations here

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Shopping Cart</h1>
            <p className="text-muted-foreground">Total: {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
          </div>
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

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
            <Button onClick={() => window.location.href = '/shop'} className="btn-primary">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 p-4 border-b border-border bg-muted/50">
                  <div className="col-span-2 text-sm font-medium text-foreground">Product</div>
                  <div className="text-sm font-medium text-foreground text-center">Price</div>
                  <div className="text-sm font-medium text-foreground text-center">Quantity</div>
                  <div className="text-sm font-medium text-foreground text-center">Subtotal</div>
                </div>

                {/* Cart Items */}
                {cartItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-5 gap-4 p-4 border-b border-border items-center">
                    {/* Product Info */}
                    <div className="col-span-2 flex gap-4">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-20 h-20 object-contain bg-muted rounded"
                      />
                      <div>
                        <h3 className="font-medium text-foreground mb-1">{item.name}</h3>
                        <button className="text-sm text-primary hover:underline">Edit options</button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-center">
                      <span className="text-foreground">${item.price.toFixed(2)}</span>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center"
                        min="0"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-center flex items-center justify-center gap-4">
                      <span className="text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-6 h-fit">
              <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Coupon Code */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="destructive" className="px-6">
                    APPLY COUPON
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button variant="outline" className="w-full">
                  UPDATE CART
                </Button>
                <Button 
                  className="w-full btn-primary"
                  onClick={() => window.location.href = '/checkout'}
                >
                  PROCEED TO CHECKOUT
                </Button>
              </div>

              {/* Shipping Info */}
              <div className="mt-6 text-sm text-muted-foreground">
                <p>Free shipping for US on orders over $50 and excluding Alaska and Hawaii. Additional shipping costs might be applied during checkout for shipping to Canada.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Cart;