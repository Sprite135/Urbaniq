using AutoMapper;
using Ecommerce.Application.DTOs.Cart;
using Ecommerce.Application.Services.Cart;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using MockQueryable.Moq;
using Moq;

namespace Ecommerce.UnitTests.Services;

/// <summary>
/// Unit tests for CartService — covers add/remove operations, quantity limits,
/// cart creation, and edge cases like empty GUIDs and invalid products.
/// </summary>
public class CartServiceTests
{
    private readonly Mock<IRepository<Domain.Entities.Cart>> _cartRepoMock;
    private readonly Mock<IRepository<CartItem>> _cartItemRepoMock;
    private readonly Mock<IRepository<Product>> _productRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<ILogger<CartService>> _loggerMock;
    private readonly CartService _sut;

    public CartServiceTests()
    {
        _cartRepoMock = new Mock<IRepository<Domain.Entities.Cart>>();
        _cartItemRepoMock = new Mock<IRepository<CartItem>>();
        _productRepoMock = new Mock<IRepository<Product>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _mapperMock = new Mock<IMapper>();
        _loggerMock = new Mock<ILogger<CartService>>();

        _sut = new CartService(
            _cartRepoMock.Object,
            _cartItemRepoMock.Object,
            _productRepoMock.Object,
            _unitOfWorkMock.Object,
            _mapperMock.Object,
            _loggerMock.Object);
    }

    private static Product CreateProduct(Guid? id = null) => new()
    {
        Id = id ?? Guid.NewGuid(),
        ProductName = "Test T-Shirt",
        Price = 999,
        Quantity = 25,
        Image = "https://test.com/image.jpg",
        DeliverableZones = "150106",
        Variants =
        [
            new ProductVariant
            {
                Id = Guid.NewGuid(),
                Size = "M",
                Color = "Black",
                Quantity = 25
            }
        ]
    };

    // ==================== AddToCart Tests ====================

    [Fact]
    public async Task AddToCartAsync_NewCart_CreatesCartAndItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var product = CreateProduct();
        var variant = product.Variants[0];
        var dto = new AddToCartRequestDto { ProductId = product.Id, ProductVariantId = variant.Id, Quantity = 1, DeliveryCode = "150106" };
        var cartResponse = new CartResponseDto { CartId = Guid.NewGuid(), Items = new List<CartItemResponseDto>() };

        _productRepoMock.Setup(r => r.Query()).Returns(new List<Product> { product }.AsQueryable().BuildMock());

        // First query returns null (no cart), second returns the newly created cart
        var emptyCarts = new List<Domain.Entities.Cart>().AsQueryable().BuildMock();
        _cartRepoMock.SetupSequence(r => r.Query())
            .Returns(emptyCarts)
            .Returns(new List<Domain.Entities.Cart>
            {
                new() { CartId = Guid.NewGuid(), UserId = userId, CartItems = new List<CartItem>() }
            }.AsQueryable().BuildMock());

        _mapperMock.Setup(m => m.Map<CartResponseDto>(It.IsAny<Domain.Entities.Cart>())).Returns(cartResponse);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.AddToCartAsync(userId, dto);

