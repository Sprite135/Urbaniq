using AutoMapper;
using Ecommerce.Application.Common.ProductOptions;
using Ecommerce.Application.DTOs.Address;
using Ecommerce.Application.DTOs.Cart;
using Ecommerce.Application.DTOs.Catalog;
using Ecommerce.Application.DTOs.Category;
using Ecommerce.Application.DTOs.Identity;
using Ecommerce.Application.DTOs.Orders;
using Ecommerce.Application.DTOs.Wishlist;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Enums;

namespace Ecommerce.Api.Mapping
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<RegisterRequestDto, User>()
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email.ToLower()))
                .ForMember(dest => dest.PhoneNumber, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.MapFrom(_ => UserRole.User));

            CreateMap<User, UserResponseDto>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role.ToString()));

            CreateMap<User, AdminUserResponseDto>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role.ToString()));

            CreateMap<CreateProductRequestDto, Product>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.SKU, opt => opt.Ignore())
                .ForMember(dest => dest.Slug, opt => opt.Ignore())
                .ForMember(dest => dest.Image, opt => opt.Ignore())
                .ForMember(dest => dest.Size, opt => opt.Ignore())
                .ForMember(dest => dest.Color, opt => opt.Ignore())
                .ForMember(dest => dest.AvailableSizes, opt => opt.Ignore())
                .ForMember(dest => dest.AvailableColors, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAtUtc, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAtUtc, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
                .ForMember(dest => dest.DeletedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Category, opt => opt.Ignore())
                .ForMember(dest => dest.SubCategory, opt => opt.Ignore())
                .ForMember(dest => dest.CartItems, opt => opt.Ignore())
                .ForMember(dest => dest.ProductImages, opt => opt.Ignore())
                .ForMember(dest => dest.Variants, opt => opt.Ignore());

            CreateMap<ProductVariant, ProductVariantResponseDto>();
            CreateMap<ProductImage, ProductImageResponseDto>();

            CreateMap<Product, ProductResponseDto>()
                .ForMember(dest => dest.Image,
                    opt => opt.MapFrom(src =>
                        src.ProductImages
                            .OrderBy(pi => pi.DisplayOrder)
                            .Select(pi => pi.ImageUrl)
                            .FirstOrDefault() ?? src.Image))
                .ForMember(dest => dest.Images,
                    opt => opt.MapFrom(src =>
                        src.ProductImages
                            .Where(pi => string.IsNullOrWhiteSpace(pi.Color))
                            .OrderBy(pi => pi.DisplayOrder)
                            .Select(pi => pi.ImageUrl)
                            .ToList()))
                .ForMember(dest => dest.ImagesByColor,
                    opt => opt.MapFrom(src =>
                        src.ProductImages
                            .Where(pi => !string.IsNullOrWhiteSpace(pi.Color))
                            .GroupBy(pi => pi.Color!)
                            .ToDictionary(
                                group => group.Key,
                                group => group
                                    .OrderBy(pi => pi.DisplayOrder)
                                    .Select(pi => pi.ImageUrl)
                                    .ToList())))
                .ForMember(dest => dest.ImageEntries,
                    opt => opt.MapFrom(src =>
                        src.ProductImages
                            .OrderBy(pi => pi.DisplayOrder)
                            .ToList()))
                .ForMember(dest => dest.AvailableSizes,
                    opt => opt.MapFrom(src => src.Variants
                        .Select(v => v.Size)
                        .Distinct()
                        .OrderBy(value => value)
                        .ToList()))
                .ForMember(dest => dest.AvailableColors,
                    opt => opt.MapFrom(src => src.Variants
                        .Select(v => v.Color)
                        .Distinct()
                        .OrderBy(value => value)
                        .ToList()))
                .ForMember(dest => dest.DeliverableZones,
                    opt => opt.MapFrom(src => ProductOptionParser.ParseDeliveryCodes(src.DeliverableZones).ToList()))
                .ForMember(dest => dest.Variants,
                    opt => opt.MapFrom(src => src.Variants.OrderBy(v => v.Color).ThenBy(v => v.Size).ToList()))
                .ForMember(dest => dest.CategoryName,
                    opt => opt.MapFrom(src => src.Category != null ? src.Category.CategoryName : string.Empty))
                .ForMember(dest => dest.SubCategoryName,
                    opt => opt.MapFrom(src => src.SubCategory != null ? src.SubCategory.CategoryName : null));

            CreateMap<Category, CategoryResponseDto>();

            CreateMap<CreateCategoryRequestDto, Category>()
                .ForMember(dest => dest.CategoryId, opt => opt.Ignore())
                .ForMember(dest => dest.Slug, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true))
                .ForMember(dest => dest.ParentCategory, opt => opt.Ignore())
                .ForMember(dest => dest.SubCategories, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());

            CreateMap<Address, AddressResponseDto>().ReverseMap();
            CreateMap<Address, CreateAddressRequestDto>().ReverseMap();

            CreateMap<CartItem, CartItemResponseDto>()
                .ForMember(dest => dest.CartItemId, opt => opt.MapFrom(src => src.Id))
                .ForMember(dest => dest.ProductVariantId, opt => opt.MapFrom(src => src.ProductVariantId))
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : string.Empty))
                .ForMember(dest => dest.Slug, opt => opt.MapFrom(src => src.Product != null ? src.Product.Slug : string.Empty))
                .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.Product != null ? src.Product.Price : 0))
                .ForMember(dest => dest.Discount, opt => opt.MapFrom(src => src.Product != null ? src.Product.Discount : 0))
                .ForMember(dest => dest.Image, opt => opt.MapFrom(src => src.Product != null ? src.Product.Image : null))
                .ForMember(dest => dest.Quantity, opt => opt.MapFrom(src => src.Quantity))
                .ForMember(dest => dest.TotalPrice, opt => opt.MapFrom(src => ((src.Product != null ? src.Product.Price : 0) - (src.Product != null ? src.Product.Discount : 0)) * src.Quantity))
                .ForMember(dest => dest.Size, opt => opt.MapFrom(src => src.SelectedSize))
                .ForMember(dest => dest.Color, opt => opt.MapFrom(src => src.SelectedColor))
                .ForMember(dest => dest.DeliveryCode, opt => opt.MapFrom(src => src.DeliveryCode));

            CreateMap<Domain.Entities.Cart, CartResponseDto>()
                .ForMember(dest => dest.CartId, opt => opt.MapFrom(src => src.CartId))
                .ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.CartItems))
                .ForMember(dest => dest.TotalCount, opt => opt.MapFrom(src => src.CartItems.Sum(i => i.Quantity)))
                .ForMember(dest => dest.TotalPrice, opt => opt.MapFrom(src => src.CartItems.Sum(i => (i.Product != null ? i.Product.Price : 0) * i.Quantity)))
                .ForMember(dest => dest.TotalDiscount, opt => opt.MapFrom(src => src.CartItems.Sum(i => (i.Product != null ? i.Product.Discount : 0) * i.Quantity)))
                .ForMember(dest => dest.FinalAmount, opt => opt.MapFrom(src => src.CartItems.Sum(i => ((i.Product != null ? i.Product.Price : 0) - (i.Product != null ? i.Product.Discount : 0)) * i.Quantity)));

            CreateMap<OrderItem, OrderItemResponseDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : string.Empty))
                .ForMember(dest => dest.ImageUrl, opt => opt.MapFrom(src => src.Product != null ? src.Product.Image : string.Empty))
                .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.UnitPrice))
                .ForMember(dest => dest.TotalAmount, opt => opt.MapFrom(src => src.TotalPrice))
                .ForMember(dest => dest.Size, opt => opt.MapFrom(src => src.SelectedSize))
                .ForMember(dest => dest.Color, opt => opt.MapFrom(src => src.SelectedColor));

            CreateMap<Order, OrderDetailsResponseDto>()
                .ForMember(dest => dest.OrderStatus, opt => opt.MapFrom(src => src.OrderStatus.ToString()))
                .ForMember(dest => dest.Address, opt => opt.MapFrom(src => src.Address))
                .ForMember(dest => dest.OrderItems, opt => opt.MapFrom(src => src.OrderItems));

            CreateMap<WishList, WishListItemResponseDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product.ProductName))
                .ForMember(dest => dest.Slug, opt => opt.MapFrom(src => src.Product.Slug))
                .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.Product.Price))
                .ForMember(dest => dest.Image, opt => opt.MapFrom(src => src.Product.Image));
        }
    }
}
