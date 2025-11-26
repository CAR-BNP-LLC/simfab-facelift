/**
 * Cart Page
 * Full cart view with all items, totals, and checkout
 * Uses CartContext for real cart data
 */

import { useState, useEffect } from 'react';
import { Plus, Minus, X, ShoppingCart, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { trackViewCart } from '@/utils/googleTagManager';
import { useRegion } from '@/contexts/RegionContext';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, loading, updateQuantity, removeItem, applyCoupon } = useCart();
  const { region } = useRegion();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Get cart data safely
  const items = cart?.items || [];
  const totals = cart?.totals || { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, currency: 'USD', itemCount: 0 };
  const currency = totals.currency === 'EUR' ? '€' : '$';

  // Track view_cart event when cart loads
  useEffect(() => {
    if (cart && !loading && items.length > 0) {
      const cartItems = items.map(item => ({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        category: undefined, // Cart items don't have category in this structure
        brand: 'SimFab',
        sku: item.product_sku,
        quantity: item.quantity
      }));

      trackViewCart(cartItems, region === 'eu' ? 'EUR' : 'USD');
    }
  }, [cart, loading, items, region]);

  // Handle quantity update
  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  // Handle remove item
  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItem(itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  // Handle apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      setApplyingCoupon(true);
      await applyCoupon(couponCode);
      setCouponCode('');
    } catch (error) {
      console.error('Failed to apply coupon:', error);
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Get product image
  const getImageUrl = (item: any) => {
    // product_image is already a single URL string from the API
    if (item.product_image && typeof item.product_image === 'string') {
      return item.product_image;
    }
    
    // Fallback: try to get from product_images array if available
    if (item.product_images && Array.isArray(item.product_images) && item.product_images.length > 0) {
      return item.product_images[0].image_url || item.product_images[0].url || null;
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-4 md:py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Your Shopping Cart</h1>
            <p className="text-muted-foreground">
              {totals.itemCount > 0 ? `Total: ${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''}` : 'Your cart is empty'}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-muted-foreground mb-1">
              Questions? Toll free: <span className="text-primary font-semibold">1-888-299-2746</span>
            </p>
            <p className="text-sm text-muted-foreground">
              or email <span className="text-primary font-semibold">info@simfab.com</span>
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading cart...</span>
          </div>
        )}

        {/* Empty Cart */}
        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some products to get started!</p>
            <Button onClick={() => navigate('/shop')} className="btn-primary">
              Browse Products
            </Button>
          </div>
        )}

        {/* Cart with Items */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              {/* Backorder Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Note:</span> Some items in your cart may be available on backorder. 
                  You will be notified if any items need to be backordered when you complete your order.
                </p>
              </div>
              <div className="bg-card rounded-lg shadow-sm border border-border">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border font-semibold text-sm">
                  <div className="col-span-6">PRODUCT</div>
                  <div className="col-span-2 text-center">PRICE</div>
                  <div className="col-span-2 text-center">QUANTITY</div>
                  <div className="col-span-2 text-right">TOTAL</div>
                </div>

                {/* Cart Items */}
                <div className="divide-y divide-border">
                  {items.map((item: any) => (
                    <div key={item.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Product Info */}
                        <div className="md:col-span-6 flex gap-4">
                          {/* Image */}
                          <div className="flex-shrink-0">
                            {getImageUrl(item) ? (
                              <img
                                src={getImageUrl(item)}
                                alt={item.product_name}
                                className="w-24 h-24 object-cover rounded bg-muted"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded bg-muted flex items-center justify-center">
                                <p className="text-xs text-muted-foreground text-center px-2">No image</p>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                              {item.product_name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-1">
                              SKU: {item.product_sku}
                            </p>
                            {/* Remove button for mobile */}
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="md:hidden text-sm text-destructive hover:underline mt-2"
                              disabled={loading}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="md:col-span-2 text-left md:text-center">
                          <span className="md:hidden font-semibold mr-2">Price:</span>
                          <span className="font-medium">
                            {currency}{parseFloat(item.unit_price).toFixed(2)}
                          </span>
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2 flex items-center gap-2 md:justify-center">
                          <span className="md:hidden font-semibold">Quantity:</span>
                          <div className="flex items-center border border-border rounded">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                              disabled={loading || item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 font-medium min-w-[40px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                              disabled={loading}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                          <span className="md:hidden font-semibold">Total:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">
                              {currency}{parseFloat(item.total_price).toFixed(2)}
                            </span>
                            {/* Remove button for desktop */}
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="hidden md:block p-2 hover:bg-muted rounded transition-colors text-destructive"
                              disabled={loading}
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue Shopping */}
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate('/shop')}
                  disabled={loading}
                >
                  ← Continue Shopping
                </Button>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 md:p-6 lg:sticky lg:top-4">
                <h2 className="text-xl font-bold mb-6">Cart Summary</h2>

                {/* Applied Coupons */}
                {cart?.appliedCoupons && cart.appliedCoupons.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Applied Coupons:</p>
                    {cart.appliedCoupons.map((coupon: any, idx: number) => {
                      const discount = Number(coupon?.discountAmount ?? coupon?.amount ?? 0);
                      return (
                        <div key={idx} className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-mono font-semibold text-sm text-green-700 dark:text-green-300">{coupon?.code || 'Coupon'}</span>
                          </div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            -{currency}{discount.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Coupon Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Coupon Code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      disabled={loading || applyingCoupon}
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={loading || applyingCoupon || !couponCode.trim()}
                    >
                      {applyingCoupon ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{currency}{totals.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-medium text-green-600">
                        -{currency}{totals.discount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {totals.shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span className="font-medium">{currency}{totals.shipping.toFixed(2)}</span>
                    </div>
                  )}

                  {totals.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">{currency}{totals.tax.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total:</span>
                      <span className="text-2xl font-bold text-primary">
                        {currency}{totals.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  className="w-full btn-primary font-semibold py-6 text-lg"
                  onClick={() => navigate('/checkout')}
                  disabled={loading}
                >
                  Proceed to Checkout
                </Button>

                {/* Shipping Info */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    Shipping & taxes calculated at checkout
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span>🔒 Secure Checkout</span>
                    <span>✓ Safe Payment</span>
                  </div>
                </div>
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
