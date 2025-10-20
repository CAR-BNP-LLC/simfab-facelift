import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermittedForProps {
  /**
   * Single authority required to show content
   */
  authority?: string;
  
  /**
   * Array of authorities - user needs at least one
   */
  anyOf?: string[];
  
  /**
   * Array of authorities - user needs all of them
   */
  allOf?: string[];
  
  /**
   * Content to render if user has the required authorities
   */
  children: React.ReactNode;
  
  /**
   * Optional fallback content to render if user lacks required authorities
   * If not provided, nothing is rendered (null)
   */
  fallback?: React.ReactNode;
}

/**
 * PermittedFor Component
 * 
 * Conditionally renders children based on user's authorities.
 * Supports three modes:
 * - authority: single authority required
 * - anyOf: user needs at least one of the specified authorities
 * - allOf: user needs all of the specified authorities
 * 
 * If no authorities are specified, content is shown to all authenticated users.
 * If user lacks required authorities, fallback content is shown (or nothing if no fallback).
 * 
 * @example
 * // Single authority
 * <PermittedFor authority="products:edit">
 *   <EditButton />
 * </PermittedFor>
 * 
 * // Any of multiple authorities
 * <PermittedFor anyOf={["products:edit", "products:create"]}>
 *   <ProductActions />
 * </PermittedFor>
 * 
 * // All authorities required
 * <PermittedFor allOf={["dashboard:view", "orders:view"]}>
 *   <AdminPanel />
 * </PermittedFor>
 * 
 * // With fallback
 * <PermittedFor authority="products:delete" fallback={<span>No permission to delete</span>}>
 *   <DeleteButton />
 * </PermittedFor>
 */
export const PermittedFor: React.FC<PermittedForProps> = ({
  authority,
  anyOf,
  allOf,
  children,
  fallback = null,
}) => {
  const { hasAuthority, hasAnyAuthority, hasAllAuthorities, isAuthenticated } = useAuth();

  // If user is not authenticated, show nothing
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // If no authorities specified, show content to all authenticated users
  if (!authority && !anyOf && !allOf) {
    return <>{children}</>;
  }

  // Check single authority
  if (authority) {
    return hasAuthority(authority) ? <>{children}</> : <>{fallback}</>;
  }

  // Check any of authorities
  if (anyOf && anyOf.length > 0) {
    return hasAnyAuthority(...anyOf) ? <>{children}</> : <>{fallback}</>;
  }

  // Check all authorities
  if (allOf && allOf.length > 0) {
    return hasAllAuthorities(...allOf) ? <>{children}</> : <>{fallback}</>;
  }

  // Default: show content
  return <>{children}</>;
};

export default PermittedFor;
