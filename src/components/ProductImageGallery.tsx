import { useState } from "react";

interface ProductImage {
  url: string;
  alt: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

const ProductImageGallery = ({ images, productName }: ProductImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(0);

  // Handle no images case
  if (!images || images.length === 0) {
    return (
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            <p className="text-muted-foreground">No images available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Thumbnails */}
      <div className="flex flex-col space-y-2">
        {images.map((image, index) => (
          <button
            key={index}
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
        <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          <img 
            src={images[selectedImage]?.url} 
            alt={images[selectedImage]?.alt || productName}
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductImageGallery;