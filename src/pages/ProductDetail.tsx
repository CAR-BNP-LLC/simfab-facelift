import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingCart, Truck, Shield, Clock, Headphones, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductVariations from "@/components/ProductVariations";
import ProductAddons from "@/components/ProductAddons";
import ProductAdditionalInfo from "@/components/ProductAdditionalInfo";
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
  const [selectedColor, setSelectedColor] = useState<number | undefined>(undefined);
  const [selectedModelVariation, setSelectedModelVariation] = useState<number | undefined>(undefined);
  const [selectedDropdownVariations, setSelectedDropdownVariations] = useState<Record<number, number>>({});
  const [selectedAddons, setSelectedAddons] = useState<Set<number>>(new Set());
  const [selectedAddonOptions, setSelectedAddonOptions] = useState<Record<number, number>>({});
  
  const { toast } = useToast();
  const { addToCart } = useCart();

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
    if (product && selectedColor !== undefined) {
      console.log('Configuration changed, calculating price...');
      calculatePrice();
    }
  }, [selectedColor, selectedModelVariation, selectedDropdownVariations, selectedAddons, selectedAddonOptions]);

  // Set default selections when product loads
  useEffect(() => {
    if (product && !selectedColor) {
      try {
        // Set default color
        if (Array.isArray(product.colors) && product.colors.length > 0) {
          setSelectedColor((product.colors[0] as any).id);
        }
        
        // Set default model variation
        if (product.variations?.model && Array.isArray(product.variations.model) && product.variations.model.length > 0) {
          const defaultModel = product.variations.model.find((v: any) => 
            Array.isArray(v.options) && v.options.find((o: any) => o.is_default || o.isDefault)
          );
          if (defaultModel) {
            const defaultOption = (defaultModel as any).options.find((o: any) => o.is_default || o.isDefault);
            if (defaultOption) {
              setSelectedModelVariation(defaultOption.id);
            }
          } else if ((product.variations.model[0] as any).options?.[0]) {
            setSelectedModelVariation((product.variations.model[0] as any).options[0].id);
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
        colorId: selectedColor,
        modelVariationId: selectedModelVariation,
        dropdownSelections: selectedDropdownVariations,
        addons: Array.from(selectedAddons).map(addonId => ({
          addonId,
          optionId: selectedAddonOptions[addonId]
        }))
      };

      console.log('Calculating price for configuration:', configuration);
      
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
      const configuration: ProductConfiguration = {
        colorId: selectedColor,
        modelVariationId: selectedModelVariation,
        dropdownSelections: selectedDropdownVariations,
        addons: Array.from(selectedAddons).map(addonId => ({
          addonId,
          optionId: selectedAddonOptions[addonId]
        }))
      };

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

  const getDisplayPrice = () => {
    try {
      if (calculatedPrice !== null && calculatedPrice !== undefined) {
        return `$${calculatedPrice.toFixed(2)}`;
      }
      
      if (!product) return 'Loading...';
      
      const prod = product as any;
      
      // Try different price field combinations
      if (prod.price_min !== undefined && prod.price_max !== undefined && prod.price_min !== prod.price_max) {
        return `$${prod.price_min.toFixed(2)} - $${prod.price_max.toFixed(2)}`;
      }
      if (prod.price?.min !== undefined && prod.price?.max !== undefined) {
        return `$${prod.price.min.toFixed(2)} - $${prod.price.max.toFixed(2)}`;
      }
      if (prod.regular_price !== undefined && prod.regular_price !== null) {
        return `$${prod.regular_price.toFixed(2)}`;
      }
      if (prod.price?.regular) {
        return `$${prod.price.regular.toFixed(2)}`;
      }
      if (prod.sale_price !== undefined && prod.sale_price !== null) {
        return `$${prod.sale_price.toFixed(2)}`;
      }
      
      return 'Price TBD';
    } catch (error) {
      console.error('Error displaying price:', error);
      return 'Price TBD';
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
    ? product.images.map((img: any) => ({
        url: img.url || img.image_url || '/api/placeholder/600/400',
        alt: img.alt || img.alt_text || product.name
      }))
    : [{ url: '/api/placeholder/600/400', alt: product.name }];

  const colors = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors.map((c: any) => ({
        id: c.id.toString(),
        name: c.color_name || c.name,
        image: c.color_image_url || c.imageUrl || '/api/placeholder/80/80'
      }))
    : [];

  const modelVariations = product.variations?.model && Array.isArray(product.variations.model)
    ? product.variations.model.map((v: any) => ({
        id: v.id.toString(),
        name: v.name,
        image: v.options?.[0]?.imageUrl || v.options?.[0]?.image_url || '/api/placeholder/300/200',
        description: v.description || ''
      }))
    : [];

  const dropdownVariations = product.variations?.dropdown && Array.isArray(product.variations.dropdown)
    ? product.variations.dropdown.map((v: any) => ({
        id: v.id.toString(),
        name: v.name,
        options: Array.isArray(v.options) ? v.options.map((o: any) => ({
          id: o.id.toString(),
          name: o.option_name || o.name,
          price: o.price_adjustment || o.priceAdjustment || 0
        })) : []
      }))
    : [];

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

  const faqs = Array.isArray(product.faqs)
    ? product.faqs.map((faq: any) => ({
        question: faq.question,
        answer: faq.answer
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
          <div 
            className="lg:col-span-4 space-y-6 max-h-screen overflow-y-auto pr-4 sticky top-0"
            onWheel={(e) => {
              const element = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = element;
              const atTop = scrollTop === 0;
              const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
              
              if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                return;
              } else {
                e.stopPropagation();
              }
            }}
          >
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">{product.name}</h1>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {product.shortDescription || product.description}
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-bold">
                  {getDisplayPrice()}
                </p>
                {calculating && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
              {calculatedPrice !== null && (
                <p className="text-sm text-muted-foreground mt-1">
                  Price updates based on your selections
                </p>
              )}
            </div>

            {/* Color Selection */}
            {colors.length > 0 && (
              <div className="space-y-3">
                <label className="text-lg font-medium">
                  Choose Seat Color (Removable Foam) <span className="text-primary">*</span>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(parseInt(color.id))}
                      className={`relative p-2 rounded-lg border-2 transition-colors ${
                        selectedColor === parseInt(color.id)
                          ? 'border-primary' 
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-2">
                        <img 
                          src={color.image} 
                          alt={color.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm font-medium">{color.name}</span>
                      {selectedColor === parseInt(color.id) && (
                        <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Configuration */}
            <div className="space-y-6">
              <ProductVariations
                modelVariations={modelVariations}
                dropdownVariations={dropdownVariations}
                selectedModelVariation={selectedModelVariation?.toString()}
                selectedDropdownVariations={Object.fromEntries(
                  Object.entries(selectedDropdownVariations).map(([k, v]) => [k, v.toString()])
                )}
                onModelVariationChange={(id) => setSelectedModelVariation(parseInt(id))}
                onDropdownVariationChange={(varId, optId) => 
                  handleDropdownVariationChange(parseInt(varId), parseInt(optId))
                }
              />
              
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
            </div>

            {/* Stock Status */}
            <div className={(product as any).stock > 0 || (product as any).in_stock === '1' ? "text-green-400 font-medium" : "text-destructive font-medium"}>
              {(product as any).stock > 0 || (product as any).in_stock === '1' ? 'In stock' : 'Out of stock'}
            </div>

            {/* Add to Cart */}
            <div className="space-y-4">
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 text-lg"
                disabled={!((product as any).stock > 0 || (product as any).in_stock === '1') || addingToCart}
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

              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                <Heart className="w-5 h-5 mr-2" />
                Add to Wishlist
              </Button>
            </div>

            {/* Shipping Info */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Truck className="w-5 h-5" />
              <span>Free shipping for orders over $50</span>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <ProductAdditionalInfo
          additionalDescriptions={additionalDescriptions}
          faqs={faqs}
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
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
