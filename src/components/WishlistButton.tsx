import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: number;
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  variant = 'ghost',
  size = 'md',
  showLabel = false,
  className,
}) => {
  const { isInWishlist, addToWishlist, removeFromWishlist, loading } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isToggling, setIsToggling] = useState(false);

  const wishlisted = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isToggling || loading) return;

    try {
      setIsToggling(true);
      if (wishlisted) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isToggling || loading}
        className={cn(
          'relative rounded-full p-2 transition-colors',
          wishlisted
            ? 'text-red-500 hover:text-red-600'
            : 'text-muted-foreground hover:text-foreground',
          isToggling && 'opacity-50 cursor-not-allowed',
          className
        )}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={cn(
            sizeClasses[size],
            wishlisted ? 'fill-current' : 'fill-none'
          )}
        />
        {isToggling && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
      </button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isToggling || loading}
      className={cn(
        wishlisted && 'text-red-500 hover:text-red-600',
        className
      )}
    >
      <Heart
        className={cn(
          'mr-2 h-4 w-4',
          wishlisted ? 'fill-current' : 'fill-none'
        )}
      />
      {showLabel && (wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist')}
    </Button>
  );
};

