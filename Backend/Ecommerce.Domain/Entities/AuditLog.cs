namespace Ecommerce.Domain.Entities;

public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime AtUtc { get; set; } = DateTime.UtcNow;
    public string Actor { get; set; } = "system";
    public string Entity { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string ChangesJson { get; set; } = "{}";
}
