using AutoMapper;
using Ecommerce.Application.DTOs.Address;
using Ecommerce.Application.Services.Identity;
using Ecommerce.Domain.Entities;
using Ecommerce.Domain.Interfaces;
using FluentAssertions;
using MockQueryable.Moq;
using Moq;

namespace Ecommerce.UnitTests.Services;

public class AddressServiceTests
{
    private readonly Mock<IRepository<Address>> _addressRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly AddressService _sut;

    public AddressServiceTests()
    {
        _addressRepoMock = new Mock<IRepository<Address>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _mapperMock = new Mock<IMapper>();

        _sut = new AddressService(_addressRepoMock.Object, _unitOfWorkMock.Object, _mapperMock.Object);
    }

    [Fact]
    public async Task CreateAddressAsync_WhenLimitReached_ThrowsArgumentException()
    {
        var userId = Guid.NewGuid();
        var existing = Enumerable.Range(0, 5)
            .Select(_ => new Address { AddressId = Guid.NewGuid(), UserId = userId })
            .AsQueryable()
            .BuildMock();

        _addressRepoMock.Setup(r => r.Query()).Returns(existing);

        var dto = new CreateAddressRequestDto
        {
            FullName = "Test User",
            PhoneNumber = "9876543210",
            PostalCode = "150106",
            HouseName = "House",
            Place = "City",
            Reference = "PO",
            LandMark = "Landmark"
        };

        var act = () => _sut.CreateAddressAsync(dto, userId);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Maximum address limit is 5");
    }

    [Fact]
    public async Task CreateAddressAsync_ValidRequest_PersistsAddress()
    {
        var userId = Guid.NewGuid();
        var dto = new CreateAddressRequestDto
        {
            FullName = "Test User",
            PhoneNumber = "9876543210",
            PostalCode = "150106",
            HouseName = "House",
            Place = "City",
            Reference = "PO",
            LandMark = "Landmark"
        };

        var empty = new List<Address>().AsQueryable().BuildMock();
        _addressRepoMock.Setup(r => r.Query()).Returns(empty);
        _mapperMock.Setup(m => m.Map<AddressResponseDto>(It.IsAny<Address>()))
            .Returns(new AddressResponseDto { PostalCode = dto.PostalCode });
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var result = await _sut.CreateAddressAsync(dto, userId);

        result.Should().NotBeNull();
        result.PostalCode.Should().Be("150106");
        _addressRepoMock.Verify(r => r.AddAsync(It.IsAny<Address>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAddressAsync_UnknownAddress_ReturnsFalse()
    {
        var empty = new List<Address>().AsQueryable().BuildMock();
        _addressRepoMock.Setup(r => r.Query()).Returns(empty);

        var result = await _sut.DeleteAddressAsync(Guid.NewGuid(), Guid.NewGuid());

        result.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateAddressAsync_NotFound_ThrowsKeyNotFoundException()
    {
        var empty = new List<Address>().AsQueryable().BuildMock();
        _addressRepoMock.Setup(r => r.Query()).Returns(empty);

        var act = () => _sut.UpdateAddressAsync(Guid.NewGuid(), Guid.NewGuid(), new CreateAddressRequestDto
        {
            FullName = "A",
            PhoneNumber = "9876543210",
            PostalCode = "150106",
            HouseName = "H",
            Place = "P",
            Reference = "PO",
            LandMark = "L"
        });

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Address not found");
    }
}
