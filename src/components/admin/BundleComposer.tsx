import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, ShoppingCart, Loader2, GripVertical, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface BundleItem {
  id: number;
  item_product_id: number;
  item_product_name: string;
  quantity: number;
  item_type: 'required' | 'optional';
  is_configurable: boolean;
  price_adjustment: number;
  display_name: string | null;
  sort_order: number;
}

interface BundleComposerProps {
  productId: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function BundleComposer({ productId }: BundleComposerProps) {
  const { toast } = useToast();
  const [requiredItems, setRequiredItems] = useState<BundleItem[]>([]);
  const [optionalItems, setOptionalItems] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [itemType, setItemType] = useState<'required' | 'optional'>('required');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemConfig, setItemConfig] = useState({
    quantity: 1,
    is_configurable: false,
    price_adjustment: 0,
    display_name: '',
  });

  useEffect(() => {
    if (productId) {
      fetchBundleItems();
    }
  }, [productId]);

  const fetchBundleItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/bundles/products/${productId}/bundle-items`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setRequiredItems(data.data.required || []);
        setOptionalItems(data.data.optional || []);
      }
    } catch (error) {
      console.error('Failed to fetch bundle items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bundle items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/products?search=${query}&limit=10`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data.products || []);
      }
    } catch (error) {
      console.error('Failed to search products:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/bundles/products/${productId}/bundle-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          item_product_id: selectedProduct.id,
          quantity: itemConfig.quantity,
          item_type: itemType,
          is_configurable: itemConfig.is_configurable,
          price_adjustment: itemConfig.price_adjustment,
          display_name: itemConfig.display_name || selectedProduct.name,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Item added to bundle',
        });
        fetchBundleItems();
        setAddDialogOpen(false);
        resetDialog();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Remove this item from bundle?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/bundles/products/${productId}/bundle-items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Item removed from bundle',
        });
        fetchBundleItems();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive',
      });
    }
  };

  const resetDialog = () => {
    setSelectedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    setItemConfig({
      quantity: 1,
      is_configurable: false,
      price_adjustment: 0,
      display_name: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Required Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Required Items
              </CardTitle>
              <CardDescription>Items that must be included in this bundle</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setItemType('required');
                setAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Required Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requiredItems.length > 0 ? (
            <div className="space-y-2">
              {requiredItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{item.display_name || item.item_product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.is_configurable && <Badge variant="outline">Configurable</Badge>}
                      {item.quantity > 1 && `Quantity: ${item.quantity}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No required items</p>
              <p className="text-sm">Add items that must be included in this bundle</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Optional Add-ons
              </CardTitle>
              <CardDescription>Items customers can optionally add to the bundle</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setItemType('optional');
                setAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Optional Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {optionalItems.length > 0 ? (
            <div className="space-y-2">
              {optionalItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{item.display_name || item.item_product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.price_adjustment !== 0 && (
                        <Badge variant={item.price_adjustment > 0 ? 'default' : 'secondary'}>
                          {item.price_adjustment > 0 ? '+' : ''}
                          ${item.price_adjustment}
                        </Badge>
                      )}
                      {item.is_configurable && <Badge variant="outline">Configurable</Badge>}
                      {item.quantity > 1 && `Quantity: ${item.quantity}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No optional items</p>
              <p className="text-sm">Add optional add-ons customers can include</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Add {itemType === 'required' ? 'Required' : 'Optional'} Item
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Search */}
            <div>
              <Label>Search Product</Label>
              <Input
                placeholder="Type to search products..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  searchProducts(e.target.value);
                }}
              />
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.map(product => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(product);
                        setSearchQuery(product.name);
                        setSearchResults([]);
                      }}
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ${product.regular_price}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-2 p-2 bg-accent rounded-lg">
                  <div className="font-medium">Selected: {selectedProduct.name}</div>
                </div>
              )}
            </div>

            {/* Item Configuration */}
            {selectedProduct && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={itemConfig.display_name}
                    onChange={e => setItemConfig({ ...itemConfig, display_name: e.target.value })}
                    placeholder={selectedProduct.name}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={itemConfig.quantity}
                      onChange={e => setItemConfig({ ...itemConfig, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  {itemType === 'optional' && (
                    <div>
                      <Label>Price Adjustment</Label>
                      <Input
                        type="number"
                        value={itemConfig.price_adjustment}
                        onChange={e => setItemConfig({ ...itemConfig, price_adjustment: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="configurable"
                    checked={itemConfig.is_configurable}
                    onCheckedChange={(checked) =>
                      setItemConfig({ ...itemConfig, is_configurable: checked as boolean })
                    }
                  />
                  <Label htmlFor="configurable" className="cursor-pointer">
                    Customer can select variations for this item
                  </Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!selectedProduct}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
