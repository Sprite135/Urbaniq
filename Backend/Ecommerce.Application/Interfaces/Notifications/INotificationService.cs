using Ecommerce.Application.DTOs.Orders;

namespace Ecommerce.Application.Interfaces.Notifications
{
    public interface INotificationService
    {
        Task SendOrderConfirmationEmailAsync(string userEmail, string userName, OrderDetailsResponseDto order);
        Task SendOrderStatusUpdateEmailAsync(string userEmail, string userName, string orderNumber, string newStatus);
        Task SendPasswordResetEmailAsync(string userEmail, string userName, string resetLink);
        Task SendEmailVerificationEmailAsync(string userEmail, string userName, string verificationLink);
        Task SendWelcomeEmailAsync(string userEmail, string userName);
        Task SendLowStockAlertAsync(string productName, int currentStock, int threshold);
        Task SendWishlistPriceDropAlertAsync(string userEmail, string userName, string productName, decimal oldPrice, decimal newPrice);
        Task SendWishlistStockAvailableAlertAsync(string userEmail, string userName, string productName);
    }
}