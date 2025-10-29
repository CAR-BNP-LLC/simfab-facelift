/**
 * Page Product Edit Dialog
 * Dialog for editing products in a specific page section with drag & drop reordering
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Loader2, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Switch } from '@/components/ui/switch';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import { 
  pageProductsAPI, 
  PageProduct, 
  PageSectionProducts,
} from '@/services/api';
import ProductSelector from './ProductSelector';

interface PageProductEditDialogProps {
  open: boolean;
  onClose: () => void;
  pageRoute: string;
  section: string;
}

interface SortableProductItemProps {
  pageProduct: PageProduct;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDelete: (id: number, productName: string) => void;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({
  pageProduct,
  onToggleActive,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pageProduct.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatPrice = (product: PageProduct['product']) => {
    if (!product) return 'N/A';
    if (product.sale_price) {
      return (
        <span>
          <span className="line-through text-muted-foreground">${product.regular_price}</span>{' '}
          <span className="text-primary font-bold">${product.sale_price}</span>
        </span>
      );
    }
    return `$${product.regular_price || product.price_min || '0'}`;
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">
                {pageProduct.product?.name || 'Product not found'}
              </h4>
              <Badge variant={pageProduct.is_active ? 'default' : 'secondary'}>
                {pageProduct.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                #{pageProduct.display_order + 1}
              </Badge>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {formatPrice(pageProduct.product)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={pageProduct.is_active}
                onCheckedChange={(checked) => onToggleActive(pageProduct.id, checked)}
                id={`active-${pageProduct.id}`}
              />
              <Label htmlFor={`active-${pageProduct.id}`} className="text-xs cursor-pointer">
                {pageProduct.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(pageProduct.id, pageProduct.product?.name || 'this product')}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PageProductEditDialog({
  open,
  onClose,
  pageRoute,
  section,
}: PageProductEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<PageProduct[]>([]);
  const [displayType, setDisplayType] = useState<'products' | 'category'>('products');
  const [categoryId, setCategoryId] = useState<string>('');
  const [maxItems, setMaxItems] = useState<number>(10);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open && pageRoute && section) {
      fetchSectionProducts();
      setHasUnsavedChanges(false);
    }
  }, [open, pageRoute, section]);

  const fetchSectionProducts = async () => {
    try {
      setLoading(true);
      const response = await pageProductsAPI.getPageSectionProducts(pageRoute, section, true);
      if (response.success) {
        const data = response.data;
        setProducts(data.products || []);
        setDisplayType(data.displayType || 'products');
        setCategoryId(data.categoryId || '');
        setMaxItems(data.maxItems || 10);
      }
    } catch (error) {
      console.error('Error fetching section products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load section products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productId: number) => {
    try {
      await pageProductsAPI.addProductToSection({
        page_route: pageRoute,
        page_section: section,
        product_id: productId,
        display_order: products.length,
        is_active: true,
      });
      toast({
        title: 'Success',
        description: 'Product added to section',
      });
      setHasUnsavedChanges(true);
      fetchSectionProducts();
      setShowProductSelector(false);
    } catch (error: any) {
      const errorMessage = error.code === 'MIGRATION_REQUIRED'
        ? 'Database migration required. Please run migration 036 in the server directory.'
        : error.message || 'Failed to add product';
      
      toast({
        title: error.code === 'MIGRATION_REQUIRED' ? 'Migration Required' : 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: error.code === 'MIGRATION_REQUIRED' ? 10000 : 5000, // Longer for migration errors
      });
    }
  };

  const handleDeleteClick = (id: number, productName: string) => {
    setProductToDelete({ id, name: productName });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      await pageProductsAPI.removeProductFromSection(productToDelete.id);
      toast({
        title: 'Success',
        description: 'Product removed from section',
      });
      setHasUnsavedChanges(true);
      fetchSectionProducts();
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove product',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await pageProductsAPI.updatePageProduct(id, { is_active: isActive });
      toast({
        title: 'Success',
        description: `Product ${isActive ? 'activated' : 'deactivated'}`,
      });
      setHasUnsavedChanges(true);
      // Update local state immediately for better UX
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, is_active: isActive } : p
      ));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product status',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeIndex = products.findIndex((p) => p.id === active.id);
    const overIndex = products.findIndex((p) => p.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    const newProducts = arrayMove(products, activeIndex, overIndex);
    setProducts(newProducts);
    setHasUnsavedChanges(true);

    // Update display orders
    const updates = newProducts.map((p, index) => ({
      id: p.id,
      display_order: index,
    }));

    try {
      await Promise.all(
        updates.map(update =>
          pageProductsAPI.updatePageProduct(update.id, { display_order: update.display_order })
        )
      );
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save new order. Please try again.',
        variant: 'destructive',
      });
      // Revert on error
      fetchSectionProducts();
    }
  };

  const handleBulkSave = async () => {
    try {
      setLoading(true);
      const bulkDto = {
        page_route: pageRoute,
        page_section: section,
        products: products
          .filter(p => p.display_type === 'products')
          .map((p, index) => ({
            product_id: p.product_id!,
            display_order: index,
            is_active: p.is_active,
          })),
      };
      await pageProductsAPI.bulkUpdatePageProducts(bulkDto);
      toast({
        title: 'Success',
        description: 'Page products updated successfully',
      });
      setHasUnsavedChanges(false);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetCategory = async () => {
    if (!categoryId.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a category ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await pageProductsAPI.setCategoryForSection({
        page_route: pageRoute,
        page_section: section,
        category_id: categoryId.trim(),
        max_items: maxItems,
      });
      toast({
        title: 'Success',
        description: 'Category mode enabled',
      });
      fetchSectionProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set category',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const productItems = products.filter(p => p.display_type === 'products').sort((a, b) => a.display_order - b.display_order);

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen && hasUnsavedChanges) {
          if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            setHasUnsavedChanges(false);
            onClose();
          }
        } else if (!isOpen) {
          onClose();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Products: {pageRoute} &gt; {section}
            </DialogTitle>
            <DialogDescription>
              Manage products displayed on this page section. Drag to reorder, toggle to activate/deactivate.
            </DialogDescription>
          </DialogHeader>

          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Display Type */}
              <div>
                <Label>Display Type</Label>
                <RadioGroup
                  value={displayType}
                  onValueChange={(value) => {
                    setDisplayType(value as 'products' | 'category');
                    setHasUnsavedChanges(true);
                  }}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="products" id="products" />
                    <Label htmlFor="products" className="cursor-pointer">Individual Products</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="category" id="category" />
                    <Label htmlFor="category" className="cursor-pointer">Category (Show products from category)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Products Mode */}
              {displayType === 'products' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Current Products</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Drag to reorder • Toggle to activate/deactivate
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowProductSelector(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>

                  {productItems.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No products assigned. Click "Add Product" to get started.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={productItems.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {productItems.map((pageProduct) => (
                            <SortableProductItem
                              key={pageProduct.id}
                              pageProduct={pageProduct}
                              onToggleActive={handleToggleActive}
                              onDelete={handleDeleteClick}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {hasUnsavedChanges && productItems.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You have unsaved changes. Click "Save Changes" to apply them.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Category Mode */}
              {displayType === 'category' && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Category mode will show products from the specified category automatically. 
                      Individual product assignments will be replaced.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="categoryId">Category ID *</Label>
                    <Input
                      id="categoryId"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      placeholder="e.g., sim-racing-base"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the category slug or ID that products belong to
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="maxItems">Max Items</Label>
                    <Input
                      id="maxItems"
                      type="number"
                      value={maxItems}
                      onChange={(e) => setMaxItems(parseInt(e.target.value) || 10)}
                      min={1}
                      max={50}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum number of products to display from this category
                    </p>
                  </div>
                  <Button onClick={handleSetCategory} disabled={!categoryId.trim() || loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Category Settings
                  </Button>

                  {categoryId && (
                    <Alert>
                      <AlertDescription>
                        Currently set to category: <strong>{categoryId}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            {displayType === 'products' && productItems.length > 0 && (
              <Button onClick={handleBulkSave} disabled={loading || !hasUnsavedChanges}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
          </DialogFooter>

          {/* Product Selector Dialog */}
          {showProductSelector && (
            <ProductSelector
              open={showProductSelector}
              onClose={() => setShowProductSelector(false)}
              onSelect={handleAddProduct}
              excludeProductIds={products.map(p => p.product_id!).filter(Boolean)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{productToDelete?.name}</strong> from this page section?
              This will not delete the product itself, only remove it from this section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
