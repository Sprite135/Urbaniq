using Ecommerce.Domain.Interfaces;

namespace Ecommerce.Domain.Entities
{
    public class Address : ISoftDeletable
    {
        public Guid AddressId { get; set; }
        public Guid UserId { get; set; }
        public string FullName { get; set; } = null!;
        public string PhoneNumber { get; set; } = null!;
        public string? PostalCode { get; set; }
        public string? Department { get; set; }
        public string? Province { get; set; }
        public string? District { get; set; }
        public string? DeliveryZone { get; set; }
        public string HouseName { get; set; } = null!;
        public string Place { get; set; } = null!;
        public string Reference { get; set; } = null!;
        public string LandMark { get; set; } = null!;

        // Soft Delete
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }

        // Navigation Properties
        public User User { get; set; } = null!;
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
