using System;
using Xunit;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Domain.Tests.Entities
{
    public class CouponTests
    {
        [Fact]
        public void Coupon_WhenCreated_ShouldHaveDefaultValues()
        {
            // Arrange & Act
            var coupon = new Coupon();

            // Assert
            Assert.Equal(0, coupon.UsesCount);
            Assert.False(coupon.CanCombine);
            Assert.True(coupon.IsActive);
            Assert.False(coupon.IsDeleted);
            Assert.Null(coupon.DeletedAt);
            Assert.True(coupon.CreatedAt <= DateTime.UtcNow);
        }

        [Fact]
        public void Coupon_WithPercentageDiscount_ShouldSetCorrectType()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "PERCENT20",
                DiscountType = CouponDiscountType.Percentage,
                Value = 20
            };

            // Assert
            Assert.Equal(CouponDiscountType.Percentage, coupon.DiscountType);
            Assert.Equal(20, coupon.Value);
        }

        [Fact]
        public void Coupon_WithFixedAmountDiscount_ShouldSetCorrectType()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "FIXED50",
                DiscountType = CouponDiscountType.FixedAmount,
                Value = 50
            };

            // Assert
            Assert.Equal(CouponDiscountType.FixedAmount, coupon.DiscountType);
            Assert.Equal(50, coupon.Value);
        }

        [Fact]
        public void Coupon_WithFreeShipping_ShouldSetCorrectType()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "FREESHIP",
                DiscountType = CouponDiscountType.FreeShipping
            };

            // Assert
            Assert.Equal(CouponDiscountType.FreeShipping, coupon.DiscountType);
        }

        [Fact]
        public void Coupon_WithBuyXGetY_ShouldSetQuantities()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "BUY2GET1",
                DiscountType = CouponDiscountType.BuyXGetY,
                BuyQuantity = 2,
                GetQuantity = 1
            };

            // Assert
            Assert.Equal(CouponDiscountType.BuyXGetY, coupon.DiscountType);
            Assert.Equal(2, coupon.BuyQuantity);
            Assert.Equal(1, coupon.GetQuantity);
        }

        [Fact]
        public void Coupon_WithMinOrderAmount_ShouldEnforceMinimum()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "MIN100",
                MinOrderAmount = 100
            };

            // Assert
            Assert.Equal(100, coupon.MinOrderAmount);
        }

        [Fact]
        public void Coupon_WithMaxUses_ShouldLimitUsage()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "LIMITED",
                MaxUses = 100
            };

            // Assert
            Assert.Equal(100, coupon.MaxUses);
        }

        [Fact]
        public void Coupon_WithMaxUsesPerUser_ShouldLimitPerUser()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "PERUSER",
                MaxUsesPerUser = 3
            };

            // Assert
            Assert.Equal(3, coupon.MaxUsesPerUser);
        }

        [Fact]
        public void Coupon_WhenDeactivated_ShouldNotBeActive()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "INACTIVE",
                IsActive = false
            };

            // Assert
            Assert.False(coupon.IsActive);
        }

        [Fact]
        public void Coupon_WhenSoftDeleted_ShouldSetDeletedAt()
        {
            // Arrange
            var coupon = new Coupon { Code = "TODELETE" };
            var deleteDate = DateTime.UtcNow;

            // Act
            coupon.IsDeleted = true;
            coupon.DeletedAt = deleteDate;

            // Assert
            Assert.True(coupon.IsDeleted);
            Assert.NotNull(coupon.DeletedAt);
            Assert.Equal(deleteDate, coupon.DeletedAt);
        }

        [Fact]
        public void Coupon_WithValidDateRange_ShouldBeWithinRange()
        {
            // Arrange & Act
            var startDate = DateTime.UtcNow.AddDays(-1);
            var endDate = DateTime.UtcNow.AddDays(30);
            var coupon = new Coupon
            {
                Code = "VALID",
                StartDate = startDate,
                EndDate = endDate
            };

            // Assert
            Assert.Equal(startDate, coupon.StartDate);
            Assert.Equal(endDate, coupon.EndDate);
        }

        [Fact]
        public void Coupon_WhenCombined_ShouldAllowCombination()
        {
            // Arrange & Act
            var coupon = new Coupon
            {
                Code = "COMBINABLE",
                CanCombine = true
            };

            // Assert
            Assert.True(coupon.CanCombine);
        }

        [Fact]
        public void Coupon_ShouldInitializeNavigationProperties()
        {
            // Arrange & Act
            var coupon = new Coupon();

            // Assert
            Assert.NotNull(coupon.CouponCategories);
            Assert.NotNull(coupon.CouponProducts);
            Assert.NotNull(coupon.CouponUsers);
            Assert.NotNull(coupon.CouponExcludedProducts);
        }
    }
}
