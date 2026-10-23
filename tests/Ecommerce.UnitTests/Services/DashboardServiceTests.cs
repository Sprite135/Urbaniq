using Ecommerce.Application.Services.Admin;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;
using MockQueryable.Moq;
using Moq;

namespace Ecommerce.UnitTests.Services;

public class DashboardServiceTests
{
    [Fact]
    public async Task GetDashboardStatsAsync_CountsOnlyCollectedRevenue()
    {
        var orders = new[]
        {
            CreateOrder("yape", 500m, OrderStatus.Pending, isPaid: false),
            CreateOrder("plin", 100m, OrderStatus.Processing, isPaid: true),
            CreateOrder("cod", 200m, OrderStatus.Pending, isPaid: false),
            CreateOrder("cod", 80m, OrderStatus.Delivered, isPaid: false),
            CreateOrder("card", 120m, OrderStatus.Cancelled, isPaid: true),
            CreateOrder("card", 90m, OrderStatus.Refunded, isPaid: true),
            CreateOrder("card", 50m, OrderStatus.ReturnRequested, isPaid: true),
            CreateOrder("card", 70m, OrderStatus.Shipped, isPaid: true)
        }.AsQueryable().BuildMock();

        var orderRepository = new Mock<IRepository<Order>>();
        orderRepository.Setup(repository => repository.Query()).Returns(orders);

        var orderItemRepository = new Mock<IRepository<OrderItem>>();
        orderItemRepository.Setup(repository => repository.Query())
            .Returns(Array.Empty<OrderItem>().AsQueryable().BuildMock());

        var userRepository = new Mock<IRepository<User>>();
        userRepository.Setup(repository => repository.Query())
            .Returns(Array.Empty<User>().AsQueryable().BuildMock());

        var productRepository = new Mock<IRepository<Product>>();
        productRepository.Setup(repository => repository.Query())
            .Returns(Array.Empty<Product>().AsQueryable().BuildMock());

        var service = new DashboardService(
            orderRepository.Object,
            orderItemRepository.Object,
            userRepository.Object,
            productRepository.Object);

        var result = await service.GetDashboardStatsAsync();

        Assert.Equal(250m, result.TotalRevenue);
    }

    private static Order CreateOrder(string paymentMethod, decimal amount, OrderStatus status, bool isPaid) => new()
    {
        OrderId = Guid.NewGuid(),
        TransactionId = Guid.NewGuid().ToString(),
        PaymentMethod = paymentMethod,
        TotalPrice = amount,
        OrderStatus = status,
        IsPaid = isPaid
    };
}
