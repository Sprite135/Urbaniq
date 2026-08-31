using AutoMapper;
using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Application.Services.Orders;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;
using FluentAssertions;
using MockQueryable.Moq;
using Moq;

namespace Ecommerce.UnitTests.Services;

/// <summary>
/// Unit tests for OrderService — covers order placement, idempotency guard,
/// stock deduction, cart cleanup, status changes, and access control.
/// </summary>
public class OrderServiceTests
{
    private readonly Mock<IRepository<Order>> _orderRepoMock;
    private readonly Mock<IRepository<Domain.Entities.Cart>> _cartRepoMock;
    private readonly Mock<IRepository<CartItem>> _cartItemRepoMock;
    private readonly Mock<IRepository<Product>> _productRepoMock;
    private readonly Mock<IRepository<Address>> _addressRepoMock;
    private readonly Mock<IRepository<OrderItem>> _orderItemRepoMock;
    private readonly Mock<IRepository<User>> _userRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<IEmailJobQueue> _emailJobQueueMock;
    private readonly OrderService _sut;

    public OrderServiceTests()
    {
        _orderRepoMock = new Mock<IRepository<Order>>();
        _cartRepoMock = new Mock<IRepository<Domain.Entities.Cart>>();
        _cartItemRepoMock = new Mock<IRepository<CartItem>>();
        _productRepoMock = new Mock<IRepository<Product>>();
        _addressRepoMock = new Mock<IRepository<Address>>();
        _orderItemRepoMock = new Mock<IRepository<OrderItem>>();
        _userRepoMock = new Mock<IRepository<User>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _mapperMock = new Mock<IMapper>();
        _emailJobQueueMock = new Mock<IEmailJobQueue>();

        _sut = new OrderService(
            _orderRepoMock.Object,
            _cartRepoMock.Object,
            _cartItemRepoMock.Object,
            _productRepoMock.Object,
            _addressRepoMock.Object,
            _orderItemRepoMock.Object,
            _userRepoMock.Object,
            _unitOfWorkMock.Object,
            _mapperMock.Object,
            _emailJobQueueMock.Object);
    }

    private static Guid SetupUserId() => Guid.NewGuid();

    /// <summary>
    /// Creates a full test scenario with user, address, cart, and products ready for ordering.
    /// </summary>
    private (Guid UserId, Guid AddressId, Product Product) SetupValidOrderScenario()
    {
        var userId = Guid.NewGuid();
        var addressId = Guid.NewGuid();
        var product = new Product
        {
            Id = Guid.NewGuid(), ProductName = "Test Shirt", Price = 500, Quantity = 10,
            Image = "https://test.com/img.jpg",
            DeliverableZones = "150106"
        };
        var variant = new ProductVariant
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Product = product,
            Size = "M",
            Color = "Black",
            Quantity = 10
        };
        product.Variants = new List<ProductVariant> { variant };

