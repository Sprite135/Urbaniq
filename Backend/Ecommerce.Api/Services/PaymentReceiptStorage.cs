using Microsoft.AspNetCore.Hosting;

namespace Ecommerce.Api.Services;

public sealed class PaymentReceiptStorage
{
    public string DirectoryPath { get; }

    public PaymentReceiptStorage(IWebHostEnvironment environment)
    {
        // Azure /home persists across deployments; local development uses wwwroot.
        var azureHome = Environment.GetEnvironmentVariable("HOME");
        DirectoryPath = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME"))
                        && !string.IsNullOrWhiteSpace(azureHome)
            ? Path.Combine(azureHome, "data", "urbaniq", "payment-receipts")
            : Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", "payments");
    }
}
