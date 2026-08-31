namespace Ecommerce.Application.DTOs.Orders
{
    public class AttachVoucherRequestDto
    {
        public string? Url { get; set; }

        /// <summary>Yape/Plin 6-digit approval code the customer sends to the merchant.</summary>
        public string? ApprovalCode { get; set; }
    }
}