        var address = new Address { AddressId = addressId, UserId = userId, IsDeleted = false, PostalCode = "150106" };
        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            ProductVariantId = variant.Id,
            Quantity = 2,
            Product = product,
            ProductVariant = variant
        };
        var cart = new Domain.Entities.Cart
        {
            CartId = Guid.NewGuid(), UserId = userId,
            CartItems = new List<CartItem> { cartItem }
        };

        // Setup mocks for all repositories
        var emptyOrders = new List<Order>().AsQueryable().BuildMock();
        _orderRepoMock.Setup(r => r.Query()).Returns(emptyOrders);

        var addresses = new List<Address> { address }.AsQueryable().BuildMock();
        _addressRepoMock.Setup(r => r.Query()).Returns(addresses);

        var carts = new List<Domain.Entities.Cart> { cart }.AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(carts);

        var users = new List<User> { new() { UserId = userId, Email = "customer@test.com" } }.AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(users);

        _unitOfWorkMock
            .Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>(), It.IsAny<CancellationToken>()))
            .Returns<Func<Task>, CancellationToken>((action, _) => action());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        return (userId, addressId, product);
    }

    // ==================== CreateOrder Tests ====================

    [Fact]
    public async Task CreateOrderAsync_ValidCart_PlacesOrder()
    {
        // Arrange
        var (userId, addressId, _) = SetupValidOrderScenario();
        var dto = new CreateOrderRequestDto { AddressId = addressId, TransactionId = "TXN_001", PaymentMethod = "card" };

        // Act
        var result = await _sut.CreateOrderAsync(userId, dto);

        // Assert
        result.Should().BeTrue();
        _orderRepoMock.Verify(r => r.AddAsync(It.IsAny<Order>()), Times.Once);
        _unitOfWorkMock.Verify(
            u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateOrderAsync_DuplicateTransactionId_ThrowsException()
    {
        // Arrange — an order with this TransactionId already exists (idempotency check)
        var existingOrder = new Order { OrderId = Guid.NewGuid(), TransactionId = "TXN_DUPLICATE" };
        var orders = new List<Order> { existingOrder }.AsQueryable().BuildMock();
        _orderRepoMock.Setup(r => r.Query()).Returns(orders);

        var dto = new CreateOrderRequestDto { AddressId = Guid.NewGuid(), TransactionId = "TXN_DUPLICATE", PaymentMethod = "card" };

        // Act & Assert
        var act = () => _sut.CreateOrderAsync(Guid.NewGuid(), dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*transaction ID already exists*");
    }

    [Fact]
    public async Task CreateOrderAsync_InvalidAddress_ThrowsException()
    {
        // Arrange — address doesn't exist
        var emptyOrders = new List<Order>().AsQueryable().BuildMock();
        _orderRepoMock.Setup(r => r.Query()).Returns(emptyOrders);

        var emptyAddresses = new List<Address>().AsQueryable().BuildMock();
        _addressRepoMock.Setup(r => r.Query()).Returns(emptyAddresses);

        var dto = new CreateOrderRequestDto { AddressId = Guid.NewGuid(), TransactionId = "TXN_002", PaymentMethod = "card" };

        // Act & Assert
        var act = () => _sut.CreateOrderAsync(Guid.NewGuid(), dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Cannot find the address*");
    }

    [Fact]
    public async Task CreateOrderAsync_EmptyCart_ThrowsException()
    {
        // Arrange — address exists but cart is empty
        var userId = Guid.NewGuid();
        var addressId = Guid.NewGuid();

        var emptyOrders = new List<Order>().AsQueryable().BuildMock();
        _orderRepoMock.Setup(r => r.Query()).Returns(emptyOrders);

        var address = new Address { AddressId = addressId, UserId = userId, IsDeleted = false, PostalCode = "150106" };
        var addresses = new List<Address> { address }.AsQueryable().BuildMock();
        _addressRepoMock.Setup(r => r.Query()).Returns(addresses);

        // Empty cart
        var emptyCarts = new List<Domain.Entities.Cart>().AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(emptyCarts);

        var dto = new CreateOrderRequestDto { AddressId = addressId, TransactionId = "TXN_003", PaymentMethod = "card" };

        // Act & Assert
        var act = () => _sut.CreateOrderAsync(userId, dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*cart is empty*");
    }

    [Fact]
    public async Task CreateOrderAsync_InsufficientStock_ThrowsException()
    {
        // Arrange — product has only 1 in stock but cart has 5
        var userId = Guid.NewGuid();
        var addressId = Guid.NewGuid();
        var product = new Product
        {
            Id = Guid.NewGuid(), ProductName = "Low Stock Shirt", Price = 500,
            Quantity = 1, Image = "img.jpg", DeliverableZones = "150106" // Only 1 available
        };
        var variant = new ProductVariant
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Product = product,
            Size = "M",
            Color = "Black",
            Quantity = 1
        };
        product.Variants = new List<ProductVariant> { variant };

        var address = new Address { AddressId = addressId, UserId = userId, IsDeleted = false, PostalCode = "150106" };
        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            ProductVariantId = variant.Id,
            Quantity = 5,
            Product = product,
            ProductVariant = variant
        };
        var cart = new Domain.Entities.Cart
        {
            CartId = Guid.NewGuid(), UserId = userId,
            CartItems = new List<CartItem> { cartItem }
        };

        var emptyOrders = new List<Order>().AsQueryable().BuildMock();
        _orderRepoMock.Setup(r => r.Query()).Returns(emptyOrders);

        var addresses = new List<Address> { address }.AsQueryable().BuildMock();
        _addressRepoMock.Setup(r => r.Query()).Returns(addresses);

        var carts = new List<Domain.Entities.Cart> { cart }.AsQueryable().BuildMock();
        _cartRepoMock.Setup(r => r.Query()).Returns(carts);

        var dto = new CreateOrderRequestDto { AddressId = addressId, TransactionId = "TXN_004", PaymentMethod = "card" };

        // Act & Assert

        // Act & Assert
        var act = () => _sut.CreateOrderAsync(userId, dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*out of stock*");
    }

    [Fact]
    public async Task CreateOrderAsync_DeductsStockQuantity()
    {
        // Arrange
        var (userId, addressId, product) = SetupValidOrderScenario();
        var originalStock = product.Quantity; // 10
        var dto = new CreateOrderRequestDto { AddressId = addressId, TransactionId = "TXN_005", PaymentMethod = "card" };

        // Act
        await _sut.CreateOrderAsync(userId, dto);

        // Assert — stock should be reduced (original 10, ordered 2 = 8 remaining)
        product.Quantity.Should().BeLessThan(originalStock);
        _productRepoMock.Verify(r => r.Update(product), Times.Once);
    }

    [Fact]
    public async Task CreateOrderAsync_ClearsCartItems()
    {
        // Arrange
        var (userId, addressId, _) = SetupValidOrderScenario();
        var dto = new CreateOrderRequestDto { AddressId = addressId, TransactionId = "TXN_006", PaymentMethod = "card" };

        // Act
        await _sut.CreateOrderAsync(userId, dto);

        // Assert — cart items must be removed after order placement
        _cartItemRepoMock.Verify(r => r.RemoveRange(It.IsAny<IEnumerable<CartItem>>()), Times.Once);
    }

    // ==================== ChangeOrderStatus Tests ====================

    [Fact]
    public async Task ChangeOrderStatusAsync_ValidStatus_Updates()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var order = new Order { OrderId = orderId, UserId = userId, OrderStatus = OrderStatus.Pending };
        var orders = new List<Order> { order }.AsQueryable().BuildMock();
        _orderRepoMock.Setup(r => r.Query()).Returns(orders);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var users = new List<User> { new() { UserId = userId, Email = "customer@test.com" } }.AsQueryable().BuildMock();
        _userRepoMock.Setup(r => r.Query()).Returns(users);

        // Act
        var result = await _sut.ChangeOrderStatusAsync(orderId, "Shipped");

        // Assert
        result.OrderStatus.Should().Be("Shipped");
        result.Message.Should().Contain("updated successfully");
    }

    [Fact]
    public async Task ChangeOrderStatusAsync_InvalidStatus_ReturnsInvalidMessage()
    {
        // Arrange — "Flying" is not a valid OrderStatus enum value
        // Act
        var result = await _sut.ChangeOrderStatusAsync(Guid.NewGuid(), "Flying");

        // Assert
        result.Message.Should().Be("invalidstatus");
    }

    // ==================== GetOrderById Access Control ====================

    [Fact]
    public async Task GetOrderByIdAsync_NonAdmin_WrongUser_ThrowsUnauthorized()
    {
        // Arrange — order belongs to User A, but User B (non-admin) tries to access it
        var orderId = Guid.NewGuid();
        var ownerUserId = Guid.NewGuid();
        var requestingUserId = Guid.NewGuid(); // Different user

        var order = new Order
        {
            OrderId = orderId, UserId = ownerUserId, OrderStatus = OrderStatus.Pending,
            TotalPrice = 1000, TransactionId = "TXN_ACCESS", PaymentMethod = "card",
            OrderItems = new List<OrderItem>(),
            Address = new Address { AddressId = Guid.NewGuid() }
        };

        var orders = new List<Order> { order }.AsQueryable().BuildMock();
        _orderRepoMock.Setup(r => r.Query()).Returns(orders);

        // Act & Assert — non-admin accessing another user's order
        var act = () => _sut.GetOrderByIdAsync(orderId, requestingUserId, isAdmin: false);
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*not authorized*");
    }

    // ==================== Delivery Check Tests ====================

    [Fact]
    public async Task CanDeliverCartToAddressAsync_ValidPostalCode_ReturnsTrue()
    {
        var (userId, addressId, _) = SetupValidOrderScenario();

        var result = await _sut.CanDeliverCartToAddressAsync(userId, addressId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanDeliverCartToAddressAsync_AnyAddress_ReturnsTrue()
    {
        var userId = Guid.NewGuid();
        var addressId = Guid.NewGuid();
        var product = new Product
        {
            Id = Guid.NewGuid(), ProductName = "Shirt", Price = 500, Quantity = 5,
            DeliverableZones = "150101"
        };
        var variant = new ProductVariant { Id = Guid.NewGuid(), ProductId = product.Id, Product = product, Quantity = 5 };
        product.Variants = new List<ProductVariant> { variant };

        // Delivery is zone-based (Lima Metropolitana / Provincias) and available nationwide (Memory Kings style).
        var address = new Address { AddressId = addressId, UserId = userId, IsDeleted = false, Department = "Arequipa", Province = "Arequipa", District = "Cercado" };
        var cartItem = new CartItem
        {
            Id = Guid.NewGuid(), ProductId = product.Id, ProductVariantId = variant.Id,
            Quantity = 1, Product = product, ProductVariant = variant
        };
        var cart = new Domain.Entities.Cart { CartId = Guid.NewGuid(), UserId = userId, CartItems = new List<CartItem> { cartItem } };

        _addressRepoMock.Setup(r => r.Query()).Returns(new List<Address> { address }.AsQueryable().BuildMock());
        _cartRepoMock.Setup(r => r.Query()).Returns(new List<Domain.Entities.Cart> { cart }.AsQueryable().BuildMock());

        var result = await _sut.CanDeliverCartToAddressAsync(userId, addressId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanDeliverCartToAddressAsync_MissingAddress_ReturnsFalse()
    {
        var userId = Guid.NewGuid();
        _addressRepoMock.Setup(r => r.Query()).Returns(new List<Address>().AsQueryable().BuildMock());
        _cartRepoMock.Setup(r => r.Query()).Returns(new List<Domain.Entities.Cart>().AsQueryable().BuildMock());

        var result = await _sut.CanDeliverCartToAddressAsync(userId, Guid.NewGuid());

        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanDeliverCartToAddressAsync_EmptyCart_ReturnsFalse()
    {
        var userId = Guid.NewGuid();
        var addressId = Guid.NewGuid();
        var address = new Address { AddressId = addressId, UserId = userId, IsDeleted = false, PostalCode = "150106" };
        var cart = new Domain.Entities.Cart { CartId = Guid.NewGuid(), UserId = userId, CartItems = new List<CartItem>() };

        _addressRepoMock.Setup(r => r.Query()).Returns(new List<Address> { address }.AsQueryable().BuildMock());
        _cartRepoMock.Setup(r => r.Query()).Returns(new List<Domain.Entities.Cart> { cart }.AsQueryable().BuildMock());

        var result = await _sut.CanDeliverCartToAddressAsync(userId, addressId);

        result.Should().BeFalse();
    }

    // ==================== Self-Service Order Tests ====================

    [Fact]
    public async Task CancelOrderAsync_PendingOrder_RestoresStockAndCancels()
    {
        var userId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var product = new Product { Id = Guid.NewGuid(), ProductName = "Shirt", Quantity = 5 };
        var variant = new ProductVariant { Id = Guid.NewGuid(), ProductId = product.Id, Product = product, Quantity = 3 };
        var order = new Order
        {
            OrderId = orderId, UserId = userId, OrderStatus = OrderStatus.Pending,
            TotalPrice = 1000, TransactionId = "TXN1", PaymentMethod = "card",
            OrderItems = new List<OrderItem>
            {
                new()
                {
                    OrderItemId = Guid.NewGuid(), ProductId = product.Id, ProductVariantId = variant.Id,
                    Quantity = 2, Product = product, ProductVariant = variant
                }
            }
        };

        _orderRepoMock.Setup(r => r.Query()).Returns(new List<Order> { order }.AsQueryable().BuildMock());
        _userRepoMock.Setup(r => r.Query()).Returns(new List<User> { new() { UserId = userId, Email = "customer@test.com" } }.AsQueryable().BuildMock());
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var result = await _sut.CancelOrderAsync(userId, orderId, "Changed mind");

        result.Message.Should().Be("Order cancelled successfully");
        order.OrderStatus.Should().Be(OrderStatus.Cancelled);
        product.Quantity.Should().Be(7);
        variant.Quantity.Should().Be(5);
        _productRepoMock.Verify(r => r.Update(product), Times.Once);
    }

    [Fact]
    public async Task CancelOrderAsync_ShippedOrder_ReturnsNotCancellableMessage()
    {
        var userId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var order = new Order
        {
            OrderId = orderId, UserId = userId, OrderStatus = OrderStatus.Shipped,
            TotalPrice = 1000, TransactionId = "TXN2", PaymentMethod = "card",
            OrderItems = new List<OrderItem>()
        };

        _orderRepoMock.Setup(r => r.Query()).Returns(new List<Order> { order }.AsQueryable().BuildMock());

        var result = await _sut.CancelOrderAsync(userId, orderId, "Too late");

        result.Message.Should().Be("This order can no longer be cancelled");
    }

}

