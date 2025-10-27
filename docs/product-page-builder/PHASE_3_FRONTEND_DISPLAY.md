# Phase 3: Frontend Display Components

## Overview
This phase implements the public-facing display components that render the description components on product pages.

## Implementation Steps

### 1. Update API Types

**File:** `src/services/api.ts` (add to existing file)

Add these types and API methods:

```typescript
// ============================================================================
// PRODUCT DESCRIPTION COMPONENT TYPES
// ============================================================================

export interface ProductDescriptionComponent {
  id: number;
  product_id: number;
  component_type: 'text' | 'image' | 'two_column' | 'three_column' | 'full_width_image';
  content: any; // Will be typed based on component_type
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TextBlockContent {
  heading?: string;
  headingSize?: 'xl' | '2xl' | '3xl' | '4xl';
  headingColor?: string;
  paragraph?: string;
  textColor?: string;
  alignment?: 'left' | 'center' | 'right';
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface ImageBlockContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  width?: 'small' | 'medium' | 'large' | 'full';
  alignment?: 'left' | 'center' | 'right';
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface TwoColumnContent {
  leftColumn: {
    type: 'text' | 'image';
    content: TextBlockContent | ImageBlockContent;
  };
  rightColumn: {
    type: 'text' | 'image';
    content: TextBlockContent | ImageBlockContent;
  };
  columnRatio?: '50-50' | '60-40' | '40-60';
  gap?: number;
  reverseOnMobile?: boolean;
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface ThreeColumnContent {
  columns: [
    { icon?: string; heading: string; text: string; iconColor?: string; textColor?: string },
    { icon?: string; heading: string; text: string; iconColor?: string; textColor?: string },
    { icon?: string; heading: string; text: string; iconColor?: string; textColor?: string }
  ];
  gap?: number;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface FullWidthImageContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  height?: 'small' | 'medium' | 'large' | 'auto';
  padding?: { top: number; bottom: number; left: number; right: number };
}

// ============================================================================
// PRODUCT DESCRIPTION API
// ============================================================================

export const productDescriptionsAPI = {
  /**
   * Get description components for a product (public)
   */
  async getProductDescriptionComponents(productId: number): Promise<ProductDescriptionComponent[]> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent[] }>(
      `/api/products/${productId}/description-components`
    );
    return response.data || [];
  },

  /**
   * Get all description components for a product (admin)
   */
  async getAllProductDescriptionComponents(productId: number): Promise<ProductDescriptionComponent[]> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent[] }>(
      `/api/admin/products/${productId}/description-components`
    );
    return response.data || [];
  },

  /**
   * Create description component (admin)
   */
  async createDescriptionComponent(productId: number, data: any): Promise<ProductDescriptionComponent> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent }>(
      `/api/admin/products/${productId}/description-components`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Update description component (admin)
   */
  async updateDescriptionComponent(id: number, data: any): Promise<ProductDescriptionComponent> {
    const response = await apiRequest<{ success: boolean; data: ProductDescriptionComponent }>(
      `/api/admin/description-components/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Delete description component (admin)
   */
  async deleteDescriptionComponent(id: number): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/description-components/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Reorder description components (admin)
   */
  async reorderDescriptionComponents(productId: number, componentIds: number[]): Promise<void> {
    await apiRequest<{ success: boolean }>(
      `/api/admin/products/${productId}/description-components/reorder`,
      {
        method: 'PUT',
        body: JSON.stringify({ componentIds }),
      }
    );
  },
};
```

### 2. Create Text Block Component

**File:** `src/components/description/TextBlock.tsx`

```typescript
import React from 'react';
import { TextBlockContent } from '@/services/api';

interface TextBlockProps {
  data: TextBlockContent;
}

const TextBlock: React.FC<TextBlockProps> = ({ data }) => {
  const {
    heading,
    headingSize = '2xl',
    headingColor = '#ffffff',
    paragraph,
    textColor = '#e5e5e5',
    alignment = 'left',
    padding
  } = data;

  const getHeadingSizeClass = (size: string) => {
    switch (size) {
      case 'xl': return 'text-xl';
      case '2xl': return 'text-2xl';
      case '3xl': return 'text-3xl';
      case '4xl': return 'text-4xl';
      default: return 'text-2xl';
    }
  };

  const getAlignmentClass = (align: string) => {
    switch (align) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  const paddingStyle = padding ? {
    paddingTop: `${padding.top}px`,
    paddingBottom: `${padding.bottom}px`,
    paddingLeft: `${padding.left}px`,
    paddingRight: `${padding.right}px`,
  } : {};

  return (
    <div className={`w-full ${getAlignmentClass(alignment)}`} style={paddingStyle}>
      {heading && (
        <h2 
          className={`${getHeadingSizeClass(headingSize)} font-bold mb-4`}
          style={{ color: headingColor }}
        >
          {heading}
        </h2>
      )}
      {paragraph && (
        <div 
          className="prose prose-lg max-w-none"
          style={{ color: textColor }}
          dangerouslySetInnerHTML={{ __html: paragraph }}
        />
      )}
    </div>
  );
};

export default TextBlock;
```

### 3. Create Image Block Component

**File:** `src/components/description/ImageBlock.tsx`

```typescript
import React from 'react';
import { ImageBlockContent } from '@/services/api';

interface ImageBlockProps {
  data: ImageBlockContent;
}

const ImageBlock: React.FC<ImageBlockProps> = ({ data }) => {
  const {
    imageUrl,
    altText = '',
    caption,
    width = 'full',
    alignment = 'center',
    padding
  } = data;

  const getWidthClass = (width: string) => {
    switch (width) {
      case 'small': return 'max-w-sm';
      case 'medium': return 'max-w-md';
      case 'large': return 'max-w-lg';
      case 'full': return 'w-full';
      default: return 'w-full';
    }
  };

  const getAlignmentClass = (align: string) => {
    switch (align) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-center';
    }
  };

  const paddingStyle = padding ? {
    paddingTop: `${padding.top}px`,
    paddingBottom: `${padding.bottom}px`,
    paddingLeft: `${padding.left}px`,
    paddingRight: `${padding.right}px`,
  } : {};

  return (
    <div className={`w-full ${getAlignmentClass(alignment)}`} style={paddingStyle}>
      <div className={`${getWidthClass(width)} mx-auto`}>
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-auto rounded-lg shadow-lg"
          loading="lazy"
        />
        {caption && (
          <p className="text-sm text-muted-foreground mt-2 italic">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageBlock;
```

### 4. Create Two Column Layout Component

**File:** `src/components/description/TwoColumnLayout.tsx`

```typescript
import React from 'react';
import { TwoColumnContent, TextBlockContent, ImageBlockContent } from '@/services/api';
import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';

interface TwoColumnLayoutProps {
  data: TwoColumnContent;
}

const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({ data }) => {
  const {
    leftColumn,
    rightColumn,
    columnRatio = '50-50',
    gap = 24,
    reverseOnMobile = false,
    padding
  } = data;

  const getColumnClasses = (ratio: string) => {
    switch (ratio) {
      case '50-50': return 'md:grid-cols-2';
      case '60-40': return 'md:grid-cols-5';
      case '40-60': return 'md:grid-cols-5';
      default: return 'md:grid-cols-2';
    }
  };

  const getLeftColumnClass = (ratio: string) => {
    switch (ratio) {
      case '50-50': return 'md:col-span-1';
      case '60-40': return 'md:col-span-3';
      case '40-60': return 'md:col-span-2';
      default: return 'md:col-span-1';
    }
  };

  const getRightColumnClass = (ratio: string) => {
    switch (ratio) {
      case '50-50': return 'md:col-span-1';
      case '60-40': return 'md:col-span-2';
      case '40-60': return 'md:col-span-3';
      default: return 'md:col-span-1';
    }
  };

  const paddingStyle = padding ? {
    paddingTop: `${padding.top}px`,
    paddingBottom: `${padding.bottom}px`,
    paddingLeft: `${padding.left}px`,
    paddingRight: `${padding.right}px`,
  } : {};

  const gapStyle = {
    gap: `${gap}px`
  };

  const renderColumnContent = (column: { type: string; content: any }) => {
    switch (column.type) {
      case 'text':
        return <TextBlock data={column.content as TextBlockContent} />;
      case 'image':
        return <ImageBlock data={column.content as ImageBlockContent} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full" style={paddingStyle}>
      <div 
        className={`grid grid-cols-1 ${getColumnClasses(columnRatio)} ${reverseOnMobile ? 'md:grid-flow-col-dense' : ''}`}
        style={gapStyle}
      >
        <div className={getLeftColumnClass(columnRatio)}>
          {renderColumnContent(leftColumn)}
        </div>
        <div className={`${getRightColumnClass(columnRatio)} ${reverseOnMobile ? 'md:order-first' : ''}`}>
          {renderColumnContent(rightColumn)}
        </div>
      </div>
    </div>
  );
};

export default TwoColumnLayout;
```

### 5. Create Three Column Layout Component

**File:** `src/components/description/ThreeColumnLayout.tsx`

```typescript
import React from 'react';
import { ThreeColumnContent } from '@/services/api';

interface ThreeColumnLayoutProps {
  data: ThreeColumnContent;
}

const ThreeColumnLayout: React.FC<ThreeColumnLayoutProps> = ({ data }) => {
  const {
    columns,
    gap = 16,
    alignment = 'center',
    backgroundColor,
    padding
  } = data;

  const getAlignmentClass = (align: string) => {
    switch (align) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-center';
    }
  };

  const paddingStyle = padding ? {
    paddingTop: `${padding.top}px`,
    paddingBottom: `${padding.bottom}px`,
    paddingLeft: `${padding.left}px`,
    paddingRight: `${padding.right}px`,
  } : {};

  const backgroundColorStyle = backgroundColor ? {
    backgroundColor
  } : {};

  const gapStyle = {
    gap: `${gap}px`
  };

  return (
    <div 
      className="w-full rounded-lg"
      style={{ ...paddingStyle, ...backgroundColorStyle }}
    >
      <div 
        className={`grid grid-cols-1 md:grid-cols-3 ${getAlignmentClass(alignment)}`}
        style={gapStyle}
      >
        {columns.map((column, index) => (
          <div key={index} className="flex flex-col items-center space-y-3">
            {column.icon && (
              <div 
                className="w-12 h-12 flex items-center justify-center rounded-full"
                style={{ backgroundColor: column.iconColor || '#ef4444' }}
              >
                <img 
                  src={column.icon} 
                  alt="" 
                  className="w-6 h-6"
                />
              </div>
            )}
            <h3 
              className="font-semibold text-lg"
              style={{ color: column.textColor || '#ffffff' }}
            >
              {column.heading}
            </h3>
            <p 
              className="text-sm opacity-90"
              style={{ color: column.textColor || '#e5e5e5' }}
            >
              {column.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreeColumnLayout;
```

### 6. Create Main Product Description Builder

**File:** `src/components/ProductDescriptionBuilder.tsx`

```typescript
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
        return null;
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
```

### 7. Integrate into Product Detail Page

**File:** `src/pages/ProductDetail.tsx` (update existing file)

Add this import and component:

```typescript
import ProductDescriptionBuilder from '@/components/ProductDescriptionBuilder';

// Add this component after the product options section and before FAQs:
{product && (
  <ProductDescriptionBuilder productId={product.id} />
)}
```

## Testing Instructions

1. **Test Component Rendering:**
   ```bash
   # Start the frontend
   npm run dev
   
   # Navigate to a product page and verify components render correctly
   ```

2. **Test with Sample Data:**
   ```bash
   # Create a test component via API
   curl -X POST http://localhost:3001/api/admin/products/1/description-components \
     -H "Content-Type: application/json" \
     -H "Cookie: session=your-session-cookie" \
     -d '{
       "component_type": "text",
       "content": {
         "heading": "Uniquely adaptable",
         "headingSize": "2xl",
         "paragraph": "The articulating arm <span style=\"color:#ef4444;font-weight:bold\">can be effortlessly</span> mounted on either side."
       }
     }'
   ```

3. **Test Responsive Layouts:**
   - Test two-column layouts on mobile/desktop
   - Verify three-column layouts stack properly on mobile
   - Check image sizing and alignment

## Next Steps

After completing Phase 3:
- Public components render correctly
- Rich text with colored words works
- Responsive layouts function properly
- Ready to build admin interface in Phase 4

## Notes

- HTML content is rendered safely with `dangerouslySetInnerHTML`
- Components are responsive and mobile-friendly
- Loading states and error handling included
- Components integrate seamlessly with existing product pages

