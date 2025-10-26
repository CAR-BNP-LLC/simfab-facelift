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
  } = data || {};

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
