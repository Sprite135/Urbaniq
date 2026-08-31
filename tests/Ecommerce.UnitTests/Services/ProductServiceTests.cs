using AutoMapper;
using Ecommerce.Application.DTOs.Catalog;
using Ecommerce.Application.Interfaces.Catalog;
using Ecommerce.Application.Services.Catalog;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using MockQueryable.Moq;
using Moq;

namespace Ecommerce.UnitTests.Services;

/// <summary>
/// Unit tests for ProductService — covers CRUD operations, Cloudinary integration,
/// SKU/Slug generation, cache invalidation, and category validation.
/// </summary>
public class ProductServiceTests
{
    private readonly Mock<IRepository<Product>> _productRepoMock;
    private readonly Mock<IRepository<Category>> _categoryRepoMock;
    private readonly Mock<IRepository<OrderItem>> _orderItemRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<ICloudImageService> _cloudImageMock;
    private readonly Mock<IDistributedCache> _cacheMock;
    private readonly ProductService _sut;

    public ProductServiceTests()
    {
        _productRepoMock = new Mock<IRepository<Product>>();
        _categoryRepoMock = new Mock<IRepository<Category>>();
        _orderItemRepoMock = new Mock<IRepository<OrderItem>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _mapperMock = new Mock<IMapper>();
        _cloudImageMock = new Mock<ICloudImageService>();
        _cacheMock = new Mock<IDistributedCache>();

        _sut = new ProductService(
            _productRepoMock.Object,
            _categoryRepoMock.Object,
            _orderItemRepoMock.Object,
            _unitOfWorkMock.Object,
            _mapperMock.Object,
            _cloudImageMock.Object,
            _cacheMock.Object);
    }

    private static CreateProductRequestDto CreateValidDto() => new()
    {
        ProductName = "Classic T-Shirt",
        Price = 999,
        Discount = 0,
        Quantity = 25,
        Description = "Premium cotton tee",
        DeliverableZones = "150106, 673002",
        Variants =
        [
            new ProductVariantRequestDto
            {
                Size = "M",
                Color = "Black",
                Quantity = 25
            }
        ],
        Material = "100% Cotton",
        CategoryId = 1
    };

    private static Category CreateCategory() => new()
    {
        CategoryId = 1,
        CategoryName = "T-Shirts",
        Slug = "t-shirts",
        IsActive = true
    };

    private static Mock<IFormFile> CreateImageMock()
    {
        var imageMock = new Mock<IFormFile>();
        imageMock.SetupGet(file => file.Length).Returns(1024);
        imageMock.SetupGet(file => file.FileName).Returns("product.jpg");
        return imageMock;
    }

    // ==================== AddProduct Tests ====================

