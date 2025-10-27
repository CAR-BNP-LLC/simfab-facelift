import React from 'react';
import { TwoColumnContent, TextBlockContent, ImageBlockContent } from '@/services/api';
import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';

interface TwoColumnLayoutProps {
  data: TwoColumnContent;
}

const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({ data }) => {
  // Provide default values and null checks
  const {
    leftColumn = { type: 'text', content: {} },
    rightColumn = { type: 'text', content: {} },
    columnRatio = '50-50',
    gap = 24,
    reverseOnMobile = false,
    padding
  } = data || {};

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
    if (!column || !column.type) {
      return <div className="text-muted-foreground text-sm">Empty column</div>;
    }
    
    switch (column.type) {
      case 'text':
        return <TextBlock data={column.content as TextBlockContent} />;
      case 'image':
        return <ImageBlock data={column.content as ImageBlockContent} />;
      default:
        return <div className="text-muted-foreground text-sm">Unknown column type</div>;
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
