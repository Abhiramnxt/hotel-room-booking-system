import React, { useState, useEffect, forwardRef } from 'react';
import { FALLBACK_IMAGES, getOptimizedImageUrl } from '../image_data';

interface RoomImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  category?: 'Standard' | 'Deluxe' | 'Executive Suite' | 'Presidential Suite' | string;
  fallbackType?: 'Standard' | 'Deluxe' | 'Executive Suite' | 'Presidential Suite' | 'General';
  width?: number;
  quality?: number;
}

/**
 * Premium, bulletproof React Image Component crafted specifically for Sai Nirvana Plaza.
 * It immediately renders the intended premium cover photo, verifies accessibility,
 * and handles any loading errors by instantly swapping to a high-contrast luxury category placeholder.
 * Fully compatible with Framer Motion via forwardRef.
 */
export const RoomImage = forwardRef<HTMLImageElement, RoomImageProps>(({
  src,
  alt = 'Sai Nirvana Plaza Room',
  className = 'w-full h-full object-cover',
  category,
  fallbackType,
  width,
  quality,
  ...props
}, ref) => {
  // Resolve the best corresponding category fallback
  const resolvedCategory = fallbackType || category || 'General';
  const fallbackUrl = FALLBACK_IMAGES[resolvedCategory] || FALLBACK_IMAGES['General'];

  // Resolve scaled Unsplash source if width/quality is requested
  const initialUrl = src ? (width || quality ? getOptimizedImageUrl(src, width, quality) : src) : fallbackUrl;

  // Keep internal state of the image source to reflect swaps immediately and seamlessly
  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
  const [isFallbackActive, setIsFallbackActive] = useState<boolean>(!src);

  // Sync internal state with external source changes
  useEffect(() => {
    if (src) {
      const activeSrc = (width || quality) ? getOptimizedImageUrl(src, width, quality) : src;
      setCurrentSrc(activeSrc);
      setIsFallbackActive(false);
    } else {
      setCurrentSrc(fallbackUrl);
      setIsFallbackActive(true);
    }
  }, [src, fallbackUrl, width, quality]);


  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!isFallbackActive) {
      // Set to fallback image as backup
      setCurrentSrc(fallbackUrl);
      setIsFallbackActive(true);
    }
    // Propagate custom onError handler if provided
    if (props.onError) {
      props.onError(e);
    }
  };

  return (
    <img
      {...props}
      ref={ref}
      src={currentSrc}
      alt={isFallbackActive ? `${resolvedCategory} Room Premium Placeholder` : alt}
      onError={handleError}
      className={className}
      referrerPolicy="no-referrer"
    />
  );
});

// Give it a helpful displayName for React DevTools and syntax linters
RoomImage.displayName = 'RoomImage';
