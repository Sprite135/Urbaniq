using System;
using System.ComponentModel.DataAnnotations;
using Ecommerce.Domain.Interfaces;

namespace Ecommerce.Domain.Entities
{
    public class Review : ISoftDeletable
    {
        public int ReviewId { get; set; }
        public Guid ProductId { get; set; }
        public Guid UserId { get; set; }
        public int Rating { get; set; }
        public string Title { get; set; }
        public string Comment { get; set; }
        public bool IsVerifiedPurchase { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsApproved { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }

        // Navigation Properties
        public virtual Product Product { get; set; } = null!;
        public virtual User User { get; set; } = null!;
    }
}