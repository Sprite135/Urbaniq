using Ecommerce.Application.DTOs.Category;
using Microsoft.AspNetCore.Http;

namespace Ecommerce.Application.Interfaces.Catalog
{
    /// <summary>
    /// Manages product categories — CRUD operations with hierarchy support.
    /// Categories form a tree structure (root → subcategories) for the clothing store navigation.
    /// </summary>
    public interface ICategoryService
    {
        /// <summary>
        /// Creates a new category. If ParentCategoryId is provided, creates a subcategory.
        /// Auto-generates the slug from the category name and parent path.
        /// </summary>
        Task<string> CreateCategoryAsync(CreateCategoryRequestDto createCategory);

        /// <summary>
        /// Returns all categories as a flat list (no nesting).
        /// Useful for admin dropdowns and category selection.
        /// </summary>
        Task<IEnumerable<CategoryResponseDto>> GetAllCategoriesAsync();

        /// <summary>
        /// Returns the complete category hierarchy as a nested tree structure.
        /// Root categories contain their subcategories in the SubCategories property.
        /// Used for storefront navigation menus.
        /// </summary>
        Task<IEnumerable<CategoryResponseDto>> GetCategoryTreeAsync();

        /// <summary>
        /// Finds a category by its URL-friendly slug (e.g., "top-wear/t-shirts").
        /// Used for frontend routing — URL path maps directly to category.
        /// </summary>
        Task<CategoryResponseDto?> GetCategoryBySlugAsync(string slug);

        /// <summary>
        /// Returns immediate child subcategories of a given parent category.
        /// Example: GetSubCategoriesAsync(topWearId) returns T-Shirts, Shirts, Hoodies, etc.
        /// </summary>
        Task<IEnumerable<CategoryResponseDto>> GetSubCategoriesAsync(int parentCategoryId);

        /// <summary>
        /// Toggles the IsActive status of a category. Inactive categories are hidden from
        /// the storefront navigation and cannot be assigned to products.
        /// Returns true if the category is now active, false if now inactive.
        /// </summary>
        Task<bool> ToggleCategoryStatusAsync(int categoryId);

        /// <summary>
        /// Deletes a category by its ID.
        /// </summary>
        Task DeleteCategoryAsync(int categoryId);

        /// <summary>
        /// Uploads an image for a category and returns its URL.
        /// </summary>
        Task<string> UploadCategoryImageAsync(int categoryId, IFormFile file);
    }
}
