namespace Ecommerce.Application.DTOs.Address
{
    public class CreateAddressRequestDto
    {
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
    }
}
