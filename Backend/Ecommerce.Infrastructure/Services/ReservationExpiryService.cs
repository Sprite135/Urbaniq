using Ecommerce.Application.Interfaces.Orders;
using Ecommerce.Domain.Enums;
using Ecommerce.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Infrastructure.Services;

public sealed class ReservationExpiryService(IServiceScopeFactory scopeFactory, ILogger<ReservationExpiryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var lookup = scopeFactory.CreateScope();
                var now = DateTime.UtcNow;
                var ids = await lookup.ServiceProvider.GetRequiredService<AppDbContext>().Orders
                    .Where(o => !o.IsPaid && o.OrderStatus == OrderStatus.Pending && o.PaymentDueAtUtc <= now)
                    .OrderBy(o => o.PaymentDueAtUtc).Select(o => o.OrderId).Take(100).ToListAsync(stoppingToken);
                foreach (var id in ids)
                {
                    using var scope = scopeFactory.CreateScope();
                    try { await scope.ServiceProvider.GetRequiredService<IOrderService>().ExpirePendingOrderAsync(id); }
                    catch (DbUpdateConcurrencyException) { }
                    catch (Exception ex) { logger.LogError(ex, "Could not resolve expired reservation {OrderId}", id); }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Reservation expiry scan failed"); }
            try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
