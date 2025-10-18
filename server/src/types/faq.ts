/**
 * FAQ Types
 * Type definitions for product FAQ management
 */

// ============================================================================
// CORE FAQ TYPES
// ============================================================================

export interface ProductFAQ {
  id: number;
  product_id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_active: string; // Database stores as '1' or '0'
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// CREATE/UPDATE TYPES (DTOs)
// ============================================================================

export interface CreateFAQDto {
  product_id: number;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: string; // '1' for active, '0' for inactive
}

export interface UpdateFAQDto {
  id: number;
  question?: string;
  answer?: string;
  sort_order?: number;
  is_active?: string; // '1' for active, '0' for inactive
}

export interface ReorderFAQsDto {
  product_id: number;
  faq_ids: number[]; // Array of FAQ IDs in desired order
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface FAQResponse {
  success: boolean;
  data?: ProductFAQ | ProductFAQ[];
  message?: string;
  error?: string;
}

export interface ReorderResponse {
  success: boolean;
  message?: string;
  error?: string;
}
