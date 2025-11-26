/**
 * Page Products Types
 * Type definitions for managing products displayed on specific pages
 */

export interface PageProduct {
  id: number;
  page_route: string;
  page_section: string;
  product_id: number | null;
  category_id: string | null;
  display_order: number;
  is_active: boolean;
  display_type: 'products' | 'category';
  max_items: number;
  created_at: Date;
  updated_at: Date;
}

export interface PageProductWithProduct extends PageProduct {
  product?: {
    id: number;
    name: string;
    slug: string;
    price_min: number | null;
    price_max: number | null;
    regular_price: number | null;
    sale_price: number | null;
    images: any[];
    status: string;
  };
}

export interface CreatePageProductDto {
  page_route: string;
  page_section: string;
  product_id: number;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdatePageProductDto {
  display_order?: number;
  is_active?: boolean;
}

export interface BulkPageProductDto {
  page_route: string;
  page_section: string;
  products: Array<{
    product_id: number;
    display_order: number;
    is_active: boolean;
  }>;
}

export interface SetCategoryDto {
  page_route: string;
  page_section: string;
  category_id: string;
  max_items?: number;
}

export interface PageConfiguration {
  pageRoute: string;
  pageName: string;
  sections: Array<{
    sectionKey: string;
    sectionName: string;
    productCount: number;
    displayType: 'products' | 'category';
    categoryId?: string | null;
    maxItems?: number;
  }>;
}

export interface PageSectionProducts {
  pageRoute: string;
  section: string;
  products: PageProductWithProduct[];
  displayType: 'products' | 'category';
  categoryId?: string | null;
  maxItems?: number;
}



