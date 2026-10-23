using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Domain.Entities;
using Ecommerce.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;

namespace Ecommerce.Infrastructure.Services;

public sealed class BackgroundEmailJobQueue(IServiceScopeFactory scopeFactory) : IEmailJobQueue
{
    public async ValueTask QueueAsync(EmailJobMessage message, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(message);
        if (string.IsNullOrWhiteSpace(message.ToEmail)) throw new ArgumentException("Recipient email is required.");
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.OutboxEmails.Add(new OutboxEmail { Recipient = message.ToEmail, Subject = message.Subject, HtmlBody = message.HtmlBody });
        await db.SaveChangesAsync(cancellationToken);
    }
}
