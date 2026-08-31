using Ecommerce.Application.DTOs.Reviews;
using Ecommerce.Application.Interfaces.Reviews;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Asp.Versioning;

namespace Ecommerce.Api.Controllers.Reviews
{
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiController]
    [ApiVersion("1.0")]
    public class ReviewController : ControllerBase
    {
        private readonly IReviewService _reviewService;
        public ReviewController(IReviewService reviewService) => _reviewService = reviewService;

        private Guid GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null || !Guid.TryParse(claim.Value, out var userId))
                throw new UnauthorizedAccessException("User id not found in token");
            return userId;
        }

        [HttpGet("product/{productId:guid}")]
        public async Task<IActionResult> GetByProduct(Guid productId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _reviewService.GetReviewsByProductAsync(productId, pageNumber, pageSize);
            return Ok(result);
        }

        [HttpPost("{productId:guid}")]
        [Authorize]
        public async Task<IActionResult> CreateReview(Guid productId, [FromBody] CreateReviewDto dto)
        {
            var userId = GetUserId();
            var review = await _reviewService.CreateReviewAsync(userId, productId, dto);
            return Ok(review);
        }

        [HttpPut("{reviewId:int}")]
        [Authorize]
        public async Task<IActionResult> UpdateReview(int reviewId, [FromBody] UpdateReviewDto dto)
        {
            var userId = GetUserId();
            var success = await _reviewService.UpdateReviewAsync(userId, reviewId, dto);
            return success ? Ok(new { message = "Review updated" }) : NotFound(new { message = "Review not found" });
        }

        [HttpDelete("{reviewId:int}")]
        [Authorize]
        public async Task<IActionResult> DeleteReview(int reviewId)
        {
            var userId = GetUserId();
            var success = await _reviewService.DeleteReviewAsync(userId, reviewId);
            return success ? Ok(new { message = "Review deleted" }) : NotFound(new { message = "Review not found" });
        }
    }
}