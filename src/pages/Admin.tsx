import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Loader2, Package, Settings } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  regular_price: number;
  stock: number; // Database uses 'stock' not 'stock_quantity'
  status: string;
  featured: boolean;
  categories: string[];
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'create'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Build product data
      const productData = {
        ...formData,
        regular_price: parseFloat(formData.regular_price),
        stock_quantity: parseInt(formData.stock_quantity),
        featured: formData.featured,
        categories: [formData.categories],
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
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
          description: editingProduct ? 'Product updated!' : 'Product created!',
        });
        
        // Reset form
        setFormData({
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
        setActiveTab('products');
        fetchProducts();
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

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: '',
      short_description: '',
      type: 'simple',
      status: product.status,
      featured: product.featured,
      regular_price: product.regular_price.toString(),
      stock_quantity: product.stock.toString(), // Database uses 'stock'
      categories: product.categories?.[0] || 'accessories',
      tags: ''
    });
    setActiveTab('create');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/products/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Product deleted!',
        });
        fetchProducts();
      } else {
        throw new Error(data.error?.message || 'Failed to delete');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive'
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-destructive mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your products and inventory</p>
          <div className="w-20 h-1 bg-destructive mt-2"></div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6">
          <p className="text-yellow-500 font-medium">⚠️ Testing Mode: Admin authentication is bypassed. Everyone has admin access.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'products' ? 'default' : 'outline'}
            onClick={() => setActiveTab('products')}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Products
          </Button>
          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('create');
              setEditingProduct(null);
              setFormData({
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
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Product
          </Button>
        </div>

        {/* Products List Tab */}
        {activeTab === 'products' && (
          <Card>
            <CardHeader>
              <CardTitle>All Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No products yet</p>
                  <Button onClick={() => setActiveTab('create')}>
                    Create Your First Product
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">SKU</th>
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Stock</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-b">
                          <td className="py-3">{product.id}</td>
                          <td className="py-3 font-mono text-sm">{product.sku}</td>
                          <td className="py-3 max-w-xs truncate">{product.name}</td>
                          <td className="py-3 font-semibold">${product.regular_price}</td>
                          <td className="py-3">
                            <span className={product.stock > 0 ? 'text-green-500' : 'text-red-500'}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              product.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                            }`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <Link to={`/product/${product.slug}`} target="_blank">
                                <Button size="sm" variant="ghost">View</Button>
                              </Link>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(product.id)}>
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
        )}

        {/* Create/Edit Product Tab */}
        {activeTab === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="FS-TRAINER-001"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({ 
                          ...formData, 
                          name,
                          slug: formData.slug || generateSlug(name)
                        });
                      }}
                      placeholder="SimFab Flight Sim Trainer Station"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="flight-sim-trainer-station"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: /product/{formData.slug || 'your-product-slug'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    placeholder="Your Gateway to Precision Aviation Training"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed product description..."
                    rows={4}
                  />
                </div>

                {/* Pricing & Inventory */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="regular_price">Price ($) *</Label>
                    <Input
                      id="regular_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.regular_price}
                      onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })}
                      placeholder="999.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Product Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                        <SelectItem value="configurable">Configurable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="categories">Category</Label>
                    <Select 
                      value={formData.categories} 
                      onValueChange={(value) => setFormData({ ...formData, categories: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flight-sim">Flight Sim</SelectItem>
                        <SelectItem value="sim-racing">Sim Racing</SelectItem>
                        <SelectItem value="cockpits">Cockpits</SelectItem>
                        <SelectItem value="monitor-stands">Monitor Stands</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="best-seller, modular, professional"
                  />
                </div>

                {/* Featured */}
                <div className="flex items-center gap-2">
                  <input
                    id="featured"
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="featured">Featured Product</Label>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingProduct ? 'Update' : 'Create'} Product
                      </>
                    )}
                  </Button>
                  {editingProduct && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setEditingProduct(null);
                        setActiveTab('products');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Help Text */}
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> After creating a product, you can add variations, colors, and add-ons 
                    by visiting the product detail page and using the configuration tools.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    For now, create simple products to test the system. Advanced configurations coming soon!
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Stock</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.stock > 0).length}
                  </p>
                </div>
                <Settings className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Featured</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.featured).length}
                  </p>
                </div>
                <Settings className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links */}
        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/shop" className="text-sm text-primary hover:underline">→ View Shop Page</Link>
            <a href={`${API_URL}/api/products`} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">→ API: Products</a>
            <a href={`${API_URL}/api/products/featured`} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">→ API: Featured</a>
            <a href={`${API_URL}/health`} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">→ API: Health</a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;

