using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Ecommerce.Infrastructure.Data
{
    /// <summary>
    /// Design-time DbContext factory for EF Core migrations.
    /// This allows migrations to be created without requiring full app configuration.
    /// </summary>
    public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            
            // Use LocalDB SQL Server for design-time migrations.
            // IMPORTANT: must match the application's configured database (EcommerceDb),
            // otherwise `dotnet ef database update` would migrate a different database
            // than the one the running API actually uses.
            optionsBuilder.UseSqlServer(
                "Server=(localdb)\\MSSQLLocalDB;Database=EcommerceDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True;Encrypt=False;"
            );

            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
