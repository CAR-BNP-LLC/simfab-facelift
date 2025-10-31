/**
 * Admin Dashboard
 * Complete admin panel with Dashboard, Orders, Products, Users, Settings
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings,
  Shield,
  Plus,
  Edit,
  Trash2,
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Eye,
  Check,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Upload,
  Image as ImageIcon,
  Star,
  GripVertical,
  Trash,
  Info,
  Ticket,
  ExternalLink,
  Mail,
  FileText,
  LayoutGrid,
  AlertTriangle
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/use-error-handler';
import VariationsList from '@/components/admin/VariationsList';
import VariationManagementDialog from '@/components/admin/VariationManagementDialog';
import ProductEditDialog from '@/components/admin/ProductEditDialog';
import RbacManagement from '@/components/admin/RbacManagement';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';
import CouponList from '@/components/admin/CouponList';
import CouponForm from '@/components/admin/CouponForm';
import PermittedFor from '@/components/auth/PermittedFor';
import EmailTemplatesTab from '@/components/admin/EmailTemplatesTab';
import ErrorLogsTab from '@/components/admin/ErrorLogsTab';
import PageProductsTab from '@/components/admin/PageProductsTab';
import { AnalyticsDashboard } from '@/components/admin/analytics/AnalyticsDashboard';
import { adminVariationsAPI, VariationWithOptions, CreateVariationDto, UpdateVariationDto } from '@/services/api';

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
  const [stockMismatchMap, setStockMismatchMap] = useState<Record<number, boolean>>({});
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productImages, setProductImages] = useState<any[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Variation management state
  const [productVariations, setProductVariations] = useState<VariationWithOptions[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<VariationWithOptions | null>(null);
  
  // Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  
  // Coupon management state
  const [couponFormOpen, setCouponFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  
  const { toast } = useToast();
  const { handleError, handleSuccess } = useErrorHandler();

  // Utility function to generate slug from name (GitHub-style)
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  // Sorting and filtering state
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Handle product name change and auto-generate slug
  const handleProductNameChange = (name: string) => {
    // Only generate new slug if creating new product or name has changed
    const shouldGenerateSlug = !editingProduct || name !== editingProduct.name;
    const slug = shouldGenerateSlug ? generateSlug(name) : productForm.slug;
    
    setProductForm(prev => ({
      ...prev,
      name,
      slug
    }));
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'analytics') {
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
      
      // Fetch stock mismatch info
      try {
        const mismatchResponse = await fetch(`${API_URL}/api/admin/products/stock-mismatch-check`, {
          credentials: 'include'
        });
        const mismatchData = await mismatchResponse.json();
        if (mismatchData.success) {
          setStockMismatchMap(mismatchData.data || {});
        }
      } catch (err) {
        console.error('Failed to load stock mismatch info:', err);
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

  const handleViewOrderDetails = async (orderId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedOrder(data.data);
        setOrderDetailsModalOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load order details',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive'
      });
    }
  };

  const handleCloseOrderDetails = () => {
    setOrderDetailsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      const productData = {
        ...productForm,
        // Only include slug if creating new product or name has changed
        ...(editingProduct && productForm.name === editingProduct.name 
          ? {} 
          : { slug: generateSlug(productForm.name) }
        ),
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
        
        // Invalidate navbar cache
        window.dispatchEvent(new CustomEvent('productChanged'));
        
        // Reset form
        setProductForm({
          sku: '',
          name: '',
          slug: '', // Will be auto-generated when name is entered
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
        
        // Invalidate navbar cache
        window.dispatchEvent(new CustomEvent('productChanged'));
        
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
    setEditDialogOpen(true);
    
    // Fetch product images when editing
    if (product.id) {
      fetchProductImages(product.id);
      fetchProductVariations(product.id);
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingProduct(null);
    setProductImages([]);
    setProductVariations([]);
  };

  const handleSaveFromDialog = async (formData: any) => {
    if (!editingProduct?.id) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
        fetchProducts(); // Refresh the products list
        handleCloseEditDialog();
      } else {
        throw new Error(data.error?.message || 'Failed to update product');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update product',
        variant: 'destructive'
      });
    }
  };

  // Image management functions
  const fetchProductImages = async (productId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/images`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setProductImages(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch product images:', error);
    }
  };

  const handleImageUpload = async (productId: number, files: FileList) => {
    setUploadingImages(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`${API_URL}/api/admin/products/${productId}/images`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'Upload failed');
        }
        
        return data.data;
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setProductImages(prev => [...prev, ...uploadedImages]);
      
      toast({
        title: 'Success',
        description: `${uploadedImages.length} image(s) uploaded successfully`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload images',
        variant: 'destructive'
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (productId: number, imageId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        setProductImages(prev => prev.filter(img => img.id !== imageId));
        toast({ title: 'Image deleted' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive'
      });
    }
  };

  const handleSetPrimaryImage = async (productId: number, imageId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_primary: true })
      });
      
      const data = await response.json();
      if (data.success) {
        setProductImages(prev => 
          prev.map(img => ({
            ...img,
            is_primary: img.id === imageId
          }))
        );
        toast({ title: 'Primary image updated' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update primary image',
        variant: 'destructive'
      });
    }
  };

  // Variation management functions
  const fetchProductVariations = async (productId: number) => {
    try {
      setVariationsLoading(true);
      const response = await adminVariationsAPI.getVariations(productId);
      setProductVariations(response.data);
    } catch (error) {
      console.error('Failed to fetch product variations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product variations',
        variant: 'destructive'
      });
    } finally {
      setVariationsLoading(false);
    }
  };

  const handleCreateVariation = async (data: CreateVariationDto) => {
    if (!editingProduct?.id) {
      console.error('No editing product ID');
      return;
    }
    
    console.log('Creating variation:', data, 'for product:', editingProduct.id);
    
    try {
      const response = await adminVariationsAPI.createVariation(editingProduct.id, data);
      console.log('Variation created successfully:', response);
      setProductVariations(prev => [...prev, response.data]);
      handleSuccess('Variation created successfully');
    } catch (error) {
      handleError(error, 'Failed to create variation');
      throw error;
    }
  };

  const handleUpdateVariation = async (data: UpdateVariationDto) => {
    if (!editingProduct?.id || !editingVariation?.id) return;
    
    try {
      const response = await adminVariationsAPI.updateVariation(editingProduct.id, editingVariation.id, data);
      setProductVariations(prev => 
        prev.map(v => v.id === editingVariation.id ? response.data : v)
      );
      handleSuccess('Variation updated successfully');
    } catch (error) {
      handleError(error, 'Failed to update variation');
      throw error;
    }
  };

  const handleDeleteVariation = async (variationId: number) => {
    if (!editingProduct?.id) return;
    
    try {
      await adminVariationsAPI.deleteVariation(editingProduct.id, variationId);
      setProductVariations(prev => prev.filter(v => v.id !== variationId));
      handleSuccess('Variation deleted successfully');
    } catch (error) {
      handleError(error, 'Failed to delete variation');
    }
  };

  const handleEditVariation = (variation: VariationWithOptions) => {
    setEditingVariation(variation);
    setVariationDialogOpen(true);
  };

  const handleAddVariation = () => {
    setEditingVariation(null);
    setVariationDialogOpen(true);
  };

  const handleVariationDialogClose = () => {
    setVariationDialogOpen(false);
    setEditingVariation(null);
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

  // Coupon handlers
  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponFormOpen(true);
  };

  const handleEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon);
    setCouponFormOpen(true);
  };

  const handleDeleteCoupon = async (coupon: any) => {
    if (!confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/coupons/${coupon.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Coupon deleted successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete coupon',
        variant: 'destructive',
      });
    }
  };

  const handleCouponSave = () => {
    // The CouponList will re-fetch automatically
    setCouponFormOpen(false);
    setEditingCoupon(null);
  };

  // Sorting and filtering functions
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const filteredAndSortedProducts = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => {
        const categories = typeof product.categories === 'string' 
          ? JSON.parse(product.categories) 
          : product.categories || [];
        return categories.includes(categoryFilter);
      });
    }

    // Apply featured filter
    if (featuredFilter !== 'all') {
      const isFeatured = featuredFilter === 'featured';
      filtered = filtered.filter(product => product.featured === isFeatured);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
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
          <TabsList className="grid w-full grid-cols-11">
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
            <TabsTrigger value="page-products" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Page Products</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Product</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Coupons</span>
            </TabsTrigger>
            <TabsTrigger value="email-templates" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Emails</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="error-logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Error Logs</span>
            </TabsTrigger>
            <TabsTrigger value="rbac" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab - Navigation Squares */}
          <TabsContent value="dashboard" className="space-y-6">
            <PermittedFor authority="dashboard:view">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Orders Card - Most Important */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('orders')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <ShoppingBag className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Orders</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Manage and track customer orders
                    </p>
                  </CardContent>
                </Card>

                {/* Products Card - Core Business */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('products')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Package className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Products</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      View, edit, and manage your products
                    </p>
                  </CardContent>
                </Card>

                {/* Page Products Card - Content Management */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('page-products')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <LayoutGrid className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Page Products</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Manage featured products on pages
                    </p>
                  </CardContent>
                </Card>

                {/* Create Product Card - Content Creation */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('create')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Plus className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Create Product</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Add a new product to your catalog
                    </p>
                  </CardContent>
                </Card>

                {/* Coupons Card - Marketing */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('coupons')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Ticket className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Coupons</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Create and manage discount coupons
                    </p>
                  </CardContent>
                </Card>

                {/* Email Templates Card - Communication */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('email-templates')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Mail className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Emails</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Manage email templates and settings
                    </p>
                  </CardContent>
                </Card>

                {/* Analytics Card - Insights */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('analytics')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <TrendingUp className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Analytics</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      View sales stats, revenue, and top products
                    </p>
                  </CardContent>
                </Card>

                {/* Error Logs Card - Monitoring */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('error-logs')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <FileText className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Error Logs</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      View and monitor system error logs
                    </p>
                  </CardContent>
                </Card>

                {/* Permissions Card - Admin */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('rbac')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Shield className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Permissions</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Manage roles and access control
                    </p>
                  </CardContent>
                </Card>

                {/* Settings Card - System */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('settings')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Settings className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Settings</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      System configuration and preferences
                    </p>
                  </CardContent>
                </Card>
              </div>
            </PermittedFor>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <PermittedFor authority="dashboard:view">
              <AnalyticsDashboard
                dashboardStats={dashboardStats}
                loading={loading}
              />
            </PermittedFor>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <PermittedFor authority="orders:view">
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
                          <th className="text-left py-3 px-2">Payment</th>
                          <th className="text-left py-3 px-2">Date</th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr 
                            key={order.id} 
                            className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleViewOrderDetails(order.id)}
                          >
                            <td className="py-3 px-2">
                              <span className="font-mono text-sm font-semibold">{order.order_number}</span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-sm">
                                {order.user_first_name && order.user_last_name ? (
                                  <p className="font-medium">{order.user_first_name} {order.user_last_name}</p>
                                ) : null}
                                <p className="text-muted-foreground">{order.user_email || order.customer_email}</p>
                                {order.customer_phone && (
                                  <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant="outline">{order.item_count || 0}</Badge>
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-semibold">${parseFloat(order.total_amount).toFixed(2)}</span>
                            </td>
                            <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                              <PermittedFor 
                                authority="orders:manage" 
                                fallback={<Badge variant="outline">{order.status}</Badge>}
                              >
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
                              </PermittedFor>
                            </td>
                            <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                              <Badge 
                                variant={
                                  order.payment_status === 'paid' ? 'default' :
                                  order.payment_status === 'pending' ? 'secondary' :
                                  order.payment_status === 'failed' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {order.payment_status || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewOrderDetails(order.id)}
                              >
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
            </PermittedFor>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <PermittedFor authority="products:view">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Management</CardTitle>
                    <CardDescription>View and manage products</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => {/* CSV upload functionality */}}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload CSV
                    </Button>
                    <PermittedFor authority="products:create">
                      <Button onClick={() => setActiveTab('create')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    </PermittedFor>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="flight-sim">Flight Sim</SelectItem>
                        <SelectItem value="sim-racing">Sim Racing</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="monitor-stands">Monitor Stands</SelectItem>
                        <SelectItem value="cockpits">Cockpits</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Featured" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="not-featured">Not Featured</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Results counter */}
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {filteredAndSortedProducts().length} of {products.length} products
                </div>
                
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
                          <th className="text-left py-3 px-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('sku')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              SKU {getSortIcon('sku')}
                            </Button>
                          </th>
                          <th className="text-left py-3 px-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('name')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Name {getSortIcon('name')}
                            </Button>
                          </th>
                          <th className="text-left py-3 px-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('regular_price')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Price {getSortIcon('regular_price')}
                            </Button>
                          </th>
                          <th className="text-left py-3 px-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('stock')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Stock {getSortIcon('stock')}
                            </Button>
                          </th>
                          <th className="text-left py-3 px-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('status')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Status {getSortIcon('status')}
                            </Button>
                          </th>
                          <th className="text-left py-3 px-2">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort('featured')}
                              className="h-auto p-0 font-semibold hover:bg-transparent"
                            >
                              Featured {getSortIcon('featured')}
                            </Button>
                          </th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedProducts().map((product) => (
                          <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2 group">
                                <span className="font-mono text-sm group-hover:text-primary transition-colors">
                                  {product.sku}
                                </span>
                                {product.slug && (
                                  <Link 
                                    to={`/product/${product.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    title="View product page"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 max-w-xs">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{product.name}</p>
                                {stockMismatchMap[product.id] && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Stock mismatch: Variation stock sum doesn't match product stock</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {product.is_on_sale && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  SALE
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex flex-col gap-1">
                                {product.is_on_sale && product.sale_price ? (
                                  <>
                                    <span className="font-bold text-destructive">
                                      ${parseFloat(product.sale_price.toString()).toFixed(2)}
                                    </span>
                                    <span className="text-xs line-through text-muted-foreground">
                                      ${product.regular_price ? parseFloat(product.regular_price.toString()).toFixed(2) : '0.00'}
                                    </span>
                                  </>
                                ) : (
                                  <span>${product.regular_price ? parseFloat(product.regular_price.toString()).toFixed(2) : '0.00'}</span>
                                )}
                              </div>
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
                                <PermittedFor authority="products:edit">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </PermittedFor>
                                <PermittedFor authority="products:delete">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </PermittedFor>
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
            </PermittedFor>
          </TabsContent>

          {/* Create Product Tab */}
          <TabsContent value="create" className="space-y-6">
            <PermittedFor authority="products:create">
            <Card>
              <CardHeader>
                <CardTitle>Create New Product</CardTitle>
                <CardDescription>
                  Add a new product to your catalog
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
                        onChange={(e) => handleProductNameChange(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug (Auto-generated)</Label>
                    <Input
                      id="slug"
                      value={productForm.slug}
                      readOnly
                      placeholder="Will be generated from product name..."
                      className="bg-muted text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated automatically from product name (lowercase, kebab-case)
                    </p>
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
                    <Checkbox
                      id="featured"
                      checked={productForm.featured}
                      onCheckedChange={(checked) => setProductForm({ ...productForm, featured: checked as boolean })}
                    />
                    <div className="flex items-center gap-1">
                      <Label htmlFor="featured" className="cursor-pointer">Featured Product</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Featured products are highlighted in navbar category menus</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Image upload and variations will be available after product creation */}
                  {false && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Product Images</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Upload multiple images. The first image will be used in navigation menus.
                        </p>
                      </div>

                      {/* Upload Area */}
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="image-upload"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleImageUpload(editingProduct.id, e.target.files);
                            }
                          }}
                          className="hidden"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-lg font-medium mb-2">Upload Images</p>
                          <p className="text-sm text-muted-foreground">
                            Click to select multiple images or drag and drop
                          </p>
                        </label>
                      </div>

                      {/* Image Gallery */}
                      {productImages.length > 0 ? (
                        <div className="space-y-4">
                          <h4 className="font-medium">Current Images ({productImages.length})</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {productImages
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((image, index) => (
                                <div key={image.id} className="relative group">
                                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                                    <img
                                      src={image.image_url}
                                      alt={image.alt_text || `Product image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  
                                  {/* Image Actions */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleSetPrimaryImage(editingProduct.id, image.id)}
                                        className="h-8 w-8 p-0"
                                        title={image.is_primary ? "Primary image" : "Set as primary"}
                                      >
                                        <Star className={`h-4 w-4 ${image.is_primary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteImage(editingProduct.id, image.id)}
                                        className="h-8 w-8 p-0"
                                        title="Delete image"
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Primary Badge */}
                                  {image.is_primary && (
                                    <div className="absolute top-2 left-2">
                                      <Badge variant="default" className="text-xs">
                                        Primary
                                      </Badge>
                                    </div>
                                  )}

                                  {/* Drag Handle */}
                                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                          <p className="text-muted-foreground">This product has no images</p>
                        </div>
                      )}

                      {uploadingImages && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>Uploading images...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product Variations Section */}
                  {editingProduct && (
                    <div className="space-y-4">
                      <VariationsList
                        variations={productVariations}
                        loading={variationsLoading}
                        onEdit={handleEditVariation}
                        onDelete={handleDeleteVariation}
                        onAdd={handleAddVariation}
                      />
                    </div>
                  )}

                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Product'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            </PermittedFor>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-6">
            <PermittedFor authority="coupons:view">
              <CouponList
                onCreateClick={handleCreateCoupon}
                onEditClick={handleEditCoupon}
                onDeleteClick={handleDeleteCoupon}
              />
            </PermittedFor>
          </TabsContent>

          {/* RBAC Management Tab */}
          <TabsContent value="rbac" className="space-y-6">
            <RbacManagement />
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="email-templates" className="space-y-6 pb-24">
            <EmailTemplatesTab />
          </TabsContent>

          {/* Error Logs Tab */}
          <TabsContent value="error-logs" className="space-y-6">
            <ErrorLogsTab />
          </TabsContent>

          {/* Page Products Tab */}
          <TabsContent value="page-products" className="space-y-6 pb-24">
            <PageProductsTab />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <PermittedFor authority="rbac:manage">
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
            </PermittedFor>
          </TabsContent>
        </Tabs>
      </main>

      {/* Variation Management Dialog */}
      <VariationManagementDialog
        open={variationDialogOpen}
        onClose={handleVariationDialogClose}
        onSave={editingVariation ? handleUpdateVariation : handleCreateVariation}
        variation={editingVariation}
        productId={editingProduct?.id || 0}
      />

      {/* Product Edit Dialog */}
      <ProductEditDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        onSave={handleSaveFromDialog}
        product={editingProduct}
        productImages={productImages}
        productVariations={productVariations}
        onImageUpload={async (file, productId) => {
          setUploadingImages(true);
          try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await fetch(`${API_URL}/api/admin/products/${productId}/images`, {
              method: 'POST',
              credentials: 'include',
              body: formData
            });
            if (response.ok) {
              fetchProductImages(productId);
            }
          } finally {
            setUploadingImages(false);
          }
        }}
        onImageDelete={async (imageId) => {
          try {
            await fetch(`${API_URL}/api/admin/products/images/${imageId}`, {
              method: 'DELETE',
              credentials: 'include'
            });
            if (editingProduct?.id) {
              fetchProductImages(editingProduct.id);
            }
          } catch (error) {
            console.error('Failed to delete image:', error);
          }
        }}
        onImageReorder={async (imageId, newOrder) => {
          try {
            await fetch(`${API_URL}/api/admin/products/images/${imageId}/reorder`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ sort_order: newOrder })
            });
            if (editingProduct?.id) {
              fetchProductImages(editingProduct.id);
            }
          } catch (error) {
            console.error('Failed to reorder image:', error);
          }
        }}
        onSetPrimaryImage={async (imageId) => {
          try {
            await fetch(`${API_URL}/api/admin/products/images/${imageId}/set-primary`, {
              method: 'PUT',
              credentials: 'include'
            });
            if (editingProduct?.id) {
              fetchProductImages(editingProduct.id);
            }
            toast({
              title: 'Success',
              description: 'Primary image updated'
            });
          } catch (error) {
            console.error('Failed to set primary image:', error);
            toast({
              title: 'Error',
              description: 'Failed to set primary image',
              variant: 'destructive'
            });
          }
        }}
        uploadingImages={uploadingImages}
      />

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        open={orderDetailsModalOpen}
        onClose={handleCloseOrderDetails}
      />

      {/* Coupon Form Dialog */}
      <CouponForm
        open={couponFormOpen}
        onClose={() => {
          setCouponFormOpen(false);
          setEditingCoupon(null);
        }}
        onSave={handleCouponSave}
        coupon={editingCoupon}
      />

      <Footer />
    </div>
  );
};

export default Admin;
