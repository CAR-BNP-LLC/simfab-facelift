import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Heart, ShoppingCart, Truck, Shield, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("black");
  const [selectedOption, setSelectedOption] = useState("");

  // Mock product data - in real app, fetch based on id
  const product = {
    id: id || "dcs-flight-sim",
    name: "SimFab DCS Flight Sim Modular Cockpit",
    price: 599.00,
    description: "Get ready to take your space or combat simulation to new heights with SimFab's DCS Edition Modular Combat Sim Cockpit. Designed to meet the needs of the most discerning virtual pilots, this comprehensive cockpit system offers a world of immersive possibilities.",
    details: "DCS edition cockpit includes: seat with cutout, seat risers, seat frame, rudder pedal plate assembly, side by side HOTAS style stick and throttle brackets with adapter plates type B and type C, centered stick lower mount bracket with adapter plates type C. Refer to product detailed description below for controls compatibility and options.",
    additionalInfo: "Exchange of default adapter plates is available at no additional cost. Available additional adapter plates with quick 'hot swap' when multiple controls are being used.",
    images: [
      "/api/placeholder/600/400",
      "/api/placeholder/600/400", 
      "/api/placeholder/600/400",
      "/api/placeholder/600/400",
      "/api/placeholder/600/400",
      "/api/placeholder/600/400"
    ],
    colors: [
      { id: "black", name: "Black", image: "/api/placeholder/80/80" },
      { id: "blue", name: "Blue", image: "/api/placeholder/80/80" },
      { id: "gray", name: "Gray", image: "/api/placeholder/80/80" },
      { id: "green", name: "Green", image: "/api/placeholder/80/80" },
      { id: "olive-green", name: "Olive Green", image: "/api/placeholder/80/80" },
      { id: "orange", name: "Orange", image: "/api/placeholder/80/80" },
      { id: "red", name: "Red", image: "/api/placeholder/80/80" },
      { id: "yellow", name: "Yellow", image: "/api/placeholder/80/80" }
    ],
    options: [
      "Standard center stick lower mount bracket",
      "Retrofit kit for control loaded stick bases Rhino and Moza AB9",
      "Extended HOTAS mount bracket system",
      "Custom adapter plate configuration"
    ],
    specs: {
      weight: "73.6 lbs",
      dimensions: "37 x 23 x 16 in"
    },
    inStock: true
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
            <div className="flex gap-4">
              {/* Thumbnails */}
              <div className="flex flex-col space-y-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 border-2 rounded-lg overflow-hidden transition-colors ${
                      selectedImage === index ? 'border-primary' : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <img 
                      src={image} 
                      alt={`Product view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Main Image */}
              <div className="flex-1">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={product.images[selectedImage]} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">{product.name}</h1>
              <p className="text-4xl font-bold">${product.price.toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              <p className="text-sm text-muted-foreground">{product.details}</p>
              <p className="text-sm text-muted-foreground">{product.additionalInfo}</p>
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

            {/* Options Selection */}
            <div className="space-y-3">
              <label className="text-lg font-medium">
                Select an option: <span className="text-primary">*</span>
              </label>
              <Select value={selectedOption} onValueChange={setSelectedOption}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Standard center stick lower mount bracket" />
                </SelectTrigger>
                <SelectContent>
                  {product.options.map((option, index) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Status */}
            <div className="text-green-400 font-medium">In stock</div>

            {/* Hybrid Cockpit Label */}
            <div className="text-xl font-bold text-muted-foreground">Hybrid cockpit</div>

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
              <div className="space-y-1">
                <span className="text-muted-foreground">Select an option:</span>
                <p className="text-sm font-medium">
                  Standard center stick lower mount bracket, Retrofit kit for control loaded stick bases Rhino and Moza AB9
                </p>
              </div>
            </div>
          </div>
        </div>

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