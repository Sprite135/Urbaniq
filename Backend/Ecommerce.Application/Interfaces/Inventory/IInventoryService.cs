namespace Ecommerce.Application.Interfaces.Inventory
{
    public interface IInventoryService
    {
        Task CheckLowStockThresholdsAsync();
        Task<bool> ReserveStockAsync(Guid productId, int quantity);
        Task ReleaseStockAsync(Guid productId, int quantity);
        Task<bool> IsStockAvailableAsync(Guid productId, int quantity);
    }
}