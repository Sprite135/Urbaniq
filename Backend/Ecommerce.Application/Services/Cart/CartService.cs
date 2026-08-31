using AutoMapper;
using Ecommerce.Application.Common.ProductOptions;
using Ecommerce.Application.DTOs.Cart;
using Ecommerce.Application.Interfaces.Cart;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Application.Services.Cart
{
    public class CartService : ICartService
    {
        private const int MaxQuantity = 10;
        private readonly IRepository<Domain.Entities.Cart> _cartRepo;
        private readonly IRepository<CartItem> _cartItemRepo;
        private readonly IRepository<Product> _productRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<CartService> _logger;

        public CartService(
            IRepository<Domain.Entities.Cart> cartRepo,
            IRepository<CartItem> cartItemRepo,
            IRepository<Product> productRepo,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<CartService> logger)
        {
            _cartRepo = cartRepo;
            _cartItemRepo = cartItemRepo;
            _productRepo = productRepo;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        private async Task<Domain.Entities.Cart> GetOrCreateCartAsync(Guid? userId, string? sessionId)
        {
            Domain.Entities.Cart cart = null;

            if (userId.HasValue)
            {
                cart = await _cartRepo.Query()
                    .Include(c => c.CartItems).ThenInclude(ci => ci.Product)
                    .Include(c => c.CartItems).ThenInclude(ci => ci.ProductVariant)
                    .FirstOrDefaultAsync(c => c.UserId == userId.Value);
            }
            else if (!string.IsNullOrEmpty(sessionId))
            {
                cart = await _cartRepo.Query()
                    .Include(c => c.CartItems).ThenInclude(ci => ci.Product)
                    .Include(c => c.CartItems).ThenInclude(ci => ci.ProductVariant)
                    .FirstOrDefaultAsync(c => c.SessionId == sessionId);
            }

            if (cart == null)
            {
                cart = new Domain.Entities.Cart
                {
                    CartId = Guid.NewGuid(),
                    UserId = userId,
                    SessionId = sessionId
                };
                await _cartRepo.AddAsync(cart);
                await _unitOfWork.SaveChangesAsync();
            }

            return cart;
        }

        public async Task<CartResponseDto> GetCartAsync(Guid? userId = null, string? sessionId = null)
        {
            if (!userId.HasValue && string.IsNullOrEmpty(sessionId))
            {
                return new CartResponseDto
                {
                    CartId = Guid.Empty,
                    Items = new List<CartItemResponseDto>()
                };
            }

            var cart = await GetOrCreateCartAsync(userId, sessionId);
            return _mapper.Map<CartResponseDto>(cart);
        }

        public async Task<CartResponseDto> AddToCartAsync(Guid? userId, string? sessionId, AddToCartRequestDto dto)
        {
            if (!userId.HasValue && string.IsNullOrEmpty(sessionId))
                throw new ArgumentException("Either userId or sessionId must be provided");

            if (dto == null) throw new ArgumentNullException(nameof(dto));

            var product = await _productRepo.Query()
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Id == dto.ProductId);
            if (product == null) throw new ArgumentException("Product not found", nameof(dto.ProductId));

            var variant = product.Variants.FirstOrDefault(v => v.Id == dto.ProductVariantId);
            if (variant == null) throw new ArgumentException("Selected product variant was not found.", nameof(dto.ProductVariantId));

            if (!string.IsNullOrWhiteSpace(dto.DeliveryCode))
            {
                ValidateSelection(product, dto.DeliveryCode);
            }

            var cart = await GetOrCreateCartAsync(userId, sessionId);

            var requestedQuantity = Math.Max(1, dto.Quantity);
            var normalizedCode = string.IsNullOrWhiteSpace(dto.DeliveryCode)
                ? string.Empty
                : dto.DeliveryCode.Trim();
            var existing = cart.CartItems.FirstOrDefault(ci => ci.ProductVariantId == dto.ProductVariantId);

            var currentVariantQuantityInCart = cart.CartItems
                .Where(ci => ci.ProductVariantId == dto.ProductVariantId)
                .Sum(ci => ci.Quantity);

            if (currentVariantQuantityInCart + requestedQuantity > variant.Quantity)
            {
                throw new ArgumentException($"Only {variant.Quantity} unit(s) are currently available for this size and color.");
            }

            if (existing == null)
            {
                var newItem = new CartItem
                {
                    Id = Guid.NewGuid(),
                    CartId = cart.CartId,
                    ProductId = dto.ProductId,
                    ProductVariantId = dto.ProductVariantId,
                    Quantity = Math.Min(requestedQuantity, MaxQuantity),
                    SelectedSize = variant.Size,
                    SelectedColor = variant.Color,
                    DeliveryCode = normalizedCode
                };
                await _cartItemRepo.AddAsync(newItem);
            }
            else
            {
                existing.Quantity = Math.Min(existing.Quantity + requestedQuantity, MaxQuantity);
                existing.DeliveryCode = normalizedCode;
            }

            try
            {
                await _unitOfWork.SaveChangesAsync();
                _logger.LogInformation(
                    "Cart {CartId} (User: {UserId}, Session: {SessionId}) added product {ProductId} variant {VariantId} ({Size}/{Color})",
                    cart.CartId,
                    userId?.ToString() ?? "anonymous",
                    sessionId ?? "none",
                    dto.ProductId,
                    dto.ProductVariantId,
                    variant.Size,
                    variant.Color);
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Concurrency exception when saving cart {CartId}", cart.CartId);
                throw;
            }

            return await GetCartAsync(userId, sessionId);
        }

        public async Task<bool> RemoveFromCartAsync(Guid? userId, string? sessionId, Guid cartItemId)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            var item = cart.CartItems.FirstOrDefault(ci => ci.Id == cartItemId);
            if (item == null) return false;

            _cartItemRepo.Remove(item);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> IncreaseQuantityAsync(Guid? userId, string? sessionId, Guid cartItemId, int delta = 1)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            var item = cart.CartItems.FirstOrDefault(ci => ci.Id == cartItemId);
            if (item == null || item.Quantity >= MaxQuantity) return false;

            var totalForVariant = cart.CartItems
                .Where(ci => ci.ProductVariantId == item.ProductVariantId)
                .Sum(ci => ci.Quantity);

            if (item.ProductVariant.Quantity < totalForVariant + delta)
            {
                return false;
            }

            item.Quantity = Math.Min(item.Quantity + delta, MaxQuantity);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DecreaseQuantityAsync(Guid? userId, string? sessionId, Guid cartItemId, int delta = 1)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            var item = cart.CartItems.FirstOrDefault(ci => ci.Id == cartItemId);
            if (item == null) return false;

            item.Quantity = Math.Max(0, item.Quantity - delta);
            if (item.Quantity == 0)
            {
                _cartItemRepo.Remove(item);
            }

            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task MergeCartAsync(string sessionId, Guid userId)
        {
            if (string.IsNullOrEmpty(sessionId) || userId == Guid.Empty)
                return;

            var guestCart = await _cartRepo.Query()
                .Include(c => c.CartItems).ThenInclude(ci => ci.Product)
                .Include(c => c.CartItems).ThenInclude(ci => ci.ProductVariant)
                .FirstOrDefaultAsync(c => c.SessionId == sessionId && !c.UserId.HasValue);

            if (guestCart == null || guestCart.CartItems == null || !guestCart.CartItems.Any())
                return;

            var userCart = await _cartRepo.Query()
                .Include(c => c.CartItems).ThenInclude(ci => ci.Product)
                .Include(c => c.CartItems).ThenInclude(ci => ci.ProductVariant)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (userCart == null)
            {
                guestCart.UserId = userId;
                guestCart.SessionId = null;
                _cartRepo.Update(guestCart);
            }
            else
            {
                foreach (var guestItem in guestCart.CartItems)
                {
                    var existing = userCart.CartItems.FirstOrDefault(ci => ci.ProductVariantId == guestItem.ProductVariantId);
                    var totalForVariant = userCart.CartItems
                        .Where(ci => ci.ProductVariantId == guestItem.ProductVariantId)
                        .Sum(ci => ci.Quantity);

                    if (existing == null)
                    {
                        var newItem = new CartItem
                        {
                            Id = Guid.NewGuid(),
                            CartId = userCart.CartId,
                            ProductId = guestItem.ProductId,
                            ProductVariantId = guestItem.ProductVariantId,
                            Quantity = guestItem.Quantity,
                            SelectedSize = guestItem.SelectedSize,
                            SelectedColor = guestItem.SelectedColor,
                            DeliveryCode = guestItem.DeliveryCode
                        };
                        await _cartItemRepo.AddAsync(newItem);
                    }
                    else
                    {
                        var newQuantity = Math.Min(existing.Quantity + guestItem.Quantity, MaxQuantity);
                        if (guestItem.ProductVariant.Quantity >= totalForVariant + guestItem.Quantity)
                        {
                            existing.Quantity = newQuantity;
                        }
                    }
                }
                _cartItemRepo.RemoveRange(guestCart.CartItems);
                _cartRepo.Remove(guestCart);
            }

            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("Merged guest cart {SessionId} into user cart {UserId}", sessionId, userId);
        }

        private static void ValidateSelection(Product product, string deliveryCode)
        {
            var deliverableCodes = ProductOptionParser.ParseDeliveryCodes(product.DeliverableZones);
            if (!deliverableCodes.Contains(deliveryCode.Trim(), StringComparer.Ordinal))
            {
                throw new ArgumentException("Este producto no se puede enviar a la zona seleccionada.");
            }
        }
    }
}