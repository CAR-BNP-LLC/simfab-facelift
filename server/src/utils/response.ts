import { Response } from 'express';

/**
 * Standard success response format
 */
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Paginated response format
 */
interface PaginatedResponse<T = any> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
  message?: string;
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message })
  };
  res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): void => {
  sendSuccess(res, data, message, 201);
};

/**
 * Send paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): void => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  const response: PaginatedResponse<T> = {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrevious
      }
    },
    ...(message && { message })
  };

  res.status(200).json(response);
};

/**
 * Send no content response (204)
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

/**
 * Parse pagination parameters from request query
 */
export const parsePagination = (query: any): { page: number; limit: number; offset: number } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20)); // Max 100 items per page
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Parse sort parameters from request query
 */
export const parseSort = (query: any, defaultSort: string = 'created_at', defaultOrder: 'asc' | 'desc' = 'desc'): { sortBy: string; sortOrder: 'asc' | 'desc' } => {
  const sortBy = query.sortBy || defaultSort;
  const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : defaultOrder;

  return { sortBy, sortOrder };
};

/**
 * Sanitize SQL ORDER BY clause
 */
export const sanitizeOrderBy = (sortBy: string, allowedFields: string[]): string => {
  if (!allowedFields.includes(sortBy)) {
    return allowedFields[0]; // Return default field
  }
  return sortBy;
};

/**
 * Helper functions for controllers (return objects instead of sending response)
 */

/**
 * Create success response object
 */
export const successResponse = <T>(
  data: T,
  message?: string
): SuccessResponse<T> => {
  return {
    success: true,
    data,
    ...(message && { message })
  };
};

/**
 * Create paginated response object
 */
export const paginatedResponse = <T>(
  items: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  },
  additionalData?: any
): any => {
  return {
    success: true,
    data: {
      [Array.isArray(items) ? 'products' : 'items']: items,
      pagination,
      ...additionalData
    }
  };
};

