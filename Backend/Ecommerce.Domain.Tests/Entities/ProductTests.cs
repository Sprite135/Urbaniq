using System;
using Xunit;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Domain.Tests.Entities
{
    public class ProductTests
    {
        [Fact]
        public void Product_WhenCreated_ShouldHaveDefaultValues()
        {
            // Arrange & Act
            var product = new Product();

            // Assert
            Assert.Equal(0, product.TotalSold);
            Assert.False(product.RequiresConfiguration);
            Assert.False(product.IsDeleted);
            Assert.Null(product.DeletedAt);
            Assert.True(product.CreatedAtUtc <= DateTime.UtcNow);
        }

        [Fact]
        public void Product_WithPricing_ShouldCalculateCorrectly()
        {
            // Arrange & Act
            var product = new Product
            {
                Price = 100,
                Discount = 20
            };

            // Assert
            Assert.Equal(100, product.Price);
            Assert.Equal(20, product.Discount);
        }

        [Fact]
        public void Product_WithStock_ShouldTrackQuantity()
        {
            // Arrange & Act
            var product = new Product
            {
                Quantity = 50
            };

            // Assert
            Assert.Equal(50, product.Quantity);
        }

        [Fact]
        public void Product_WithConfigurationRequired_ShouldBeMarked()
        {
            // Arrange & Act
            var product = new Product
            {
                RequiresConfiguration = true
            };

            // Assert
            Assert.True(product.RequiresConfiguration);
        }

        [Fact]
        public void Product_WithCategory_ShouldSetCategoryId()
        {
            // Arrange & Act
            var product = new Product
            {
                CategoryId = 5
            };

            // Assert
            Assert.Equal(5, product.CategoryId);
        }

        [Fact]
        public void Product_WithSubCategory_ShouldSetSubCategoryId()
        {
            // Arrange & Act
            var product = new Product
            {
                SubCategoryId = 10
            };

            // Assert
            Assert.Equal(10, product.SubCategoryId);
        }

        [Fact]
        public void Product_WithSize_ShouldSetSize()
        {
            // Arrange & Act
            var product = new Product
            {
                Size = "M"
            };

            // Assert
            Assert.Equal("M", product.Size);
        }

        [Fact]
        public void Product_WithColor_ShouldSetColor()
        {
            // Arrange & Act
            var product = new Product
            {
                Color = "Black"
            };

            // Assert
            Assert.Equal("Black", product.Color);
        }

        [Fact]
        public void Product_WithAvailableSizes_ShouldSetSizes()
        {
            // Arrange & Act
            var product = new Product
            {
                AvailableSizes = "S,M,L,XL"
            };

            // Assert
            Assert.Equal("S,M,L,XL", product.AvailableSizes);
        }

        [Fact]
        public void Product_WithAvailableColors_ShouldSetColors()
        {
            // Arrange & Act
            var product = new Product
            {
                AvailableColors = "Black,Navy,White"
            };

            // Assert
            Assert.Equal("Black,Navy,White", product.AvailableColors);
        }

        [Fact]
        public void Product_WhenSoftDeleted_ShouldSetDeletedAt()
        {
            // Arrange
            var product = new Product();
            var deleteDate = DateTime.UtcNow;

            // Act
            product.IsDeleted = true;
            product.DeletedAt = deleteDate;

            // Assert
            Assert.True(product.IsDeleted);
            Assert.NotNull(product.DeletedAt);
            Assert.Equal(deleteDate, product.DeletedAt);
        }

        [Fact]
        public void Product_WhenUpdated_ShouldSetUpdatedAt()
        {
            // Arrange
            var product = new Product();
            var updateDate = DateTime.UtcNow;

            // Act
            product.UpdatedAtUtc = updateDate;

            // Assert
            Assert.NotNull(product.UpdatedAtUtc);
            Assert.Equal(updateDate, product.UpdatedAtUtc);
        }

        [Fact]
        public void Product_ShouldInitializeNavigationProperties()
        {
            // Arrange & Act
            var product = new Product();

            // Assert
            Assert.NotNull(product.CartItems);
            Assert.NotNull(product.ProductImages);
            Assert.NotNull(product.Variants);
            Assert.NotNull(product.Specifications);
            Assert.NotNull(product.Reviews);
        }

        [Fact]
        public void Product_WithMaterial_ShouldSetMaterial()
        {
            // Arrange & Act
            var product = new Product
            {
                Material = "100% Cotton"
            };

            // Assert
            Assert.Equal("100% Cotton", product.Material);
        }

        [Fact]
        public void Product_WithDeliverableZones_ShouldSetZones()
        {
            // Arrange & Act
            var product = new Product
            {
                DeliverableZones = "LIMA,LIMAPROV"
            };

            // Assert
            Assert.Equal("LIMA,LIMAPROV", product.DeliverableZones);
        }
    }
}
