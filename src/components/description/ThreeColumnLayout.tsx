import React from 'react';
import { ThreeColumnContent } from '@/services/api';

interface ThreeColumnLayoutProps {
  data: ThreeColumnContent;
}

const ThreeColumnLayout: React.FC<ThreeColumnLayoutProps> = ({ data }) => {
  const {
    columns = [],
    gap = 16,
    alignment = 'center',
    backgroundColor,
    padding
  } = data || {};

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
