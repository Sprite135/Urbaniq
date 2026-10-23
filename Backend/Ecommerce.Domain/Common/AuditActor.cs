namespace Ecommerce.Domain.Common;

// AsyncLocal keeps request identity isolated across concurrent requests and jobs.
public static class AuditActor
{
    public static readonly AsyncLocal<string?> Current = new();
}
