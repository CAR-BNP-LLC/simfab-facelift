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
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          <img 
            src={images[selectedImage]?.url} 
            alt={images[selectedImage]?.alt || productName}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductImageGallery;