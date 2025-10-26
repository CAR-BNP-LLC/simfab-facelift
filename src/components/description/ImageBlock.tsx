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
  } = data || {};

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

  if (!imageUrl) {
    return (
      <div className={`w-full ${getAlignmentClass(alignment)}`} style={paddingStyle}>
        <div className="text-muted-foreground text-sm p-4 border border-dashed rounded-lg">
          No image URL provided
        </div>
      </div>
    );
  }

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