    [Fact]
    public async Task AddProductAsync_ValidDto_SavesProduct()
    {
        // Arrange
        var dto = CreateValidDto();
        var category = CreateCategory();
        var product = new Product { Id = Guid.NewGuid(), ProductName = dto.ProductName };
        var imageMock = CreateImageMock();

        var categories = new List<Category> { category }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(categories);
        _cloudImageMock.Setup(s => s.UploadImageAsync(It.IsAny<IFormFile>()))
            .ReturnsAsync("https://cloudinary.com/image.jpg");
        _mapperMock.Setup(m => m.Map<Product>(dto)).Returns(product);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        await _sut.AddProductAsync(dto, new[] { imageMock.Object });

        // Assert
        _productRepoMock.Verify(r => r.AddAsync(It.IsAny<Product>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task AddProductAsync_InvalidCategory_ThrowsArgumentException()
    {
        // Arrange — category doesn't exist
        var emptyCategories = new List<Category>().AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(emptyCategories);

        var dto = CreateValidDto();
        var imageMock = CreateImageMock();

        // Act & Assert
        var act = () => _sut.AddProductAsync(dto, new[] { imageMock.Object });
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Category*not found*");
    }

    [Fact]
    public async Task AddProductAsync_UploadsImageToCloudinary()
    {
        // Arrange
        var dto = CreateValidDto();
        var category = CreateCategory();
        var product = new Product { Id = Guid.NewGuid() };
        var imageMock = CreateImageMock();

        var categories = new List<Category> { category }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(categories);
        _mapperMock.Setup(m => m.Map<Product>(dto)).Returns(product);
        _cloudImageMock.Setup(s => s.UploadImageAsync(imageMock.Object))
            .ReturnsAsync("https://cloudinary.com/uploaded.jpg");
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        await _sut.AddProductAsync(dto, new[] { imageMock.Object });

        // Assert — Cloudinary upload must be called exactly once
        _cloudImageMock.Verify(s => s.UploadImageAsync(imageMock.Object), Times.Once);
    }

    [Fact]
    public async Task AddProductAsync_GeneratesSkuAndSlug()
    {
        // Arrange
        var dto = CreateValidDto();
        var category = CreateCategory();
        var product = new Product { Id = Guid.NewGuid(), ProductName = "Classic T-Shirt" };
        var imageMock = CreateImageMock();

        var categories = new List<Category> { category }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(categories);
        _mapperMock.Setup(m => m.Map<Product>(dto)).Returns(product);
        _cloudImageMock.Setup(s => s.UploadImageAsync(It.IsAny<IFormFile>()))
            .ReturnsAsync("https://cloudinary.com/img.jpg");
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        await _sut.AddProductAsync(dto, new[] { imageMock.Object });

        // Assert — SKU and Slug must be auto-generated (not null/empty)
        _productRepoMock.Verify(r => r.AddAsync(It.Is<Product>(p =>
            !string.IsNullOrEmpty(p.SKU) && !string.IsNullOrEmpty(p.Slug)
        )), Times.Once);
    }

    [Fact]
    public async Task AddProductAsync_InvalidatesCache()
    {
        // Arrange

        var dto = CreateValidDto();
        var category = CreateCategory();
        var product = new Product { Id = Guid.NewGuid() };
        var imageMock = CreateImageMock();

        var categories = new List<Category> { category }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(categories);
        _mapperMock.Setup(m => m.Map<Product>(dto)).Returns(product);
        _cloudImageMock.Setup(s => s.UploadImageAsync(It.IsAny<IFormFile>()))
            .ReturnsAsync("https://cloudinary.com/img.jpg");
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        await _sut.AddProductAsync(dto, new[] { imageMock.Object });

        // Assert — cache must be cleared after adding a product
        _cacheMock.Verify(c => c.Remove("products_cache"), Times.Once);
    }

    // ==================== UpdateProduct Tests ====================

    [Fact]
    public async Task UpdateProductAsync_ExistingProduct_ReturnsTrue()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var existingProduct = new Product { Id = productId, ProductName = "Old Name" };
        var dto = CreateValidDto();
        var category = CreateCategory();
        var imageMock = CreateImageMock();

        var products = new List<Product> { existingProduct }.AsQueryable().BuildMock();
        _productRepoMock.Setup(r => r.Query()).Returns(products);

        var categories = new List<Category> { category }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(categories);

        _cloudImageMock.Setup(s => s.UploadImageAsync(It.IsAny<IFormFile>()))
            .ReturnsAsync("https://cloudinary.com/updated.jpg");
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.UpdateProductAsync(productId, dto, new[] { imageMock.Object });

        // Assert
        result.Should().BeTrue();
        _productRepoMock.Verify(r => r.Update(It.IsAny<Product>()), Times.Once);
    }

    [Fact]
    public async Task UpdateProductAsync_UpdatesVariantRowsAndTotalStock()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var blackVariantId = Guid.NewGuid();
        var navyVariantId = Guid.NewGuid();
        const string existingImageUrl = "https://cloudinary.com/existing-shirt.jpg";
        var existingProduct = new Product
        {
            Id = productId,
            ProductName = "Existing Shirt",
            Image = existingImageUrl,
            ProductImages =
            [
                new ProductImage
                {
                    Id = Guid.NewGuid(),
                    ProductId = productId,
                    ImageUrl = existingImageUrl,
                    Color = null,
                    DisplayOrder = 0,
                    IsPrimary = true
                }
            ],
            Variants =
            [
                new ProductVariant
                {
                    Id = blackVariantId,
                    ProductId = productId,
                    SKU = "TSH-BLA-M-0001",
                    Size = "M",
                    Color = "Black",
                    Quantity = 2
                },
                new ProductVariant
                {
                    Id = navyVariantId,
                    ProductId = productId,
                    SKU = "TSH-NAV-L-0002",
                    Size = "L",
                    Color = "Navy",
                    Quantity = 3
                }
            ]
        };
        var dto = CreateValidDto();
        dto.Variants =
        [
            new ProductVariantRequestDto { Size = "M", Color = "Black", Quantity = 7 },
            new ProductVariantRequestDto { Size = "XL", Color = "Olive", Quantity = 4 }
        ];
        // Retain the existing image so BuildProductImagesAsync has at least one image
        dto.RetainedImageUrls = [existingImageUrl];
        dto.RetainedImageColors = [""]; // No color assignment (shared across all colours)
        var category = CreateCategory();

        var products = new List<Product> { existingProduct }.AsQueryable().BuildMock();
        _productRepoMock.Setup(r => r.Query()).Returns(products);

        var categories = new List<Category> { category }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(categories);

        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.UpdateProductAsync(productId, dto, Array.Empty<IFormFile>());

        // Assert
        result.Should().BeTrue();
        existingProduct.Quantity.Should().Be(11);
        existingProduct.AvailableSizes.Should().Be("M, XL");
        existingProduct.AvailableColors.Should().Be("Black, Olive");
        existingProduct.Variants.Should().HaveCount(2);
        existingProduct.Variants.Should().ContainSingle(v => v.Id == blackVariantId && v.Size == "M" && v.Color == "Black" && v.Quantity == 7);
        existingProduct.Variants.Should().ContainSingle(v => v.Id == navyVariantId && v.Size == "XL" && v.Color == "Olive" && v.Quantity == 4);
        existingProduct.Variants.Should().NotContain(v => v.Color == "Navy");
        _productRepoMock.Verify(r => r.Update(existingProduct), Times.Once);
    }

    [Fact]
    public async Task UpdateProductAsync_NonExistentProduct_ReturnsFalse()
    {
        // Arrange — empty product list
        var emptyProducts = new List<Product>().AsQueryable().BuildMock();
        _productRepoMock.Setup(r => r.Query()).Returns(emptyProducts);

        var dto = CreateValidDto();
        var imageMock = CreateImageMock();

        // Act
        var result = await _sut.UpdateProductAsync(Guid.NewGuid(), dto, new[] { imageMock.Object });

        // Assert
        result.Should().BeFalse();
    }

    // ==================== DeleteProduct Tests ====================

    [Fact]
    public async Task DeleteProductAsync_ExistingProduct_ReturnsTrue()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var product = new Product { Id = productId };
        _productRepoMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.DeleteProductAsync(productId);

        // Assert
        result.Should().BeTrue();
        _productRepoMock.Verify(r => r.Remove(product), Times.Once);
    }

    [Fact]
    public async Task DeleteProductAsync_NonExistentProduct_ReturnsFalse()
    {
        // Arrange
        _productRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Product?)null);

        // Act
        var result = await _sut.DeleteProductAsync(Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
    }

    // ==================== GetProduct Tests ====================

    [Fact]
    public async Task GetProductByIdAsync_NonExistent_ThrowsArgumentException()
    {
        // Arrange — no products
        var emptyProducts = new List<Product>().AsQueryable().BuildMock();
        _productRepoMock.Setup(r => r.Query()).Returns(emptyProducts);

        // Act & Assert
        var act = () => _sut.GetProductByIdAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*not found*");
    }
}
