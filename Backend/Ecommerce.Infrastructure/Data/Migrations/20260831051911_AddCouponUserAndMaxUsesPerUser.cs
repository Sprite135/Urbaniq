using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ecommerce.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCouponUserAndMaxUsesPerUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BuyQuantity",
                table: "Coupons",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CanCombine",
                table: "Coupons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "GetQuantity",
                table: "Coupons",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxUsesPerUser",
                table: "Coupons",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AutoCouponRules",
                columns: table => new
                {
                    RuleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TriggerType = table.Column<int>(type: "int", nullable: false),
                    CouponPrefix = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DiscountType = table.Column<int>(type: "int", nullable: false),
                    DiscountValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MinOrderAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    MaxUses = table.Column<int>(type: "int", nullable: true),
                    MaxUsesPerUser = table.Column<int>(type: "int", nullable: true),
                    ValidityDays = table.Column<int>(type: "int", nullable: false),
                    MinimumPurchaseAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    EventStartDate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EventEndDate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutoCouponRules", x => x.RuleId);
                });

            migrationBuilder.CreateTable(
                name: "CouponExcludedProducts",
                columns: table => new
                {
                    CouponId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CouponExcludedProducts", x => new { x.CouponId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_CouponExcludedProducts_Coupons_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "CouponId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CouponExcludedProducts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CouponUsers",
                columns: table => new
                {
                    CouponId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CouponUsers", x => new { x.CouponId, x.UserId, x.OrderId });
                    table.ForeignKey(
                        name: "FK_CouponUsers_Coupons_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "CouponId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CouponExcludedProducts_ProductId",
                table: "CouponExcludedProducts",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AutoCouponRules");

            migrationBuilder.DropTable(
                name: "CouponExcludedProducts");

            migrationBuilder.DropTable(
                name: "CouponUsers");

            migrationBuilder.DropColumn(
                name: "BuyQuantity",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "CanCombine",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "GetQuantity",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "MaxUsesPerUser",
                table: "Coupons");
        }
    }
}
