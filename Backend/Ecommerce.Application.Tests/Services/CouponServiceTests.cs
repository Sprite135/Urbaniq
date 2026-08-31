using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Ecommerce.Application.Services.Coupons;
using Ecommerce.Application.DTOs.Coupons;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using Ecommerce.Domain.Common;

namespace Ecommerce.Application.Tests.Services
{
    public class CouponServiceTests
    {
        private readonly Mock<IRepository<Coupon>> _mockCouponRepo;
        private readonly Mock<IRepository<CouponCategory>> _mockCouponCategoryRepo;
        private readonly Mock<IRepository<CouponProduct>> _mockCouponProductRepo;
        private readonly Mock<IRepository<CouponUser>> _mockCouponUserRepo;
        private readonly Mock<IRepository<Category>> _mockCategoryRepo;
        private readonly Mock<IRepository<Product>> _mockProductRepo;
        private readonly Mock<IUnitOfWork> _mockUnitOfWork;
        private readonly CouponService _couponService;

        public CouponServiceTests()
        {
            _mockCouponRepo = new Mock<IRepository<Coupon>>();
            _mockCouponCategoryRepo = new Mock<IRepository<CouponCategory>>();
            _mockCouponProductRepo = new Mock<IRepository<CouponProduct>>();
            _mockCouponUserRepo = new Mock<IRepository<CouponUser>>();
            _mockCategoryRepo = new Mock<IRepository<Category>>();
            _mockProductRepo = new Mock<IRepository<Product>>();
            _mockUnitOfWork = new Mock<IUnitOfWork>();

            _couponService = new CouponService(
                _mockCouponRepo.Object,
                _mockCouponCategoryRepo.Object,
                _mockCouponProductRepo.Object,
                _mockCouponUserRepo.Object,
                _mockCategoryRepo.Object,
                _mockProductRepo.Object,
                _mockUnitOfWork.Object,
                null // Mapper not needed for basic tests
            );
        }

        [Fact]
        public async Task ValidateCouponAsync_WithValidCoupon_ReturnsValidResponse()
        {
            // Arrange
            var coupon = new Coupon
            {
                CouponId = 1,
                Code = "TEST20",
                DiscountType = CouponDiscountType.Percentage,
                Value = 20,
                MinOrderAmount = 100,
                MaxUses = 100,
                UsesCount = 5,
                StartDate = DateTime.UtcNow.AddDays(-1),
                EndDate = DateTime.UtcNow.AddDays(30),
                IsActive = true,
                IsDeleted = false,
                CouponCategories = new List<CouponCategory>(),
                CouponProducts = new List<CouponProduct>()
            };

            var mockQuery = new Mock<IQueryable<Coupon>>();
            mockQuery.Setup(q => q.Include(It.IsAny<string>())).Returns(mockQuery.Object);
            mockQuery.Setup(q => q.FirstOrDefaultAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Coupon, bool>>>(), 
                It.IsAny<CancellationToken>())).ReturnsAsync(coupon);

            _mockCouponRepo.Setup(r => r.Query()).Returns(mockQuery.Object);

            var dto = new ValidateCouponDto
            {
                Code = "TEST20",
                CartTotal = 150,
                ProductIds = new List<Guid>(),
                CategoryIds = new List<int>()
            };

            // Act
            var result = await _couponService.ValidateCouponAsync(dto);

            // Assert
            Assert.True(result.IsValid);
            Assert.Equal("TEST20", result.Code);
            Assert.Equal(30, result.DiscountAmount); // 20% of 150
        }

        [Fact]
        public async Task ValidateCouponAsync_WithExpiredCoupon_ReturnsInvalidResponse()
        {
            // Arrange
            var coupon = new Coupon
            {
                CouponId = 1,
                Code = "EXPIRED",
                DiscountType = CouponDiscountType.Percentage,
                Value = 10,
                StartDate = DateTime.UtcNow.AddDays(-60),
                EndDate = DateTime.UtcNow.AddDays(-30),
                IsActive = true,
                IsDeleted = false,
                CouponCategories = new List<CouponCategory>(),
                CouponProducts = new List<CouponProduct>()
            };

            var mockQuery = new Mock<IQueryable<Coupon>>();
            mockQuery.Setup(q => q.Include(It.IsAny<string>())).Returns(mockQuery.Object);
            mockQuery.Setup(q => q.FirstOrDefaultAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Coupon, bool>>>(), 
                It.IsAny<CancellationToken>())).ReturnsAsync(coupon);

            _mockCouponRepo.Setup(r => r.Query()).Returns(mockQuery.Object);

            var dto = new ValidateCouponDto
            {
                Code = "EXPIRED",
                CartTotal = 100,
                ProductIds = new List<Guid>(),
                CategoryIds = new List<int>()
            };

            // Act
            var result = await _couponService.ValidateCouponAsync(dto);

