namespace Ecommerce.Application.DTOs.Reviews
{
    public class ReviewResponseDto
    {
        public int ReviewId { get; set; }
        public Guid ProductId { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public int Rating { get; set; }
        public string Title { get; set; }
        public string Comment { get; set; }
        public bool IsVerifiedPurchase { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}