import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

type ProductImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallbackLabel: string;
};

const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  onError,
  ...imageProps
}) => {
  const [hasError, setHasError] = useState(!src);

  // Use relative URLs when frontend is compiled (served by backend)
  // Use absolute URLs when running in dev mode with separate Vite server
  const absoluteSrc = src && (src.startsWith('http://') || src.startsWith('https://'))
    ? src
    : src; // Keep relative URLs for production (served by backend)

  useEffect(() => {
    setHasError(!src);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt ? `${alt} image unavailable` : undefined}
        className={`flex flex-col items-center justify-center bg-[#f3f4f6] dark:bg-[#1a1c21] px-5 text-center text-[#374151] dark:text-[#9ca3af] ${className}`}
      >
        <ImageOff className="mb-3 h-8 w-8 text-[#9d731e]" aria-hidden="true" />
        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9d731e]">Urbaniq</span>
        <span className="mt-2 max-w-full text-sm font-semibold leading-5 text-[#111827] dark:text-[#ece7dd]">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      {...imageProps}
      src={absoluteSrc}
      alt={alt}
      className={className}
      onError={(event) => {
        onError?.(event);
        setHasError(true);
      }}
    />
  );
};

export default ProductImage;
