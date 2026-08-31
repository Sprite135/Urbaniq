import React from 'react';
import { motion } from 'framer-motion';
import ProductImage from './ProductImage';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({ images, productName }) => {
  // Since our backend might only have one image for now, I'll repeat it for the gallery effect
  // or handle multiple if available.
  const galleryImages = images.length > 0 ? images : [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&q=80&w=800'
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {galleryImages.map((src, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="aspect-[3/4] overflow-hidden bg-gray-50 dark:bg-[#0e0f12] rounded-sm"
        >
          <ProductImage
            src={src}
            alt={`${productName} view ${index + 1}`}
            fallbackLabel={productName}
            className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700 cursor-zoom-in"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default ProductGallery;
