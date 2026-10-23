namespace Ecommerce.Application.DTOs.Orders
{
    public class ChangeOrderStatusRequestDto
    {
        public string Status { get; set; } = null!;
        public string? Reason { get; set; }
    }
}
