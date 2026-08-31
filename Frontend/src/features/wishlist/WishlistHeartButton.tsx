import React from 'react';
import { Heart } from 'lucide-react';
import { useWishlistProduct } from './useWishlistProduct';

interface WishlistHeartButtonProps {
  productId: string;
  /** sm = product card, md = product detail page */
  size?: 'sm' | 'md';
  className?: string;
  stopLinkNavigation?: boolean;
}

const WishlistHeartButton: React.FC<WishlistHeartButtonProps> = ({
  productId,
  size = 'sm',
  className = '',
  stopLinkNavigation = false,
}) => {
  const { isWishlisted, isToggling, toggleWishlist } = useWishlistProduct(productId);

  const iconSize = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopLinkNavigation) {
      event.preventDefault();
      event.stopPropagation();
    }
    void toggleWishlist();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isToggling}
      aria-label={isWishlisted ? 'Quitar de la lista de deseos' : 'Agregar a la lista de deseos'}
      aria-pressed={isWishlisted}
      className={`transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className} ${
        isWishlisted ? 'text-red-500 hover:text-red-600' : ''
      }`}
    >
      <Heart
        className={`${iconSize} transition-colors ${
          isWishlisted ? 'fill-red-500 text-red-500' : 'fill-none'
        }`}
      />
    </button>
  );
};

export default WishlistHeartButton;
