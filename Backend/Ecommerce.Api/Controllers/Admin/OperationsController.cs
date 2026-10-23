using Asp.Versioning;
using Ecommerce.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Api.Controllers.Admin;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/admin/operations")]
[Authorize(Roles = "Admin")]
public sealed class OperationsController(AppDbContext db) : ControllerBase
{
    [HttpGet("audit")]
    public async Task<IActionResult> Audit([FromQuery] int limit = 100)
        => Ok(await db.AuditLogs.AsNoTracking().OrderByDescending(x => x.AtUtc)
            .Take(Math.Clamp(limit, 1, 200)).ToListAsync());

    [HttpGet("email-outbox")]
    public async Task<IActionResult> EmailOutbox([FromQuery] int limit = 100)
        => Ok(await db.OutboxEmails.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc)
            .Take(Math.Clamp(limit, 1, 200)).Select(x => new
            {
                x.Id, x.Recipient, x.Subject, x.CreatedAtUtc, x.SentAtUtc, x.Attempts, x.NextAttemptAtUtc, x.LastError
            }).ToListAsync());

    [HttpPost("email-outbox/{id:guid}/retry")]
    public async Task<IActionResult> RetryEmail(Guid id)
    {
        var email = await db.OutboxEmails.FirstOrDefaultAsync(x => x.Id == id);
        if (email == null) return NotFound(new { message = "Correo no encontrado." });
        if (email.SentAtUtc != null) return BadRequest(new { message = "El correo ya fue enviado." });
        email.Attempts = 0;
        email.NextAttemptAtUtc = DateTime.UtcNow;
        email.LastError = null;
        await db.SaveChangesAsync();
        return Ok(new { message = "Correo programado para reintento." });
    }
}
