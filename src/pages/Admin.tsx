/**
 * Admin Dashboard
 * Complete admin panel with Dashboard, Orders, Products, Users, Settings
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  AlertTriangle,
  Truck,
  RotateCcw,
  Megaphone,
  Download
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator, SelectGroup } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/use-error-handler';
import VariationsList from '@/components/admin/VariationsList';
import VariationManagementDialog from '@/components/admin/VariationManagementDialog';
import ProductEditDialog from '@/components/admin/ProductEditDialog';
import ProductGroupRow from '@/components/admin/ProductGroupRow';
import RbacManagement from '@/components/admin/RbacManagement';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';
import CSVImportExportDialog from '@/components/admin/CSVImportExportDialog';
import CouponList from '@/components/admin/CouponList';
import CouponForm from '@/components/admin/CouponForm';
import PermittedFor from '@/components/auth/PermittedFor';
import EmailTemplatesTab from '@/components/admin/EmailTemplatesTab';
import ErrorLogsTab from '@/components/admin/ErrorLogsTab';
import PageProductsTab from '@/components/admin/PageProductsTab';
import ShippingQuotes from '@/components/admin/ShippingQuotes';
import { AnalyticsDashboard } from '@/components/admin/analytics/AnalyticsDashboard';
import AssemblyManualsManagement from '@/components/admin/AssemblyManualsManagement';
import SettingsTab from '@/components/admin/SettingsTab';
import { adminVariationsAPI, VariationWithOptions, CreateVariationDto, UpdateVariationDto, siteNoticeAPI, SiteNotice, marketingCampaignAPI, MarketingCampaign, CampaignStats } from '@/services/api';

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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Sync activeTab with URL query parameter
  const urlTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTabState] = useState(urlTab);
  
  // Update URL when tab changes
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'dashboard') {
      newParams.delete('tab'); // Remove tab param for dashboard to keep URL clean
    } else {
      newParams.set('tab', tab);
    }
    // Use replace: false to create history entry for back button
    setSearchParams(newParams, { replace: false });
  };
  
  // Sync tab from URL when browser back/forward is used
  useEffect(() => {
    const currentUrlTab = searchParams.get('tab') || 'dashboard';
    if (currentUrlTab !== activeTab) {
      setActiveTabState(currentUrlTab);
    }
  }, [searchParams, activeTab]);

  // Handle order query parameter - open order details when order param is present
  useEffect(() => {
    const orderIdParam = searchParams.get('order');
    if (orderIdParam && activeTab === 'orders' && !orderDetailsModalOpen) {
      const orderId = parseInt(orderIdParam);
      if (!isNaN(orderId) && (!selectedOrder || selectedOrder.id !== orderId)) {
        handleViewOrderDetails(orderId);
        // Remove order param from URL after opening modal
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('order');
        setSearchParams(newParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activeTab]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockMismatchMap, setStockMismatchMap] = useState<Record<number, boolean>>({});
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingProductGroup, setEditingProductGroup] = useState<any[] | null>(null);
  const [productImages, setProductImages] = useState<any[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'group' | 'individual'>('individual');
  const [pairedProduct, setPairedProduct] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Site notice management state
  const [siteNotices, setSiteNotices] = useState<SiteNotice[]>([]);
  const [editingNotice, setEditingNotice] = useState<SiteNotice | null>(null);
  const [noticeForm, setNoticeForm] = useState({ message: '', is_active: true });
  
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
  const [couponRefreshTrigger, setCouponRefreshTrigger] = useState(0);
  
  // Marketing campaign state
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({ name: '', subject: '', content: '' });
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [sendingCampaign, setSendingCampaign] = useState<number | null>(null);
  
  // CSV import/export state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  
  // Image migration state
  const [migratingImages, setMigratingImages] = useState(false);
  
  // Force delete dialog state
  const [forceDeleteDialogOpen, setForceDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; cartCount: number } | null>(null);
  
  // Delete all dialog state
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  
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
  const [regionFilter, setRegionFilter] = useState<string>('all'); // 'all', 'us', 'eu'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderRegionFilter, setOrderRegionFilter] = useState<string>('all'); // 'all', 'us', 'eu' - for orders
  const [orderCouponFilter, setOrderCouponFilter] = useState<string>('all'); // 'all' or coupon ID
  const [coupons, setCoupons] = useState<any[]>([]); // For coupon filter dropdown

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
    stock_quantity_eu: '10', // Stock for EU when creating for both
    categories: [] as string[],
    tags: '',
    note: '',
    region: 'us' as 'us' | 'eu' | 'both'
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

  // Load site notices
  const fetchSiteNotices = async () => {
    try {
      const response = await siteNoticeAPI.getAllNotices();
      if (response.success && response.data) {
        setSiteNotices(response.data);
      }
    } catch (error) {
      console.error('Failed to load site notices:', error);
    }
  };

  // Load marketing campaigns
  const fetchCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const response = await marketingCampaignAPI.listCampaigns();
      if (response.success && response.data) {
        setCampaigns(response.data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      handleError(error);
    } finally {
      setCampaignsLoading(false);
    }
  };

  // Load eligible recipient count
  const fetchEligibleCount = async () => {
    try {
      const response = await marketingCampaignAPI.getEligibleCount();
      if (response.success && response.data) {
        setEligibleCount(response.data.count);
      }
    } catch (error) {
      console.error('Failed to load eligible count:', error);
    }
  };

  // Handle create/edit campaign
  const handleSaveCampaign = async () => {
    try {
      if (editingCampaign) {
        await marketingCampaignAPI.updateCampaign(editingCampaign.id, campaignForm);
        handleSuccess('Campaign updated successfully');
      } else {
        await marketingCampaignAPI.createCampaign(campaignForm);
        handleSuccess('Campaign created successfully');
      }
      setEditingCampaign(null);
      setCampaignForm({ name: '', subject: '', content: '' });
      setShowCampaignForm(false);
      fetchCampaigns();
    } catch (error) {
      handleError(error);
    }
  };

  // Handle send campaign
  const handleSendCampaign = async (id: number) => {
    if (!confirm(`Are you sure you want to send this campaign to ${eligibleCount} recipients? This action cannot be undone.`)) {
      return;
    }

    try {
      setSendingCampaign(id);
      const response = await marketingCampaignAPI.sendCampaign(id);
      if (response.success) {
        handleSuccess(`Campaign sent successfully! ${response.data.sent_count} emails sent.`);
        fetchCampaigns();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setSendingCampaign(null);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'analytics') {
      fetchDashboardStats();
    } else if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'orders') {
      fetchCoupons(); // Load coupons for filter dropdown
      fetchOrders();
    } else if (activeTab === 'site-notice') {
      fetchSiteNotices();
    } else if (activeTab === 'marketing-campaigns') {
      fetchCampaigns();
      fetchEligibleCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, orderRegionFilter, orderCouponFilter, categoryFilter]);

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
      // Build query params
      const params = new URLSearchParams();
      params.append('limit', '1000');
      params.append('includeDeleted', 'true');
      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await fetch(`${API_URL}/api/admin/products?${params.toString()}`, {
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

  const fetchCoupons = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/coupons?limit=1000`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        const couponsList = data.data.coupons || [];
        setCoupons(couponsList);
        console.log(`Loaded ${couponsList.length} coupons for filter`);
      } else {
        console.error('Failed to load coupons:', data.error);
      }
    } catch (error) {
      console.error('Failed to load coupons:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (orderRegionFilter && orderRegionFilter !== 'all') {
        params.append('region', orderRegionFilter);
      }
      if (orderCouponFilter && orderCouponFilter !== 'all') {
        params.append('coupon_id', orderCouponFilter);
      }
      const response = await fetch(`${API_URL}/api/admin/orders?${params.toString()}`, {
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

      // If editing, use normal update flow
      if (editingProduct) {
        const productData = {
          ...productForm,
          ...(productForm.name !== editingProduct.name 
            ? { slug: generateSlug(productForm.name) }
            : {}
          ),
          region: productForm.region as 'us' | 'eu',
          regular_price: parseFloat(productForm.regular_price),
          stock_quantity: parseInt(productForm.stock_quantity),
          featured: productForm.featured,
          categories: productForm.categories,
          tags: productForm.tags ? productForm.tags.split(',').map(t => t.trim()) : [],
          note: productForm.note || null
        };

        const response = await fetch(`${API_URL}/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(productData)
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: 'Success',
            description: 'Product updated'
          });
          window.dispatchEvent(new CustomEvent('productChanged'));
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
            stock_quantity_eu: '10',
            categories: [],
            tags: '',
            note: '',
            region: 'us'
          });
          setEditingProduct(null);
          fetchProducts();
          setActiveTab('products');
        } else {
          throw new Error(data.error?.message || 'Failed to update product');
        }
        return;
      }

      // Creating new product - handle both regions
      if (productForm.region === 'both') {
        // Create product group with both regions
        const baseData = {
          name: productForm.name,
          slug: generateSlug(productForm.name),
          description: productForm.description,
          short_description: productForm.short_description,
          type: productForm.type,
          status: productForm.status,
          featured: productForm.featured,
          regular_price: parseFloat(productForm.regular_price),
          categories: productForm.categories,
          tags: productForm.tags ? productForm.tags.split(',').map(t => t.trim()) : [],
          note: productForm.note || null
        };

        const productGroupData = {
          ...baseData,
          sku: productForm.sku, // Same SKU for both regions
          stock_quantity_us: parseInt(productForm.stock_quantity),
          stock_quantity_eu: parseInt(productForm.stock_quantity_eu || productForm.stock_quantity),
        };

        const response = await fetch(`${API_URL}/api/admin/products/group`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(productGroupData)
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: 'Success',
            description: 'Product created for both US and EU regions'
          });
          window.dispatchEvent(new CustomEvent('productChanged'));
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
            stock_quantity_eu: '10',
            categories: ['accessories'],
            tags: '',
            note: '',
            region: 'us'
          });
          fetchProducts();
          setActiveTab('products');
        } else {
          throw new Error(data.error?.message || 'Failed to create product group');
        }
      } else {
        // Single region product
        const productData = {
          ...productForm,
          slug: generateSlug(productForm.name),
          region: productForm.region as 'us' | 'eu',
          regular_price: parseFloat(productForm.regular_price),
          stock_quantity: parseInt(productForm.stock_quantity),
          featured: productForm.featured,
          categories: productForm.categories,
          tags: productForm.tags ? productForm.tags.split(',').map(t => t.trim()) : [],
          note: productForm.note || null
        };

        const response = await fetch(`${API_URL}/api/admin/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(productData)
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: 'Success',
            description: 'Product created'
          });
          window.dispatchEvent(new CustomEvent('productChanged'));
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
            stock_quantity_eu: '10',
            categories: ['accessories'],
            tags: '',
            note: '',
            region: 'us'
          });
          fetchProducts();
          setActiveTab('products');
        } else {
          throw new Error(data.error?.message || 'Failed to create product');
        }
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

  const handleDeleteProduct = async (id: number, force: boolean = false) => {
    if (!force && !confirm('Are you sure you want to delete this product?')) return;

    try {
      const url = force 
        ? `${API_URL}/api/admin/products/${id}?force=true`
        : `${API_URL}/api/admin/products/${id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        const softDeleted = data.data?.softDeleted || false;
        toast({ 
          title: softDeleted ? 'Product marked as deleted' : 'Product deleted',
          description: softDeleted 
            ? 'Product was soft-deleted (referenced in orders). You can restore it if needed.'
            : force ? 'Product removed from carts and deleted' : undefined
        });
        
        // Invalidate navbar cache
        window.dispatchEvent(new CustomEvent('productChanged'));
        
        fetchProducts();
        setForceDeleteDialogOpen(false);
        setProductToDelete(null);
      } else if (response.status === 409) {
        const errorCode = data.error?.code;
        
        if (errorCode === 'PRODUCT_IN_ORDERS') {
          // Product is in orders - cannot delete (no force delete option)
          const orderCount = data.error?.details?.orderCount || 0;
          toast({
            title: 'Cannot Delete Product',
            description: `This product is referenced in ${orderCount} order(s) and cannot be deleted to maintain order history integrity.`,
            variant: 'destructive',
            duration: 8000
          });
        } else if (errorCode === 'PRODUCT_IN_CART' || errorCode === 'CONFLICT') {
          // Product is in cart - show force delete dialog
          const cartCount = data.error?.details?.cartCount || 0;
          setProductToDelete({ id, cartCount });
          setForceDeleteDialogOpen(true);
        } else {
          toast({
            title: 'Error',
            description: data.error?.message || 'Failed to delete product',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to delete product',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      });
    }
  };

  const handleForceDelete = async () => {
    if (productToDelete) {
      await handleDeleteProduct(productToDelete.id, true);
    }
  };

  const handleDeleteAllProducts = async () => {
    setDeleteAllDialogOpen(false);
    setDeletingAll(true);
    
    let deleted = 0;
    let failed = 0;
    let softDeleted = 0;
    
    try {
      // Loop through all products and delete them
      for (const product of products) {
        try {
          // Skip already deleted products
          if (product.deleted_at) {
            continue;
          }
          
          const url = `${API_URL}/api/admin/products/${product.id}?force=true`;
          const response = await fetch(url, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          const data = await response.json();
          
          if (data.success) {
            if (data.data?.softDeleted) {
              softDeleted++;
            } else {
              deleted++;
            }
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to delete product ${product.id}:`, error);
          failed++;
        }
      }
      
      // Refresh products list
      fetchProducts();
      
      // Show summary toast
      toast({
        title: 'Delete All Complete',
        description: `Deleted: ${deleted} products, Soft deleted: ${softDeleted} products, Failed: ${failed} products`,
        duration: 8000
      });
      
      // Invalidate navbar cache
      window.dispatchEvent(new CustomEvent('productChanged'));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting products',
        variant: 'destructive'
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleRestoreProduct = async (id: number) => {
    if (!confirm('Are you sure you want to restore this product?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/products/${id}/restore`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast({ 
          title: 'Product restored',
          description: 'Product has been restored and is now active'
        });
        
        // Invalidate navbar cache
        window.dispatchEvent(new CustomEvent('productChanged'));
        
        fetchProducts();
      } else {
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to restore product',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to restore product',
        variant: 'destructive'
      });
    }
  };

  const handleEditProduct = async (product: any) => {
    // Individual product editing mode - show only region-specific fields
    setEditMode('individual');
    
    // Fetch fresh product data to ensure we have the latest values (especially for backorders_allowed)
    try {
      console.log('🔄 Fetching fresh product data for editing:', product.id);
      const response = await fetch(`${API_URL}/api/admin/products/${product.id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('✅ Fresh product data fetched:', { 
          id: data.data.id, 
          backorders_allowed: data.data.backorders_allowed,
          type: typeof data.data.backorders_allowed 
        });
        product = data.data; // Use fresh data
      } else {
        console.warn('⚠️  Failed to fetch fresh product data, using cached data');
      }
    } catch (error) {
      console.error('❌ Error fetching fresh product data:', error);
      // Continue with cached product data if fetch fails
    }
    
    // Find paired product if it exists (for reference, but we're editing individual)
    const paired = product.product_group_id ? products.find(p => 
      p.product_group_id === product.product_group_id && 
      p.id !== product.id &&
      p.region !== product.region
    ) : null;
    
    setEditingProduct(product);
    setPairedProduct(paired); // Pass for reference but mode is individual
    setEditDialogOpen(true);
    
    if (product.id) {
      fetchProductImages(product.id);
      fetchProductVariations(product.id);
    }
  };

  const handleEditGroup = async (groupProducts: any[]) => {
    // Group editing mode - show only shared fields
    setEditMode('group');
    setEditingProductGroup(groupProducts);
    
    // Use the first product as the base for editing
    let mainProduct = groupProducts[0];
    
    // Fetch fresh product data to ensure we have the latest values
    try {
      console.log('🔄 Fetching fresh product data for group editing:', mainProduct.id);
      const response = await fetch(`${API_URL}/api/admin/products/${mainProduct.id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('✅ Fresh product data fetched for group:', { 
          id: data.data.id, 
          backorders_allowed: data.data.backorders_allowed 
        });
        mainProduct = data.data; // Use fresh data
      } else {
        console.warn('⚠️  Failed to fetch fresh product data, using cached data');
      }
    } catch (error) {
      console.error('❌ Error fetching fresh product data:', error);
      // Continue with cached product data if fetch fails
    }
    
    const paired = groupProducts.find(p => p.id !== mainProduct.id && p.region !== mainProduct.region);
    
    setEditingProduct(mainProduct);
    setPairedProduct(paired);
    setEditDialogOpen(true);
    
    if (mainProduct.id) {
      fetchProductImages(mainProduct.id);
      fetchProductVariations(mainProduct.id);
    }
  };

  const handleBreakGroup = async (groupId: string, callback?: () => void) => {
    if (!confirm('Are you sure you want to break this product group? The products will no longer sync automatically. This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/products/group/${groupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Product group broken successfully',
        });
        fetchProducts();
        if (callback) callback();
      } else {
        throw new Error(data.error?.message || 'Failed to break product group');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to break product group',
        variant: 'destructive'
      });
    }
  };

  const handleToggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingProduct(null);
    setEditingProductGroup(null);
    setProductImages([]);
    setProductVariations([]);
    setPairedProduct(null);
    setEditMode('individual');
  };

  const handleSaveFromDialog = async (formData: any) => {
    if (!editingProduct?.id) return;

    try {
      console.log('📤 Sending product update:', editingProduct.id, formData);
      
      const response = await fetch(`${API_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      console.log('📥 Product update response:', data);

      if (data.success) {
        console.log('✅ Product update successful:', { 
          id: data.data?.id, 
          backorders_allowed: data.data?.backorders_allowed,
          type: typeof data.data?.backorders_allowed 
        });
        
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
        
        // Update the products array with the updated product data
        // This ensures the list shows the latest data immediately
        if (data.data) {
          setProducts(prevProducts => 
            prevProducts.map(p => p.id === data.data.id ? data.data : p)
          );
          
          // Also update editingProduct state
          setEditingProduct(data.data);
        }
        
        // Refresh the products list to ensure everything is in sync
        await fetchProducts();
        
        handleCloseEditDialog();
      } else {
        console.error('❌ Product update failed:', data.error);
        throw new Error(data.error?.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('❌ Product update error:', error);
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

  // Image migration function
  const handleMigrateImages = async () => {
    if (!confirm('This will download all external product and variation images to your server. This may take a while. Continue?')) {
      return;
    }

    setMigratingImages(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/products/migrate-images`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        const result = data.data;
        toast({
          title: 'Migration Complete',
          description: `Migrated ${result.migratedProductImages} product images and ${result.migratedVariationOptions} variation images. ${result.errors.length} errors occurred.`,
          variant: result.errors.length > 0 ? 'default' : 'default'
        });
        
        if (result.errors.length > 0) {
          console.error('Migration errors:', result.errors);
        }
        
        // Refresh products to show updated images
        fetchProducts();
      } else {
        throw new Error(data.error?.message || 'Migration failed');
      }
    } catch (error: any) {
      toast({
        title: 'Migration Failed',
        description: error.message || 'Failed to migrate images',
        variant: 'destructive'
      });
    } finally {
      setMigratingImages(false);
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
    
    
    try {
      const response = await adminVariationsAPI.createVariation(editingProduct.id, data);
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
        setCouponRefreshTrigger(prev => prev + 1);
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
    setCouponFormOpen(false);
    setEditingCoupon(null);
    setCouponRefreshTrigger(prev => prev + 1);
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

    // Apply region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(product => product.region === regionFilter);
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

  // Group products by product_group_id
  // Only creates groups for products that have at least 2 products sharing the same group_id
  const groupProducts = () => {
    const filtered = filteredAndSortedProducts();
    const groups = new Map<string, any[]>();
    const ungrouped: any[] = [];

    // First pass: collect all products by group_id
    const tempGroups = new Map<string, any[]>();
    filtered.forEach(product => {
      if (product.product_group_id) {
        const groupId = product.product_group_id;
        if (!tempGroups.has(groupId)) {
          tempGroups.set(groupId, []);
        }
        tempGroups.get(groupId)!.push(product);
      } else {
        ungrouped.push(product);
      }
    });

    // Second pass: only add groups with 2+ products
    tempGroups.forEach((groupProducts, groupId) => {
      if (groupProducts.length >= 2) {
        groups.set(groupId, groupProducts);
      } else {
        // If only one product has this group_id, treat it as ungrouped
        ungrouped.push(...groupProducts);
      }
    });

    return { groups, ungrouped };
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
          <TabsList className="grid grid-cols-9 w-full">
            <TabsTrigger value="dashboard" className="flex items-center justify-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center justify-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="shipping-quotes" className="flex items-center justify-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Shipping Quotes</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center justify-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Product</span>
            </TabsTrigger>
            <PermittedFor authority="emails:view">
              <TabsTrigger value="email-templates" className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Emails</span>
              </TabsTrigger>
            </PermittedFor>
            <TabsTrigger value="analytics" className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="site-notice" className="flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Site Notice</span>
            </TabsTrigger>
            <PermittedFor authority="marketing:view">
              <TabsTrigger value="marketing-campaigns" className="flex items-center justify-center gap-2">
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Marketing</span>
              </TabsTrigger>
            </PermittedFor>
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

                {/* Shipping Quotes Card - Shipping Management */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('shipping-quotes')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Truck className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Shipping Quotes</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Manage shipping quotes and rates
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

                {/* Marketing Campaigns Card - Email Marketing */}
                <PermittedFor authority="marketing:view">
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => setActiveTab('marketing-campaigns')}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                      <Megaphone className="h-12 w-12 text-primary mb-4" />
                      <CardTitle className="text-xl font-bold mb-2">Marketing Campaigns</CardTitle>
                      <p className="text-sm text-muted-foreground text-center">
                        Send marketing emails to all registered users
                      </p>
                    </CardContent>
                  </Card>
                </PermittedFor>

                {/* Email Templates Card - Communication */}
                <PermittedFor authority="emails:view">
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
                </PermittedFor>

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

                {/* Assembly Manuals Card - Content Management */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => setActiveTab('assembly-manuals')}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <FileText className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-xl font-bold mb-2">Assembly Manuals</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                      Manage PDF manuals and QR codes
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

          {/* Site Notice Tab */}
          <TabsContent value="site-notice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site-Wide Notice Management</CardTitle>
                <CardDescription>
                  Manage the notice displayed on the home page once per session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create/Edit Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notice-message">Notice Message</Label>
                    <Textarea
                      id="notice-message"
                      value={noticeForm.message}
                      onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                      placeholder="e.g., 'Black Friday promo' or 'Out of office orders will be slowed by a few days'"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notice-active"
                      checked={noticeForm.is_active}
                      onCheckedChange={(checked) => setNoticeForm({ ...noticeForm, is_active: checked as boolean })}
                    />
                    <Label htmlFor="notice-active" className="cursor-pointer">
                      Active (only one notice can be active at a time)
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          if (editingNotice) {
                            await siteNoticeAPI.updateNotice(editingNotice.id, noticeForm.message, noticeForm.is_active);
                            toast({ title: 'Success', description: 'Notice updated' });
                          } else {
                            await siteNoticeAPI.createNotice(noticeForm.message, noticeForm.is_active);
                            toast({ title: 'Success', description: 'Notice created' });
                          }
                          setNoticeForm({ message: '', is_active: true });
                          setEditingNotice(null);
                          // Refresh notices list
                          await fetchSiteNotices();
                        } catch (error: any) {
                          toast({
                            title: 'Error',
                            description: error.message || 'Failed to save notice',
                            variant: 'destructive'
                          });
                        }
                      }}
                      disabled={!noticeForm.message.trim()}
                    >
                      {editingNotice ? 'Update Notice' : 'Create Notice'}
                    </Button>
                    {editingNotice && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingNotice(null);
                          setNoticeForm({ message: '', is_active: true });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notices List */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">All Notices</h3>
                  {siteNotices.length === 0 ? (
                    <p className="text-muted-foreground">No notices created yet</p>
                  ) : (
                    <div className="space-y-3">
                      {siteNotices.map((notice) => (
                        <Card key={notice.id} className={notice.is_active ? 'border-blue-500' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {notice.is_active && (
                                    <Badge variant="default" className="bg-blue-500">
                                      Active
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    Created: {new Date(notice.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm">{notice.message}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingNotice(notice);
                                    setNoticeForm({ message: notice.message, is_active: notice.is_active });
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this notice?')) {
                                      try {
                                        await siteNoticeAPI.deleteNotice(notice.id);
                                        toast({ title: 'Success', description: 'Notice deleted' });
                                        await fetchSiteNotices();
                                      } catch (error: any) {
                                        toast({
                                          title: 'Error',
                                          description: error.message || 'Failed to delete notice',
                                          variant: 'destructive'
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Select value={orderRegionFilter} onValueChange={setOrderRegionFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      <SelectItem value="us">US</SelectItem>
                      <SelectItem value="eu">EU</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={orderCouponFilter} onValueChange={setOrderCouponFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by coupon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="no_coupon">No Coupon</SelectItem>
                      <SelectItem value="with_coupon">All Coupons</SelectItem>
                      {coupons && coupons.length > 0 && (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>Individual Coupons</SelectLabel>
                            {coupons.map((coupon) => (
                              <SelectItem key={coupon.id} value={coupon.id.toString()}>
                                {coupon.code}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
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
                          <th className="text-left py-3 px-2">Region</th>
                          <th className="text-left py-3 px-2">Items</th>
                          <th className="text-left py-3 px-2">Total</th>
                          <th className="text-left py-3 px-2">Coupon</th>
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
                              {order.region && (
                                <Badge 
                                  className={`text-xs font-semibold cursor-default pointer-events-none ${
                                    order.region === 'us' 
                                      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700' 
                                      : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700'
                                  }`}
                                >
                                  {order.region.toUpperCase()}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant="outline">{order.item_count || 0}</Badge>
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-semibold">
                                {order.currency === 'EUR' ? '€' : '$'}{parseFloat(order.total_amount).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              {order.coupon_code ? (
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {order.coupon_code}
                                  </Badge>
                                  {order.coupon_discount && (
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      -{order.currency === 'EUR' ? '€' : '$'}{parseFloat(order.coupon_discount).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
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
                    <Button variant="secondary" onClick={() => setCsvDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Import/Export CSV
                    </Button>
                    <PermittedFor authority="products:edit">
                      <Button 
                        variant="outline" 
                        onClick={handleMigrateImages}
                        disabled={migratingImages}
                      >
                        {migratingImages ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Migrating...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Migrate Images
                          </>
                        )}
                      </Button>
                    </PermittedFor>
                    <PermittedFor authority="products:delete">
                      <Button 
                        variant="destructive" 
                        onClick={() => setDeleteAllDialogOpen(true)}
                        disabled={deletingAll || products.length === 0}
                      >
                        {deletingAll ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All
                          </>
                        )}
                      </Button>
                    </PermittedFor>
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
                        <SelectItem value="conversion-kits">Conversion Kits</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="individual-parts">Individual Parts</SelectItem>
                        <SelectItem value="racing-flight-seats">Racing & Flight Seats</SelectItem>
                        <SelectItem value="refurbished">B-stock</SelectItem>
                        <SelectItem value="bundles">Bundles</SelectItem>
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
                    <Select value={regionFilter} onValueChange={setRegionFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="us">US Only</SelectItem>
                        <SelectItem value="eu">EU Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Results counter */}
                <div className="mb-4 text-sm text-muted-foreground">
                  {(() => {
                    const { groups, ungrouped } = groupProducts();
                    const totalDisplayed = groups.size + ungrouped.length;
                    return `Showing ${totalDisplayed} ${groups.size > 0 ? 'groups and ' : ''}${ungrouped.length} products of ${products.length} total`;
                  })()}
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
                        {(() => {
                          const { groups, ungrouped } = groupProducts();
                          const rows: JSX.Element[] = [];

                          // Add grouped products
                          groups.forEach((groupProducts, groupId) => {
                            rows.push(
                              <ProductGroupRow
                                key={`group-${groupId}`}
                                groupId={groupId}
                                products={groupProducts}
                                isExpanded={expandedGroups.has(groupId)}
                                onToggle={() => handleToggleGroup(groupId)}
                                onEditProduct={handleEditProduct}
                                onEditGroup={handleEditGroup}
                                onDeleteProduct={handleDeleteProduct}
                                onRestoreProduct={handleRestoreProduct}
                                onBreakGroup={handleBreakGroup}
                                stockMismatchMap={stockMismatchMap}
                              />
                            );
                          });

                          // Add ungrouped products
                          ungrouped.forEach((product) => (
                            rows.push(
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium truncate">{product.name}</p>
                                {product.region && (
                                  <Badge 
                                    className={`text-xs font-semibold cursor-default pointer-events-none ${
                                      product.region === 'us' 
                                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900' 
                                        : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900'
                                    }`}
                                  >
                                    {product.region.toUpperCase()}
                                  </Badge>
                                )}
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
                                {product.is_on_sale && (
                                  <Badge variant="destructive" className="text-xs">
                                    SALE
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const currency = product.region === 'eu' ? '€' : '$';
                                  return product.is_on_sale && product.sale_price ? (
                                    <>
                                      <span className="font-bold text-destructive">
                                        {currency}{parseFloat(product.sale_price.toString()).toFixed(2)}
                                      </span>
                                      <span className="text-xs line-through text-muted-foreground">
                                        {currency}{product.regular_price ? parseFloat(product.regular_price.toString()).toFixed(2) : '0.00'}
                                      </span>
                                    </>
                                  ) : (
                                    <span>{currency}{product.regular_price ? parseFloat(product.regular_price.toString()).toFixed(2) : '0.00'}</span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                                {product.stock}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                  {product.status}
                                </Badge>
                                {product.deleted_at && (
                                  <Badge variant="destructive" className="text-xs">
                                    DELETED
                                  </Badge>
                                )}
                              </div>
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
                                {product.deleted_at ? (
                                  <PermittedFor authority="products:edit">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleRestoreProduct(product.id)}
                                      title="Restore product"
                                    >
                                      <RotateCcw className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </PermittedFor>
                                ) : (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                            )
                          ));

                          return rows;
                        })()}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="region">Region *</Label>
                      <Select 
                        value={productForm.region} 
                        onValueChange={(value) => setProductForm({ ...productForm, region: value as 'us' | 'eu' | 'both' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us">United States (US) Only</SelectItem>
                          <SelectItem value="eu">Europe (EU) Only</SelectItem>
                          <SelectItem value="both">Both US & EU</SelectItem>
                        </SelectContent>
                      </Select>
                      {productForm.region === 'both' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Creates two linked products with separate stock for each region
                        </p>
                      )}
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

                  <div>
                    <Label htmlFor="note">Product Note</Label>
                    <Textarea
                      id="note"
                      value={productForm.note}
                      onChange={(e) => setProductForm({ ...productForm, note: e.target.value })}
                      rows={2}
                      placeholder="Optional note displayed on product detail page (e.g., 'Product available only on back order, expect on date')"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This note will be displayed prominently on the product detail page
                    </p>
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
                      <Label htmlFor="stock_quantity">
                        {productForm.region === 'both' ? 'Stock (US) *' : 'Stock *'}
                      </Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={productForm.stock_quantity}
                        onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                        required
                      />
                    </div>
                    {productForm.region === 'both' && (
                      <div>
                        <Label htmlFor="stock_quantity_eu">Stock (EU) *</Label>
                        <Input
                          id="stock_quantity_eu"
                          type="number"
                          value={productForm.stock_quantity_eu}
                          onChange={(e) => setProductForm({ ...productForm, stock_quantity_eu: e.target.value })}
                          required
                        />
                      </div>
                    )}
                    {productForm.region !== 'both' && (
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
                    )}
                  </div>
                  {productForm.region === 'both' && (
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
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="categories">Categories</Label>
                      <div className="mt-2 space-y-2 border rounded-md p-4 max-h-60 overflow-y-auto">
                        {[
                          { value: 'flight-sim', label: 'Flight Sim' },
                          { value: 'sim-racing', label: 'Sim Racing' },
                          { value: 'accessories', label: 'Accessories' },
                          { value: 'monitor-stands', label: 'Monitor Stands' },
                          { value: 'conversion-kits', label: 'Conversion Kits' },
                          { value: 'services', label: 'Services' },
                          { value: 'individual-parts', label: 'Individual Parts' },
                          { value: 'racing-flight-seats', label: 'Racing & Flight Seats' },
                          { value: 'refurbished', label: 'B-stock' },
                          { value: 'bundles', label: 'Bundles' },
                          { value: 'flight-sim-add-on-modules', label: 'Flight Sim Add-On Modules' },
                          { value: 'flight-sim-accessories', label: 'Flight Sim Accessories' }
                        ].map((category) => (
                          <div key={category.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`admin-category-${category.value}`}
                              checked={productForm.categories.includes(category.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setProductForm({
                                    ...productForm,
                                    categories: [...productForm.categories, category.value]
                                  });
                                } else {
                                  setProductForm({
                                    ...productForm,
                                    categories: productForm.categories.filter(c => c !== category.value)
                                  });
                                }
                              }}
                            />
                            <label
                              htmlFor={`admin-category-${category.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {category.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      {productForm.categories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {productForm.categories.map((cat) => (
                            <Badge key={cat} variant="secondary">
                              {[
                                { value: 'flight-sim', label: 'Flight Sim' },
                                { value: 'sim-racing', label: 'Sim Racing' },
                                { value: 'accessories', label: 'Accessories' },
                                { value: 'monitor-stands', label: 'Monitor Stands' },
                                { value: 'conversion-kits', label: 'Conversion Kits' },
                                { value: 'services', label: 'Services' },
                                { value: 'individual-parts', label: 'Individual Parts' },
                                { value: 'racing-flight-seats', label: 'Racing & Flight Seats' },
                                { value: 'refurbished', label: 'B-stock' },
                                { value: 'bundles', label: 'Bundles' },
                                { value: 'flight-sim-add-on-modules', label: 'Flight Sim Add-On Modules' },
                                { value: 'flight-sim-accessories', label: 'Flight Sim Accessories' }
                              ].find(c => c.value === cat)?.label || cat}
                            </Badge>
                          ))}
                        </div>
                      )}
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
                refreshTrigger={couponRefreshTrigger}
              />
            </PermittedFor>
          </TabsContent>

          {/* Shipping Quotes Tab */}
          <TabsContent value="shipping-quotes" className="space-y-6">
            <PermittedFor authority="orders:view">
              <ShippingQuotes />
            </PermittedFor>
          </TabsContent>

          {/* RBAC Management Tab */}
          <TabsContent value="rbac" className="space-y-6">
            <RbacManagement />
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="email-templates" className="space-y-6 pb-24">
            <PermittedFor authority="emails:view">
              <EmailTemplatesTab />
            </PermittedFor>
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
          {/* Assembly Manuals Tab */}
          <TabsContent value="assembly-manuals" className="space-y-6">
            <AssemblyManualsManagement />
          </TabsContent>

          {/* Marketing Campaigns Tab */}
          <TabsContent value="marketing-campaigns" className="space-y-6">
            <PermittedFor authority="marketing:view">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Marketing Campaigns</h2>
                    <p className="text-muted-foreground">Create and send marketing emails to registered users</p>
                  </div>
                  <PermittedFor authority="marketing:create">
                    <Button onClick={() => {
                      setEditingCampaign(null);
                      setCampaignForm({ name: '', subject: '', content: '' });
                      setShowCampaignForm(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  </PermittedFor>
                </div>

                {/* Eligible Recipients Info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Eligible Recipients</p>
                        <p className="text-2xl font-bold">{eligibleCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Form */}
                {(editingCampaign || showCampaignForm) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="campaign-name">Campaign Name</Label>
                        <Input
                          id="campaign-name"
                          value={campaignForm.name}
                          onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                          placeholder="e.g., Summer Sale 2024"
                        />
                      </div>
                      <div>
                        <Label htmlFor="campaign-subject">Email Subject</Label>
                        <Input
                          id="campaign-subject"
                          value={campaignForm.subject}
                          onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                          placeholder="e.g., Summer Sale - Up to 50% Off!"
                        />
                      </div>
                      <div>
                        <Label htmlFor="campaign-content">Email Content (HTML)</Label>
                        <Textarea
                          id="campaign-content"
                          value={campaignForm.content}
                          onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                          placeholder="Enter your email content in HTML format..."
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: An unsubscribe link will be automatically added to the bottom of all emails for GDPR compliance.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <PermittedFor authority="marketing:create">
                          <Button onClick={handleSaveCampaign} disabled={!campaignForm.name || !campaignForm.subject || !campaignForm.content}>
                            {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                          </Button>
                        </PermittedFor>
                        <Button variant="outline" onClick={() => {
                          setEditingCampaign(null);
                          setCampaignForm({ name: '', subject: '', content: '' });
                          setShowCampaignForm(false);
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Campaigns List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {campaignsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : campaigns.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No campaigns yet. Create your first campaign above.</p>
                    ) : (
                      <div className="space-y-4">
                        {campaigns.map((campaign) => (
                          <Card key={campaign.id}>
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold">{campaign.name}</h3>
                                    <Badge variant={campaign.status === 'sent' ? 'default' : campaign.status === 'sending' ? 'secondary' : 'outline'}>
                                      {campaign.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-1">
                                    <strong>Subject:</strong> {campaign.subject}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Created: {new Date(campaign.created_at).toLocaleDateString()}
                                    {campaign.sent_at && ` • Sent: ${new Date(campaign.sent_at).toLocaleDateString()}`}
                                    {campaign.sent_count > 0 && ` • ${campaign.sent_count} sent`}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <PermittedFor authority="marketing:edit">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingCampaign(campaign);
                                        setCampaignForm({ name: campaign.name, subject: campaign.subject, content: campaign.content });
                                        setShowCampaignForm(true);
                                      }}
                                      disabled={campaign.status === 'sent' || campaign.status === 'sending'}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </PermittedFor>
                                  <PermittedFor authority="marketing:send">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleSendCampaign(campaign.id)}
                                      disabled={campaign.status === 'sent' || campaign.status === 'sending' || sendingCampaign === campaign.id}
                                    >
                                      {sendingCampaign === campaign.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Sending...
                                        </>
                                      ) : (
                                        <>
                                          <Mail className="h-4 w-4 mr-2" />
                                          Send
                                        </>
                                      )}
                                    </Button>
                                  </PermittedFor>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </PermittedFor>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <PermittedFor authority="rbac:manage">
              <SettingsTab />
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
        mode={editMode}
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
        pairedProduct={pairedProduct}
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

      {/* CSV Import/Export Dialog */}
      <CSVImportExportDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        onImportComplete={() => {
          fetchProducts();
          toast({
            title: 'Products refreshed',
            description: 'Product list has been refreshed after import'
          });
        }}
      />

      {/* Force Delete Confirmation Dialog */}
      <AlertDialog open={forceDeleteDialogOpen} onOpenChange={setForceDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Product is in Shopping Carts</AlertDialogTitle>
            <AlertDialogDescription>
              This product is currently in {productToDelete?.cartCount || 0} shopping cart(s). 
              Deleting it will remove it from all carts. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setForceDeleteDialogOpen(false);
              setProductToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Force Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Products?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete ALL {products.filter(p => !p.deleted_at).length} active products. 
              Products referenced in orders will be soft-deleted (marked as deleted but preserved for order history).
              Products in shopping carts will be removed from carts.
              <br /><br />
              <strong className="text-destructive">This action cannot be undone!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAllDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllProducts}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All Products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default Admin;

