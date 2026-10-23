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
            : Path.Combine(environment.ContentRootPath, "App_Data", "payment-receipts");
    }

    public bool IsValidName(string name) => name == Path.GetFileName(name) &&
        Guid.TryParseExact(Path.GetFileNameWithoutExtension(name), "D", out _) &&
        new[] { ".png", ".jpg", ".jpeg", ".webp", ".pdf" }.Contains(Path.GetExtension(name).ToLowerInvariant());

    public async Task<bool> IsOwnedAsync(string url, Guid userId)
    {
        var name = url.StartsWith("/uploads/payments/", StringComparison.Ordinal) ? url[18..] : "";
        if (!IsValidName(name)) return false;
        var path = Path.Combine(DirectoryPath, name) + ".owner";
        return File.Exists(path) && await File.ReadAllTextAsync(path) == userId.ToString();
    }

    public static bool HasValidSignature(byte[] bytes, string ext) => ext switch
    {
        ".png" => bytes.AsSpan().StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
        ".jpg" or ".jpeg" => bytes.AsSpan().StartsWith(new byte[] { 255, 216, 255 }),
        ".pdf" => bytes.AsSpan().StartsWith("%PDF-"u8),
        ".webp" => bytes.Length >= 12 && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8),
        _ => false
    };
}
