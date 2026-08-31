using AutoMapper;
using Ecommerce.Application.DTOs.Address;
using Ecommerce.Application.Helpers;
using Ecommerce.Application.Interfaces.Identity;
using Ecommerce.Domain.Common;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Ecommerce.Application.Services.Identity
{
    public class AddressService : IAddressService
    {
        private readonly IRepository<Address> _addressRepo;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public AddressService(IRepository<Address> addressRepo, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _addressRepo = addressRepo;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<AddressResponseDto> CreateAddressAsync(CreateAddressRequestDto newAddress, Guid userId)
        {
            if (userId == Guid.Empty)
                throw new ArgumentException("User not found");

            if (newAddress == null)
                throw new ArgumentNullException(nameof(newAddress), "The address cannot be null");

            var count = await _addressRepo.Query().CountAsync(a => a.UserId == userId);
            if (count >= 5)
                throw new ArgumentException("Maximum address limit is 5");

            var address = new Address
            {
                UserId = userId,
                FullName = newAddress.FullName,
                PhoneNumber = NormalizePeruPhone(newAddress.PhoneNumber),
                PostalCode = newAddress.PostalCode,
                Department = newAddress.Department,
                Province = newAddress.Province,
                District = newAddress.District,
                DeliveryZone = newAddress.DeliveryZone
                    ?? DeliveryHelper.ResolveZone(newAddress.Department, newAddress.Province),
                HouseName = newAddress.HouseName,
                Place = newAddress.Place,
                Reference = newAddress.Reference,
                LandMark = newAddress.LandMark,
            };

            await _addressRepo.AddAsync(address);
            await _unitOfWork.SaveChangesAsync();
            return _mapper.Map<AddressResponseDto>(address);
        }

        public async Task<PagedResult<AddressResponseDto>> GetAllAddressesAsync(Guid userId, int pageNumber = 1, int pageSize = 10)
        {
            if (userId == Guid.Empty)
                throw new ArgumentException("User not found");

            var query = _addressRepo.Query().Where(a => a.UserId == userId);
            var totalCount = await query.CountAsync();

            var addresses = await query
                .Skip((pageNumber - 1) * pageSize).Take(pageSize)
                .ToListAsync();

            return new PagedResult<AddressResponseDto>
            {
                Items = _mapper.Map<List<AddressResponseDto>>(addresses),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<AddressResponseDto> UpdateAddressAsync(Guid userId, Guid addressId, CreateAddressRequestDto addressDto)
        {
            if (userId == Guid.Empty)
                throw new ArgumentException("User not found");

            if (addressDto == null)
                throw new ArgumentNullException(nameof(addressDto), "The address cannot be null");

            var address = await _addressRepo.Query()
                .FirstOrDefaultAsync(a => a.AddressId == addressId && a.UserId == userId);

            if (address == null)
                throw new KeyNotFoundException("Address not found");

            address.FullName = addressDto.FullName;
            address.PhoneNumber = NormalizePeruPhone(addressDto.PhoneNumber);
            address.PostalCode = addressDto.PostalCode;
            address.Department = addressDto.Department;
            address.Province = addressDto.Province;
            address.District = addressDto.District;
            address.DeliveryZone = addressDto.DeliveryZone
                ?? DeliveryHelper.ResolveZone(addressDto.Department, addressDto.Province);
            address.HouseName = addressDto.HouseName;
            address.Place = addressDto.Place;
            address.Reference = addressDto.Reference;
            address.LandMark = addressDto.LandMark;

            _addressRepo.Update(address);
            await _unitOfWork.SaveChangesAsync();
            return _mapper.Map<AddressResponseDto>(address);
        }

        private static string NormalizePeruPhone(string phoneNumber)
        {
            var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());
            if (digits.Length == 9)
            {
                return "+51" + digits;
            }

            if (digits.Length == 11 && digits.StartsWith("51"))
            {
                return "+" + digits;
            }

            return phoneNumber;
        }

        public async Task<bool> DeleteAddressAsync(Guid userId, Guid addressId)
        {
            if (userId == Guid.Empty)
                throw new ArgumentException("User not found");

            var address = await _addressRepo.Query()
                .FirstOrDefaultAsync(a => a.AddressId == addressId && a.UserId == userId);

            if (address == null)
                return false;

            _addressRepo.Remove(address);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }
    }
}
