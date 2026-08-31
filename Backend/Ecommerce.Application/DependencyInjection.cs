using Ecommerce.Application.Interfaces.Cart;
using Ecommerce.Application.Interfaces.Catalog;
using Ecommerce.Application.Interfaces.Cache;
using Ecommerce.Application.Interfaces.Coupons;
using Ecommerce.Application.Interfaces.Identity;
using Ecommerce.Application.Interfaces.Inventory;
using Ecommerce.Application.Interfaces.Notifications;
using Ecommerce.Application.Interfaces.Orders;
using Ecommerce.Application.Interfaces.Reviews;
using Ecommerce.Application.Interfaces.Wishlist;
using Ecommerce.Application.Services.Cart;
using Ecommerce.Application.Services.Catalog;
using Ecommerce.Application.Services.Cache;
using Ecommerce.Application.Services.Coupons;
using Ecommerce.Application.Services.Identity;
using Ecommerce.Application.Services.Inventory;
using Ecommerce.Application.Services.Notifications;
using Ecommerce.Application.Services.Orders;
using Ecommerce.Application.Services.Reviews;
using Ecommerce.Application.Services.Wishlist;
using Ecommerce.Application.Validators.Identity;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Ecommerce.Application
{
    /// <summary>
    /// Registers all Application layer services, interfaces, and validators.
    /// </summary>
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            // Identity Services
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IAddressService, AddressService>();
            services.AddScoped<IUserManagementService, UserManagementService>();
            services.AddScoped<Ecommerce.Application.Interfaces.Admin.IDashboardService, Ecommerce.Application.Services.Admin.DashboardService>();

            // Catalog Services
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<IProductService, ProductService>();

            // Cart Services
            services.AddScoped<ICartService, CartService>();

            // Order Services
            services.AddScoped<IOrderService, OrderService>();

            // Wishlist Services
            services.AddScoped<IWishListService, WishListService>();

            // Review Services
            services.AddScoped<IReviewService, ReviewService>();

            // Coupon Services
            services.AddScoped<ICouponService, CouponService>();
            services.AddScoped<IAutoCouponService, AutoCouponService>();

            // Notification Services
            services.AddScoped<INotificationService, NotificationService>();

            // Inventory Services
            services.AddScoped<IInventoryService, InventoryService>();

            // Cache Services
            services.AddScoped<ICacheService, CacheService>();

            // FluentValidation — auto-discover all validators in this assembly
            services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

            return services;
        }
    }
}
