using AutoMapper;
using Ecommerce.Application.DTOs.Category;
using Ecommerce.Application.Extensions;
using Ecommerce.Application.Interfaces.Catalog;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.RegularExpressions;

namespace Ecommerce.Application.Services.Catalog
{
    /// <summary>
    /// Handles category management with hierarchical tree support.
    /// Categories form a two-level structure: Root → Subcategories.
    /// Auto-generates URL slugs from category names and parent paths.
    /// </summary>
    public class CategoryService : ICategoryService
    {
        private readonly IRepository<Category> _categoryRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly IDistributedCache _cache;
        private readonly ICloudImageService _cloudImageService;
        private const string CATEGORY_TREE_CACHE_KEY = "category_tree_active";

        public CategoryService(IRepository<Category> categoryRepo, IUnitOfWork unitOfWork, IMapper mapper, IDistributedCache cache, ICloudImageService cloudImageService)
        {
            _categoryRepo = categoryRepo;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _cache = cache;
            _cloudImageService = cloudImageService;
        }

        /// <inheritdoc />
        public async Task<string> CreateCategoryAsync(CreateCategoryRequestDto createCategory)
        {
            if (createCategory == null || string.IsNullOrWhiteSpace(createCategory.CategoryName))
                throw new ArgumentException("Invalid category data.");

            // Check for duplicate name under the same parent
            bool exists = await _categoryRepo.Query()
                .AnyAsync(c => c.CategoryName.ToLower() == createCategory.CategoryName.ToLower()
                            && c.ParentCategoryId == createCategory.ParentCategoryId);

            if (exists)
                throw new ArgumentException("A category with this name already exists under the same parent.");

            // Validate parent category exists if ParentCategoryId is provided
            string parentSlug = string.Empty;
            if (createCategory.ParentCategoryId.HasValue)
            {
                var parent = await _categoryRepo.Query()
                    .FirstOrDefaultAsync(c => c.CategoryId == createCategory.ParentCategoryId.Value);

                if (parent == null)
                    throw new ArgumentException($"Parent category with ID {createCategory.ParentCategoryId} not found.");

                parentSlug = parent.Slug;
            }

            var category = _mapper.Map<Category>(createCategory);

            // Auto-generate URL-friendly slug from name and parent path
            var nameSlug = GenerateSlug(createCategory.CategoryName);
            category.Slug = string.IsNullOrEmpty(parentSlug) ? nameSlug : $"{parentSlug}/{nameSlug}";

            await _categoryRepo.AddAsync(category);
            await _unitOfWork.SaveChangesAsync();
            await InvalidateCategoryCachesAsync();

            return "Category added successfully.";
        }

        /// <inheritdoc />
        public async Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync()
        {
            var categories = await _categoryRepo.Query()
                .AsNoTracking()
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            return _mapper.Map<IEnumerable<CategoryResponseDto>>(categories);
        }

        /// <inheritdoc />
        public async Task<IEnumerable<CategoryResponseDto>> GetCategoryTreeAsync()
        {
            var cachedTree = await _cache.GetRecordAsync<List<CategoryResponseDto>>(CATEGORY_TREE_CACHE_KEY);
            if (cachedTree != null)
            {
                return cachedTree;
            }

            // Fetch all categories in a single query (no N+1 problem)
            var allCategories = await _categoryRepo.Query()
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            // Build tree structure in-memory for efficiency
            var categoryDtos = _mapper.Map<List<CategoryResponseDto>>(allCategories);
            var lookup = categoryDtos.ToDictionary(c => c.CategoryId);

            var rootCategories = new List<CategoryResponseDto>();

            foreach (var dto in categoryDtos)
            {
                if (dto.ParentCategoryId.HasValue && lookup.TryGetValue(dto.ParentCategoryId.Value, out var parent))
                {
                    // Attach subcategory to its parent
                    parent.SubCategories.Add(dto);
                }
                else
                {
                    // Root category (no parent)
                    rootCategories.Add(dto);
                }
            }

            await _cache.SetRecordAsync(CATEGORY_TREE_CACHE_KEY, rootCategories, TimeSpan.FromMinutes(10));
            return rootCategories;
        }

        /// <inheritdoc />
        public async Task<CategoryResponseDto?> GetCategoryBySlugAsync(string slug)
        {
            var category = await _categoryRepo.Query()
                .AsNoTracking()
                .Include(c => c.SubCategories.Where(sc => sc.IsActive).OrderBy(sc => sc.DisplayOrder))
                .FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive);

            return category == null ? null : _mapper.Map<CategoryResponseDto>(category);
        }

        /// <inheritdoc />
        public async Task<IEnumerable<CategoryResponseDto>> GetSubCategoriesAsync(int parentCategoryId)
        {
            var subCategories = await _categoryRepo.Query()
                .AsNoTracking()
                .Where(c => c.ParentCategoryId == parentCategoryId && c.IsActive)
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            return _mapper.Map<IEnumerable<CategoryResponseDto>>(subCategories);
        }

        /// <summary>
        /// Generates a URL-friendly slug from a name string.
        /// Example: "Cargo Pants" → "cargo-pants", "T-Shirts" → "t-shirts"
        /// </summary>
        private static string GenerateSlug(string name)
        {
            var slug = name.ToLowerInvariant();
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
            slug = Regex.Replace(slug, @"\s+", "-");
            slug = Regex.Replace(slug, @"-+", "-");
            return slug.Trim('-');
        }

        /// <inheritdoc />
        public async Task<bool> ToggleCategoryStatusAsync(int categoryId)
        {
            var category = await _categoryRepo.Query()
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

            if (category == null)
                throw new ArgumentException($"Category with ID {categoryId} not found.");

            category.IsActive = !category.IsActive;
            await _unitOfWork.SaveChangesAsync();
            await InvalidateCategoryCachesAsync();

            return category.IsActive;
        }

        /// <inheritdoc />
        public async Task DeleteCategoryAsync(int categoryId)
        {
            var category = await _categoryRepo.Query()
                .Include(c => c.SubCategories)
                .Include(c => c.Products)
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

            if (category == null)
                throw new ArgumentException($"Category with ID {categoryId} not found.");

            if (category.SubCategories.Any())
                throw new InvalidOperationException("Cannot delete a category that contains subcategories. Delete the subcategories first.");

            if (category.Products.Any())
                throw new InvalidOperationException("Cannot delete a category that contains products. Reassign or delete the products first.");

            _categoryRepo.Remove(category);
            await _unitOfWork.SaveChangesAsync();
            await InvalidateCategoryCachesAsync();
        }

        private async Task InvalidateCategoryCachesAsync()
        {
            try
            {
                await _cache.RemoveAsync(CATEGORY_TREE_CACHE_KEY);
            }
            catch (Exception)
            {
                // Category writes should not fail just because Redis is temporarily unavailable.
            }
        }

        /// <inheritdoc />
        public async Task<string> UploadCategoryImageAsync(int categoryId, IFormFile file)
        {
            var category = await _categoryRepo.Query()
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

            if (category == null)
                throw new ArgumentException($"Category with ID {categoryId} not found.");

            var imageUrl = await _cloudImageService.UploadImageAsync(file);
            category.ImageUrl = imageUrl;
            _categoryRepo.Update(category);
            await _unitOfWork.SaveChangesAsync();
            await InvalidateCategoryCachesAsync();

            return imageUrl;
        }
    }
}
