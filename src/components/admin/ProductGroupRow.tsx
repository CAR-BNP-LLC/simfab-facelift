import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit, Trash2, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import PermittedFor from '@/components/auth/PermittedFor';

interface ProductGroupRowProps {
  groupId: string;
  products: any[];
  isExpanded: boolean;
  onToggle: () => void;
  onEditProduct: (product: any) => void;
  onEditGroup: (products: any[]) => void;
  onDeleteProduct: (productId: number) => void;
  onBreakGroup: (groupId: string) => void;
  stockMismatchMap: Record<number, boolean>;
}

const ProductGroupRow = ({
  groupId,
  products,
  isExpanded,
  onToggle,
  onEditProduct,
  onEditGroup,
  onDeleteProduct,
  onBreakGroup,
  stockMismatchMap
}: ProductGroupRowProps) => {
  if (products.length === 0) return null;

  const [usProduct] = products.filter(p => p.region === 'us');
  const [euProduct] = products.filter(p => p.region === 'eu');
  const mainProduct = usProduct || euProduct || products[0];

  // Calculate aggregate values
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const avgPrice = products.reduce((sum, p) => sum + (parseFloat(p.regular_price) || 0), 0) / products.length;
  const allActive = products.every(p => p.status === 'active');
  const allFeatured = products.every(p => p.featured);
  const hasSale = products.some(p => p.is_on_sale);

  return (
    <>
      {/* Group Header Row */}
      <tr className="border-b border-border bg-muted/30 hover:bg-muted/50 cursor-pointer" onClick={onToggle}>
        <td className="py-3 px-2">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Link2 className="h-4 w-4 text-blue-600" />
            <span className="font-mono text-sm">{mainProduct.sku}</span>
            {mainProduct.slug && (
              <Link 
                to={`/product/${mainProduct.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{mainProduct.name}</p>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
              <Link2 className="w-3 h-3 mr-1" />
              Linked Group
            </Badge>
            {hasSale && (
              <Badge variant="destructive" className="text-xs">
                SALE
              </Badge>
            )}
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-col gap-1">
            <span>${avgPrice.toFixed(2)}</span>
            {hasSale && (
              <span className="text-xs text-muted-foreground">Avg price</span>
            )}
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-col gap-1">
            <Badge variant={totalStock > 0 ? 'default' : 'destructive'}>
              {totalStock} total
            </Badge>
            <div className="flex gap-1 text-xs text-muted-foreground">
              {usProduct && <span>US: {usProduct.stock}</span>}
              {euProduct && <span>EU: {euProduct.stock}</span>}
            </div>
          </div>
        </td>
        <td className="py-3 px-2">
          <Badge variant={allActive ? 'default' : 'secondary'}>
            {allActive ? 'active' : 'mixed'}
          </Badge>
        </td>
        <td className="py-3 px-2">
          {allFeatured ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
        <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <PermittedFor authority="products:edit">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEditGroup(products)}
                title="Edit Group (both products)"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </PermittedFor>
            <PermittedFor authority="products:edit">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onBreakGroup(groupId)}
                title="Break Group"
              >
                <Unlink className="h-4 w-4 text-orange-600" />
              </Button>
            </PermittedFor>
          </div>
        </td>
      </tr>

      {/* Expanded Individual Products */}
      {isExpanded && products.map((product) => (
        <tr key={product.id} className="border-b border-border bg-muted/10 hover:bg-muted/30">
          <td className="py-3 px-2 pl-10">
            <div className="flex items-center gap-2 group">
              <span className="font-mono text-sm group-hover:text-primary transition-colors">
                {product.sku}
              </span>
              {product.slug && (
                <Link 
                  to={`/product/${product.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="View product page"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </td>
          <td className="py-3 px-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{product.name}</p>
              {product.region && (
                <Badge 
                  className={`text-xs font-semibold cursor-default pointer-events-none ${
                    product.region === 'us' 
                      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700' 
                      : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700'
                  }`}
                >
                  {product.region.toUpperCase()}
                </Badge>
              )}
              {stockMismatchMap[product.id] && (
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                  Stock mismatch
                </Badge>
              )}
              {product.is_on_sale && (
                <Badge variant="destructive" className="text-xs">
                  SALE
                </Badge>
              )}
            </div>
          </td>
          <td className="py-3 px-2">
            <div className="flex flex-col gap-1">
              {product.is_on_sale && product.sale_price ? (
                <>
                  <span className="font-bold text-destructive">
                    ${parseFloat(product.sale_price.toString()).toFixed(2)}
                  </span>
                  <span className="text-xs line-through text-muted-foreground">
                    ${product.regular_price ? parseFloat(product.regular_price.toString()).toFixed(2) : '0.00'}
                  </span>
                </>
              ) : (
                <span>${product.regular_price ? parseFloat(product.regular_price.toString()).toFixed(2) : '0.00'}</span>
              )}
            </div>
          </td>
          <td className="py-3 px-2">
            <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
              {product.stock}
            </Badge>
          </td>
          <td className="py-3 px-2">
            <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
              {product.status}
            </Badge>
          </td>
          <td className="py-3 px-2">
            {product.featured ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
          </td>
          <td className="py-3 px-2">
            <div className="flex gap-2">
              <PermittedFor authority="products:edit">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onEditProduct(product)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </PermittedFor>
              <PermittedFor authority="products:delete">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onDeleteProduct(product.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </PermittedFor>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export default ProductGroupRow;

