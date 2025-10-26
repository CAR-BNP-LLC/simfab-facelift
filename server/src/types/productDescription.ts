/**
 * Product Description Builder Types
 * Type definitions for dynamic product description components
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface ProductDescriptionComponent {
  id: number;
  product_id: number;
  component_type: ComponentType;
  content: ComponentContent;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ComponentType = 'text' | 'image' | 'two_column' | 'three_column' | 'full_width_image';

// ============================================================================
// COMPONENT CONTENT TYPES
// ============================================================================

export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TextBlockContent {
  heading?: string;
  headingSize?: 'xl' | '2xl' | '3xl' | '4xl';
  headingColor?: string;
  paragraph?: string; // HTML string with inline styles
  textColor?: string; // Default text color
  alignment?: 'left' | 'center' | 'right';
  padding?: Padding;
}

export interface ImageBlockContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  width?: 'small' | 'medium' | 'large' | 'full';
  alignment?: 'left' | 'center' | 'right';
  padding?: Padding;
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
  padding?: Padding;
}

export interface ThreeColumnItem {
  icon?: string;
  heading: string;
  text: string;
  iconColor?: string;
  textColor?: string;
}

export interface ThreeColumnContent {
  columns: [ThreeColumnItem, ThreeColumnItem, ThreeColumnItem];
  gap?: number;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  padding?: Padding;
}

export interface FullWidthImageContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  height?: 'small' | 'medium' | 'large' | 'auto';
  padding?: Padding;
}

// Union type for all component content
export type ComponentContent = 
  | TextBlockContent 
  | ImageBlockContent 
  | TwoColumnContent 
  | ThreeColumnContent 
  | FullWidthImageContent;

// ============================================================================
// DTOs FOR API OPERATIONS
// ============================================================================

export interface CreateComponentDto {
  component_type: ComponentType;
  content: ComponentContent;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateComponentDto {
  component_type?: ComponentType;
  content?: ComponentContent;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderComponentsDto {
  componentIds: number[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ComponentWithContent extends Omit<ProductDescriptionComponent, 'content'> {
  content: ComponentContent;
}

export interface GetComponentsResponse {
  success: boolean;
  data: ComponentWithContent[];
}

export interface CreateComponentResponse {
  success: boolean;
  data: ComponentWithContent;
  message: string;
}

export interface UpdateComponentResponse {
  success: boolean;
  data: ComponentWithContent;
  message: string;
}

export interface DeleteComponentResponse {
  success: boolean;
  message: string;
}

export interface ReorderComponentsResponse {
  success: boolean;
  message: string;
}

