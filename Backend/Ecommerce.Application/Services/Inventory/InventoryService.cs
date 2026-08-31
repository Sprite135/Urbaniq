using Ecommerce.Application.Interfaces.Inventory;
using Ecommerce.Application.Interfaces.Notifications;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Ecommerce.Application.Services.Inventory
{
    public class InventoryService : IInventoryService
    {
        private readonly IRepository<Product> _productRepo;
        private readonly INotificationService _notificationService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<InventoryService> _logger;
        private const int DEFAULT_LOW_STOCK_THRESHOLD = 5;

        public InventoryService(
            IRepository<Product> productRepo,
            INotificationService notificationService,
            IUnitOfWork unitOfWork,
            ILogger<InventoryService> logger)
        {
            _productRepo = productRepo;
            _notificationService = notificationService;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task CheckLowStockThresholdsAsync()
        {
            var lowStockProducts = await _productRepo.Query()
                .Where(p => p.Quantity > 0 && p.Quantity <= DEFAULT_LOW_STOCK_THRESHOLD && !p.IsDeleted)
                .ToListAsync();

            foreach (var product in lowStockProducts)
            {
                await _notificationService.SendLowStockAlertAsync(
                    product.ProductName,
                    product.Quantity,
                    DEFAULT_LOW_STOCK_THRESHOLD
                );
                _logger.LogWarning("Low stock alert for product {Product}: {Stock} units", product.ProductName, product.Quantity);
            }
        }

        public async Task<bool> ReserveStockAsync(Guid productId, int quantity)
        {
            var product = await _productRepo.Query()
                .FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted);

            if (product == null)
            {
                _logger.LogWarning("Product not found for stock reservation: {ProductId}", productId);
                return false;
            }

            if (product.Quantity < quantity)
            {
                _logger.LogWarning("Insufficient stock for product {Product}: Requested {Requested}, Available {Available}", 
                    product.ProductName, quantity, product.Quantity);
                return false;
            }

            product.Quantity -= quantity;
            _productRepo.Update(product);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Stock reserved for product {Product}: {Quantity} units", product.ProductName, quantity);
            return true;
        }

        public async Task ReleaseStockAsync(Guid productId, int quantity)
        {
            var product = await _productRepo.Query()
                .FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted);

            if (product == null)
            {
                _logger.LogWarning("Product not found for stock release: {ProductId}", productId);
                return;
            }

            product.Quantity += quantity;
            _productRepo.Update(product);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Stock released for product {Product}: {Quantity} units", product.ProductName, quantity);
        }

        public async Task<bool> IsStockAvailableAsync(Guid productId, int quantity)
        {
            var product = await _productRepo.Query()
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == productId && !p.IsDeleted);

            if (product == null)
                return false;

            return product.Quantity >= quantity;
        }
    }
}