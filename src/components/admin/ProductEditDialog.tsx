import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import VariationsList from './VariationsList';

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
  uploadingImages: boolean;
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
  uploadingImages
}: ProductEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  // Initialize form when product changes
  useEffect(() => {
    if (product && open) {
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
        })()
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id) return;

    setLoading(true);
    try {
      const formData = {
        ...productForm,
        regular_price: parseFloat(productForm.regular_price) || 0,
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
    const file = e.target.files?.[0];
    if (file && product?.id) {
      try {
        await onImageUpload(file, product.id);
        e.target.value = ''; // Reset input
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to upload image',
          variant: 'destructive'
        });
      }
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Product: {product.name}</DialogTitle>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
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
                  <input
                    type="checkbox"
                    id="featured"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="featured" className="cursor-pointer">Featured Product</Label>
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
                    Upload product images
                  </p>
                  <input
                    type="file"
                    accept="image/*"
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
                        Upload Image
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
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            </div>

                            {/* Primary Badge */}
                            {image.is_primary && (
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
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditDialog;
