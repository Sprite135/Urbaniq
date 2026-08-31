namespace Ecommerce.Application.DTOs.Reviews
{
    public class UpdateReviewDto
    {
        public int? Rating { get; set; }
        public string? Title { get; set; }
        public string? Comment { get; set; }
    }
}