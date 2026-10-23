using Ecommerce.Application.Common.Settings;
using Ecommerce.Application.Interfaces.Catalog;
using Ecommerce.Application.Interfaces.Email;
using Ecommerce.Application.Interfaces.Payment;
using Ecommerce.Application.Interfaces.Sms;
using Ecommerce.Domain.Interfaces;
using Ecommerce.Infrastructure.Data;
using Ecommerce.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Ecommerce.Infrastructure
{
    /// <summary>
    /// Registers all Infrastructure layer services: DbContext, Repository, UoW, and external services.
    /// </summary>
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            // Database
            services.AddDbContextPool<AppDbContext>(options =>
                options.UseSqlServer(
                    configuration.GetConnectionString("DefaultConnection"),
                    sqlOptions => 
                    {
                        sqlOptions.EnableRetryOnFailure();
                        sqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
                    }));

            // Repository & Unit of Work
            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
            services.AddScoped(typeof(IReadRepository<>), typeof(Repository<>));
            services.AddScoped<IUnitOfWork, UnitOfWork>();

            // External Services (Infrastructure implementations of Application interfaces)
            var cloudinaryCloudName = configuration["CloudinarySettings:CloudName"];
            var cloudinaryApiKey = configuration["CloudinarySettings:ApiKey"];
            var cloudinaryApiSecret = configuration["CloudinarySettings:ApiSecret"];

            if (string.IsNullOrWhiteSpace(cloudinaryCloudName) ||
                cloudinaryCloudName.Contains("SET_VIA_USER_SECRETS_OR_ENV_VAR", StringComparison.OrdinalIgnoreCase) ||
                string.IsNullOrWhiteSpace(cloudinaryApiKey) ||
                cloudinaryApiKey.Contains("SET_VIA_USER_SECRETS_OR_ENV_VAR", StringComparison.OrdinalIgnoreCase) ||
                string.IsNullOrWhiteSpace(cloudinaryApiSecret) ||
                cloudinaryApiSecret.Contains("SET_VIA_USER_SECRETS_OR_ENV_VAR", StringComparison.OrdinalIgnoreCase))
            {
                services.AddScoped<ICloudImageService, LocalImageService>();
            }
            else
            {
                services.AddScoped<ICloudImageService, CloudinaryImageService>();
            }
            services.AddScoped<IPaymentGatewayService, StripeGatewayService>();
            services.Configure<MercadoPagoSettings>(configuration.GetSection("MercadoPagoSettings"));
            services.AddHttpClient<IMercadoPagoService, MercadoPagoService>(client =>
            {
                client.BaseAddress = new Uri("https://api.mercadopago.com/");
                client.Timeout = TimeSpan.FromSeconds(20);
            });

            // Email Service – SMTP via MailKit
            services.Configure<EmailSettings>(configuration.GetSection("EmailSettings"));
            services.AddScoped<IEmailSender, SmtpEmailSender>();
            services.AddSingleton<BackgroundEmailJobQueue>();
            services.AddSingleton<IEmailJobQueue>(provider => provider.GetRequiredService<BackgroundEmailJobQueue>());
            services.AddHostedService<QueuedEmailHostedService>();
            services.AddHostedService<ReservationExpiryService>();

            // SMS Service - Twilio
            services.Configure<SmsSettings>(configuration.GetSection("SmsSettings"));
            var twilioAccountSid = configuration["SmsSettings:AccountSid"];
            var twilioAuthToken = configuration["SmsSettings:AuthToken"];
            var twilioFromNumber = configuration["SmsSettings:FromNumber"];

            if (string.IsNullOrWhiteSpace(twilioAccountSid) ||
                twilioAccountSid.Contains("SET_VIA_USER_SECRETS_OR_ENV_VAR", StringComparison.OrdinalIgnoreCase) ||
                string.IsNullOrWhiteSpace(twilioAuthToken) ||
                twilioAuthToken.Contains("SET_VIA_USER_SECRETS_OR_ENV_VAR", StringComparison.OrdinalIgnoreCase))
            {
                services.AddScoped<ISmsSender, LocalSmsSender>();
            }
            else
            {
                services.AddScoped<ISmsSender, TwilioSmsSender>();
            }

            return services;
        }
    }
}
