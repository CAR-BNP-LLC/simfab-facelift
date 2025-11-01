import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Upload,
  Image as ImageIcon,
  Loader2,
  Info,
  Star,
  StarOff,
  CalendarIcon,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import VariationsList from './VariationsList';
import VariationManagementDialog from './VariationManagementDialog';
import FAQsList from './FAQsList';
import DescriptionComponentsList from './DescriptionComponentsList';
import VariationStockManager from './VariationStockManager';
import BundleComposer from './BundleComposer';
import PermittedFor from '@/components/auth/PermittedFor';
import { format } from 'date-fns';
import { ProductFAQ, CreateFAQData, UpdateFAQData, faqsAPI, ProductDescriptionComponent, productDescriptionsAPI, VariationWithOptions, CreateVariationDto, UpdateVariationDto, adminVariationsAPI } from '@/services/api';

interface ProductEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (productData: any) => Promise<void>;
  product: any;
  productImages: any[];
  productVariations: any[];
  onImageUpload: (file: File, productId: number) => Promise<void>;
  onImageDelete: (imageId: number) => Promise<void>;
  onImageReorder: (imageId: number, newOrder: number) => Promise<void>;
  onSetPrimaryImage: (imageId: number) => Promise<void>;
  uploadingImages: boolean;
  pairedProduct?: any; // Product paired in opposite region
}

