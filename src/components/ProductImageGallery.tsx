import { useState, useEffect, useMemo } from "react";

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
    <div className="flex gap-4">
      {/* Thumbnails */}
      <div className="flex flex-col space-y-2">
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
        <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <img 
            src={displayImages[selectedImage]?.url} 
            alt={displayImages[selectedImage]?.alt || productName}
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductImageGallery;