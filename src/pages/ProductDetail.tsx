import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingCart, Truck, Shield, Clock, Headphones, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { WishlistButton } from "@/components/WishlistButton";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductVariations from "@/components/ProductVariations";
import ProductAddons from "@/components/ProductAddons";
import ProductAdditionalInfo from "@/components/ProductAdditionalInfo";
import ProductFAQs from "@/components/ProductFAQs";
import ProductDescriptionBuilder from "@/components/ProductDescriptionBuilder";
import { productsAPI, ProductWithDetails, ProductConfiguration } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";

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
  const [selectedAddons, setSelectedAddons] = useState<Set<number>>(new Set());
  const [selectedAddonOptions, setSelectedAddonOptions] = useState<Record<number, number>>({});
  
  // New variation state
  const [selectedTextValues, setSelectedTextValues] = useState<Record<string, string>>({});
  const [selectedImageValues, setSelectedImageValues] = useState<Record<string, string>>({});
  const [selectedBooleanValues, setSelectedBooleanValues] = useState<Record<string, boolean>>({});
  
  const { toast } = useToast();
  const { addToCart } = useCart();

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

  // Fetch product on mount
  useEffect(() => {
    console.log('ProductDetail mounted. Product identifier:', productSlug);
    
    if (productSlug) {
      console.log('Calling fetchProduct with:', productSlug);
      fetchProduct(productSlug);
    } else {
      console.error('No product identifier provided!');
      setError('No product identifier provided');
      setLoading(false);
    }
  }, [productSlug]);

  // Calculate price when configuration changes (but NOT when product first loads)
  useEffect(() => {
    if (product) {
      console.log('Configuration changed, calculating price...');
      calculatePrice();
    }
  }, [selectedModelVariation, selectedDropdownVariations, selectedAddons, selectedAddonOptions, selectedTextValues, selectedImageValues, selectedBooleanValues]);

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
        console.error('Error setting default selections:', error);
      }
    }
  }, [product]);

  const fetchProduct = async (productSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching product by slug:', productSlug);
      
      const response = await productsAPI.getBySlug(productSlug);
      console.log('Product response:', response);
      
      if (response.data) {
        setProduct(response.data);
      } else {
        throw new Error('Invalid product data');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
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

  const calculatePrice = async () => {
    if (!product) return;

    try {
      setCalculating(true);

      const configuration: ProductConfiguration = {
        variations: {
          // Legacy dropdown variations (using old system)
          ...(selectedModelVariation && { [selectedModelVariation]: selectedModelVariation }),
          ...selectedDropdownVariations,
          // New variation system
          ...Object.fromEntries(
            Object.entries(selectedTextValues).map(([variationId, value]) => [
              parseInt(variationId), 
              value // For text variations, we might need to map to option IDs
            ])
          ),
          ...Object.fromEntries(
            Object.entries(selectedImageValues).map(([variationId, optionId]) => [
              parseInt(variationId), 
              parseInt(optionId)
            ])
          ),
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
        },
        addons: Array.from(selectedAddons).map(addonId => ({
          addonId,
          optionId: selectedAddonOptions[addonId]
        }))
      };

      console.log('Calculating price for configuration:', configuration);
      console.log('Selected boolean values:', selectedBooleanValues);
      
      const response = await productsAPI.calculatePrice(product.id, configuration, 1);
      console.log('Price calculation response:', response);
      
      setCalculatedPrice(response.data.pricing.total);
    } catch (err) {
      console.error('Price calculation error:', err);
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
      console.log('handleAddToCart - Current state values:');
      console.log('- selectedModelVariation:', selectedModelVariation);
      console.log('- selectedDropdownVariations:', selectedDropdownVariations);
      console.log('- selectedTextValues:', selectedTextValues);
      console.log('- selectedImageValues:', selectedImageValues);
      console.log('- selectedBooleanValues:', selectedBooleanValues);
      console.log('- selectedAddons:', selectedAddons);
      console.log('- selectedAddonOptions:', selectedAddonOptions);
      
      const configuration: ProductConfiguration = {
        variations: {
          // Legacy dropdown variations (using old system)
          ...(selectedModelVariation && { [selectedModelVariation]: selectedModelVariation }),
          ...selectedDropdownVariations,
          // New variation system
          ...Object.fromEntries(
            Object.entries(selectedTextValues).map(([variationId, value]) => [
              parseInt(variationId), 
              value // For text variations, we might need to map to option IDs
            ])
          ),
          ...Object.fromEntries(
            Object.entries(selectedImageValues).map(([variationId, optionId]) => [
              parseInt(variationId), 
              parseInt(optionId)
            ])
          ),
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
        },
        addons: Array.from(selectedAddons).map(addonId => ({
          addonId,
          optionId: selectedAddonOptions[addonId]
        }))
      };

      console.log('handleAddToCart - Final configuration:', configuration);

      console.log('Adding to cart:', {
        productId: product.id,
        configuration,
        quantity: 1
      });

      await addToCart(product.id, configuration, 1);

      // Success is handled by CartContext (shows toast)
    } catch (error) {
      console.error('Failed to add to cart:', error);
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

  const handleAddonToggle = (addonId: number) => {
    const newSelected = new Set(selectedAddons);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
      const newOptions = { ...selectedAddonOptions };
      delete newOptions[addonId];
      setSelectedAddonOptions(newOptions);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddons(newSelected);
  };

  const handleAddonOptionChange = (addonId: number, optionId: number) => {
    setSelectedAddonOptions(prev => ({
      ...prev,
      [addonId]: optionId
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
      console.error('Error displaying price:', error);
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

  // Transform variations for the new ProductVariations component
  const textVariations = product.variations?.text && Array.isArray(product.variations.text)
    ? product.variations.text.map((v: any) => ({
        id: v.id.toString(),
        name: v.name,
        description: v.description || '',
        isRequired: v.is_required || false
      }))
    : [];

  const dropdownVariations = product.variations?.dropdown && Array.isArray(product.variations.dropdown)
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
    : [];

  const imageVariations = product.variations?.image && Array.isArray(product.variations.image)
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
    : [];

  const booleanVariations = product.variations?.boolean && Array.isArray(product.variations.boolean)
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
    : [];

  // Debug logging
  console.log('Product variations:', product.variations);
  console.log('Text variations:', textVariations);
  console.log('Dropdown variations:', dropdownVariations);
  console.log('Image variations:', imageVariations);
  console.log('Boolean variations:', booleanVariations);
  console.log('Selected boolean values:', selectedBooleanValues);

  const addons = Array.isArray(product.addons)
    ? product.addons.map((a: any) => ({
        id: a.id.toString(),
        name: a.name,
        price: a.base_price || a.price?.min,
        priceRange: a.price_range_min && a.price_range_max && a.price_range_min !== a.price_range_max ? {
          min: a.price_range_min,
          max: a.price_range_max
        } : undefined,
        options: Array.isArray(a.options) && a.has_options ? a.options.map((o: any) => ({
          id: o.id.toString(),
          name: o.name,
          image: o.image_url || o.imageUrl || '/api/placeholder/200/150',
          price: o.price
        })) : undefined
      }))
    : [];

  const additionalDescriptions = Array.isArray(product.additionalInfo)
    ? product.additionalInfo.map((info: any) => ({
        title: info.title,
        images: [],
        description: info.description || ''
      }))
    : [];


  const assemblyManuals = Array.isArray(product.assemblyManuals)
    ? product.assemblyManuals.map((manual: any) => ({
        name: manual.name,
        image: manual.image_url || manual.thumbnailUrl || '/api/placeholder/300/200',
        fileUrl: manual.file_url || manual.fileUrl
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
              <p className="text-muted-foreground leading-relaxed mb-4">
                {product.shortDescription || product.description}
              </p>
              
              {(() => {
                const priceData = getDisplayPrice();
                if (priceData.range) {
                  return (
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl font-bold">
                        ${priceData.price.toFixed(2)} - ${priceData.original.toFixed(2)}
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
                        ${priceData.price.toFixed(2)}
                      </p>
                      {priceData.original && (
                        <p className="text-xl line-through text-muted-foreground">
                          ${priceData.original.toFixed(2)}
                        </p>
                      )}
                      {calculating && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {priceData.onSale && priceData.original && (
                      <p className="text-sm text-green-600 font-medium">
                        Save ${(priceData.original - priceData.price).toFixed(2)}
                      </p>
                    )}
                  </div>
                );
              })()}
              
              {calculatedPrice !== null && (
                <p className="text-sm text-muted-foreground mt-1">
                  Price updates based on your selections
                </p>
              )}
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
                  selectedDropdownValues={Object.fromEntries(
                    Object.entries(selectedDropdownVariations).map(([k, v]) => [k, v.toString()])
                  )}
                  selectedImageValues={selectedImageValues}
                  selectedBooleanValues={selectedBooleanValues}
                  onTextChange={(variationId, value) => {
                    setSelectedTextValues(prev => ({ ...prev, [variationId]: value }));
                  }}
                  onDropdownChange={(varId, optId) => 
                    handleDropdownVariationChange(parseInt(varId), parseInt(optId))
                  }
                  onImageChange={(variationId, optionId) => {
                    setSelectedImageValues(prev => ({ ...prev, [variationId]: optionId }));
                  }}
                  onBooleanChange={(variationId, value) => {
                    console.log('Boolean variation changed:', variationId, 'to', value);
                    setSelectedBooleanValues(prev => {
                      const newValues = { ...prev, [variationId]: value };
                      console.log('Updated boolean values:', newValues);
                      return newValues;
                    });
                  }}
                />
              </div>
            )}

            {/* Product Addons */}
            {addons.length > 0 && (
              <ProductAddons
                addons={addons}
                selectedAddons={new Set(Array.from(selectedAddons).map(id => id.toString()))}
                selectedAddonOptions={Object.fromEntries(
                  Object.entries(selectedAddonOptions).map(([k, v]) => [k, v.toString()])
                )}
                onAddonToggle={(id) => handleAddonToggle(parseInt(id))}
                onAddonOptionChange={(addonId, optId) => 
                  handleAddonOptionChange(parseInt(addonId), parseInt(optId))
                }
              />
            )}

            {/* Stock Status */}
            <div className={isProductInStock(product) ? "text-green-400 font-medium" : "text-destructive font-medium"}>
              {isProductInStock(product) ? 'In stock' : 'Out of stock'}
            </div>

            {/* Add to Cart */}
            <div className="space-y-4">
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 text-lg"
                disabled={!isProductInStock(product) || addingToCart}
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
