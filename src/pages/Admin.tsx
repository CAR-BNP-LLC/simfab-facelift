/**
 * Admin Dashboard
 * Complete admin panel with Dashboard, Orders, Products, Users, Settings
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Eye,
  Check,
  X
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface DashboardStats {
  today: { order_count: number; revenue: number };
  month: { order_count: number; revenue: number };
  orderStatusCounts: Array<{ status: string; count: number }>;
  recentOrders: any[];
  topProducts: any[];
  productStats: { total: number; in_stock: number; low_stock: number };
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const { toast } = useToast();

  // Product form state
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    slug: '',
    description: '',
    short_description: '',
    type: 'simple',
    status: 'active',
    featured: false,
    regular_price: '',
    stock_quantity: '10',
    categories: 'accessories',
    tags: ''
  });

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setDashboardStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/products?limit=100`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data.products || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/orders?limit=50`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data.orders || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      const productData = {
        ...productForm,
        regular_price: parseFloat(productForm.regular_price),
        stock_quantity: parseInt(productForm.stock_quantity),
        featured: productForm.featured,
        categories: [productForm.categories],
        tags: productForm.tags ? productForm.tags.split(',').map(t => t.trim()) : []
      };

      const url = editingProduct 
        ? `${API_URL}/api/admin/products/${editingProduct.id}`
        : `${API_URL}/api/admin/products`;
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: editingProduct ? 'Product updated' : 'Product created'
        });
        
        // Reset form
        setProductForm({
          sku: '',
          name: '',
          slug: '',
          description: '',
          short_description: '',
          type: 'simple',
          status: 'active',
          featured: false,
          regular_price: '',
          stock_quantity: '10',
          categories: 'accessories',
          tags: ''
        });
        setEditingProduct(null);
        fetchProducts();
        setActiveTab('products');
      } else {
        throw new Error(data.error?.message || 'Failed to save product');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save product',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/products/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Product deleted' });
        fetchProducts();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      });
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      sku: product.sku || '',
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      short_description: product.short_description || '',
      type: product.type || 'simple',
      status: product.status || 'active',
      featured: product.featured || false,
      regular_price: product.regular_price?.toString() || '',
      stock_quantity: product.stock?.toString() || '0',
      categories: Array.isArray(product.categories) ? product.categories[0] : 'accessories',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : ''
    });
    setActiveTab('create');
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Order status updated' });
        fetchOrders();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your store</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : dashboardStats ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Today's Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${dashboardStats.today.revenue.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardStats.today.order_count} orders
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        This Month
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${dashboardStats.month.revenue.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardStats.month.order_count} orders
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Products
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardStats.productStats.total}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardStats.productStats.in_stock} in stock
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Low Stock Alert
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardStats.productStats.low_stock}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Products need restock
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Latest 5 orders</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardStats.recentOrders.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No orders yet</p>
                      ) : (
                        dashboardStats.recentOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                            <div>
                              <p className="font-semibold">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.user_email || order.customer_email}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={
                                order.status === 'delivered' ? 'default' :
                                order.status === 'shipped' ? 'secondary' :
                                order.status === 'cancelled' ? 'destructive' :
                                'outline'
                              }>
                                {order.status}
                              </Badge>
                              <p className="text-sm font-semibold mt-1">
                                ${parseFloat(order.total_amount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products (Last 30 Days)</CardTitle>
                    <CardDescription>Best sellers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardStats.topProducts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No sales data yet</p>
                      ) : (
                        dashboardStats.topProducts.map((product, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{product.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.total_sold} sold
                              </p>
                            </div>
                            <p className="font-semibold">${parseFloat(product.revenue).toFixed(2)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>View and manage all orders</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2">Order #</th>
                          <th className="text-left py-3 px-2">Customer</th>
                          <th className="text-left py-3 px-2">Items</th>
                          <th className="text-left py-3 px-2">Total</th>
                          <th className="text-left py-3 px-2">Status</th>
                          <th className="text-left py-3 px-2">Date</th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-3 px-2">
                              <span className="font-mono text-sm">{order.order_number}</span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-sm">
                                {order.user_first_name && order.user_last_name ? (
                                  <p className="font-medium">{order.user_first_name} {order.user_last_name}</p>
                                ) : null}
                                <p className="text-muted-foreground">{order.user_email || order.customer_email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant="outline">{order.item_count || 0}</Badge>
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-semibold">${parseFloat(order.total_amount).toFixed(2)}</span>
                            </td>
                            <td className="py-3 px-2">
                              <Select
                                value={order.status}
                                onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="shipped">Shipped</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 px-2 text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Management</CardTitle>
                    <CardDescription>View and manage products</CardDescription>
                  </div>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No products yet</p>
                    <Button onClick={() => setActiveTab('create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Product
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2">SKU</th>
                          <th className="text-left py-3 px-2">Name</th>
                          <th className="text-left py-3 px-2">Price</th>
                          <th className="text-left py-3 px-2">Stock</th>
                          <th className="text-left py-3 px-2">Status</th>
                          <th className="text-left py-3 px-2">Featured</th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-3 px-2">
                              <span className="font-mono text-sm">{product.sku}</span>
                            </td>
                            <td className="py-3 px-2 max-w-xs">
                              <p className="font-medium truncate">{product.name}</p>
                            </td>
                            <td className="py-3 px-2">
                              ${product.regular_price ? parseFloat(product.regular_price.toString()).toFixed(2) : '0.00'}
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                                {product.stock}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                {product.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              {product.featured ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground" />
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create/Edit Product Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</CardTitle>
                <CardDescription>
                  {editingProduct ? `Editing: ${editingProduct.name}` : 'Add a new product to your catalog'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sku">SKU *</Label>
                      <Input
                        id="sku"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={productForm.slug}
                      onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                      placeholder="product-url-slug"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="short_description">Short Description</Label>
                    <Input
                      id="short_description"
                      value={productForm.short_description}
                      onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Full Description</Label>
                    <Textarea
                      id="description"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="regular_price">Price *</Label>
                      <Input
                        id="regular_price"
                        type="number"
                        step="0.01"
                        value={productForm.regular_price}
                        onChange={(e) => setProductForm({ ...productForm, regular_price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock_quantity">Stock *</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={productForm.stock_quantity}
                        onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={productForm.status} onValueChange={(value) => setProductForm({ ...productForm, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="categories">Category</Label>
                      <Select value={productForm.categories} onValueChange={(value) => setProductForm({ ...productForm, categories: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flight-sim">Flight Sim</SelectItem>
                          <SelectItem value="sim-racing">Sim Racing</SelectItem>
                          <SelectItem value="accessories">Accessories</SelectItem>
                          <SelectItem value="monitor-stands">Monitor Stands</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        value={productForm.tags}
                        onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })}
                        placeholder="best-seller, modular"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={productForm.featured}
                      onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="featured" className="cursor-pointer">Featured Product</Label>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingProduct ? 'Update Product' : 'Create Product'
                      )}
                    </Button>
                    {editingProduct && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingProduct(null);
                          setProductForm({
                            sku: '',
                            name: '',
                            slug: '',
                            description: '',
                            short_description: '',
                            type: 'simple',
                            status: 'active',
                            featured: false,
                            regular_price: '',
                            stock_quantity: '10',
                            categories: 'accessories',
                            tags: ''
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>System configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Settings panel coming soon. This will include site configuration, email settings, and more.
                  </AlertDescription>
                </Alert>
                
                <div className="pt-4">
                  <h3 className="font-semibold mb-2">Quick Info:</h3>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>• Admin authentication is currently bypassed for testing</p>
                    <p>• All users have admin access</p>
                    <p>• Payment integration coming in Phase 4</p>
                    <p>• Shipping integration coming in Phase 5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
