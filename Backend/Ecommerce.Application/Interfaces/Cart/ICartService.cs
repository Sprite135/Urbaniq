using Ecommerce.Application.DTOs.Cart;

namespace Ecommerce.Application.Interfaces.Cart
{
    /// <summary>
    /// Manages shopping cart operations for both authenticated and anonymous users.
    /// </summary>
    public interface ICartService
    {
        Task<CartResponseDto> GetCartAsync(Guid? userId = null, string? sessionId = null);
        Task<CartResponseDto> AddToCartAsync(Guid? userId, string? sessionId, AddToCartRequestDto dto);
        Task<bool> RemoveFromCartAsync(Guid? userId, string? sessionId, Guid cartItemId);
        Task<bool> IncreaseQuantityAsync(Guid? userId, string? sessionId, Guid cartItemId, int delta = 1);
        Task<bool> DecreaseQuantityAsync(Guid? userId, string? sessionId, Guid cartItemId, int delta = 1);
        Task MergeCartAsync(string sessionId, Guid userId);
    }
}