const ProductEditDialog = ({
  open,
  onClose,
  onSave,
  product,
  productImages,
  productVariations,
  onImageUpload,
  onImageDelete,
  onImageReorder,
  onSetPrimaryImage,
  uploadingImages,
  pairedProduct
}: ProductEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState<ProductFAQ[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [saleStartDate, setSaleStartDate] = useState<Date | undefined>(undefined);
  const [saleEndDate, setSaleEndDate] = useState<Date | undefined>(undefined);
  const [descriptionComponents, setDescriptionComponents] = useState<ProductDescriptionComponent[]>([]);
  const [localVariations, setLocalVariations] = useState<VariationWithOptions[]>([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<VariationWithOptions | null>(null);
  const [variationStockSum, setVariationStockSum] = useState<number | null>(null);
  const [checkingStockMismatch, setCheckingStockMismatch] = useState(false);
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
    sale_price: '',
    is_on_sale: false,
    sale_start_date: '',
    sale_end_date: '',
    sale_label: '',
    stock_quantity: '10',
    categories: 'accessories',
    tags: '',
    region: 'us' as 'us' | 'eu'
  });

  // Utility function to generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Handle product name change and auto-generate slug
  const handleProductNameChange = (name: string) => {
    const shouldGenerateSlug = !product || name !== product.name;
    const slug = shouldGenerateSlug ? generateSlug(name) : productForm.slug;
    
    setProductForm(prev => ({
      ...prev,
      name,
      slug
    }));
  };

  // Check stock mismatch
  const checkStockMismatch = async () => {
    if (!product?.id) return;
    
    try {
      setCheckingStockMismatch(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/admin/products/${product.id}/variation-stock-summary`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        // Calculate sum of all variation option stock
        const sum = data.data.reduce((total: number, item: any) => {
          if (item.stock_quantity !== null && item.stock_quantity !== undefined) {
            return total + Number(item.stock_quantity);
          }
          return total;
        }, 0);
        setVariationStockSum(sum);
      }
    } catch (err) {
      console.error('Failed to check stock mismatch:', err);
    } finally {
      setCheckingStockMismatch(false);
    }
  };

  // Initialize form when product changes
  useEffect(() => {
    if (product && open) {
      // Parse dates
      const parseDate = (date: Date | string | null | undefined): Date | undefined => {
        if (!date) return undefined;
        return new Date(date);
      };

      setSaleStartDate(parseDate(product.sale_start_date));
      setSaleEndDate(parseDate(product.sale_end_date));

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
        sale_price: product.sale_price?.toString() || '',
        is_on_sale: product.is_on_sale || false,
        sale_start_date: '',
        sale_end_date: '',
        sale_label: product.sale_label || '',
        stock_quantity: product.stock?.toString() || '0',
        categories: (() => {
          try {
            if (Array.isArray(product.categories)) {
              return product.categories[0] || 'accessories';
            }
            if (typeof product.categories === 'string') {
              const parsed = JSON.parse(product.categories);
              return Array.isArray(parsed) ? (parsed[0] || 'accessories') : 'accessories';
            }
            return 'accessories';
          } catch {
            return 'accessories';
          }
        })(),
        tags: (() => {
          try {
            if (Array.isArray(product.tags)) {
              return product.tags.join(', ');
            }
            if (typeof product.tags === 'string') {
              const parsed = JSON.parse(product.tags);
              return Array.isArray(parsed) ? parsed.join(', ') : '';
            }
            return '';
          } catch {
            return '';
          }
        })(),
        region: (product.region === 'eu' ? 'eu' : 'us') as 'us' | 'eu'
      });
      
      // Load FAQs and description components for this product
      if (product.id) {
        loadFAQs(product.id);
        loadDescriptionComponents(product.id);
        fetchVariations(product.id);
        checkStockMismatch();
      }
    }
  }, [product, open]);

  // Check stock mismatch when product stock changes
  useEffect(() => {
    if (product?.id) {
      checkStockMismatch();
    }
  }, [productForm.stock_quantity]);

  // Sync variations from props
  useEffect(() => {
    if (productVariations) {
      setLocalVariations(productVariations);
    }
  }, [productVariations]);

  // Load FAQs for the product
  const loadFAQs = async (productId: number) => {
    setFaqsLoading(true);
    try {
      const productFAQs = await faqsAPI.getProductFAQs(productId);
      setFaqs(productFAQs);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load FAQs',
        variant: 'destructive'
      });
    } finally {
      setFaqsLoading(false);
    }
  };

  // Load description components for the product
  const loadDescriptionComponents = async (productId: number) => {
    try {
      const components = await productDescriptionsAPI.getAllProductDescriptionComponents(productId);
      setDescriptionComponents(components);
    } catch (error) {
      console.error('Error loading description components:', error);
      toast({
        title: 'Error',
        description: 'Failed to load description components',
        variant: 'destructive'
      });
    }
  };

  // FAQ management functions
  const handleCreateFAQ = async (data: CreateFAQData) => {
    if (!product) return;
    
    try {
      const newFAQ = await faqsAPI.createFAQ(product.id, data);
      setFaqs(prev => [...prev, newFAQ]);
      toast({
        title: 'Success',
        description: 'FAQ created successfully'
      });
    } catch (error) {
      console.error('Error creating FAQ:', error);
      toast({
        title: 'Error',
        description: 'Failed to create FAQ',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleUpdateFAQ = async (id: number, data: UpdateFAQData) => {
    try {
      const updatedFAQ = await faqsAPI.updateFAQ(id, data);
      setFaqs(prev => prev.map(faq => faq.id === id ? updatedFAQ : faq));
      toast({
        title: 'Success',
        description: 'FAQ updated successfully'
      });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      toast({
        title: 'Error',
        description: 'Failed to update FAQ',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleDeleteFAQ = async (id: number) => {
    try {
      await faqsAPI.deleteFAQ(id);
      setFaqs(prev => prev.filter(faq => faq.id !== id));
      toast({
        title: 'Success',
        description: 'FAQ deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete FAQ',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleReorderFAQs = async (faqIds: number[]) => {
    if (!product) return;
    
    try {
      await faqsAPI.reorderFAQs(product.id, faqIds);
      // Reload FAQs to get updated order
      await loadFAQs(product.id);
      toast({
        title: 'Success',
        description: 'FAQ order updated successfully'
      });
    } catch (error) {
      console.error('Error reordering FAQs:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder FAQs',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Description component management functions
  const handleCreateDescriptionComponent = async (data: any) => {
    if (!product) return;
    
    try {
      await productDescriptionsAPI.createDescriptionComponent(product.id, data);
      await loadDescriptionComponents(product.id);
      toast({
        title: 'Success',
        description: 'Description component created successfully'
      });
    } catch (error) {
      console.error('Error creating description component:', error);
      toast({
        title: 'Error',
        description: 'Failed to create description component',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateDescriptionComponent = async (id: number, data: any) => {
    try {
      await productDescriptionsAPI.updateDescriptionComponent(id, data);
      await loadDescriptionComponents(product.id);
      toast({
        title: 'Success',
        description: 'Description component updated successfully'
      });
    } catch (error) {
      console.error('Error updating description component:', error);
      toast({
        title: 'Error',
        description: 'Failed to update description component',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDescriptionComponent = async (id: number) => {
    try {
      await productDescriptionsAPI.deleteDescriptionComponent(id);
      await loadDescriptionComponents(product.id);
      toast({
        title: 'Success',
        description: 'Description component deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting description component:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete description component',
        variant: 'destructive'
      });
    }
  };

  const handleReorderDescriptionComponents = async (componentIds: number[]) => {
    if (!product) return;
    
    try {
      await productDescriptionsAPI.reorderDescriptionComponents(product.id, componentIds);
      await loadDescriptionComponents(product.id);
      toast({
        title: 'Success',
        description: 'Description components reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering description components:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder description components',
        variant: 'destructive'
      });
    }
  };

  // Variation management functions
  const fetchVariations = async (productId: number) => {
    setVariationsLoading(true);
    try {
      const response = await adminVariationsAPI.getVariations(productId);
      setLocalVariations(response.data);
    } catch (error) {
      console.error('Error fetching variations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load variations',
        variant: 'destructive'
      });
    } finally {
      setVariationsLoading(false);
    }
  };

  const handleCreateVariation = async (data: CreateVariationDto) => {
    if (!product?.id) return;
    
    try {
      const response = await adminVariationsAPI.createVariation(product.id, data);
      setLocalVariations(prev => [...prev, response.data]);
      toast({
        title: 'Success',
        description: 'Variation created successfully'
      });
      setVariationDialogOpen(false);
      setEditingVariation(null);
    } catch (error) {
      console.error('Error creating variation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create variation',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleUpdateVariation = async (data: UpdateVariationDto) => {
    if (!product?.id || !editingVariation?.id) return;
    
    try {
      const response = await adminVariationsAPI.updateVariation(product.id, editingVariation.id, data);
      setLocalVariations(prev => prev.map(v => v.id === editingVariation.id ? response.data : v));
      toast({
        title: 'Success',
        description: 'Variation updated successfully'
      });
      setVariationDialogOpen(false);
      setEditingVariation(null);
    } catch (error) {
      console.error('Error updating variation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update variation',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleDeleteVariation = async (variationId: number) => {
    if (!product?.id) return;
    
    try {
      await adminVariationsAPI.deleteVariation(product.id, variationId);
      setLocalVariations(prev => prev.filter(v => v.id !== variationId));
      toast({
        title: 'Success',
        description: 'Variation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting variation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete variation',
        variant: 'destructive'
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id) return;

    setLoading(true);
    try {
      const formData = {
        ...productForm,
        region: productForm.region as 'us' | 'eu',
        regular_price: parseFloat(productForm.regular_price) || 0,
        sale_price: productForm.sale_price ? parseFloat(productForm.sale_price) : null,
        is_on_sale: productForm.is_on_sale,
        sale_start_date: saleStartDate || null,
        sale_end_date: saleEndDate || null,
        sale_label: productForm.sale_label || null,
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        categories: [productForm.categories],
        tags: productForm.tags ? productForm.tags.split(',').map(tag => tag.trim()) : []
      };

      await onSave(formData);
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && product?.id) {
      try {
        // Upload multiple files
        for (let i = 0; i < files.length; i++) {
          await onImageUpload(files[i], product.id);
        }
        e.target.value = ''; // Reset input
        toast({
          title: 'Success',
          description: `${files.length} image(s) uploaded successfully`
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to upload images',
          variant: 'destructive'
        });
      }
    }
  };

  if (!product) return null;

  // Check if product is actually linked (has a paired product)
  const isLinked = !!pairedProduct;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Product: {product.name}</DialogTitle>
            {isLinked && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                  <Info className="w-3 h-3 mr-1" />
                  Linked with {oppositeRegion}
                </Badge>
              </div>
            )}
          </div>
          {isLinked && (
            <p className="text-sm text-muted-foreground mt-2">
              Changes to name, description, price, and other shared fields will automatically sync to the {oppositeRegion} product. Stock quantities remain separate.
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      onValueChange={(value) => setProductForm({ ...productForm, region: value as 'us' | 'eu' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">United States (US)</SelectItem>
                        <SelectItem value="eu">Europe (EU)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="short_description">Short Description</Label>
                    <Textarea
                      id="short_description"
                      value={productForm.short_description}
                      onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                      placeholder="Brief description for product cards..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Full Description</Label>
                    <Textarea
                      id="description"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Detailed product description..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing and Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="regular_price">Regular Price ($) *</Label>
                    <Input
                      id="regular_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.regular_price}
                      onChange={(e) => setProductForm({ ...productForm, regular_price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    />
                  </div>
                </div>

                {/* Discount Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      id="is_on_sale"
                      checked={productForm.is_on_sale}
                      onCheckedChange={(checked) => setProductForm({ ...productForm, is_on_sale: checked as boolean })}
                    />
                    <Label htmlFor="is_on_sale" className="cursor-pointer font-medium">
                      Product is on sale
                    </Label>
                  </div>

                  {productForm.is_on_sale && (
                    <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                      <div>
                        <Label htmlFor="sale_price">Sale Price ($) *</Label>
                        <Input
                          id="sale_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={productForm.sale_price}
                          onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Sale Start Date & Time (Optional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {saleStartDate ? format(saleStartDate, "PPP HH:mm") : "Select start date & time"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="flex">
                                <Calendar
                                  mode="single"
                                  selected={saleStartDate}
                                  onSelect={setSaleStartDate}
                                  initialFocus
                                  className="rounded-md"
                                />
                                <div className="border-l p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor="start-hour" className="w-12">Hour:</Label>
                                    <Select 
                                      value={saleStartDate?.getHours().toString().padStart(2, '0') || '00'}
                                      onValueChange={(value) => {
                                        const date = saleStartDate || new Date();
                                        date.setHours(parseInt(value));
                                        setSaleStartDate(new Date(date));
                                      }}
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                          <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor="start-minute" className="w-12">Min:</Label>
                                    <Select 
                                      value={saleStartDate?.getMinutes().toString().padStart(2, '0') || '00'}
                                      onValueChange={(value) => {
                                        const date = saleStartDate || new Date();
                                        date.setMinutes(parseInt(value));
                                        setSaleStartDate(new Date(date));
                                      }}
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => (
                                          <SelectItem key={i} value={(i * 5).toString().padStart(2, '0')}>
                                            {(i * 5).toString().padStart(2, '0')}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {saleStartDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSaleStartDate(undefined)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Sale End Date & Time (Optional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {saleEndDate ? format(saleEndDate, "PPP HH:mm") : "Select end date & time"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="flex">
                                <Calendar
                                  mode="single"
                                  selected={saleEndDate}
                                  onSelect={setSaleEndDate}
                                  initialFocus
                                  className="rounded-md"
                                />
                                <div className="border-l p-3 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor="end-hour" className="w-12">Hour:</Label>
                                    <Select 
                                      value={saleEndDate?.getHours().toString().padStart(2, '0') || '00'}
                                      onValueChange={(value) => {
                                        const date = saleEndDate || new Date();
                                        date.setHours(parseInt(value));
                                        setSaleEndDate(new Date(date));
                                      }}
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                          <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor="end-minute" className="w-12">Min:</Label>
                                    <Select 
                                      value={saleEndDate?.getMinutes().toString().padStart(2, '0') || '00'}
                                      onValueChange={(value) => {
                                        const date = saleEndDate || new Date();
                                        date.setMinutes(parseInt(value));
                                        setSaleEndDate(new Date(date));
                                      }}
                                    >
                                      <SelectTrigger className="w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => (
                                          <SelectItem key={i} value={(i * 5).toString().padStart(2, '0')}>
                                            {(i * 5).toString().padStart(2, '0')}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {saleEndDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSaleEndDate(undefined)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="sale_label">Sale Badge Label (e.g., "50% OFF")</Label>
                        <Input
                          id="sale_label"
                          placeholder="50% OFF"
                          value={productForm.sale_label}
                          onChange={(e) => setProductForm({ ...productForm, sale_label: e.target.value })}
                        />
                      </div>

                      {/* Auto-calculate discount percentage */}
                      {productForm.regular_price && productForm.sale_price && (
                        <div className="text-sm text-blue-600 font-medium">
                          Discount: {Math.round(((parseFloat(productForm.regular_price) - parseFloat(productForm.sale_price)) / parseFloat(productForm.regular_price)) * 100)}% OFF
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Product Type field hidden for now - still defaults to 'simple' in state */}
                  <div className="hidden">
                    <Label htmlFor="type">Product Type</Label>
                    <Select value={productForm.type} onValueChange={(value) => setProductForm({ ...productForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                        <SelectItem value="grouped">Grouped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={productForm.status} onValueChange={(value) => setProductForm({ ...productForm, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
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
              </CardContent>
            </Card>

            {/* Categories and Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories & Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            {/* Image Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload product images (select multiple files)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </>
                    )}
                  </Button>
                </div>

                {/* Current Images */}
                {productImages.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Current Images ({productImages.length})</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {productImages
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
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
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={image.is_primary === true || image.is_primary === '1' ? "default" : "secondary"}
                                onClick={() => onSetPrimaryImage(image.id)}
                                className="h-8 w-8 p-0"
                                title={image.is_primary === true || image.is_primary === '1' ? "Primary image" : "Set as primary"}
                              >
                                {image.is_primary === true || image.is_primary === '1' ? (
                                  <Star className="h-4 w-4 fill-current" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </Button>
                              <PermittedFor authority="products:delete">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onImageDelete(image.id)}
                                  className="h-8 w-8 p-0"
                                  title="Delete image"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </PermittedFor>
                            </div>

                            {/* Primary Badge */}
                            {(image.is_primary === true || image.is_primary === '1') && (
                              <div className="absolute top-2 left-2">
                                <Badge variant="default" className="text-xs">
                                  Primary
                                </Badge>
                              </div>
                            )}

                            {/* Sort Order Badge */}
                            <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                              {image.sort_order || index + 1}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variations */}
            {productVariations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Variations</CardTitle>
                </CardHeader>
                <CardContent>
                  <VariationsList
                    variations={productVariations}
                    onEdit={() => {}} // Will be handled by parent
                    onDelete={() => {}} // Will be handled by parent
                    onAdd={() => {}} // Will be handled by parent
                  />
                </CardContent>
              </Card>
            )}

          </form>

          {/* Additional Content in Tabs */}
          {product && (
            <Tabs defaultValue="variations" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="variations">Variations & Stock</TabsTrigger>
                <TabsTrigger value="bundle">Bundle Items</TabsTrigger>
                <TabsTrigger value="descriptions">Description Components</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
              </TabsList>

              {/* Variations & Stock Tab */}
              <TabsContent value="variations" className="mt-4 space-y-6">
                <div className="space-y-4">
                  <VariationsList
                    variations={localVariations}
                    loading={variationsLoading}
                    onEdit={handleEditVariation}
                    onDelete={handleDeleteVariation}
                    onAdd={handleAddVariation}
                  />
                </div>
                <div className="border-t pt-4">
                  {/* Stock Mismatch Warning */}
                  {(() => {
                    const productStock = parseInt(productForm.stock_quantity) || 0;
                    const hasVariationStock = variationStockSum !== null;
                    const stockMismatch = hasVariationStock && variationStockSum !== productStock;
                    
                    if (stockMismatch) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-yellow-800 mb-1">Stock Mismatch Warning</h4>
                              <p className="text-sm text-yellow-700">
                                The sum of all variation option stock ({variationStockSum}) does not match the product stock ({productStock}).
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <h3 className="text-lg font-semibold mb-4">Stock Management</h3>
                  <VariationStockManager 
                    productId={product.id}
                    onStockChange={() => checkStockMismatch()}
                  />
                </div>
              </TabsContent>

              {/* Bundle Items Tab */}
              <TabsContent value="bundle" className="mt-4">
                <BundleComposer productId={product.id} />
              </TabsContent>

              {/* Description Components Tab */}
              <TabsContent value="descriptions" className="mt-4">
                <DescriptionComponentsList
                  productId={product.id}
                  components={descriptionComponents}
                  onComponentCreate={handleCreateDescriptionComponent}
                  onComponentUpdate={handleUpdateDescriptionComponent}
                  onComponentDelete={handleDeleteDescriptionComponent}
                  onComponentReorder={handleReorderDescriptionComponents}
                />
              </TabsContent>

              {/* FAQs Tab */}
              <TabsContent value="faqs" className="mt-4">
                <FAQsList
                  productId={product.id}
                  faqs={faqs}
                  onFAQCreate={handleCreateFAQ}
                  onFAQUpdate={handleUpdateFAQ}
                  onFAQDelete={handleDeleteFAQ}
                  onFAQReorder={handleReorderFAQs}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <PermittedFor authority="products:edit">
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </PermittedFor>
        </DialogFooter>
      </DialogContent>
      </Dialog>
      
      {/* Variation Management Dialog */}
      {product && (
        <VariationManagementDialog
          open={variationDialogOpen}
          onClose={handleVariationDialogClose}
          onSave={editingVariation ? handleUpdateVariation : handleCreateVariation}
          variation={editingVariation}
          productId={product.id}
        />
      )}
    </>
  );
};

export default ProductEditDialog;
