
/**
 * Profile/Account Page
 * Shows user profile, order history, and account management
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, User, MapPin, CreditCard, LogOut, ShoppingBag, Heart } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { orderAPI } from "@/services/api";
import { Link } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { wishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    console.log('Profile page - Auth state:', { 
      loading, 
      isAuthenticated, 
      user: user?.email,
      hasUser: !!user 
    });
    
    if (!loading && !isAuthenticated) {
      console.log('Not authenticated, redirecting to login...');
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate, user]);

  // Load orders
  useEffect(() => {
    if (isAuthenticated && user) {
      loadOrders();
    }
  }, [isAuthenticated, user]);

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await orderAPI.getUserOrders({ page: 1, limit: 10 });
      if (response.success && response.data.orders) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="container mx-auto px-4 py-8 mt-20">
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Account</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.firstName}!
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="wishlist" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Wishlist</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="addresses" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Addresses</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">First Name</p>
                      <p className="font-medium">{user.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Name</p>
                      <p className="font-medium">{user.lastName}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={user.emailVerified ? "default" : "secondary"}>
                        {user.emailVerified ? "✓ Verified" : "Not Verified"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="pt-4">
                    <Button variant="outline">Edit Profile</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wishlist Tab */}
            <TabsContent value="wishlist" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5" />
                        My Wishlist
                      </CardTitle>
                      <CardDescription>
                        You have {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} in your wishlist
                      </CardDescription>
                    </div>
                    <Button variant="outline" asChild>
                      <Link to="/wishlist">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {wishlist.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {wishlist.slice(0, 4).map((item) => {
                        const product = item.product;
                        const primaryImage = product.images?.[0]?.image_url || 
                                           product.product_images?.[0]?.image_url || 
                                           '/placeholder.svg';

                        return (
                          <Link
                            key={item.id}
                            to={`/product/${product.slug}`}
                            className="group relative"
                          >
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                              <img
                                src={primaryImage}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <p className="text-sm font-medium mt-2 truncate group-hover:text-primary">
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {product.sale_price ? (
                                <>
                                  <span className="text-destructive">${product.sale_price.toFixed(2)}</span>
                                  <span className="line-through ml-1">${product.regular_price?.toFixed(2)}</span>
                                </>
                              ) : (
                                `$${product.regular_price?.toFixed(2) || '0.00'}`
                              )}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
                      <p className="text-muted-foreground mb-4">
                        Start adding items you love to your wishlist
                      </p>
                      <Button asChild>
                        <Link to="/shop">Browse Products</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>View and track your orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start shopping to see your orders here!
                      </p>
                      <Button onClick={() => navigate('/shop')}>
                        Browse Products
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/order-confirmation/${order.order_number}`)}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                              <p className="font-semibold">Order #{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant={
                                order.status === 'delivered' ? 'default' :
                                order.status === 'shipped' ? 'secondary' :
                                order.status === 'cancelled' ? 'destructive' :
                                'outline'
                              }>
                                {order.status}
                              </Badge>
                              <p className="font-semibold">
                                ${parseFloat(order.total_amount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Saved Addresses</CardTitle>
                  <CardDescription>Manage your shipping and billing addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No saved addresses</h3>
                    <p className="text-muted-foreground mb-4">
                      Add an address to make checkout faster
                    </p>
                    <Button variant="outline">Add Address</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="h-4 w-4 mr-2" />
                    Manage Addresses
                  </Button>
                  <div className="pt-4 border-t border-border">
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;
