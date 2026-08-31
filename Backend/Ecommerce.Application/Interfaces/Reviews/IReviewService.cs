using Ecommerce.Application.DTOs.Reviews;
using Ecommerce.Domain.Common;

namespace Ecommerce.Application.Interfaces.Reviews
{
    /// <summary>
    /// Manages product reviews — add, view, and moderate operations.
    /// </summary>
    public interface IReviewService
    {
        Task<PagedResult<ReviewResponseDto>> GetReviewsByProductAsync(Guid productId, int pageNumber = 1, int pageSize = 10);
        Task<ReviewResponseDto?> CreateReviewAsync(Guid userId, Guid productId, CreateReviewDto dto);
        Task<bool> UpdateReviewAsync(Guid userId, int reviewId, UpdateReviewDto dto);
        Task<bool> DeleteReviewAsync(Guid userId, int reviewId);
    }
}