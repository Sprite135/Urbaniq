using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Services;

public sealed class QueuedEmailHostedService(IServiceScopeFactory scopeFactory, ILogger<QueuedEmailHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await SendNextAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Email outbox processing failed"); }
            try { await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task SendNextAsync(CancellationToken token)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        for (var count = 0; count < 20; count++)
        {
            var now = DateTime.UtcNow;
            var email = await db.OutboxEmails.Where(e => e.SentAtUtc == null && e.Attempts < 8 && e.NextAttemptAtUtc <= now)
                .OrderBy(e => e.CreatedAtUtc).FirstOrDefaultAsync(token);
            if (email == null) return;
            email.Attempts++;
            email.NextAttemptAtUtc = now.AddMinutes(5);
            try { await db.SaveChangesAsync(token); }
            catch (DbUpdateConcurrencyException) { db.ChangeTracker.Clear(); continue; }
            try
            {
                await scope.ServiceProvider.GetRequiredService<IEmailSender>().SendAsync(email.Recipient, email.Subject, email.HtmlBody);
                email.SentAtUtc = DateTime.UtcNow;
                email.LastError = null;
            }
            catch (Exception ex)
            {
                email.LastError = ex.GetType().Name;
                email.NextAttemptAtUtc = DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, email.Attempts)));
                logger.LogError(ex, "Outbox email {EmailId} failed on attempt {Attempt}", email.Id, email.Attempts);
            }
            await db.SaveChangesAsync(token);
        }
    }
}