        // Assert
        result.Should().NotBeNull();
        _cartRepoMock.Verify(r => r.AddAsync(It.IsAny<Domain.Entities.Cart>()), Times.Once);
    }

    [Fact]
    public async Task AddToCartAsync_ExistingItem_IncrementsQuantity()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var product = CreateProduct(productId);
        var variant = product.Variants[0];
        var existingItem = new CartItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            ProductVariantId = variant.Id,
            Quantity = 2,
            Product = product,
            ProductVariant = variant,
            DeliveryCode = "150106"
        };
        var existingCart = new Domain.Entities.Cart
        {
            CartId = Guid.NewGuid(), UserId = userId,
            CartItems = new List<CartItem> { existingItem }
        };

        _productRepoMock.Setup(r => r.Query()).Returns(new List<Product> { product }.AsQueryable().BuildMock());
        var carts = new List<Domain.Entities.Cart> { existingCart }.AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(carts);
        _mapperMock.Setup(m => m.Map<CartResponseDto>(It.IsAny<Domain.Entities.Cart>()))
            .Returns(new CartResponseDto());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var dto = new AddToCartRequestDto { ProductId = productId, ProductVariantId = variant.Id, Quantity = 3, DeliveryCode = "150106" };

        // Act
        await _sut.AddToCartAsync(userId, dto);

        // Assert — quantity should increase from 2 to 5
        existingItem.Quantity.Should().Be(5);
    }

    [Fact]
    public async Task AddToCartAsync_MaxQuantity_CapsAtTen()
    {
        // Arrange — item already at quantity 8, adding 5 more should cap at 10
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var product = CreateProduct(productId);
        var variant = product.Variants[0];
        var existingItem = new CartItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            ProductVariantId = variant.Id,
            Quantity = 8,
            Product = product,
            ProductVariant = variant,
            DeliveryCode = "150106"
        };
        var existingCart = new Domain.Entities.Cart
        {
            CartId = Guid.NewGuid(), UserId = userId,
            CartItems = new List<CartItem> { existingItem }
        };

        _productRepoMock.Setup(r => r.Query()).Returns(new List<Product> { product }.AsQueryable().BuildMock());
        var carts = new List<Domain.Entities.Cart> { existingCart }.AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(carts);
        _mapperMock.Setup(m => m.Map<CartResponseDto>(It.IsAny<Domain.Entities.Cart>()))
            .Returns(new CartResponseDto());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var dto = new AddToCartRequestDto { ProductId = productId, ProductVariantId = variant.Id, Quantity = 5, DeliveryCode = "150106" };

        // Act
        await _sut.AddToCartAsync(userId, dto);

        // Assert — must not exceed MaxQuantity (10)
        existingItem.Quantity.Should().BeLessThanOrEqualTo(10);
    }

    [Fact]
    public async Task AddToCartAsync_EmptyGuid_ThrowsArgumentNullException()
    {
        // Arrange
        var dto = new AddToCartRequestDto { ProductId = Guid.NewGuid(), Quantity = 1 };

        // Act & Assert — Guid.Empty is invalid
        var act = () => _sut.AddToCartAsync(Guid.Empty, dto);
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public async Task AddToCartAsync_InvalidProduct_ThrowsArgumentException()
    {
        // Arrange — product doesn't exist
        _productRepoMock.Setup(r => r.Query()).Returns(new List<Product>().AsQueryable().BuildMock());

        var dto = new AddToCartRequestDto { ProductId = Guid.NewGuid(), ProductVariantId = Guid.NewGuid(), Quantity = 1, DeliveryCode = "150106" };

        // Act & Assert
        var act = () => _sut.AddToCartAsync(Guid.NewGuid(), dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Product not found*");
    }

    // ==================== RemoveFromCart Tests ====================

    [Fact]
    public async Task RemoveFromCartAsync_ValidItem_ReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var cartItem = new CartItem { Id = Guid.NewGuid(), ProductId = productId, Quantity = 1 };
        var cart = new Domain.Entities.Cart
        {
            CartId = Guid.NewGuid(), UserId = userId,
            CartItems = new List<CartItem> { cartItem }
        };

        var carts = new List<Domain.Entities.Cart> { cart }.AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(carts);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.RemoveFromCartAsync(userId, cartItem.Id);

        // Assert
        result.Should().BeTrue();
        _cartItemRepoMock.Verify(r => r.Remove(cartItem), Times.Once);
    }

    [Fact]
    public async Task RemoveFromCartAsync_NoCart_ReturnsFalse()
    {
        // Arrange
        var emptyCarts = new List<Domain.Entities.Cart>().AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(emptyCarts);

        // Act
        var result = await _sut.RemoveFromCartAsync(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    // ==================== Quantity Tests ====================

    [Fact]
    public async Task IncreaseQuantityAsync_ValidItem_Increments()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var variant = new ProductVariant { Id = Guid.NewGuid(), Quantity = 25, Size = "M", Color = "Black" };
        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            ProductVariantId = variant.Id,
            ProductVariant = variant,
            Quantity = 3
        };
        var cart = new Domain.Entities.Cart
        {
            CartId = Guid.NewGuid(), UserId = userId,
            CartItems = new List<CartItem> { cartItem }
        };

        var carts = new List<Domain.Entities.Cart> { cart }.AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(carts);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.IncreaseQuantityAsync(userId, cartItem.Id);

        // Assert
        result.Should().BeTrue();
        cartItem.Quantity.Should().Be(4);
    }

    [Fact]
    public async Task DecreaseQuantityAsync_ToZero_RemovesItem()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var cartItem = new CartItem { Id = Guid.NewGuid(), ProductId = productId, Quantity = 1 };
        var cart = new Domain.Entities.Cart
        {
            CartId = Guid.NewGuid(), UserId = userId,
            CartItems = new List<CartItem> { cartItem }
        };

        var carts = new List<Domain.Entities.Cart> { cart }.AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(carts);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.DecreaseQuantityAsync(userId, cartItem.Id);

        // Assert — item at quantity 1 decreased by 1 should be removed
        result.Should().BeTrue();
        _cartItemRepoMock.Verify(r => r.Remove(cartItem), Times.Once);
    }
}
