using AutoMapper;
using Ecommerce.Application.DTOs.Reviews;
using Ecommerce.Application.Interfaces.Reviews;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Services.Reviews
{
    public class ReviewService : IReviewService
    {
        private readonly IRepository<Review> _reviewRepo;
        private readonly IRepository<Product> _productRepo;
        private readonly IRepository<Order> _orderRepo;
        private readonly IRepository<OrderItem> _orderItemRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public ReviewService(
            IRepository<Review> reviewRepo,
            IRepository<Product> productRepo,
            IRepository<Order> orderRepo,
            IRepository<OrderItem> orderItemRepo,
            IRepository<User> userRepo,
            IUnitOfWork unitOfWork,
            IMapper mapper)
        {
            _reviewRepo = reviewRepo;
            _productRepo = productRepo;
            _orderRepo = orderRepo;
            _orderItemRepo = orderItemRepo;
            _userRepo = userRepo;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<PagedResult<ReviewResponseDto>> GetReviewsByProductAsync(Guid productId, int pageNumber = 1, int pageSize = 10)
        {
            var query = _reviewRepo.Query()
                .Where(r => r.ProductId == productId && !r.IsDeleted && r.IsApproved)
                .Include(r => r.User)
                .OrderByDescending(r => r.CreatedAt);

            var totalCount = await query.CountAsync();
            var reviews = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtoList = reviews.Select(r => new ReviewResponseDto
            {
                ReviewId = r.ReviewId,
                ProductId = r.ProductId,
                UserId = r.UserId,
                UserName = r.User?.Name ?? "Usuario",
                Rating = r.Rating,
                Title = r.Title,
                Comment = r.Comment,
                IsVerifiedPurchase = r.IsVerifiedPurchase,
                CreatedAt = r.CreatedAt
            }).ToList();

            return new PagedResult<ReviewResponseDto>
            {
                Items = dtoList,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<ReviewResponseDto?> CreateReviewAsync(Guid userId, Guid productId, CreateReviewDto dto)
        {
            // Validate rating
            if (dto.Rating < 1 || dto.Rating > 5)
                throw new ArgumentException("Rating must be between 1 and 5");

            // Check if product exists
            var product = await _productRepo.Query().FirstOrDefaultAsync(p => p.Id == productId);
            if (product == null)
                throw new ArgumentException("Product not found");

            // Check if user already reviewed this product
            var existing = await _reviewRepo.Query()
                .FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == productId);
            if (existing != null)
                throw new InvalidOperationException("You have already reviewed this product");

            // Check if user has purchased this product (verified purchase)
            var hasPurchased = await _orderItemRepo.Query()
                .Include(oi => oi.Order)
                .AnyAsync(oi => oi.Order.UserId == userId 
                    && oi.ProductId == productId 
                    && (oi.Order.OrderStatus == OrderStatus.Delivered || oi.Order.OrderStatus == OrderStatus.Shipped));

            var review = new Review
            {
                ProductId = productId,
                UserId = userId,
                Rating = dto.Rating,
                Title = dto.Title,
                Comment = dto.Comment,
                IsVerifiedPurchase = hasPurchased,
                CreatedAt = DateTime.UtcNow
            };

            await _reviewRepo.AddAsync(review);
            await _unitOfWork.SaveChangesAsync();

            return new ReviewResponseDto
            {
                ReviewId = review.ReviewId,
                ProductId = productId,
                UserId = userId,
                UserName = "Usuario", // Will be populated by the controller if needed
                Rating = review.Rating,
                Title = review.Title,
                Comment = review.Comment,
                IsVerifiedPurchase = review.IsVerifiedPurchase,
                CreatedAt = review.CreatedAt
            };
        }

        public async Task<bool> UpdateReviewAsync(Guid userId, int reviewId, UpdateReviewDto dto)
        {
            var review = await _reviewRepo.Query().FirstOrDefaultAsync(r => r.ReviewId == reviewId && r.UserId == userId);
            if (review == null)
                return false;

            if (dto.Rating.HasValue)
            {
                if (dto.Rating < 1 || dto.Rating > 5)
                    throw new ArgumentException("Rating must be between 1 and 5");
                review.Rating = dto.Rating.Value;
            }

            if (!string.IsNullOrEmpty(dto.Title))
                review.Title = dto.Title;

            if (!string.IsNullOrEmpty(dto.Comment))
                review.Comment = dto.Comment;

            _reviewRepo.Update(review);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteReviewAsync(Guid userId, int reviewId)
        {
            var review = await _reviewRepo.Query().FirstOrDefaultAsync(r => r.ReviewId == reviewId && r.UserId == userId);
            if (review == null)
                return false;

            review.IsDeleted = true;
            review.DeletedAt = DateTime.UtcNow;
            _reviewRepo.Update(review);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}