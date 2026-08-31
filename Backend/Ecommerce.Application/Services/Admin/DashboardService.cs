using Ecommerce.Application.DTOs.Admin;
using Ecommerce.Application.DTOs.Catalog;
using Ecommerce.Application.Interfaces.Admin;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ecommerce.Application.Services.Admin
{
    public class DashboardService : IDashboardService
    {
        private readonly IRepository<Order> _orderRepo;
        private readonly IRepository<OrderItem> _orderItemRepo;
        private readonly IRepository<User> _userRepo;
        private readonly IRepository<Product> _productRepo;

        public DashboardService(
            IRepository<Order> orderRepo,
            IRepository<OrderItem> orderItemRepo,
            IRepository<User> userRepo,
            IRepository<Product> productRepo)
        {
            _orderRepo = orderRepo;
            _orderItemRepo = orderItemRepo;
            _userRepo = userRepo;
            _productRepo = productRepo;
        }

        public async Task<AdminDashboardStatsDto> GetDashboardStatsAsync()
        {
            var totalRevenue = await _orderRepo.Query()
                .Where(o => 
                    (new[] { "card", "yape", "plin", "bcp", "interbank", "bbva", "scotiabank", "pagoefectivo" }.Contains(o.PaymentMethod) && o.OrderStatus != OrderStatus.Cancelled) ||
                    (o.PaymentMethod == "cod" && o.OrderStatus == OrderStatus.Delivered))
                .SumAsync(o => o.TotalPrice);
            
            var totalItemsDelivered = await _orderItemRepo.Query()
                .Where(oi => oi.Order.OrderStatus == OrderStatus.Delivered)
                .SumAsync(oi => (int?)oi.Quantity) ?? 0;

            var totalItemsCancelled = await _orderItemRepo.Query()
                .Where(oi => oi.Order.OrderStatus == OrderStatus.Cancelled)
                .SumAsync(oi => (int?)oi.Quantity) ?? 0;
            
            var totalProcessingOrders = await _orderRepo.Query().CountAsync(o => o.OrderStatus == OrderStatus.Processing);
            var totalShippedOrders = await _orderRepo.Query().CountAsync(o => o.OrderStatus == OrderStatus.Shipped);
            
            var totalCustomers = await _userRepo.Query().CountAsync(u => u.Role != UserRole.Admin);
            var lowStockCount = await _productRepo.Query().CountAsync(p => p.Quantity <= 10);

            return new AdminDashboardStatsDto
            {
                TotalRevenue = totalRevenue,
                TotalItemsDelivered = totalItemsDelivered,
                TotalItemsCancelled = totalItemsCancelled,
                TotalProcessingOrders = totalProcessingOrders,
                TotalShippedOrders = totalShippedOrders,
                TotalCustomers = totalCustomers,
                LowStockCount = lowStockCount
            };
        }

        public async Task<List<ProductResponseDto>> GetLowStockProductsAsync(int threshold = 10, int limit = 5)
        {
            var products = await _productRepo.Query()
                .Where(p => p.Quantity <= threshold)
                .OrderBy(p => p.Quantity)
                .Take(limit)
                .ToListAsync();

            return products.Select(p => new ProductResponseDto
            {
                Id = p.Id,
                ProductName = p.ProductName,
                SKU = p.SKU,
                Price = p.Price,
                Quantity = p.Quantity,
                Image = p.Image,
                Slug = p.Slug,
                CategoryId = p.CategoryId
            }).ToList();
        }
    }
}
