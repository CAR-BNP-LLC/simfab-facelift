/**
 * CartSidebar Component
 * Displays shopping cart in a slide-out sidebar
 * Uses CartContext for real cart data
 */

import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartSidebar = ({ isOpen, onClose }: CartSidebarProps) => {
  const { cart, loading, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  // Get cart data safely
  const items = cart?.items || [];
  const totals = cart?.totals || { subtotal: 0, total: 0, itemCount: 0 };

  const handleViewCart = () => {
    onClose();
    navigate('/cart');
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    try {
      await updateQuantity(itemId, quantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItem(itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  // Get product image URL
  const getImageUrl = (item: any) => {
    // product_image is already a single URL string from the API
    if (item.product_image && typeof item.product_image === 'string') {
      return item.product_image;
    }
    
    // Fallback: try to get from product_images array if available
    if (item.product_images && Array.isArray(item.product_images) && item.product_images.length > 0) {
      return item.product_images[0].image_url || item.product_images[0].url || '/placeholder.svg';
    }
    
    return '/placeholder.svg';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl transform transition-transform">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Your Cart</h2>
              {totals.itemCount > 0 && (
                <span className="text-sm text-muted-foreground">({totals.itemCount})</span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Empty Cart */}
          {!loading && items.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add some products to get started!
              </p>
              <Button onClick={handleViewCart} variant="outline">
                Browse Products
              </Button>
            </div>
          )}

          {/* Cart Items */}
          {!loading && items.length > 0 && (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex gap-3 border-b border-border pb-4 last:border-0">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <img 
                          src={getImageUrl(item)}
                          alt={item.product_name}
                          className="h-20 w-20 rounded object-cover bg-muted"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                          {item.product_name}
                        </h3>
                        

                        {/* Price */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-foreground">
                            ${parseFloat(item.unit_price).toFixed(2)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground">
                              ${parseFloat(item.total_price).toFixed(2)} total
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-border rounded">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-none"
                              onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              disabled={loading || item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-none"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={loading}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-7 ml-auto"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer with Totals and Actions */}
              <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                {/* Subtotal */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="text-green-600">-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-lg font-semibold text-primary">
                      ${totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Shipping & taxes calculated at checkout
                </p>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    Proceed to Checkout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleViewCart}
                    disabled={loading}
                  >
                    View Full Cart
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartSidebar;
