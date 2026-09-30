using AutoMapper;
using Ecommerce.Application.DTOs.Category;
using Ecommerce.Application.Services.Catalog;
using Ecommerce.Application.Interfaces.Catalog;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MockQueryable.Moq;
using Moq;

namespace Ecommerce.UnitTests.Services;

/// <summary>
/// Unit tests for CategoryService — covers category creation, duplicate detection,
/// parent validation, slug generation, and hierarchical tree building.
/// </summary>
public class CategoryServiceTests
{
    private readonly Mock<IRepository<Category>> _categoryRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<ICloudImageService> _cloudImageServiceMock;
    private readonly CategoryService _sut;

    public CategoryServiceTests()
    {
        _categoryRepoMock = new Mock<IRepository<Category>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _mapperMock = new Mock<IMapper>();
        _cloudImageServiceMock = new Mock<ICloudImageService>();

        _sut = new CategoryService(
            _categoryRepoMock.Object,
            _unitOfWorkMock.Object,
            _mapperMock.Object,
            new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions())),
            _cloudImageServiceMock.Object);
    }

    // ==================== CreateCategory Tests ====================

    [Fact]
    public async Task CreateCategoryAsync_ValidDto_ReturnsSuccessMessage()
    {
        // Arrange — no existing category with same name
        var emptyCategories = new List<Category>().AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(emptyCategories);

        var dto = new CreateCategoryRequestDto { CategoryName = "T-Shirts", DisplayOrder = 1 };
        var category = new Category { CategoryId = 1, CategoryName = "T-Shirts" };

        _mapperMock.Setup(m => m.Map<Category>(dto)).Returns(category);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        var result = await _sut.CreateCategoryAsync(dto);

        // Assert
        result.Should().Contain("successfully");
        _categoryRepoMock.Verify(r => r.AddAsync(It.IsAny<Category>()), Times.Once);
    }

    [Fact]
    public async Task CreateCategoryAsync_NullOrEmptyName_ThrowsArgumentException()
    {
        // Arrange
        var dto = new CreateCategoryRequestDto { CategoryName = "", DisplayOrder = 1 };

        // Act & Assert
        var act = () => _sut.CreateCategoryAsync(dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Invalid category data*");
    }

    [Fact]
    public async Task CreateCategoryAsync_DuplicateName_ThrowsArgumentException()
    {
        // Arrange — a category with the same name already exists under the same parent
        var existing = new Category { CategoryId = 1, CategoryName = "T-Shirts", ParentCategoryId = null };
        var categories = new List<Category> { existing }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(categories);

        var dto = new CreateCategoryRequestDto { CategoryName = "T-Shirts", ParentCategoryId = null };

        // Act & Assert
        var act = () => _sut.CreateCategoryAsync(dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task CreateCategoryAsync_InvalidParent_ThrowsArgumentException()
    {
        // Arrange — no duplicate names but parent category doesn't exist
        var emptyCategories = new List<Category>().AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(emptyCategories);

        var dto = new CreateCategoryRequestDto { CategoryName = "T-Shirts", ParentCategoryId = 999 };

        // Act & Assert
        var act = () => _sut.CreateCategoryAsync(dto);
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Parent category*not found*");
    }

    [Fact]
    public async Task CreateCategoryAsync_WithValidParent_GeneratesNestedSlug()
    {
        // Arrange — parent category "Top Wear" exists with slug "top-wear"
        var parent = new Category { CategoryId = 1, CategoryName = "Top Wear", Slug = "top-wear" };

        // First query checks for duplicates (none found), second query finds parent
        _categoryRepoMock.SetupSequence(r => r.Query())
            .Returns(new List<Category>().AsQueryable().BuildMock())           // Duplicate check
            .Returns(new List<Category> { parent }.AsQueryable().BuildMock()); // Parent lookup

        var dto = new CreateCategoryRequestDto
        {
            CategoryName = "T-Shirts", ParentCategoryId = 1, DisplayOrder = 1
        };

        var category = new Category { CategoryName = "T-Shirts" };
        _mapperMock.Setup(m => m.Map<Category>(dto)).Returns(category);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        // Act
        await _sut.CreateCategoryAsync(dto);

        // Assert — slug should be "top-wear/t-shirts" (nested under parent)
        category.Slug.Should().Be("top-wear/t-shirts");
    }

    // ==================== GetCategoryTree Tests ====================

    [Fact]
    public async Task GetCategoryTreeAsync_ReturnsNestedHierarchy()
    {
        // Arrange — flat list of categories with parent-child relationships
        var rootCategory = new Category
        {
            CategoryId = 1, CategoryName = "Top Wear", Slug = "top-wear",
            IsActive = true, ParentCategoryId = null, DisplayOrder = 1
        };
        var childCategory = new Category
        {
            CategoryId = 2, CategoryName = "T-Shirts", Slug = "top-wear/t-shirts",
            IsActive = true, ParentCategoryId = 1, DisplayOrder = 1
        };

        var allCategories = new List<Category> { rootCategory, childCategory }.AsQueryable().BuildMock();
        _categoryRepoMock.Setup(r => r.Query()).Returns(allCategories);

        var rootDto = new CategoryResponseDto
        {
            CategoryId = 1, CategoryName = "Top Wear", Slug = "top-wear",
            IsActive = true, ParentCategoryId = null
        };
        var childDto = new CategoryResponseDto
        {
            CategoryId = 2, CategoryName = "T-Shirts", Slug = "top-wear/t-shirts",
            IsActive = true, ParentCategoryId = 1
        };

        _mapperMock.Setup(m => m.Map<List<CategoryResponseDto>>(It.IsAny<List<Category>>()))
            .Returns(new List<CategoryResponseDto> { rootDto, childDto });

        // Act
        var result = await _sut.GetCategoryTreeAsync();

        // Assert — root categories should contain their children
        var tree = result.ToList();
        tree.Should().HaveCount(1); // Only 1 root category
        tree[0].CategoryName.Should().Be("Top Wear");
        tree[0].SubCategories.Should().HaveCount(1);
        tree[0].SubCategories[0].CategoryName.Should().Be("T-Shirts");
    }
}
