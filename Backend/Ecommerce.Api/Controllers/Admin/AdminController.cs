using Ecommerce.Application.DTOs.Category;
using Ecommerce.Application.DTOs.Identity;
using Ecommerce.Application.Interfaces.Catalog;
using Ecommerce.Application.Interfaces.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;

namespace Ecommerce.Api.Controllers.Admin
{
    /// <summary>
    /// Admin operations — user management and category management endpoints.
    /// All endpoints require Admin role unless explicitly marked [AllowAnonymous].
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IUserManagementService _userManagementService;
        private readonly ICategoryService _categoryService;
        private readonly Ecommerce.Application.Interfaces.Admin.IDashboardService _dashboardService;

        public AdminController(
            IUserManagementService userManagementService, 
            ICategoryService categoryService,
            Ecommerce.Application.Interfaces.Admin.IDashboardService dashboardService)
        {
            _userManagementService = userManagementService;
            _categoryService = categoryService;
            _dashboardService = dashboardService;
        }

        // ==================== User Management ====================

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
            => Ok(await _userManagementService.GetAllUsersAsync(pageNumber, pageSize));

        [HttpPatch("users/block-unblock/{userId}")]
        public async Task<IActionResult> ToggleUserBlockStatus(Guid userId)
        {
            var isBlocked = await _userManagementService.ToggleUserBlockStatusAsync(userId);
            return Ok(new { message = isBlocked ? "User blocked" : "User unblocked" });
        }

        // ==================== Dashboard ====================

        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
            => Ok(await _dashboardService.GetDashboardStatsAsync());

        [HttpGet("low-stock-products")]
        public async Task<IActionResult> GetLowStockProducts([FromQuery] int threshold = 10, [FromQuery] int limit = 5)
            => Ok(await _dashboardService.GetLowStockProductsAsync(threshold, limit));

        // ==================== Category Management ====================

        /// <summary>
        /// Creates a new category. Set ParentCategoryId to create a subcategory.
        /// </summary>
        [HttpPost("categories")]
        public async Task<IActionResult> AddCategory([FromBody] CreateCategoryRequestDto dto)
        {
            if (dto == null) return BadRequest(new { message = "Category data is required." });
            var message = await _categoryService.CreateCategoryAsync(dto);
            return Ok(new { message });
        }

        /// <summary>
        /// Returns all categories as a flat list (for admin dropdowns).
        /// </summary>
        [HttpGet("categories")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCategories()
            => Ok(await _categoryService.GetAllCategoriesAsync());

        /// <summary>
        /// Returns the complete category hierarchy as a nested tree.
        /// Used by the storefront for navigation menus.
        /// </summary>
        [HttpGet("categories/tree")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCategoryTree()
            => Ok(await _categoryService.GetCategoryTreeAsync());

        /// <summary>
        /// Returns a specific category by its URL-friendly slug.
        /// Includes immediate subcategories in the response.
        /// </summary>
        [HttpGet("categories/slug/{*slug}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCategoryBySlug(string slug)
        {
            var category = await _categoryService.GetCategoryBySlugAsync(slug);
            return category == null
                ? NotFound(new { message = $"Category with slug '{slug}' not found." })
                : Ok(category);
        }

        /// <summary>
        /// Returns immediate subcategories of a parent category.
        /// </summary>
        [HttpGet("categories/{parentId}/subcategories")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSubCategories(int parentId)
            => Ok(await _categoryService.GetSubCategoriesAsync(parentId));

        /// <summary>
        /// Toggles a category's active/inactive status.
        /// Inactive categories are hidden from storefront navigation.
        /// </summary>
        [HttpPatch("categories/{categoryId}/toggle-status")]
        public async Task<IActionResult> ToggleCategoryStatus(int categoryId)
        {
            var isActive = await _categoryService.ToggleCategoryStatusAsync(categoryId);
            return Ok(new { message = isActive ? "Category activated" : "Category deactivated", isActive });
        }

        /// <summary>
        /// Deletes a category. Hard delete.
        /// Fails if category has subcategories or products.
        /// </summary>
        [HttpDelete("categories/{categoryId}")]
        public async Task<IActionResult> DeleteCategory(int categoryId)
        {
            try
            {
                await _categoryService.DeleteCategoryAsync(categoryId);
                return Ok(new { message = "Category deleted successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Uploads an image for a category and returns its URL.
        /// </summary>
        [HttpPost("categories/{categoryId}/image")]
        public async Task<IActionResult> UploadCategoryImage(int categoryId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!new[] { ".png", ".jpg", ".jpeg", ".webp" }.Contains(ext))
                return BadRequest(new { message = "Unsupported file type. Use png, jpg, jpeg or webp." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File too large (max 5 MB)." });

            try
            {
                var imageUrl = await _categoryService.UploadCategoryImageAsync(categoryId, file);
                return Ok(new { imageUrl });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Failed to upload image: {ex.Message}" });
            }
        }
    }
}
