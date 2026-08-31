using System.ComponentModel.DataAnnotations;

namespace Ecommerce.Application.DTOs.Coupons
{
    public class ValidateCouponDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; }

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal CartTotal { get; set; }

        public List<Guid>? ProductIds { get; set; }

        public List<int>? CategoryIds { get; set; }

        public Guid? UserId { get; set; }
    }
}