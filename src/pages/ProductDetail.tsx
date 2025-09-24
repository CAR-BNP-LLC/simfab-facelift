import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingCart, Truck, Shield, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductVariations from "@/components/ProductVariations";
import ProductAddons from "@/components/ProductAddons";
import ProductAdditionalInfo from "@/components/ProductAdditionalInfo";

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedColor, setSelectedColor] = useState("black");
  const [selectedModelVariation, setSelectedModelVariation] = useState("base-configuration");
  const [selectedDropdownVariations, setSelectedDropdownVariations] = useState<Record<string, string>>({});
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [selectedAddonOptions, setSelectedAddonOptions] = useState<Record<string, string>>({});

  // Mock product data - in real app, fetch based on id
  const product = {
    id: id || "flight-sim-trainer",
    name: "SimFab Flight Sim Trainer Station",
    price: { min: 999.00, max: 3522.00 },
    description: "Your Gateway to Precision Aviation Training.",
    details: "SimFab's Trainer Station is focused on providing precise and exact replication of popular aircrafts with true to life controls placement in an ergonomically correct framework.",
    images: [
      { url: "/api/placeholder/600/400", alt: "Main cockpit view" },
      { url: "/api/placeholder/600/400", alt: "Side view" },
      { url: "/api/placeholder/600/400", alt: "Controls detail" },
      { url: "/api/placeholder/600/400", alt: "Seat detail" },
      { url: "/api/placeholder/600/400", alt: "Full setup" },
      { url: "/api/placeholder/600/400", alt: "Assembly view" }
    ],
    colors: [
      { id: "black", name: "Black", image: "/api/placeholder/80/80" },
      { id: "blue", name: "Blue", image: "/api/placeholder/80/80" },
      { id: "gray", name: "Gray", image: "/api/placeholder/80/80" },
      { id: "olive-green", name: "Olive Green", image: "/api/placeholder/80/80" }
    ],
    modelVariations: [
      {
        id: "base-configuration",
        name: "Base Cockpit Configuration",
        image: "/api/placeholder/300/200",
        description: "Standard cockpit setup with essential components"
      }
    ],
    dropdownVariations: [
      {
        id: "rudder-pedals",
        name: "What rudder pedals are you using?",
        options: [
          { id: "standard", name: "Standard Rudder Pedals", price: 0 },
          { id: "premium", name: "Premium Rudder Pedals", price: 150 },
          { id: "custom", name: "Custom Rudder Pedals", price: 300 }
        ]
      },
      {
        id: "yoke",
        name: "What yoke are you using?",
        options: [
          { id: "basic", name: "Basic Yoke", price: 0 },
          { id: "advanced", name: "Advanced Yoke", price: 250 },
          { id: "professional", name: "Professional Yoke", price: 500 }
        ]
      },
      {
        id: "throttle-quadrant",
        name: "What throttle quadrant are you using?",
        options: [
          { id: "single", name: "Single Throttle", price: 0 },
          { id: "dual", name: "Dual Throttle", price: 180 },
          { id: "quad", name: "Quad Throttle", price: 350 }
        ]
      }
    ],
    addons: [
      {
        id: "articulating-arm",
        name: "Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit",
        priceRange: { min: 199.00, max: 229.00 }
      },
      {
        id: "monitor-mount",
        name: "SimFab Single Monitor Mount Stand for Flight Sim & Sim Racing",
        price: 219.00,
        options: [
          {
            id: "single-mount",
            name: "Single Monitor Mount",
            image: "/api/placeholder/200/150",
            price: 219.00
          },
          {
            id: "triple-mount",
            name: "Triple Monitor Mount",
            image: "/api/placeholder/200/150",
            price: 399.00
          }
        ]
      }
    ],
    additionalDescriptions: [
      {
        title: "Triple Monitor Stand Variation Description",
        images: [
          "/api/placeholder/800/400",
          "/api/placeholder/800/400"
        ],
        description: "Choose between HD and LD variations for optimal monitor compatibility and setup flexibility."
      }
    ],
    faqs: [
      {
        question: "Can you use the Triple Monitor Stand for bigger monitors? What is the monitor weight limit?",
        answer: "The Triple Monitor Stand can support monitors up to 55 inches with a maximum weight of 35 lbs per monitor. For larger setups, we recommend our heavy-duty mounting brackets."
      }
    ],
    assemblyManuals: [
      {
        name: "Triple Monitor Mount Stand (HD)",
        image: "/api/placeholder/300/200",
        fileUrl: "/api/placeholder/document.pdf"
      },
      {
        name: "Triple Monitor Mount Stand (LD)",
        image: "/api/placeholder/300/200",
        fileUrl: "/api/placeholder/document.pdf"
      }
    ],
    specs: {
      weight: "73.6 lbs",
      dimensions: "37 x 23 x 16 in"
    },
    inStock: true
  };

  const handleDropdownVariationChange = (variationId: string, optionId: string) => {
    setSelectedDropdownVariations(prev => ({
      ...prev,
      [variationId]: optionId
    }));
  };

  const handleAddonToggle = (addonId: string) => {
    const newSelected = new Set(selectedAddons);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
      // Remove addon options when addon is deselected
      const newOptions = { ...selectedAddonOptions };
      delete newOptions[addonId];
      setSelectedAddonOptions(newOptions);
    } else {
      newSelected.add(addonId);
    }
    setSelectedAddons(newSelected);
  };

  const handleAddonOptionChange = (addonId: string, optionId: string) => {
    setSelectedAddonOptions(prev => ({
      ...prev,
      [addonId]: optionId
    }));
  };

  const calculateTotalPrice = () => {
    let total = product.price.min;
    
    // Add dropdown variation prices
    Object.entries(selectedDropdownVariations).forEach(([variationId, optionId]) => {
      const variation = product.dropdownVariations.find(v => v.id === variationId);
      const option = variation?.options.find(o => o.id === optionId);
      if (option?.price) {
        total += option.price;
      }
    });

    // Add addon prices
    selectedAddons.forEach(addonId => {
      const addon = product.addons.find(a => a.id === addonId);
      if (addon) {
        if (addon.price) {
          total += addon.price;
        } else if (selectedAddonOptions[addonId]) {
          const option = addon.options?.find(o => o.id === selectedAddonOptions[addonId]);
          if (option?.price) {
            total += option.price;
          }
        }
      }
    });

    return total;
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
          <span className="text-foreground">Flight Sim Cockpits</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Image Gallery */}
          <div className="lg:col-span-8">
            <ProductImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Product Info */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">{product.name}</h1>
              <p className="text-4xl font-bold">
                ${product.price.min.toFixed(2)} - ${product.price.max.toFixed(2)}
              </p>
              <p className="text-2xl font-bold text-muted-foreground mt-2">
                Current Total: ${calculateTotalPrice().toFixed(2)}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              <p className="text-sm text-muted-foreground">{product.details}</p>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <label className="text-lg font-medium">
                Choose Seat Color (Removable Foam) <span className="text-primary">*</span>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`relative p-2 rounded-lg border-2 transition-colors ${
                      selectedColor === color.id 
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
                    {selectedColor === color.id && (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>


            {/* Product Configuration */}
            <div className="space-y-6">
              <ProductVariations
                modelVariations={product.modelVariations}
                dropdownVariations={product.dropdownVariations}
                selectedModelVariation={selectedModelVariation}
                selectedDropdownVariations={selectedDropdownVariations}
                onModelVariationChange={setSelectedModelVariation}
                onDropdownVariationChange={handleDropdownVariationChange}
              />
              
              <ProductAddons
                addons={product.addons}
                selectedAddons={selectedAddons}
                selectedAddonOptions={selectedAddonOptions}
                onAddonToggle={handleAddonToggle}
                onAddonOptionChange={handleAddonOptionChange}
              />
            </div>

            {/* Stock Status */}
            <div className="text-green-400 font-medium">In stock</div>

            {/* Add to Cart */}
            <div className="space-y-4">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 text-lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                ADD TO CART
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

            {/* Product Specs */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span className="font-medium">{product.specs.weight}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-medium">{product.specs.dimensions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <ProductAdditionalInfo
          additionalDescriptions={product.additionalDescriptions}
          faqs={product.faqs}
          assemblyManuals={product.assemblyManuals}
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