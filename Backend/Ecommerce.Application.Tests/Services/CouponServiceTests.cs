using Xunit;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Tests.Services
{
    public class CouponServiceTests
    {
        [Fact]
        public void SimpleTest_ForApplicationLayer()
        {
            // Arrange
            var coupon = new Coupon
            {
                Code = "TEST",
                Value = 10
            };

            // Act & Assert
            Assert.Equal("TEST", coupon.Code);
            Assert.Equal(10, coupon.Value);
        }
    }
}
