import { useState, useEffect } from 'react';
import { Plus, Minus, Save, AlertCircle, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface VariationOption {
  id: number;
  option_name: string;
  option_value: string;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  reserved_quantity: number;
  available: number;
}

interface Variation {
  id: number;
  name: string;
  variation_type: string;
  tracks_stock: boolean;
  options: VariationOption[];
}

interface VariationStockManagerProps {
  productId: number;
  onStockChange?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function VariationStockManager({ productId, onStockChange }: VariationStockManagerProps) {
  const { toast } = useToast();
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchVariationStock();
    }
  }, [productId]);

  const fetchVariationStock = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/variation-stock-summary`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        console.log('Variation stock data received:', data.data);
        
        // Group options by variation
        // Important: A variation with no options will still appear in the results
        // because of the LEFT JOIN, but option_id will be NULL
        const grouped = data.data.reduce((acc: Record<number, any>, item: any) => {
          // Skip if no variation_id
          if (!item.variation_id) return acc;
          
          // Initialize variation if not already in accumulator
          if (!acc[item.variation_id]) {
            acc[item.variation_id] = {
              id: item.variation_id,
              name: item.variation_name,
              tracks_stock: item.tracks_stock === true || item.tracks_stock === 'true' || item.tracks_stock === 1,
              options: [],
            };
          }
          
          // Add option only if option_id exists (not NULL)
          if (item.option_id) {
            acc[item.variation_id].options.push({
              id: item.option_id,
              option_name: item.option_name,
              stock_quantity: item.stock_quantity !== null && item.stock_quantity !== undefined ? Number(item.stock_quantity) : null,
              low_stock_threshold: item.low_stock_threshold !== null && item.low_stock_threshold !== undefined ? Number(item.low_stock_threshold) : null,
              reserved_quantity: item.reserved_quantity || 0,
              available: item.available !== null && item.available !== undefined ? item.available : 0,
            });
          }
          return acc;
        }, {});

        // Convert to array - all variations here already have tracks_stock = true from backend
        const variationsArray = Object.values(grouped);
        
        console.log('Variations with stock tracking:', variationsArray);
        console.log('Variation details:', variationsArray.map((v: any) => ({
          id: v.id,
          name: v.name,
          tracks_stock: v.tracks_stock,
          optionsCount: v.options.length
        })));
        
        setVariations(variationsArray);
      }
    } catch (error) {
      console.error('Failed to fetch variation stock:', error);
      toast({
        title: 'Error',
        description: 'Failed to load variation stock data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (variationId: number, optionId: number, field: string, value: number | null) => {
    console.log('handleStockChange called:', { variationId, optionId, field, value });
    setVariations(prev => {
      const updated = prev.map(v =>
        v.id === variationId
          ? {
              ...v,
              options: v.options.map(o =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : v
      );
      console.log('Updated variations state:', updated);
      return updated;
    });
  };

  const handleAdjustStock = async (variationId: number, optionId: number, adjustment: number) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/variation-stock/${variationId}/stock/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          optionId,
          adjustment,
          reason: `Manual adjustment by admin`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `Stock ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`,
        });
        fetchVariationStock();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to adjust stock',
        variant: 'destructive',
      });
    }
  };

  const handleBatchUpdate = async (variationId: number) => {
    console.log('handleBatchUpdate called for variation:', variationId);
    console.log('Current variations state:', variations);
    
    setSaving(true);
    try {
      const variation = variations.find(v => v.id === variationId);
      if (!variation) {
        console.error('Variation not found:', variationId);
        return;
      }

      console.log('Found variation:', variation);
      console.log('Variation options before mapping:', variation.options);

      const requestBody = {
        options: variation.options.map(o => {
          const stockQty = o.stock_quantity === '' || o.stock_quantity === null || o.stock_quantity === undefined 
            ? null 
            : Number(o.stock_quantity);
          const threshold = o.low_stock_threshold === '' || o.low_stock_threshold === null || o.low_stock_threshold === undefined 
            ? null 
            : Number(o.low_stock_threshold);
          
          console.log(`Mapping option ${o.id}:`, {
            original: { stock_quantity: o.stock_quantity, low_stock_threshold: o.low_stock_threshold },
            processed: { stock_quantity: stockQty, low_stock_threshold: threshold }
          });
          
          return {
            optionId: o.id,
            stock_quantity: stockQty,
            low_stock_threshold: threshold,
          };
        }),
      };

      console.log('Saving stock for variation', variationId, ':', JSON.stringify(requestBody, null, 2));

      const url = `${API_URL}/api/admin/variation-stock/${variationId}/stock`;
      console.log('Making request to:', url);
      console.log('Request body:', requestBody);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('Stock save response:', data);
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Stock updated successfully',
        });
        fetchVariationStock();
        onStockChange?.();
      } else {
        console.error('Stock save failed:', data);
        toast({
          title: 'Error',
          description: data.error?.message || 'Failed to update stock',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update stock',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (available: number, threshold: number | null) => {
    if (threshold === null) return 'no_track';
    if (available <= 0) return 'out_of_stock';
    if (available <= threshold) return 'low_stock';
    return 'in_stock';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
      default:
        return <Badge variant="secondary">No Tracking</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (variations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No variations with stock tracking enabled</p>
          <p className="text-sm text-muted-foreground">
            Enable "Track Stock Per Option" in a variation's settings to manage stock quantities here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {variations.map(variation => (
        <Card key={variation.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{variation.name}</span>
              <div className="flex gap-2">
                {variation.tracks_stock && (
                  <Badge variant="outline">Stock Tracked</Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Save button clicked for variation:', variation.id);
                    handleBatchUpdate(variation.id);
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {variation.tracks_stock
                ? 'Stock quantities are tracked per option'
                : 'Enable stock tracking in variation settings'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {variation.tracks_stock ? (
              variation.options.length > 0 ? (
                <div className="space-y-4">
                  {variation.options.map(option => {
                  const status = getStockStatus(option.available, option.low_stock_threshold);
                  return (
                    <div
                      key={option.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{option.option_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Available: {option.available} | Reserved: {option.reserved_quantity}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`stock-${option.id}`} className="w-20">
                            Stock:
                          </Label>
                          <Input
                            id={`stock-${option.id}`}
                            type="number"
                            className="w-24"
                            value={option.stock_quantity ?? ''}
                            onChange={e => {
                              const value = e.target.value;
                              console.log('Stock input changed:', { optionId: option.id, rawValue: value });
                              const numValue = value === '' ? null : (isNaN(parseInt(value)) ? null : parseInt(value));
                              console.log('Parsed value:', numValue);
                              handleStockChange(variation.id, option.id, 'stock_quantity', numValue);
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor={`threshold-${option.id}`} className="w-24">
                            Threshold:
                          </Label>
                          <Input
                            id={`threshold-${option.id}`}
                            type="number"
                            className="w-20"
                            value={option.low_stock_threshold ?? ''}
                            onChange={e => {
                              const value = e.target.value;
                              console.log('Threshold input changed:', { optionId: option.id, rawValue: value });
                              const numValue = value === '' ? null : (isNaN(parseInt(value)) ? null : parseInt(value));
                              console.log('Parsed value:', numValue);
                              handleStockChange(variation.id, option.id, 'low_stock_threshold', numValue);
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdjustStock(variation.id, option.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdjustStock(variation.id, option.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div>{getStatusBadge(status)}</div>
                      </div>
                    </div>
                  );
                })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">Stock tracking is enabled for this variation</p>
                  <p className="text-sm">Add options to this variation to manage stock quantities. Options will appear here once created.</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Stock tracking not enabled. Enable "Track Stock Per Option" in variation settings to manage quantities.
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
