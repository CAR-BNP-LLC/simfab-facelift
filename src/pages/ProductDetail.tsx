import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingCart, Truck, Shield, Clock, Headphones, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { WishlistButton } from "@/components/WishlistButton";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductVariations from "@/components/ProductVariations";
import ProductAdditionalInfo from "@/components/ProductAdditionalInfo";
import ProductFAQs from "@/components/ProductFAQs";
import ProductDescriptionBuilder from "@/components/ProductDescriptionBuilder";
import { productsAPI, ProductWithDetails, ProductConfiguration } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useRegion } from "@/contexts/RegionContext";
import { calculateTotalPrice } from "@/utils/priceCalculator";
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol } from "@/utils/currency";

const ProductDetail = () => {
  const params = useParams();
  const productSlug = params.id || params.slug; // Route is defined as :id but we use it as slug
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  
  // Configuration state
  const [selectedModelVariation, setSelectedModelVariation] = useState<number | undefined>(undefined);
  const [selectedDropdownVariations, setSelectedDropdownVariations] = useState<Record<number, number>>({});
  
  // New variation state
  const [selectedTextValues, setSelectedTextValues] = useState<Record<string, string>>({});
  const [selectedImageValues, setSelectedImageValues] = useState<Record<string, string>>({});
  const [selectedBooleanValues, setSelectedBooleanValues] = useState<Record<string, boolean>>({});
  
  // Bundle items state
  const [bundleItems, setBundleItems] = useState<any>(null);
  const [bundleItemsLoading, setBundleItemsLoading] = useState(false);
  const [bundleConfigurations, setBundleConfigurations] = useState<Record<number, any>>({});
  const [selectedOptionalItems, setSelectedOptionalItems] = useState<Set<number>>(new Set());
  const [bundleItemStock, setBundleItemStock] = useState<Record<number, { available: number; productId: number }>>({});
  
  // Variation stock state
  const [variationStock, setVariationStock] = useState<{ available: boolean; availableQuantity: number; variationStock?: Array<{ variationName: string; optionName: string; available: number }> } | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { region } = useRegion();

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Helper function to check if product is in stock
  const isProductInStock = (product: any): boolean => {
    if (!product) return false;
    const stock = product.stock;
    const inStock = product.in_stock;
    // Primary check: if stock is defined (including 0), use it
    if (stock !== undefined && stock !== null) {
      return stock > 0;
    }
    // Fallback: if stock is not defined, check in_stock field
    return inStock === '1' || inStock === true;
  };

  // Check if all required variations are selected
  const checkRequiredVariations = (): string[] => {
    if (!product) return [];
    const errors: string[] = [];

    // Check model variations
    const modelVariations = product.variations?.model || [];
    const requiredModel = modelVariations.find((v: any) => v.is_required);
    if (requiredModel && !selectedModelVariation) {
      errors.push(`${requiredModel.name} model variation is required`);
    }

    // Check dropdown variations
    const dropdownVariations = product.variations?.dropdown || [];
    dropdownVariations.forEach((variation: any) => {
      if (variation.is_required) {
        const variationId = parseInt(variation.id.toString());
        if (!selectedDropdownVariations[variationId]) {
          errors.push(`${variation.name} variation is required`);
        }
      }
    });

    // Check image variations
    const imageVariations = product.variations?.image || [];
    imageVariations.forEach((variation: any) => {
      if (variation.is_required) {
        const variationId = variation.id.toString();
        if (!selectedImageValues[variationId]) {
          errors.push(`${variation.name} variation is required`);
        }
      }
    });

    // Check boolean variations
    const booleanVariations = product.variations?.boolean || [];
    booleanVariations.forEach((variation: any) => {
      if (variation.is_required) {
        const variationId = variation.id.toString();
        if (selectedBooleanValues[variationId] === undefined) {
          errors.push(`${variation.name} variation is required`);
        }
      }
    });

    return errors;
  };

  // Check if required bundle items are configured
  const checkRequiredBundleItems = (): string[] => {
    if (!product || !bundleItems?.required) return [];
    const errors: string[] = [];

    bundleItems.required.forEach((item: any) => {
      if (item.is_configurable) {
        const itemConfig = bundleConfigurations[item.id];
        const itemName = item.display_name || item.item_product_name;
        if (!itemConfig || Object.keys(itemConfig).length === 0) {
          errors.push(`${itemName} requires configuration`);
        } else if (item.variations) {
          // Check required variations within the bundle item
          const allVariations = [
            ...(item.variations.text || []),
            ...(item.variations.dropdown || []),
            ...(item.variations.image || []),
            ...(item.variations.boolean || [])
          ];
          
          allVariations.forEach((variation: any) => {
            if (variation.is_required) {
              const variationId = variation.id.toString();
              if (variation.variation_type === 'dropdown') {
                if (!itemConfig[variationId]) {
                  errors.push(`${itemName} - ${variation.name} variation is required`);
                }
              } else if (variation.variation_type === 'image') {
                if (!itemConfig[variationId]) {
                  errors.push(`${itemName} - ${variation.name} variation is required`);
                }
              } else if (variation.variation_type === 'boolean') {
                if (itemConfig[variationId] === undefined) {
                  errors.push(`${itemName} - ${variation.name} variation is required`);
                }
              }
            }
          });
        }
      }
    });

    return errors;
  };

  // Check if chosen optional bundle items have required variations
  const checkOptionalBundleItems = (): string[] => {
    if (!product || !bundleItems?.optional || selectedOptionalItems.size === 0) return [];
    const errors: string[] = [];

    Array.from(selectedOptionalItems).forEach((itemId: number) => {
      const bundleItem = bundleItems.optional.find((item: any) => item.id === itemId);
      if (!bundleItem) return;

      if (bundleItem.is_configurable) {
        const itemConfig = bundleConfigurations[itemId];
        const itemName = bundleItem.display_name || bundleItem.item_product_name;
        if (!itemConfig || Object.keys(itemConfig).length === 0) {
          errors.push(`Optional item ${itemName} requires configuration`);
        } else if (bundleItem.variations) {
          // Check required variations within the optional bundle item
          const allVariations = [
            ...(bundleItem.variations.text || []),
            ...(bundleItem.variations.dropdown || []),
            ...(bundleItem.variations.image || []),
            ...(bundleItem.variations.boolean || [])
          ];
          
          allVariations.forEach((variation: any) => {
            if (variation.is_required) {
              const variationId = variation.id.toString();
              if (variation.variation_type === 'dropdown') {
                if (!itemConfig[variationId]) {
                  errors.push(`Optional item ${itemName} - ${variation.name} variation is required`);
                }
              } else if (variation.variation_type === 'image') {
                if (!itemConfig[variationId]) {
                  errors.push(`Optional item ${itemName} - ${variation.name} variation is required`);
                }
              } else if (variation.variation_type === 'boolean') {
                if (itemConfig[variationId] === undefined) {
                  errors.push(`Optional item ${itemName} - ${variation.name} variation is required`);
                }
              }
            }
          });
        }
      }
    });

    return errors;
  };

  // Run all validations
  const validateConfiguration = (): string[] => {
    const errors = [
      ...checkRequiredVariations(),
      ...checkRequiredBundleItems(),
      ...checkOptionalBundleItems()
    ];
    setValidationErrors(errors);
    return errors;
  };

  // Re-validate when configuration changes
  useEffect(() => {
    if (product) {
      validateConfiguration();
    }
  }, [
    product,
    selectedModelVariation,
    selectedDropdownVariations,
    selectedImageValues,
    selectedBooleanValues,
    bundleItems,
    bundleConfigurations,
    selectedOptionalItems
  ]);

  // Fetch product on mount and when region changes
  useEffect(() => {
    if (productSlug) {
      fetchProduct(productSlug);
    } else {
      setError('No product identifier provided');
      setLoading(false);
    }
  }, [productSlug, region]); // Refetch when region changes

  // Fetch bundle items if product is a bundle
  useEffect(() => {
    if (product && (product as any).is_bundle) {
      fetchBundleItems(product.id);
    }
  }, [product]);

  // Calculate price and check stock when configuration changes (but NOT when product first loads)
  useEffect(() => {
    if (product) {
      calculatePrice();
      checkVariationStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelVariation, selectedDropdownVariations, selectedTextValues, selectedImageValues, selectedBooleanValues, selectedOptionalItems, bundleConfigurations]);

  // Check bundle item stock when configuration changes
  useEffect(() => {
    if (product && (product as any).is_bundle && bundleItems) {
      checkBundleItemStock(product.id, bundleItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptionalItems, bundleConfigurations]);

  // Set default selections when product loads
  useEffect(() => {
    if (product) {
      try {
        // Set default model variation
        if (product.variations?.image && Array.isArray(product.variations.image) && product.variations.image.length > 0) {
          const defaultModel = product.variations.image.find((v: any) => 
            Array.isArray(v.options) && v.options.find((o: any) => o.is_default || o.isDefault)
          );
          if (defaultModel) {
            const defaultOption = (defaultModel as any).options.find((o: any) => o.is_default || o.isDefault);
            if (defaultOption) {
              setSelectedModelVariation(defaultOption.id);
            }
          } else if ((product.variations.image[0] as any).options?.[0]) {
            setSelectedModelVariation((product.variations.image[0] as any).options[0].id);
          }
        }

        // Set default dropdown variations
        if (product.variations?.dropdown && Array.isArray(product.variations.dropdown)) {
          const defaults: Record<number, number> = {};
          product.variations.dropdown.forEach((variation: any) => {
            if (Array.isArray(variation.options) && variation.options.length > 0) {
              const defaultOption = variation.options.find((o: any) => o.is_default || o.isDefault) || variation.options[0];
              if (defaultOption) {
                defaults[variation.id] = defaultOption.id;
              }
            }
          });
          setSelectedDropdownVariations(defaults);
        }
      } catch (error) {
      }
    }
  }, [product]);

  const fetchProduct = async (productSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response = await productsAPI.getBySlug(productSlug);
      
      if (response.data) {
        setProduct(response.data);
      } else {
        throw new Error('Invalid product data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load product';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBundleItems = async (productId: number) => {
    try {
      setBundleItemsLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products/${productId}/bundle-items`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBundleItems(data.data);
        // Check stock for bundle items after loading
        await checkBundleItemStock(productId, data.data);
      }
    } catch (err) {
      // Error handled silently
    } finally {
      setBundleItemsLoading(false);
    }
  };

  // Check stock availability for bundle items
  const checkBundleItemStock = async (productId: number, bundleItemsData: any) => {
    try {
      if (!bundleItemsData || !productId) return;
      
      // Build current configuration for stock check
      const config = {
        bundleItems: {
          selectedOptional: Array.from(selectedOptionalItems),
          configurations: bundleConfigurations
        }
      };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products/${productId}/bundle-items/check-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bundleItems: config.bundleItems })
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.variationStock) {
        // Map stock availability by bundle item ID
        const stockMap: Record<number, { available: number; productId: number; required?: boolean }> = {};
        
        // Map by productId to bundle item ID
        bundleItemsData.required?.forEach((item: any) => {
          const stockInfo = data.data.variationStock.find((s: any) => s.productId === item.item_product_id && s.required);
          if (stockInfo) {
            stockMap[item.id] = {
              available: stockInfo.available || 0,
              productId: item.item_product_id,
              required: true
            };
          }
        });
        
        bundleItemsData.optional?.forEach((item: any) => {
          const stockInfo = data.data.variationStock.find((s: any) => s.productId === item.item_product_id && !s.required);
          if (stockInfo) {
            stockMap[item.id] = {
              available: stockInfo.available || 0,
              productId: item.item_product_id,
              required: false
            };
          }
        });
        
        setBundleItemStock(stockMap);
      }
    } catch (err) {
      console.error('Failed to check bundle item stock:', err);
    }
  };

  // Check stock availability for selected variations
  const checkVariationStock = async () => {
    if (!product) return;

    try {
      setCheckingStock(true);

      // Build configuration for stock check
      const configuration: ProductConfiguration = {
        modelVariationId: selectedModelVariation,
        variations: {
          ...selectedDropdownVariations,
          ...Object.fromEntries(
            Object.entries(selectedImageValues).map(([variationId, optionId]) => [
              parseInt(variationId), 
              parseInt(optionId)
            ])
          ),
          ...Object.fromEntries(
            Object.entries(selectedBooleanValues).map(([variationId, value]) => {
              const booleanVariation = product.variations?.boolean?.find((v: any) => v.id.toString() === variationId);
              if (booleanVariation?.options) {
                const yesOption = booleanVariation.options.find((opt: any) => opt.option_name === 'Yes');
                const noOption = booleanVariation.options.find((opt: any) => opt.option_name === 'No');
                const optionId = value ? (yesOption?.id || 1) : (noOption?.id || 0);
                return [parseInt(variationId), optionId];
              }
              return [parseInt(variationId), value ? 1 : 0];
            })
          )
        }
      };

      // Only check if we have variations selected (that might track stock)
      const hasVariations = configuration.variations && Object.keys(configuration.variations).length > 0;
      if (!hasVariations) {
        setVariationStock(null);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products/${product.id}/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(configuration)
      });

      const data = await response.json();
      
      if (data.success) {
        setVariationStock(data.data);
      } else {
        setVariationStock(null);
      }
    } catch (err) {
      console.error('Failed to check variation stock:', err);
      setVariationStock(null);
    } finally {
      setCheckingStock(false);
    }
  };

  const calculatePrice = async () => {
    if (!product) return;

    try {
      setCalculating(true);

      const configuration: ProductConfiguration = {
        modelVariationId: selectedModelVariation, // Image/model variations go here
        variations: {
          // Dropdown variations: variationId -> optionId
          ...selectedDropdownVariations,
          // Image variations: variationId -> optionId  
          ...Object.fromEntries(
            Object.entries(selectedImageValues).map(([variationId, optionId]) => [
              parseInt(variationId), 
              parseInt(optionId)
            ])
          ),
          // Boolean variations: variationId -> optionId (convert boolean to option ID)
          ...Object.fromEntries(
            Object.entries(selectedBooleanValues).map(([variationId, value]) => {
              // Find the boolean variation to get the correct option IDs
              const booleanVariation = product.variations?.boolean?.find((v: any) => v.id.toString() === variationId);
              if (booleanVariation?.options) {
                const yesOption = booleanVariation.options.find((opt: any) => opt.option_name === 'Yes');
                const noOption = booleanVariation.options.find((opt: any) => opt.option_name === 'No');
                const optionId = value ? (yesOption?.id || 1) : (noOption?.id || 0);
                return [parseInt(variationId), optionId];
              }
              return [parseInt(variationId), value ? 1 : 0]; // Fallback
            })
          )
          // Note: Text variations don't affect price, so they're not included
        }
      };

      
      const response = await productsAPI.calculatePrice(product.id, configuration, 1);
      
      // Calculate required bundle items variation price adjustments only (no base price)
      let requiredItemsVariationAdjustments = 0;
      if (bundleItems && bundleItems.required) {
        bundleItems.required.forEach((item: any) => {
          if (item.is_configurable && bundleConfigurations[item.id]) {
            const config = bundleConfigurations[item.id];
            
            // Check dropdown variations
            if (item.variations?.dropdown) {
              item.variations.dropdown.forEach((variation: any) => {
                const selectedOptionId = config[variation.id];
                if (selectedOptionId && variation.options) {
                  const selectedOption = variation.options.find((opt: any) => opt.id === selectedOptionId);
                  if (selectedOption && selectedOption.price_adjustment) {
                    requiredItemsVariationAdjustments += selectedOption.price_adjustment;
                  }
                }
              });
            }
            
            // Check boolean variations
            if (item.variations?.boolean) {
              item.variations.boolean.forEach((variation: any) => {
                const isYes = config[variation.id] === true;
                if (isYes && variation.options) {
                  const yesOption = variation.options.find((opt: any) => opt.option_name === 'Yes');
                  if (yesOption && yesOption.price_adjustment) {
                    requiredItemsVariationAdjustments += yesOption.price_adjustment;
                  }
                }
              });
            }
          }
        });
      }
      
      // Calculate optional bundle items (base price + variations) - separate into components
      const optionalBundleItems: Array<{ basePrice: number; variationAdjustments: number }> = [];
      if (bundleItems && bundleItems.optional) {
        bundleItems.optional.forEach((item: any) => {
          if (selectedOptionalItems.has(item.id)) {
            const basePrice = item.item_product_price || item.regular_price || 0;
            let variationAdjustments = 0;
            
            // Add variation price adjustments
            if (item.is_configurable && bundleConfigurations[item.id]) {
              const config = bundleConfigurations[item.id];
              
              // Check dropdown variations
              if (item.variations?.dropdown) {
                item.variations.dropdown.forEach((variation: any) => {
                  const selectedOptionId = config[variation.id];
                  if (selectedOptionId && variation.options) {
                    const selectedOption = variation.options.find((opt: any) => opt.id === selectedOptionId);
                    if (selectedOption && selectedOption.price_adjustment) {
                      variationAdjustments += selectedOption.price_adjustment;
                    }
                  }
                });
              }
              
              // Check boolean variations
              if (item.variations?.boolean) {
                item.variations.boolean.forEach((variation: any) => {
                  const isYes = config[variation.id] === true;
                  if (isYes && variation.options) {
                    const yesOption = variation.options.find((opt: any) => opt.option_name === 'Yes');
                    if (yesOption && yesOption.price_adjustment) {
                      variationAdjustments += yesOption.price_adjustment;
                    }
                  }
                });
              }
            }
            
            optionalBundleItems.push({ basePrice, variationAdjustments });
          }
        });
      }
      
      // Use centralized price calculator
      const finalPrice = calculateTotalPrice({
        basePrice: response.data.pricing.basePrice,
        variationAdjustments: response.data.pricing.variationAdjustments.reduce((sum: number, adj: any) => sum + adj.amount, 0),
        requiredBundleAdjustments: requiredItemsVariationAdjustments,
        optionalBundleItems,
        quantity: 1
      });
      
      setCalculatedPrice(finalPrice.total);
    } catch (err) {
      // Fallback to base price if calculation fails
      const fallbackPrice = (product as any).price_min 
        || (product as any).regular_price 
        || (product as any).price?.min 
        || (product as any).price?.regular 
        || 0;
      setCalculatedPrice(fallbackPrice);
    } finally {
      setCalculating(false);
    }
  };

  /**
   * Handle Add to Cart
   */
  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);

      // Build configuration
      
      
      const configuration: ProductConfiguration = {
        modelVariationId: selectedModelVariation,
        variations: {
          ...selectedDropdownVariations,
          ...Object.fromEntries(
            Object.entries(selectedImageValues).map(([variationId, optionId]) => [
              parseInt(variationId), 
              parseInt(optionId)
            ])
          ),
          ...Object.fromEntries(
            Object.entries(selectedBooleanValues).map(([variationId, value]) => {
              const booleanVariation = product.variations?.boolean?.find((v: any) => v.id.toString() === variationId);
              if (booleanVariation?.options) {
                const yesOption = booleanVariation.options.find((opt: any) => opt.option_name === 'Yes');
                const noOption = booleanVariation.options.find((opt: any) => opt.option_name === 'No');
                const optionId = value ? (yesOption?.id || 1) : (noOption?.id || 0);
                return [parseInt(variationId), optionId];
              }
              return [parseInt(variationId), value ? 1 : 0];
            })
          )
        },
        bundleItems: {
          selectedOptional: Array.from(selectedOptionalItems),
          configurations: bundleConfigurations
        }
      };


      await addToCart(product.id, configuration, 1);
      
      // Log what was stored in cart

      // Success is handled by CartContext (shows toast)
    } catch (error) {
      // Error is handled by CartContext (shows error toast)
    } finally {
      setAddingToCart(false);
    }
  };

  const handleDropdownVariationChange = (variationId: number, optionId: number) => {
    setSelectedDropdownVariations(prev => ({
      ...prev,
      [variationId]: optionId
    }));
  };

  // Check if sale is currently active
  const isSaleActive = () => {
    const prod = product as any;
    if (!prod.is_on_sale) return false;
    
    const now = new Date();
    const startDate = prod.sale_start_date ? new Date(prod.sale_start_date) : null;
    const endDate = prod.sale_end_date ? new Date(prod.sale_end_date) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    
    return true;
  };

  const getDisplayPrice = () => {
    try {
      if (calculatedPrice !== null && calculatedPrice !== undefined) {
        return { price: calculatedPrice, original: null, onSale: false };
      }
      
      if (!product) return { price: 0, original: null, onSale: false };
      
      const prod = product as any;
      const onSale = isSaleActive();
      
      // Try different price field combinations
      if (prod.price_min !== undefined && prod.price_max !== undefined && prod.price_min !== prod.price_max) {
        return { price: prod.price_min, original: prod.price_max, onSale: false, range: true };
      }
      if (prod.price?.min !== undefined && prod.price?.max !== undefined) {
        return { price: prod.price.min, original: prod.price.max, onSale: false, range: true };
      }
      
      if (onSale && prod.sale_price !== undefined && prod.sale_price !== null) {
        return { price: prod.sale_price, original: prod.regular_price, onSale: true };
      }
      
      if (prod.regular_price !== undefined && prod.regular_price !== null) {
        return { price: prod.regular_price, original: null, onSale: false };
      }
      if (prod.price?.regular) {
        return { price: prod.price.regular, original: null, onSale: false };
      }
      
      return { price: 0, original: null, onSale: false };
    } catch (error) {
      return { price: 0, original: null, onSale: false };
    }
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Lifetime warranty",
      description: "On all metal parts"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Money-back guarantee", 
      description: "Extended holiday return"
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Same day shipping",
      description: "1-6 days fast delivery"
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: "Real person support",
      description: "We are here to assist you"
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="h-12 w-12 animate-spin text-destructive mb-4" />
          <p className="text-muted-foreground">Loading product...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-40">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive text-lg font-medium mb-2">Product not found</p>
          <p className="text-muted-foreground mb-4">{error || 'This product does not exist'}</p>
          <Link to="/shop">
            <Button variant="outline">Back to Shop</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Transform product data for components (with safe access)
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
        .sort((a: any, b: any) => {
          // Primary image first
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          // Then by sort_order
          return (a.sort_order || 0) - (b.sort_order || 0);
        })
        .map((img: any) => ({
          url: img.image_url || img.url,
          alt: img.alt_text || img.alt || product.name
        }))
        .filter(img => img.url) // Remove images without URLs
    : [];

  // Collect variations from bundle items
  const bundleVariations = {
    text: [] as any[],
    dropdown: [] as any[],
    image: [] as any[],
    boolean: [] as any[]
  };

  if (bundleItems && bundleItems.required) {
    bundleItems.required.forEach((item: any) => {
      if (item.is_configurable && item.variations) {
        // Add variations from this bundle item
        if (item.variations.text) bundleVariations.text.push(...item.variations.text);
        if (item.variations.dropdown) bundleVariations.dropdown.push(...item.variations.dropdown);
        if (item.variations.image) bundleVariations.image.push(...item.variations.image);
        if (item.variations.boolean) bundleVariations.boolean.push(...item.variations.boolean);
      }
    });
  }

  // Transform variations for the new ProductVariations component
  // Merge main product variations with bundle item variations
  const textVariations = [
    ...(product.variations?.text && Array.isArray(product.variations.text)
      ? product.variations.text.map((v: any) => ({
          id: v.id.toString(),
          name: v.name,
          description: v.description || '',
          isRequired: v.is_required || false
        }))
      : []),
    ...bundleVariations.text.map((v: any) => ({
      id: `bundle-${v.id}`,
      name: v.name,
      description: v.description || '',
      isRequired: v.is_required || false
    }))
  ];

  const dropdownVariations = [
    ...(product.variations?.dropdown && Array.isArray(product.variations.dropdown)
      ? product.variations.dropdown.map((v: any) => ({
          id: v.id.toString(),
          name: v.name,
          description: v.description || '',
          isRequired: v.is_required || false,
          options: Array.isArray(v.options) ? v.options.map((o: any) => ({
            id: o.id.toString(),
            name: o.option_name || o.name,
            price: o.price_adjustment || 0
          })) : []
        }))
      : []),
    ...bundleVariations.dropdown.map((v: any) => {
      // Find which bundle item this variation belongs to
      const bundleItem = bundleItems?.required?.find((item: any) => {
        if (!item.is_configurable || !item.variations) return false;
        const dropVariations = item.variations.dropdown || [];
        return dropVariations.some((v2: any) => v2.id === v.id);
      });
      
      return {
        id: `bundle-${v.id}`,
        name: v.name,
        description: v.description || '',
        isRequired: v.is_required || false,
        options: Array.isArray(v.options) ? v.options.map((o: any) => ({
          id: o.id.toString(),
          name: o.option_name || o.name,
          price: o.price_adjustment || 0
        })) : [],
        bundleVariationId: v.id, // Store original ID for bundle configuration
        bundleItemId: bundleItem?.id
      };
    })
  ];

  const imageVariations = [
    ...(product.variations?.image && Array.isArray(product.variations.image)
      ? product.variations.image.map((v: any) => ({
          id: v.id.toString(),
          name: v.name,
          description: v.description || '',
          isRequired: v.is_required || false,
          options: Array.isArray(v.options) ? v.options.map((o: any) => ({
            id: o.id.toString(),
            name: o.option_name || o.name,
            price: o.price_adjustment || 0,
            image: o.image_url || '/api/placeholder/80/80'
          })) : []
        }))
      : []),
    ...bundleVariations.image.map((v: any) => ({
      id: `bundle-${v.id}`,
      name: v.name,
      description: v.description || '',
      isRequired: v.is_required || false,
      options: Array.isArray(v.options) ? v.options.map((o: any) => ({
        id: o.id.toString(),
        name: o.option_name || o.name,
        price: o.price_adjustment || 0,
        image: o.image_url || '/api/placeholder/80/80'
      })) : [],
      bundleVariationId: v.id,
      bundleItemId: bundleItems?.required?.find((item: any) => 
        item.variations?.image?.some((v2: any) => v2.id === v.id)
      )?.id
    }))
  ];

  const booleanVariations = [
    ...(product.variations?.boolean && Array.isArray(product.variations.boolean)
      ? product.variations.boolean.map((v: any) => {
          // Extract yes price from options
          const yesOption = v.options?.find((opt: any) => opt.option_name === 'Yes');
          const yesPrice = yesOption?.price_adjustment || 0;
          
          return {
            id: v.id.toString(),
            name: v.name,
            description: v.description || '',
            isRequired: v.is_required || false,
            yesPrice: yesPrice
          };
        })
      : []),
    ...bundleVariations.boolean.map((v: any) => {
      const yesOption = v.options?.find((opt: any) => opt.option_name === 'Yes');
      const yesPrice = yesOption?.price_adjustment || 0;
      
      return {
        id: `bundle-${v.id}`,
        name: v.name,
        description: v.description || '',
        isRequired: v.is_required || false,
        yesPrice: yesPrice,
        bundleVariationId: v.id,
        bundleItemId: bundleItems?.required?.find((item: any) => 
          item.variations?.boolean?.some((v2: any) => v2.id === v.id)
        )?.id
      };
    })
  ];

  const additionalDescriptions = Array.isArray(product.additionalInfo)
    ? product.additionalInfo.map((info: any) => ({
        title: info.title,
        images: [],
        description: info.description || ''
      }))
    : [];


  const assemblyManuals = Array.isArray(product.assemblyManuals)
    ? product.assemblyManuals.map((manual: any) => ({
        id: manual.id,
        name: manual.name,
        description: manual.description,
        image: manual.image_url || manual.thumbnail_url || '/api/placeholder/300/200',
        fileUrl: manual.file_url || manual.fileUrl,
        viewUrl: manual.id ? `/manuals/${manual.id}` : undefined
      }))
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-20">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Image Gallery */}
          <div className="lg:col-span-8">
            <ProductImageGallery images={images} productName={product.name} />
          </div>

          {/* Product Info */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 lg:pr-4">
            <div className="space-y-6">
            <div>
              {/* Sale Badge */}
              {isSaleActive() && (product as any).sale_label && (
                <div className="inline-block bg-red-500 text-white px-3 py-1 rounded-md text-sm font-bold mb-3">
                  {(product as any).sale_label}
                </div>
              )}
              
              <h1 className="text-3xl font-bold text-primary mb-2">{product.name}</h1>
              {((product as any).short_description || (product as any).shortDescription) && (
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {(product as any).short_description || (product as any).shortDescription}
                </p>
              )}
              
              {(() => {
                const priceData = getDisplayPrice();
                const currency = getCurrencySymbol((product as any)?.region);
                if (priceData.range) {
                  return (
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl font-bold">
                        {currency}{priceData.price.toFixed(2)} - {currency}{priceData.original.toFixed(2)}
                      </p>
                      {calculating && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <p className={`text-4xl font-bold ${priceData.onSale ? 'text-destructive' : ''}`}>
                        {currency}{priceData.price.toFixed(2)}
                      </p>
                      {priceData.original && (
                        <p className="text-xl line-through text-muted-foreground">
                          {currency}{priceData.original.toFixed(2)}
                        </p>
                      )}
                      {calculating && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {priceData.onSale && priceData.original && (
                      <p className="text-sm text-green-600 font-medium">
                        Save {currency}{(priceData.original - priceData.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Product Variations */}
            {(textVariations.length > 0 || dropdownVariations.length > 0 || imageVariations.length > 0 || booleanVariations.length > 0) && (
              <div className="space-y-4">
                <ProductVariations
                  textVariations={textVariations}
                  dropdownVariations={dropdownVariations}
                  imageVariations={imageVariations}
                  booleanVariations={booleanVariations}
                  selectedTextValues={selectedTextValues}
                  variationStock={variationStock?.variationStock || []}
                  selectedDropdownValues={(() => {
                    // Map native variations: convert numeric keys to string keys to match variation IDs
                    const mainVariations: Record<string, string> = {};
                    Object.entries(selectedDropdownVariations).forEach(([varId, optId]) => {
                      // Variation IDs in dropdownVariations are strings, so ensure key is string
                      mainVariations[varId.toString()] = optId.toString();
                    });
                    
                    // Add bundle variations
                    const bundleSelections: Record<string, string> = {};
                    Object.entries(bundleConfigurations).forEach(([bundleItemId, config]: [string, any]) => {
                      Object.entries(config || {}).forEach(([variationId, optionId]: [string, any]) => {
                        // Find the variation with this bundleVariationId to get its display ID
                        const variation = dropdownVariations.find(v => 
                          (v as any).bundleItemId?.toString() === bundleItemId.toString() && 
                          (v as any).bundleVariationId?.toString() === variationId.toString()
                        );
                        if (variation && optionId) {
                          bundleSelections[variation.id] = optionId.toString();
                        }
                      });
                    });
                    
                    return { ...mainVariations, ...bundleSelections };
                  })()}
                  selectedImageValues={selectedImageValues}
                  selectedBooleanValues={selectedBooleanValues}
                  onTextChange={(variationId, value) => {
                    setSelectedTextValues(prev => ({ ...prev, [variationId]: value }));
                  }}
                  onDropdownChange={(varId, optId) => {
                    // Check if this is a bundle variation (starts with "bundle-")
                    if (varId.startsWith('bundle-')) {
                      const variation = dropdownVariations.find(v => v.id === varId);
                      if (variation && (variation as any).bundleItemId && (variation as any).bundleVariationId) {
                        // Store in bundle configurations
                        setBundleConfigurations(prev => ({
                          ...prev,
                          [(variation as any).bundleItemId]: {
                            ...prev[(variation as any).bundleItemId] || {},
                            [(variation as any).bundleVariationId]: parseInt(optId)
                          }
                        }));
                      }
                    } else {
                      // Regular product variation
                      handleDropdownVariationChange(parseInt(varId), parseInt(optId));
                    }
                  }}
                  onImageChange={(variationId, optionId) => {
                    setSelectedImageValues(prev => ({ ...prev, [variationId]: optionId }));
                  }}
                  onBooleanChange={(variationId, value) => {
                    setSelectedBooleanValues(prev => {
                      const newValues = { ...prev, [variationId]: value };
                      return newValues;
                    });
                  }}
                  productRegion={(product as any)?.region}
                />
              </div>
            )}

            {/* Required Bundle Items Stock Warning */}
            {bundleItems && bundleItems.required && bundleItems.required.length > 0 && (() => {
              const outOfStockRequired = bundleItems.required.filter((item: any) => {
                const stockInfo = bundleItemStock[item.id];
                return stockInfo && stockInfo.required && stockInfo.available <= 0;
              });
              
              if (outOfStockRequired.length > 0) {
                return (
                  <div className="space-y-3 pt-6">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-destructive mb-1">Product Unavailable</h4>
                          <p className="text-sm text-muted-foreground">
                            Required items are out of stock: {outOfStockRequired.map((item: any) => item.display_name || item.item_product_name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Optional Bundle Items */}
            {bundleItems && bundleItems.optional && bundleItems.optional.length > 0 && (
              <div className="space-y-3 pt-6">
                <h3 className="text-lg font-semibold">Optional Add-ons</h3>
                {bundleItems.optional.map((item: any) => {
                  const isSelected = selectedOptionalItems.has(item.id);
                  const itemVariations = item.is_configurable && item.variations ? {
                    text: item.variations.text || [],
                    dropdown: item.variations.dropdown || [],
                    image: item.variations.image || [],
                    boolean: item.variations.boolean || []
                  } : null;
                  
                  // Calculate base price
                  const basePrice = item.item_product_price || item.regular_price || 0;
                  
                  // Calculate variation price adjustments
                  const variationPriceAdjustment = (() => {
                    if (!isSelected || !itemVariations || !bundleConfigurations[item.id]) return 0;
                    
                    let adjustment = 0;
                    const config = bundleConfigurations[item.id];
                    
                    // Check dropdown variations
                    if (itemVariations.dropdown) {
                      itemVariations.dropdown.forEach((variation: any) => {
                        const selectedOptionId = config[variation.id];
                        if (selectedOptionId && variation.options) {
                          const selectedOption = variation.options.find((opt: any) => opt.id === selectedOptionId);
                          if (selectedOption && selectedOption.price_adjustment) {
                            adjustment += selectedOption.price_adjustment;
                          }
                        }
                      });
                    }
                    
                    // Check boolean variations (add yes price if selected)
                    if (itemVariations.boolean) {
                      itemVariations.boolean.forEach((variation: any) => {
                        const isYes = config[variation.id] === true;
                        if (isYes && variation.options) {
                          const yesOption = variation.options.find((opt: any) => opt.option_name === 'Yes');
                          if (yesOption && yesOption.price_adjustment) {
                            adjustment += yesOption.price_adjustment;
                          }
                        }
                      });
                    }
                    
                    return adjustment;
                  })();
                  
                  const totalPrice = basePrice + variationPriceAdjustment;
                  
                  // Check stock availability
                  const stockInfo = bundleItemStock[item.id];
                  const isAvailable = stockInfo ? stockInfo.available > 0 : true; // Default to available if not checked yet
                  const stockLabel = stockInfo ? (stockInfo.available > 0 ? `${stockInfo.available} available` : 'Out of Stock') : '';
                  
                  return (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={!isAvailable && !isSelected}
                          onCheckedChange={(checked) => {
                            if (!isAvailable && checked) return; // Don't allow selecting unavailable items
                            
                            if (checked) {
                              setSelectedOptionalItems(prev => new Set(prev).add(item.id));
                            } else {
                              const newSet = new Set(selectedOptionalItems);
                              newSet.delete(item.id);
                              setSelectedOptionalItems(newSet);
                              // Clear configurations for this item
                              setBundleConfigurations(prev => {
                                const newConfigs = { ...prev };
                                delete newConfigs[item.id];
                                return newConfigs;
                              });
                            }
                          }}
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-lg font-medium ${!isAvailable ? 'text-muted-foreground line-through' : ''}`}>
                              {item.display_name || item.item_product_name}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              (${basePrice.toFixed(2)})
                            </span>
                            {!isAvailable && (
                              <Badge variant="destructive" className="ml-2">Out of Stock</Badge>
                            )}
                            {isAvailable && stockInfo && stockInfo.available > 0 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {stockInfo.available} available
                              </Badge>
                            )}
                          </div>
                          {isSelected && variationPriceAdjustment !== 0 && (
                            <div className="text-right">
                              <div className="font-semibold">
                                ${totalPrice.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${basePrice.toFixed(2)} base
                                {variationPriceAdjustment > 0 ? ` + $${variationPriceAdjustment.toFixed(2)}` : ` - $${Math.abs(variationPriceAdjustment).toFixed(2)}`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground ml-8">{item.description}</p>
                      )}

                      {/* Show variations when checked */}
                      {isSelected && itemVariations && (
                        <div className="ml-8 space-y-3 pt-2">
                          {(() => {
                            // Flatten all variations
                            const allVariations: any[] = [];
                            if (itemVariations.dropdown) allVariations.push(...itemVariations.dropdown);
                            if (itemVariations.text) allVariations.push(...itemVariations.text);
                            if (itemVariations.image) allVariations.push(...itemVariations.image);
                            if (itemVariations.boolean) allVariations.push(...itemVariations.boolean);

                            if (allVariations.length === 0) {
                              return null;
                            }

                            return allVariations.map((variation: any) => {
                              // Handle dropdown variations
                              if (variation.variation_type === 'dropdown' && variation.options && Array.isArray(variation.options) && variation.options.length > 0) {
                                const selectedValue = bundleConfigurations[item.id]?.[variation.id];
                                
                                return (
                                  <div key={variation.id} className="space-y-2">
                                    <label className="text-sm font-medium">{variation.name}</label>
                                    <select
                                      className="w-full p-2 border rounded-md bg-background"
                                      value={selectedValue || ''}
                                      onChange={(e) => {
                                        setBundleConfigurations(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id] || {},
                                            [variation.id]: parseInt(e.target.value)
                                          }
                                        }));
                                      }}
                                    >
                                      <option value="">Select {variation.name}</option>
                                      {variation.options.map((option: any) => {
                                        const priceAdj = option.price_adjustment ?? 0;
                                        const hasPrice = priceAdj !== 0 && priceAdj !== null && priceAdj !== undefined;
                                        const currency = getCurrencySymbol((product as any)?.region);
                                        return (
                                          <option key={option.id} value={option.id}>
                                            {option.option_name}{hasPrice ? ` (${priceAdj > 0 ? '+' : ''}${currency}${Math.abs(priceAdj).toFixed(2)})` : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                );
                              }
                              
                              // Handle text variations
                              if (variation.variation_type === 'text') {
                                const selectedValue = bundleConfigurations[item.id]?.[variation.id] || '';
                                return (
                                  <div key={variation.id} className="space-y-2">
                                    <label className="text-sm font-medium">
                                      {variation.name}
                                      {variation.is_required && <span className="text-primary ml-1">*</span>}
                                    </label>
                                    <Input
                                      placeholder={`Enter ${variation.name.toLowerCase()}...`}
                                      value={selectedValue}
                                      onChange={(e) => {
                                        setBundleConfigurations(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id] || {},
                                            [variation.id]: e.target.value
                                          }
                                        }));
                                      }}
                                      required={variation.is_required}
                                    />
                                  </div>
                                );
                              }
                              
                              // Handle boolean variations
                              if (variation.variation_type === 'boolean' && variation.options) {
                                const yesOption = variation.options.find((opt: any) => opt.option_name === 'Yes');
                                const yesPrice = yesOption?.price_adjustment || 0;
                                const isChecked = bundleConfigurations[item.id]?.[variation.id] === true;
                                
                                return (
                                  <div key={variation.id} className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          setBundleConfigurations(prev => ({
                                            ...prev,
                                            [item.id]: {
                                              ...prev[item.id] || {},
                                              [variation.id]: checked
                                            }
                                          }));
                                        }}
                                      />
                                      <label className="text-sm font-medium cursor-pointer">
                                        {variation.name}
                                        {variation.is_required && <span className="text-primary ml-1">*</span>}
                                        {yesPrice > 0 && (
                                          <span className="text-primary ml-2 font-normal">
                                            (+${yesPrice.toFixed(2)})
                                          </span>
                                        )}
                                      </label>
                                    </div>
                                    {variation.description && (
                                      <p className="text-sm text-muted-foreground ml-8">{variation.description}</p>
                                    )}
                                  </div>
                                );
                              }
                              
                              return null;
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stock Status */}
            {!(variationStock && !variationStock.available) && (
              <div className={(product as any).stock > 0 || (product as any).in_stock === '1' ? "text-green-400 font-medium" : "text-destructive font-medium"}>
                {(product as any).stock > 0 || (product as any).in_stock === '1' ? 'In stock' : 'Out of stock'}
              </div>
            )}
            
            {/* Show Out of Stock when variations are out of stock */}
            {variationStock && !variationStock.available && (
              <div className="text-destructive font-medium">
                Out of stock
              </div>
            )}

            {/* Variation Stock Info (when in stock but low) */}
            {variationStock && variationStock.available && variationStock.availableQuantity > 0 && variationStock.variationStock && variationStock.availableQuantity <= 5 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Low stock:</span> Only {variationStock.availableQuantity} available
                </p>
              </div>
            )}

            {/* Add to Cart */}
            <div className="space-y-4">
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 text-lg"
                disabled={
                  !((product as any).stock > 0 || (product as any).in_stock === '1') || 
                  addingToCart ||
                  checkingStock ||
                  // Disable if selected variations are out of stock
                  (variationStock && !variationStock.available) ||
                  // Disable if any required bundle items are out of stock
                  (bundleItems?.required?.some((item: any) => {
                    const stockInfo = bundleItemStock[item.id];
                    return stockInfo && stockInfo.required && stockInfo.available <= 0;
                  })) ||
                  // Disable if validation errors exist
                  validationErrors.length > 0
                }
                onClick={handleAddToCart}
              >
                {addingToCart ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ADDING TO CART...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    ADD TO CART
                  </>
                )}
              </Button>
              
              {/* Show validation errors */}
              {validationErrors.length > 0 && (
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <p key={index} className="text-sm text-destructive text-center font-medium">
                      {error}
                    </p>
                  ))}
                </div>
              )}
              
              {/* Show message if disabled due to variation stock */}
              {variationStock && !variationStock.available && validationErrors.length === 0 && (
                <p className="text-sm text-destructive text-center font-medium">
                  Cannot add to cart: Selected option is out of stock
                </p>
              )}
              
              {/* Show message if disabled due to bundle stock */}
              {bundleItems?.required?.some((item: any) => {
                const stockInfo = bundleItemStock[item.id];
                return stockInfo && stockInfo.required && stockInfo.available <= 0;
              }) && validationErrors.length === 0 && (
                <p className="text-sm text-destructive text-center font-medium">
                  Cannot add to cart: Required items are out of stock
                </p>
              )}
              
              <div className="text-sm text-muted-foreground text-center">
                As low as $32.27/mo with <span className="font-bold">PayPal</span>. 
                <button className="underline ml-1">Learn more</button>
              </div>

              <WishlistButton
                productId={product.id}
                variant="ghost"
                showLabel={true}
                className="w-full"
              />
            </div>

            {/* Shipping Info */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Truck className="w-5 h-5" />
              <span>Free shipping for orders over $50</span>
            </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <ProductAdditionalInfo
          additionalDescriptions={additionalDescriptions}
          assemblyManuals={assemblyManuals}
        />

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-lg text-muted-foreground">
                {feature.icon}
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Product Description Builder */}
        <ProductDescriptionBuilder productId={product.id} />

        {/* FAQs Section */}
        <ProductFAQs productId={product.id} />
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