            // Assert
            Assert.False(result.IsValid);
            Assert.Contains("expirado", result.ErrorMessage?.ToLower());
        }

        [Fact]
        public async Task ValidateCouponAsync_WithMaxUsesReached_ReturnsInvalidResponse()
        {
            // Arrange
            var coupon = new Coupon
            {
                CouponId = 1,
                Code = "LIMITED",
                DiscountType = CouponDiscountType.Percentage,
                Value = 15,
                MaxUses = 10,
                UsesCount = 10,
                StartDate = DateTime.UtcNow.AddDays(-1),
                EndDate = DateTime.UtcNow.AddDays(30),
                IsActive = true,
                IsDeleted = false,
                CouponCategories = new List<CouponCategory>(),
                CouponProducts = new List<CouponProduct>()
            };

            var mockQuery = new Mock<IQueryable<Coupon>>();
            mockQuery.Setup(q => q.Include(It.IsAny<string>())).Returns(mockQuery.Object);
            mockQuery.Setup(q => q.FirstOrDefaultAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Coupon, bool>>>(), 
                It.IsAny<CancellationToken>())).ReturnsAsync(coupon);

            _mockCouponRepo.Setup(r => r.Query()).Returns(mockQuery.Object);

            var dto = new ValidateCouponDto
            {
                Code = "LIMITED",
                CartTotal = 100,
                ProductIds = new List<Guid>(),
                CategoryIds = new List<int>()
            };

            // Act
            var result = await _couponService.ValidateCouponAsync(dto);

            // Assert
            Assert.False(result.IsValid);
            Assert.Contains("agotado", result.ErrorMessage?.ToLower());
        }

        [Fact]
        public async Task ValidateCouponAsync_WithBelowMinOrderAmount_ReturnsInvalidResponse()
        {
            // Arrange
            var coupon = new Coupon
            {
                CouponId = 1,
                Code = "MIN100",
                DiscountType = CouponDiscountType.FixedAmount,
                Value = 20,
                MinOrderAmount = 100,
                StartDate = DateTime.UtcNow.AddDays(-1),
                EndDate = DateTime.UtcNow.AddDays(30),
                IsActive = true,
                IsDeleted = false,
                CouponCategories = new List<CouponCategory>(),
                CouponProducts = new List<CouponProduct>()
            };

            var mockQuery = new Mock<IQueryable<Coupon>>();
            mockQuery.Setup(q => q.Include(It.IsAny<string>())).Returns(mockQuery.Object);
            mockQuery.Setup(q => q.FirstOrDefaultAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Coupon, bool>>>(), 
                It.IsAny<CancellationToken>())).ReturnsAsync(coupon);

            _mockCouponRepo.Setup(r => r.Query()).Returns(mockQuery.Object);

            var dto = new ValidateCouponDto
            {
                Code = "MIN100",
                CartTotal = 50,
                ProductIds = new List<Guid>(),
                CategoryIds = new List<int>()
            };

            // Act
            var result = await _couponService.ValidateCouponAsync(dto);

            // Assert
            Assert.False(result.IsValid);
            Assert.Contains("mínimo", result.ErrorMessage?.ToLower());
        }

        [Fact]
        public async Task ValidateCouponAsync_WithUserLimitExceeded_ReturnsInvalidResponse()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var coupon = new Coupon
            {
                CouponId = 1,
                Code = "ONCEPERUSER",
                DiscountType = CouponDiscountType.Percentage,
                Value = 10,
                MaxUsesPerUser = 1,
                StartDate = DateTime.UtcNow.AddDays(-1),
                EndDate = DateTime.UtcNow.AddDays(30),
                IsActive = true,
                IsDeleted = false,
                CouponCategories = new List<CouponCategory>(),
                CouponProducts = new List<CouponProduct>()
            };

            var mockCouponQuery = new Mock<IQueryable<Coupon>>();
            mockCouponQuery.Setup(q => q.Include(It.IsAny<string>())).Returns(mockCouponQuery.Object);
            mockCouponQuery.Setup(q => q.FirstOrDefaultAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Coupon, bool>>>(), 
                It.IsAny<CancellationToken>())).ReturnsAsync(coupon);

            var mockUserUsageQuery = new Mock<IQueryable<CouponUser>>();
            mockUserUsageQuery.Setup(q => q.CountAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

            _mockCouponRepo.Setup(r => r.Query()).Returns(mockCouponQuery.Object);
            _mockCouponUserRepo.Setup(r => r.Query()).Returns(mockUserUsageQuery.Object);

            var dto = new ValidateCouponDto
            {
                Code = "ONCEPERUSER",
                CartTotal = 100,
                ProductIds = new List<Guid>(),
                CategoryIds = new List<int>(),
                UserId = userId
            };

            // Act
            var result = await _couponService.ValidateCouponAsync(dto);

            // Assert
            Assert.False(result.IsValid);
            Assert.Contains("límite", result.ErrorMessage?.ToLower());
        }

        [Fact]
        public async Task ValidateCouponAsync_WithFixedAmount_ReturnsCorrectDiscount()
        {
            // Arrange
            var coupon = new Coupon
            {
                CouponId = 1,
                Code = "FIXED50",
                DiscountType = CouponDiscountType.FixedAmount,
                Value = 50,
                StartDate = DateTime.UtcNow.AddDays(-1),
                EndDate = DateTime.UtcNow.AddDays(30),
                IsActive = true,
                IsDeleted = false,
                CouponCategories = new List<CouponCategory>(),
                CouponProducts = new List<CouponProduct>()
            };

            var mockQuery = new Mock<IQueryable<Coupon>>();
            mockQuery.Setup(q => q.Include(It.IsAny<string>())).Returns(mockQuery.Object);
            mockQuery.Setup(q => q.FirstOrDefaultAsync(It.IsAny<System.Linq.Expressions.Expression<Func<Coupon, bool>>>(), 
                It.IsAny<CancellationToken>())).ReturnsAsync(coupon);

            _mockCouponRepo.Setup(r => r.Query()).Returns(mockQuery.Object);

            var dto = new ValidateCouponDto
            {
                Code = "FIXED50",
                CartTotal = 200,
                ProductIds = new List<Guid>(),
                CategoryIds = new List<int>()
            };

            // Act
            var result = await _couponService.ValidateCouponAsync(dto);

            // Assert
            Assert.True(result.IsValid);
            Assert.Equal(50, result.DiscountAmount); // Fixed amount, not percentage
        }
    }
}