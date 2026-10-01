import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import WishlistHeartButton from './WishlistHeartButton';

const toggleWishlist = vi.fn();

vi.mock('./useWishlistProduct', () => ({
  useWishlistProduct: () => ({
    isWishlisted: true,
    isToggling: false,
    toggleWishlist,
  }),
}));

describe('WishlistHeartButton', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders filled heart when wishlisted and toggles on click', () => {
    render(<WishlistHeartButton productId="prod-1" />);

    const button = screen.getByRole('button', { name: 'Quitar de la lista de deseos' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('text-red-500');

    fireEvent.click(button);
    expect(toggleWishlist).toHaveBeenCalledTimes(1);
  });

  it('stops link navigation when requested', () => {
    const parentClick = vi.fn((event: { defaultPrevented: boolean }) => {
      expect(event.defaultPrevented).toBe(true);
    });

    render(
      <a href="/product/test" onClick={parentClick}>
        <WishlistHeartButton productId="prod-1" stopLinkNavigation />
      </a>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Quitar de la lista de deseos' }));
    expect(toggleWishlist).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
