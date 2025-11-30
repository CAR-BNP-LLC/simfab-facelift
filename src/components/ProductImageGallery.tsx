import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductImage {
  url: string;
  alt: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  selectedColorImageUrl?: string | null;
}

const ProductImageGallery = ({ images, productName, selectedColorImageUrl }: ProductImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(0);

  // Create a memoized images array that includes the selected color image if provided
  const displayImages = useMemo(() => {
    if (!selectedColorImageUrl) {
      return images;
    }

    // Check if the color image is already in the images array
    const existingIndex = images.findIndex(img => img.url === selectedColorImageUrl);
    
    if (existingIndex !== -1) {
      // Image already exists, return images as-is (we'll switch to it via selectedImage state)
      return images;
    }

    // Image doesn't exist, add it to the beginning of the array
    return [
      {
        url: selectedColorImageUrl,
        alt: `${productName} - Selected color`
      },
      ...images
    ];
  }, [images, selectedColorImageUrl, productName]);

  // Update selected image when color changes
  useEffect(() => {
    if (selectedColorImageUrl) {
      // Find the index of the color image in the display images
      const colorImageIndex = displayImages.findIndex(img => img.url === selectedColorImageUrl);
      if (colorImageIndex !== -1) {
        setSelectedImage(colorImageIndex);
      }
    }
  }, [selectedColorImageUrl, displayImages]);

  const handleNext = () => {
    if (!displayImages || displayImages.length === 0) return;
    setSelectedImage((prev) => (prev + 1) % displayImages.length);
  };

  const handlePrev = () => {
    if (!displayImages || displayImages.length === 0) return;
    setSelectedImage((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  // Handle no images case
  if (!displayImages || displayImages.length === 0) {
    return (
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <p className="text-white">No images available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 w-full">
      {/* Thumbnails (desktop only) */}
      <div className="hidden md:flex flex-col space-y-2">
        {displayImages.map((image, index) => (
          <button
            key={`${image.url}-${index}`}
            onClick={() => setSelectedImage(index)}
            className={`w-20 h-20 border-2 rounded-lg overflow-hidden transition-colors ${
              selectedImage === index ? 'border-primary' : 'border-border hover:border-muted-foreground'
            }`}
          >
            <img 
              src={image.url} 
              alt={image.alt}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="flex-1">
        <div
          className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={handleNext}
        >
          {/* Prev / Next arrows (visible especially on mobile where thumbnails are hidden) */}
          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <img
            src={displayImages[selectedImage]?.url}
            alt={displayImages[selectedImage]?.alt || productName}
            className="w-full h-auto max-h-[420px] md:max-h-[720px] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductImageGallery;