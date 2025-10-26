import React, { useState, useEffect } from 'react';
import { ProductDescriptionComponent } from '@/services/api';
import { productDescriptionsAPI } from '@/services/api';
import TextBlock from './description/TextBlock';
import ImageBlock from './description/ImageBlock';
import TwoColumnLayout from './description/TwoColumnLayout';
import ThreeColumnLayout from './description/ThreeColumnLayout';

interface ProductDescriptionBuilderProps {
  productId: number;
}

const ProductDescriptionBuilder: React.FC<ProductDescriptionBuilderProps> = ({ productId }) => {
  const [components, setComponents] = useState<ProductDescriptionComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        const productComponents = await productDescriptionsAPI.getProductDescriptionComponents(productId);
        setComponents(productComponents);
      } catch (err) {
        console.error('Error loading description components:', err);
        setError('Failed to load product description');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadComponents();
    }
  }, [productId]);

  const renderComponent = (component: ProductDescriptionComponent) => {
    try {
      switch (component.component_type) {
        case 'text':
          return <TextBlock key={component.id} data={component.content} />;
        case 'image':
          return <ImageBlock key={component.id} data={component.content} />;
        case 'two_column':
          return <TwoColumnLayout key={component.id} data={component.content} />;
        case 'three_column':
          return <ThreeColumnLayout key={component.id} data={component.content} />;
        case 'full_width_image':
          return <ImageBlock key={component.id} data={{ ...component.content, width: 'full' }} />;
        default:
          console.warn(`Unknown component type: ${component.component_type}`);
          return (
            <div key={component.id} className="p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
              Unknown component type: {component.component_type}
            </div>
          );
      }
    } catch (error) {
      console.error(`Error rendering component ${component.id}:`, error);
      return (
        <div key={component.id} className="p-4 border border-red-200 rounded-lg text-red-600 text-sm">
          Error rendering component
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="mt-16">
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-16">
        <div className="text-center text-muted-foreground">
          <p>Unable to load product description</p>
        </div>
      </div>
    );
  }

  if (components.length === 0) {
    return null; // Don't show anything if no components
  }

  return (
    <div className="mt-16 space-y-12">
      {components.map(renderComponent)}
    </div>
  );
};

export default ProductDescriptionBuilder;
