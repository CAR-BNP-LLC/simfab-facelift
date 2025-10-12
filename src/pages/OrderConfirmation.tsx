/**
 * Order Confirmation Page
 * Shows order details after successful checkout
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Package, 
  MapPin, 
  Truck, 
  Mail,
  Loader2,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { orderAPI } from '@/services/api';

const OrderConfirmation = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderNumber) {
      loadOrder();
    }
  }, [orderNumber]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrder(orderNumber!);
      
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Failed to load order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (item: any) => {
    if (item.product_image) {
      if (typeof item.product_image === 'string') {
        try {
          const images = JSON.parse(item.product_image);
          if (Array.isArray(images) && images.length > 0) {
            return images[0].url || images[0].image_url || '/placeholder.svg';
          }
        } catch {
          return item.product_image;
        }
      }
      return item.product_image;
    }
    return '/placeholder.svg';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'We could not find this order'}
            </p>
            <Button onClick={() => navigate('/shop')}>
              Continue Shopping
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground text-lg">
              Thank you for your order
            </p>
          </div>

          {/* Order Number */}
          <Alert className="mb-6">
            <Package className="h-4 w-4" />
            <AlertDescription>
              <strong>Order Number: {order.order_number}</strong>
              <br />
              <span className="text-sm">
                Order placed on {new Date(order.created_at).toLocaleDateString()} at{' '}
                {new Date(order.created_at).toLocaleTimeString()}
              </span>
            </AlertDescription>
          </Alert>

          {/* Payment Status (Pending for Phase 3) */}
          <Alert className="mb-6" variant="default">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Pending</strong> - Payment processing will be added in Phase 4.
              <br />
              <span className="text-sm">
                A confirmation email will be sent to: <strong>{order.customer_email}</strong>
              </span>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p className="font-semibold">
                    {order.shipping_address.firstName} {order.shipping_address.lastName}
                  </p>
                  {order.shipping_address.company && <p>{order.shipping_address.company}</p>}
                  <p>{order.shipping_address.addressLine1}</p>
                  {order.shipping_address.addressLine2 && <p>{order.shipping_address.addressLine2}</p>}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}
                  </p>
                  <p>{order.shipping_address.country}</p>
                  {order.shipping_address.phone && <p className="mt-2">{order.shipping_address.phone}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5" />
                  Shipping Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="font-semibold">
                    {order.shipping_method || 'Standard Shipping'}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Estimated delivery: 5-7 business days
                  </p>
                  {order.tracking_number && (
                    <div className="mt-3 p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Tracking Number:</p>
                      <p className="font-mono font-semibold">{order.tracking_number}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                    <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.product_name}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {item.product_sku}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${parseFloat(item.total_price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Totals */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${parseFloat(order.subtotal).toFixed(2)}</span>
                </div>

                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-green-600">
                      -${parseFloat(order.discount_amount).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span className="font-medium">
                    {order.shipping_amount === 0 ? 'FREE' : `$${parseFloat(order.shipping_amount).toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">${parseFloat(order.tax_amount).toFixed(2)}</span>
                </div>

                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="text-2xl font-bold text-primary">
                      ${parseFloat(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          {order.notes && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/profile')}>
              View Order History
            </Button>
            <Button onClick={() => navigate('/shop')}>
              Continue Shopping
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Questions about your order?</p>
            <p className="mt-1">
              Contact us at <strong className="text-primary">1-888-299-2746</strong> or{' '}
              <strong className="text-primary">info@simfab.com</strong>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;

